import { supabase } from './supabase';
import { INTENT_MAP, SYNONYM_MAP, STOP_WORDS } from './searchConfig';

const MIN_CONFIDENCE = 0.45;

export function extractKeywords(text) {
  return text.toLowerCase().replace(/[^\w\s.]/g, ' ').replace(/\bt\.?a\.?\s*coin\b/gi, 'tacoin')
    .split(/\s+/).filter(function(w) { return w.length > 1 && !STOP_WORDS.has(w); }).slice(0, 10);
}

export function expandWithSynonyms(keywords) {
  var expanded = new Set(keywords);
  keywords.forEach(function(word) {
    if (SYNONYM_MAP[word]) { SYNONYM_MAP[word].forEach(function(s) { expanded.add(s); }); }
    Object.entries(SYNONYM_MAP).forEach(function(entry) {
      if (entry[1].includes(word)) expanded.add(entry[0]);
    });
  });
  return Array.from(expanded);
}

function levenshtein(a, b) {
  var m = [];
  for (var i = 0; i <= b.length; i++) m[i] = [i];
  for (var j = 0; j <= a.length; j++) m[0][j] = j;
  for (var i2 = 1; i2 <= b.length; i2++) {
    for (var j2 = 1; j2 <= a.length; j2++) {
      m[i2][j2] = b[i2-1] === a[j2-1] ? m[i2-1][j2-1] : Math.min(m[i2-1][j2-1]+1, m[i2][j2-1]+1, m[i2-1][j2]+1);
    }
  }
  return m[b.length][a.length];
}

export function isFuzzyMatch(word, target) {
  if (word === target) return true;
  if (word.length < 3 || target.length < 3) return word === target;
  var ratio = Math.min(word.length, target.length) / Math.max(word.length, target.length);
  if (ratio < 0.6) return false;
  var maxDist = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3;
  return levenshtein(word, target) <= maxDist;
}

var faqCache = null;
var cacheTs = 0;
var CACHE_TTL = 300000;

async function loadFaqCache() {
  var now = Date.now();
  if (faqCache && now - cacheTs < CACHE_TTL) return faqCache;
  try {
    if (!supabase) return [];
    var result = await supabase.from('support_faqs')
      .select('id, question, answer, category, keywords, related_questions')
      .eq('is_published', true).order('question', { ascending: true });
    if (result.error) throw result.error;
    faqCache = result.data || [];
    cacheTs = now;
    return faqCache;
  } catch (err) {
    console.error('FAQ cache load failed:', err);
    return faqCache || [];
  }
}

function detectIntent(query) {
  var norm = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  var matches = [];
  INTENT_MAP.forEach(function(intent) {
    var best = 0;
    intent.patterns.forEach(function(pattern) {
      if (norm.includes(pattern)) {
        best = Math.max(best, 0.7 + (pattern.length / Math.max(norm.length, 1)) * 0.3);
      } else if (pattern.includes(norm) && norm.length > 3) {
        best = Math.max(best, 0.65);
      }
    });
    if (best < 0.5) {
      var qk = extractKeywords(norm);
      var ek = expandWithSynonyms(qk);
      var kwHits = 0;
      intent.keywords.forEach(function(ik) {
        for (var idx = 0; idx < ek.length; idx++) {
          if (ek[idx] === ik || isFuzzyMatch(ek[idx], ik)) { kwHits++; break; }
        }
      });
      var patHits = 0;
      var patText = intent.patterns.join(' ');
      qk.forEach(function(qw) { if (patText.includes(qw)) patHits++; });
      var kwScore = intent.keywords.length > 0 ? (kwHits / intent.keywords.length) * 0.7 : 0;
      var patScore = qk.length > 0 ? (patHits / qk.length) * 0.3 : 0;
      best = Math.max(best, kwScore + patScore);
    }
    if (best >= 0.3) { matches.push(Object.assign({}, intent, { score: Math.round(best * 100) / 100 })); }
  });
  return matches.sort(function(a, b) { return b.score - a.score; });
}

export async function smartSearchFaqs(query) {
  var faqs = await loadFaqCache();
  if (!faqs || faqs.length === 0) return [];
  var norm = query.toLowerCase().trim();
  var qk = extractKeywords(norm);
  var ek = expandWithSynonyms(qk);

  var intents = detectIntent(norm);
  if (intents.length > 0 && intents[0].score >= 0.5) {
    var results = [];
    intents.slice(0, 3).forEach(function(intent) {
      var faq = faqs.find(function(f) { return f.question.toLowerCase() === intent.faqMatch.toLowerCase(); }); // FAQ match from intent
      if (faq) { results.push({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, score: intent.score || 0.95 }); }
    });
    if (results.length > 0) {
      console.log('Intent: ' + intents[0].intent + ' (' + intents[0].score + ')');
      return results;
    }
  }

  var scored = faqs.map(function(faq) {
    var qLow = faq.question.toLowerCase();
    var aLow = faq.answer.toLowerCase();
    var fkw = (faq.keywords || []).map(function(k) { return k.toLowerCase(); });
    var allText = qLow + ' ' + aLow + ' ' + fkw.join(' ');
    var total = 0; var max = 0;
    ek.forEach(function(kw) {
      var w = 0;
      if (qLow.includes(kw)) w += 4;
      if (fkw.some(function(k) { return k === kw || k.includes(kw); })) w += 3;
      if (aLow.includes(kw)) w += 1;
      if (w === 0) {
        var words = allText.split(/\s+/);
        for (var wi = 0; wi < words.length; wi++) {
          if (isFuzzyMatch(kw, words[wi])) { w += 2; break; }
        }
      }
      total += w; max += 8;
    });
    if (qk.length >= 2) {
      for (var pi = 0; pi < qk.length - 1; pi++) {
        var phrase = qk[pi] + ' ' + qk[pi + 1];
        if (qLow.includes(phrase)) total += 3;
        else if (aLow.includes(phrase)) total += 1;
        max += 3;
      }
    }
    var score = max > 0 ? Math.round(((total / max) * 0.95) * 100) / 100 : 0;
    return { id: faq.id, question: faq.question, answer: faq.answer, category: faq.category, score: score };
  });
  return scored.filter(function(r) { return r.score >= MIN_CONFIDENCE; }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);
}
