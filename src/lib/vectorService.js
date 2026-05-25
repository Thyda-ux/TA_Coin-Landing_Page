import { supabase } from './supabase';
import { smartSearchFaqs, extractKeywords, expandWithSynonyms } from './smartSearch';

const EMBEDDING_TABLE = 'faq_embeddings';
const MIN_CONFIDENCE = 0.45;

/**
 * Generate embedding via Supabase Edge Function (Gemini text-embedding-004)
 */
async function generateEmbedding(text) {
  const { data, error } = await supabase.functions.invoke('get-embedding', {
    body: { text },
  });
  if (error) throw error;
  return data.embedding;
}

/**
 * Database keyword search fallback (used when local cache is empty)
 */
export const keywordSearchFaqs = async (query) => {
  try {
    if (!supabase) return [];
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    const keywords = extractKeywords(clean);
    const expanded = expandWithSynonyms(keywords).filter((w) => w.length > 2).slice(0, 10);
    if (expanded.length === 0) return [];

    // Exact phrase match first
    const { data: exact, error: exErr } = await supabase
      .from('support_faqs')
      .select('id, question, answer, category, keywords')
      .eq('is_published', true)
      .ilike('question', `%${clean}%`)
      .limit(5);

    if (!exErr && exact && exact.length > 0) {
      return exact.map((faq, i) => ({
        id: faq.id, question: faq.question, answer: faq.answer,
        category: faq.category, score: 0.95 - i * 0.05,
      }));
    }

    // Word-level search
    const orFilters = expanded
      .flatMap((w) => [`question.ilike.%${w}%`, `answer.ilike.%${w}%`])
      .join(',');

    const { data: matches, error: mErr } = await supabase
      .from('support_faqs')
      .select('id, question, answer, category, keywords')
      .eq('is_published', true)
      .or(orFilters)
      .limit(15);

    if (mErr) throw mErr;
    if (!matches || matches.length === 0) return [];

    const scored = matches.map((faq) => {
      const qLow = faq.question.toLowerCase();
      const aLow = faq.answer.toLowerCase();
      const fkw = (faq.keywords || []).join(' ').toLowerCase();
      let total = 0, max = 0;
      for (const w of expanded) {
        let wt = 0;
        if (qLow.includes(w)) wt += 4;
        if (fkw.includes(w)) wt += 3;
        if (aLow.includes(w)) wt += 1;
        total += wt; max += 8;
      }
      const score = max > 0 ? Math.round(((total / max) * 0.95) * 100) / 100 : 0;
      return { id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, score };
    });

    return scored.filter((r) => r.score >= MIN_CONFIDENCE).sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (err) {
    console.error('Keyword Search Error:', err);
    return [];
  }
};

/**
 * Main search: Smart local search → Semantic search → Keyword DB fallback
 * Priority: 1) Intent detection (instant) 2) Vector similarity 3) DB keyword search
 */
export const semanticSearchFaqs = async (query) => {
  // Step 1: Try smart local search first (intent + cached FAQ matching)
  try {
    const smartResults = await smartSearchFaqs(query);
    if (smartResults && smartResults.length > 0 && smartResults[0].score >= 0.5) {
      console.log('Smart search hit:', smartResults[0].question, `(${smartResults[0].score})`);
      return smartResults;
    }
  } catch (err) {
    console.warn('Smart search failed, trying semantic:', err);
  }

  // Step 2: Try semantic vector search (RAG pipeline)
  try {
    const queryVector = await generateEmbedding(query);
    const { data, error } = await supabase.rpc('match_faqs', {
      query_embedding: queryVector,
      match_threshold: 0.6,
      match_count: 5,
    });
    if (error) throw error;

    const results = data.map((m) => ({
      id: m.faq_id, question: m.question, answer: m.answer,
      category: m.category, score: m.similarity,
    }));
    if (results.length > 0) return results;
  } catch (err) {
    console.warn('Semantic search failed, trying keyword fallback:', err);
  }

  // Step 3: Database keyword search as last resort
  return await keywordSearchFaqs(query);
};

/**
 * Generate AI response using RAG completion
 */
export const generateAiResponse = async (query, matches) => {
  try {
    if (matches.length === 0) {
      return "I couldn't find relevant information in our knowledge base.";
    }
    const context = matches
      .map((m, i) => `[${i + 1}] Q: ${m.question}\nA: ${m.answer}`)
      .join('\n\n');

    const { data, error } = await supabase.functions.invoke('rag-completion', {
      body: { query, context },
    });
    if (error) throw error;
    return data.text;
  } catch (err) {
    console.error('LLM Generation Error:', err);
    return matches[0]?.answer || "Unable to generate response. Please try again.";
  }
};

/**
 * Populate vector store from existing FAQs
 */
export const populateVectorStore = async () => {
  try {
    console.log('Starting FAQ vector population...');
    const { data: faqs, error: faqError } = await supabase
      .from('support_faqs')
      .select('id, question, answer, category');
    if (faqError) throw faqError;

    let ok = 0, fail = 0;
    for (const faq of faqs) {
      try {
        const embedding = await generateEmbedding(`${faq.question} ${faq.answer}`);
        const { error: insErr } = await supabase
          .from(EMBEDDING_TABLE)
          .upsert({ faq_id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, embedding });
        if (insErr) throw insErr;
        ok++;
      } catch (err) {
        console.error(`Failed FAQ ${faq.id}:`, err);
        fail++;
      }
    }
    console.log(`✓ Populated ${ok}/${faqs.length} FAQs. Errors: ${fail}`);
    return { successCount: ok, errorCount: fail };
  } catch (err) {
    console.error('Population Error:', err);
    throw err;
  }
};

/**
 * Initialize vector store
 */
export const initializeVectorStore = async () => {
  try {
    const { error } = await supabase.rpc('match_faqs', {
      query_embedding: Array(768).fill(0),
      match_threshold: 0.6,
      match_count: 1,
    });
    if (error && !error.message.includes('function')) throw error;
    console.log('✓ Vector store ready');
  } catch (err) {
    console.error('Init Error:', err.message);
  }
};

/**
 * Subscribe to FAQ changes for real-time embedding updates
 */
export const subscribeToFaqUpdates = (onUpdate) => {
  const channel = supabase
    .channel('faq-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_faqs' },
      async (payload) => {
        try {
          const { eventType, new: newFaq, old: oldFaq } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const embedding = await generateEmbedding(`${newFaq.question} ${newFaq.answer}`);
            const { error } = await supabase.from(EMBEDDING_TABLE).upsert({
              faq_id: newFaq.id, question: newFaq.question, answer: newFaq.answer,
              category: newFaq.category, embedding,
            });
            if (error) throw error;
            onUpdate({ type: 'success', faq: newFaq });
          } else if (eventType === 'DELETE') {
            const { error } = await supabase.from(EMBEDDING_TABLE).delete().eq('faq_id', oldFaq.id);
            if (error) throw error;
            onUpdate({ type: 'deleted', faqId: oldFaq.id });
          }
        } catch (err) {
          console.error('Realtime Update Error:', err);
          onUpdate({ type: 'error', error: err.message });
        }
      })
    .subscribe();
  return channel;
};

// Re-export smart search for direct use
export { smartSearchFaqs } from './smartSearch';
