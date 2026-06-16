import { supabase } from './supabase';
import { INTENT_MAP, SYNONYM_MAP, STOP_WORDS } from './searchConfig';

export const MIN_CONFIDENCE = 0.25;
export const HIGH_CONFIDENCE = 0.7;

const SYNONYM_REVERSE = (() => {
  const m = new Map();
  for (const [canonical, syns] of Object.entries(SYNONYM_MAP)) {
    for (const s of syns) {
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(canonical);
    }
  }
  return m;
})();

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const extractKeywords = (text) => {
  return String(text || '').toLowerCase()
    .replace(/\bt\.?a\.?\s*coin\b/gi, 'tacoin')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .slice(0, 10);
};

export const expandWithSynonyms = (keywords) => {
  const expanded = new Set(keywords);
  for (const word of keywords) {
    SYNONYM_MAP[word]?.forEach(s => expanded.add(s));
    SYNONYM_REVERSE.get(word)?.forEach(c => expanded.add(c));
  }
  return Array.from(expanded);
};

const levenshtein = (a, b) => {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i2 = 1; i2 <= b.length; i2++) {
    for (let j2 = 1; j2 <= a.length; j2++) {
      m[i2][j2] = b[i2-1] === a[j2-1] ? m[i2-1][j2-1] : Math.min(m[i2-1][j2-1]+1, m[i2][j2-1]+1, m[i2-1][j2]+1);
    }
  }
  return m[b.length][a.length];
};

export const isFuzzyMatch = (word, target) => {
  if (word === target) return true;
  if (word.length < 3 || target.length < 3) return word === target;
  const ratio = Math.min(word.length, target.length) / Math.max(word.length, target.length);
  if (ratio < 0.6) return false;
  const maxDist = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3;
  return levenshtein(word, target) <= maxDist;
};

let faqCache = null;
let cacheTs = 0;
const CACHE_TTL = 300000; // 5 minutes

const loadFaqCache = async () => {
  const now = Date.now();
  if (faqCache && now - cacheTs < CACHE_TTL) return faqCache;
  try {
    if (!supabase) return [];
    const { data, error } = await supabase.from('support_faqs')
      .select('id, question, answer, category, keywords, related_questions')
      .eq('is_published', true).order('question', { ascending: true });
    if (error) throw error;
    faqCache = data || [];
    cacheTs = now;
    return faqCache;
  } catch (err) {
    console.error('FAQ cache load failed:', err);
    return faqCache || [];
  }
};

const detectIntent = (query) => {
  const norm = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  const normPadded = ' ' + norm + ' ';
  const matches = [];
  INTENT_MAP.forEach(intent => {
    let best = 0;
    intent.patterns.forEach(pattern => {
      const padded = ' ' + pattern + ' ';
      if (normPadded.includes(padded)) {
        best = Math.max(best, 0.7 + (pattern.length / Math.max(norm.length, 1)) * 0.3);
      } else if (norm.includes(pattern) && pattern.length >= 5) {
        best = Math.max(best, 0.68);
      } else if (pattern.includes(norm) && norm.length > 3) {
        best = Math.max(best, 0.65);
      }
    });
    if (best < 0.5) {
      const qk = extractKeywords(norm);
      const ek = expandWithSynonyms(qk);
      let kwHits = 0;
      intent.keywords.forEach(ik => {
        for (let idx = 0; idx < ek.length; idx++) {
          if (ek[idx] === ik || isFuzzyMatch(ek[idx], ik)) { kwHits++; break; }
        }
      });
      let patHits = 0;
      const patText = intent.patterns.join(' ');
      qk.forEach(qw => { if (patText.includes(qw)) patHits++; });
      const kwScore = intent.keywords.length > 0 ? (kwHits / intent.keywords.length) * 0.7 : 0;
      const patScore = qk.length > 0 ? (patHits / qk.length) * 0.3 : 0;
      best = Math.max(best, kwScore + patScore);
    }
    if (best >= 0.3) { matches.push({ ...intent, score: Math.round(best * 100) / 100 }); }
  });
  return matches.sort((a, b) => b.score - a.score);
};

export const smartSearchFaqs = async (query) => {
  const faqs = await loadFaqCache();
  if (!faqs || faqs.length === 0) return [];
  const norm = query.toLowerCase().trim();
  const qk = extractKeywords(norm);
  const ek = expandWithSynonyms(qk);

  const intents = detectIntent(norm);
  if (intents.length > 0 && intents[0].score >= 0.5) {
    const results = [];
    intents.slice(0, 3).forEach(intent => {
      const faq = faqs.find(f => f.question.toLowerCase() === intent.faqMatch.toLowerCase()); // FAQ match from intent
      if (faq) { results.push({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, score: intent.score || 0.95 }); }
    });
    if (results.length > 0) {
      if (import.meta.env?.DEV) {
        console.log('Intent: ' + intents[0].intent + ' (' + intents[0].score + ')');
      }
      return results;
    }
  }
  
  const scored = faqs.map(faq => {
    const qLow = faq.question.toLowerCase();
    const aLow = faq.answer.toLowerCase();
    const fkw = (faq.keywords || []).map(k => k.toLowerCase());
    const allText = `${qLow} ${aLow} ${fkw.join(' ')}`;
    let total = 0; let max = 0;
    ek.forEach(kw => {
      let w = 0;
      if (qLow.includes(kw)) w += 4;
      if (fkw.some(k => k === kw || k.includes(kw))) w += 3;
      if (aLow.includes(kw)) w += 1;
      if (w === 0) {
        const words = allText.split(/\s+/);
        for (let wi = 0; wi < words.length; wi++) {
          if (isFuzzyMatch(kw, words[wi])) { w += 2; break; }
        }
      }
      total += w; max += 8;
    });
    if (qk.length >= 2) {
      for (let pi = 0; pi < qk.length - 1; pi++) {
        const phrase = `${qk[pi]} ${qk[pi + 1]}`;
        if (qLow.includes(phrase)) total += 3;
        else if (aLow.includes(phrase)) total += 1;
        max += 3;
      }
    }
    const score = max > 0 ? Math.round(((total / max) * 0.95) * 100) / 100 : 0;
    return { id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, score };
  });
  return scored.filter(r => r.score >= MIN_CONFIDENCE).sort((a, b) => b.score - a.score).slice(0, 5);
};
