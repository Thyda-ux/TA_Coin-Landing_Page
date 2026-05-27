import { supabase } from './supabase';
import { smartSearchFaqs } from './smartSearch';

const EMBEDDING_TABLE = 'faq_embeddings';
const MIN_CONFIDENCE = 0.45;
const SMART_DIRECT_HIT = 0.62;

function normalizeQueryText(query = '') {
  return query.replace(/\s+/g, ' ').trim();
}

function dedupeByFaqId(results = []) {
  const map = new Map();
  for (const item of results) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    if (!existing || (item.score || 0) > (existing.score || 0)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
}

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
 * Main search: Smart local search (Intent) → Hybrid DB Search (Vectors + True Keywords)
 */
export const semanticSearchFaqs = async (query) => {
  const cleanQuery = normalizeQueryText(query);
  if (!cleanQuery) return [];

  // Step 1: Try smart local search first (intent + cached FAQ matching)
  try {
    const smartResults = await smartSearchFaqs(cleanQuery);
    if (smartResults && smartResults.length > 0 && smartResults[0].score >= SMART_DIRECT_HIT) {
      console.log('Smart search hit:', smartResults[0].question);
      return dedupeByFaqId(smartResults).slice(0, 5).map(({ score, category, ...rest }) => rest);
    }
  } catch (err) {
    console.warn('Smart search failed, moving to hybrid:', err);
  }

  // Step 2: Hybrid Search (The database handles both Vectors and Keywords simultaneously)
  try {
    const queryVector = await generateEmbedding(cleanQuery);
    
    // Call our new Postgres function
    const { data, error } = await supabase.rpc('hybrid_search_faq', {
      query_text: cleanQuery,
      query_embedding: queryVector,
      match_count: 5,
    });

    if (error) throw error;

    // Map the results back to the format ChatBot.jsx expects
    const results = (data || []).map((m) => ({
      id: m.faq_id, 
      question: m.question, 
      answer: m.answer,
      category: m.category, 
      score: m.similarity,
    }));

    return dedupeByFaqId(results).filter((r) => r.score >= MIN_CONFIDENCE);

  } catch (err) {
    console.error('Hybrid search failed:', err);
    return [];
  }
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
      .slice(0, 3)
      .map((m) => `Q: ${m.question}\nA: ${String(m.answer || '').slice(0, 900)}`)
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
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot populate vector store.');
      return { successCount: 0, errorCount: 0 };
    }
    console.log('Starting FAQ vector population...');
    const { data: faqs, error: faqError } = await supabase
      .from('support_faqs')
      .select('id, question, answer, category, keywords');
    if (faqError) throw faqError;

    let ok = 0, fail = 0;
    for (const faq of faqs) {
      try {
        const textToEmbed = `Category: ${faq.category || ''}\nQuestion: ${faq.question}\nAnswer: ${faq.answer}\nKeywords: ${(faq.keywords || []).join(', ')}`;
        const embedding = await generateEmbedding(textToEmbed);
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
    if (!supabase) {
      console.warn('Supabase client not initialized. Skipping vector store initialization.');
      return;
    }
    const { error } = await supabase.rpc('hybrid_search_faq', {
      query_text: 'init',
      query_embedding: Array(768).fill(0),
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
            const textToEmbed = `Category: ${newFaq.category || ''}\nQuestion: ${newFaq.question}\nAnswer: ${newFaq.answer}\nKeywords: ${(newFaq.keywords || []).join(', ')}`;
            const embedding = await generateEmbedding(textToEmbed);
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