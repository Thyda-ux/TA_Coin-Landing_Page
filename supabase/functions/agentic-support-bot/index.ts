import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// RETRIEVAL-ONLY support bot (free-tier friendly).
//
// No LLM router and no LLM generation — those hit the gemini-2.5 free-tier daily
// cap (~20/day). Instead:
//   • routing is a cheap heuristic (small-talk regex + a few imperative actions)
//   • answers are the matched FAQ text returned VERBATIM, localized from
//     support_faqs.answer_km / answer_zh when available
// The ONLY Gemini call is the query embedding (gemini-embedding-001), which has a
// generous free quota (~1000/day), so the bot is effectively free and unlimited.
// ─────────────────────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30000;
const CACHE_TTL_DAYS = 7;

const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false } });

const SIM_THRESHOLD = 0.45;
const RATE_LIMIT_RPM = 30;

// ─── i18n ────────────────────────────────────────────────────────────────
const SUPPORTED_LANGS = new Set(["en", "km", "zh"]);
function normalizeLang(raw: unknown): string {
  const base = String(raw || "en").toLowerCase().split("-")[0];
  return SUPPORTED_LANGS.has(base) ? base : "en";
}

const T = {
  trivial: {
    en: "Hi! How can I help you today?",
    km: "សួស្តី! តើខ្ញុំអាចជួយអ្វីបានខ្លះថ្ងៃនេះ?",
    zh: "您好！今天有什么可以帮您？",
  },
  rateLimit: {
    en: "You're sending messages a little too fast. Please wait a moment and try again.",
    km: "អ្នកកំពុងផ្ញើសារលឿនពេក។ សូមរង់ចាំបន្តិច ហើយព្យាយាមម្ដងទៀត។",
    zh: "您发送消息的速度有点快，请稍候片刻再试。",
  },
  noMatch: {
    en: "I couldn't find a clear answer to that in our FAQs. Would you like to connect with a live agent?",
    km: "ខ្ញុំរកមិនឃើញចម្លើយច្បាស់លាស់នៅក្នុងសំណួរញឹកញាប់របស់យើងទេ។ តើអ្នកចង់ភ្ជាប់ទៅភ្នាក់ងារផ្ទាល់ទេ?",
    zh: "我在常见问题中找不到明确的答案。您想转接人工客服吗？",
  },
  infra: {
    en: "I'm having trouble accessing our knowledge base right now. Would you like to connect with a live agent?",
    km: "ខ្ញុំកំពុងជួបបញ្ហាក្នុងការចូលប្រើមូលដ្ឋានចំណេះដឹងរបស់យើងឥឡូវនេះ។ តើអ្នកចង់ភ្ជាប់ទៅភ្នាក់ងារផ្ទាល់ទេ?",
    zh: "我现在无法访问知识库。您想转接人工客服吗？",
  },
} as const;

function tr(key: keyof typeof T, lang: string): string {
  const row = T[key] as Record<string, string>;
  return row[lang] ?? row.en;
}

const TARGET_HINTS: Record<string, Record<string, string>> = {
  en: { password_reset: "your password reset page", delete_account: "your account settings" },
  km: { password_reset: "ទំព័រកំណត់ពាក្យសម្ងាត់ឡើងវិញ", delete_account: "ការកំណត់គណនីរបស់អ្នក" },
  zh: { password_reset: "您的密码重置页面", delete_account: "您的账户设置" },
};
function actionLead(lang: string, hint: string): string {
  if (lang === "km") return `ខ្ញុំអាចជួយបាន។ សូមចុចខាងក្រោមដើម្បីបើក ${hint}។`;
  if (lang === "zh") return `我可以帮您。点击下方打开${hint}。`;
  return `I can help with that. Tap below to open ${hint}.`;
}

// ─── Heuristic router (no LLM) ───────────────────────────────────────────
// Questions are always knowledge. Only a couple of clear imperative commands
// route to "action" (which shows the account deep-link button). English only —
// km/zh always fall through to knowledge retrieval.
const QUESTION_RE = /^\s*(how|what|why|when|where|which|who|can|could|do|does|did|is|are|am|should|would|will|may|might)\b|\?\s*$/i;
const ACTION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(reset|change|forgot)\s+(my\s+)?password\b/i, "password_reset"],
  [/\b(delete|close|deactivate)\s+(my\s+)?account\b/i, "delete_account"],
];
function detectAction(query: string, lang: string): string | null {
  if (lang !== "en") return null;
  if (QUESTION_RE.test(query)) return null;
  for (const [re, target] of ACTION_PATTERNS) if (re.test(query)) return target;
  return null;
}

// Greeting / thanks / goodbye in English, Chinese, and Khmer. Tested regardless
// of the declared language (users mix languages).
const SMALLTALK_PATTERNS: RegExp[] = [
  /^\s*(hi|hello|hey|hiya|yo|thanks|thank you|thx|ty|bye|goodbye|cya|ok|okay|nice|great|cool|cheers|good\s*(morning|afternoon|evening|night))\s*[!.?]*\s*$/i,
  /^\s*(你好|您好|哈囉|哈喽|嗨|早上好|早安|中午好|下午好|晚上好|晚安|你好吗|您好吗|谢谢|謝謝|多谢|多謝|感谢|感謝|再见|再見|拜拜|辛苦了)\s*[!。.?？～~]*\s*$/,
  /^\s*(សួស្តី|សួស្ដី|ជំរាបសួរ|អរគុណ|សូមអរគុណ|ជម្រាបសួរ|លាហើយ|ជំរាបលា|អរុណសួស្តី|សាយ័ណ្ហសួស្តី)\s*[!.?។៕]*\s*$/,
];
function isSmallTalk(query: string): boolean {
  return SMALLTALK_PATTERNS.some((re) => re.test(query));
}

// ─── CORS ────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://tacoin.com",
  "https://www.tacoin.com",
  "https://ta-coin-landing-page-qrtn.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
]);
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function jsonResponse(body: Record<string, unknown>, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("Request timed out"), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function hashQuery(text: string): Promise<string> {
  const normalized = text.toLowerCase().trim().replace(/[.,?!;:'"`]+/g, "").replace(/\s+/g, " ");
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Embedding (the only Gemini call) ────────────────────────────────────
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;
async function getEmbedding(text: string) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType: "RETRIEVAL_QUERY", outputDimensionality: EMBED_DIM }),
    },
    REQUEST_TIMEOUT_MS,
  );
  if (!response.ok) throw new Error(`Embedding Error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Invalid embedding response from Gemini");
  return values as number[];
}

// For km/zh, swap the matched English answer for a stored human-reviewed
// translation when present; otherwise fall back to the English answer.
async function applyStoredTranslations(topDocs: any[], lang: string) {
  if (lang === "en" || topDocs.length === 0) return topDocs;
  const ids = topDocs.map((d) => d.faq_id).filter(Boolean);
  if (ids.length === 0) return topDocs;
  const ansCol = lang === "km" ? "answer_km" : "answer_zh";
  const qCol = lang === "km" ? "question_km" : "question_zh";
  const { data, error } = await supabase.from("support_faqs").select(`id, ${qCol}, ${ansCol}`).in("id", ids);
  if (error || !data) return topDocs;
  const map = new Map(data.map((r: any) => [r.id, r]));
  return topDocs.map((d) => {
    const t = map.get(d.faq_id) as any;
    const hasTr = !!(t && t[ansCol] && String(t[ansCol]).trim());
    if (!t) return { ...d, translated: false };
    return {
      ...d,
      question: (t[qCol] && String(t[qCol]).trim()) ? t[qCol] : d.question,
      answer: hasTr ? t[ansCol] : d.answer,
      translated: hasTr,
    };
  });
}

// Short note prepended when a km/zh user gets the English FAQ answer because no
// stored translation exists yet — makes the English fallback read as intentional.
function englishFallbackNote(lang: string): string {
  if (lang === "km") return "(ចម្លើយបង្ហាញជាភាសាអង់គ្លេស)\n\n";
  if (lang === "zh") return "（以下答案以英文显示）\n\n";
  return "";
}

// ─── Response cache (language-scoped) ────────────────────────────────────
async function checkCache(queryHash: string) {
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("agent_response_cache")
    .select("response_text, response_action")
    .eq("query_hash", queryHash).gte("created_at", cutoff).maybeSingle();
  if (error) { console.warn("Cache read error:", error.message); return null; }
  return data;
}
function writeCache(queryHash: string, queryText: string, response: string, action: string | null) {
  return supabase.from("agent_response_cache").upsert({
    query_hash: queryHash, query_text: queryText.slice(0, 500),
    response_text: response, response_action: action, last_hit_at: new Date().toISOString(),
  }, { onConflict: "query_hash" }).then(({ error }: any) => { if (error) console.warn("Cache write error:", error.message); });
}

// ─── Keyword fallback (no embeddings, no LLM) ────────────────────────────
const FALLBACK_STOP_WORDS = new Set([
  "how","what","when","where","who","which","why","the","and","for","you","your",
  "can","will","would","should","have","has","this","that","with","from","about",
  "are","was","were","but","not","get","got","its","our","out","into","than","then",
]);
async function keywordFallback(query: string, lang: string): Promise<string> {
  const words = query.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !FALLBACK_STOP_WORDS.has(w)).slice(0, 6);
  if (words.length === 0) return tr("noMatch", lang);
  const orFilter = words.map((w) => `question.ilike.%${w}%,answer.ilike.%${w}%,keywords.cs.{${w}}`).join(",");
  const { data, error } = await supabase.from("support_faqs")
    .select("question, answer, keywords, question_km, answer_km, question_zh, answer_zh")
    .eq("is_published", true).or(orFilter).limit(20);
  if (error || !data || data.length === 0) return tr("infra", lang);
  const scored = (data as any[]).map((faq: any) => {
    let score = 0;
    const q = String(faq.question || "").toLowerCase();
    const a = String(faq.answer || "").toLowerCase();
    const kw = (faq.keywords || []).map((k: string) => String(k).toLowerCase());
    for (const w of words) {
      if (q.includes(w)) score += 4;
      if (kw.some((k: string) => k === w || k.includes(w))) score += 3;
      if (a.includes(w)) score += 1;
    }
    return { faq, score };
  }).sort((x, y) => y.score - x.score);
  const top = scored[0];
  const distinctQuestionHits = words.filter((w) => String(top.faq.question || "").toLowerCase().includes(w)).length;
  if (top.score < 4 || distinctQuestionHits < 2) return tr("noMatch", lang);
  const f = top.faq;
  if (lang === "km") return (f.answer_km || "").trim() || f.answer;
  if (lang === "zh") return (f.answer_zh || "").trim() || f.answer;
  return f.answer;
}

// ─── Main ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const startTime = Date.now();
  let routeTaken = "unknown";
  let lang = "en";

  try {
    const payload = await req.json().catch(() => ({}));
    const rawQuery = payload.query;
    if (!rawQuery || typeof rawQuery !== "string") return jsonResponse({ error: "Query required" }, corsHeaders, 400);
    lang = normalizeLang(payload.lang);
    const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, 1000);

    // Small talk (cheap, no API) — matched across EN / ZH / KM so greetings like
    // "你好" or "សួស្តី" don't fall through to FAQ retrieval.
    if (isSmallTalk(query)) {
      return jsonResponse({ text: tr("trivial", lang), action: null }, corsHeaders);
    }

    // Per-IP rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
    try {
      const minuteKey = `${ip}:${Math.floor(Date.now() / 60_000)}`;
      const { data: rlCount } = await supabase.rpc("increment_rate_counter", { p_key: minuteKey });
      if ((rlCount ?? 0) > RATE_LIMIT_RPM) {
        return jsonResponse({ text: tr("rateLimit", lang), action: null }, corsHeaders, 429);
      }
    } catch (rlErr) { console.warn("Rate-limit infra unavailable, failing open:", rlErr); }

    // Cache (language-scoped)
    const queryHash = await hashQuery(query + "||" + lang);
    const cached = await checkCache(queryHash);
    if (cached) {
      return jsonResponse({ text: cached.response_text, action: cached.response_action, cached: true }, corsHeaders);
    }

    // Heuristic action route (English imperative commands only)
    const actionTarget = detectAction(query, lang);
    if (actionTarget) {
      routeTaken = "action";
      const hint = (TARGET_HINTS[lang] || TARGET_HINTS.en)[actionTarget];
      const text = actionLead(lang, hint);
      return jsonResponse({ text, action: "TRIGGER_ACCOUNT_UI", action_target: actionTarget }, corsHeaders);
    }

    // Knowledge route: embed → vector search → verbatim localized FAQ answer
    routeTaken = "knowledge";
    let vector: number[];
    try {
      vector = await getEmbedding(query);
    } catch (err) {
      console.warn("Embedding unavailable — keyword fallback:", String((err as Error)?.message || err));
      routeTaken = "fallback_keyword";
      const text = await keywordFallback(query, lang);
      return jsonResponse({ text, action: null, degraded: true }, corsHeaders);
    }

    let topDocs: any[] = [];
    try {
      const { data: docs, error: searchErr } = await supabase.rpc("hybrid_search_faq", {
        query_text: query, query_embedding: vector, match_count: 4,
      });
      if (searchErr) console.error("DB Search Error:", searchErr);
      else topDocs = (docs || []).sort((a: any, b: any) => b.combined_score - a.combined_score).slice(0, 4);
    } catch (err) { console.error("DB Search threw:", err); }

    const topScore = topDocs.reduce((m: number, d: any) => Math.max(m, Number(d.similarity ?? 0)), 0);

    if (topScore < SIM_THRESHOLD) {
      routeTaken = "no_match";
      return jsonResponse({
        text: tr("noMatch", lang), action: null, confidence: Number(topScore.toFixed(3)),
        sources: topDocs.slice(0, 3).map((d: any) => ({ question: d.question, score: Number((d.similarity ?? 0).toFixed(3)) })),
      }, corsHeaders);
    }

    // Localize the matched answer (stored km/zh translation when present), then
    // return it verbatim. Pick the doc with the highest cosine similarity.
    topDocs = await applyStoredTranslations(topDocs, lang);
    const best = topDocs.reduce((a: any, b: any) => (Number(b.similarity ?? 0) > Number(a.similarity ?? 0) ? b : a), topDocs[0]);
    const note = (lang !== "en" && !best.translated) ? englishFallbackNote(lang) : "";
    const finalAnswer = note + String(best.answer || "");

    // Cache + telemetry (fire-and-forget)
    const cacheWrite = writeCache(queryHash, query, finalAnswer, null);
    const telemetry = supabase.from("agent_analytics").insert({
      user_query: query, route_taken: routeTaken, final_response: finalAnswer, latency_ms: Date.now() - startTime,
    }).then(({ error }: any) => { if (error) console.error("Telemetry Error:", error.message); });
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(Promise.all([cacheWrite, telemetry])); } catch {}

    return jsonResponse({
      text: finalAnswer, action: null, confidence: Number(topScore.toFixed(3)),
      sources: topDocs.slice(0, 3).map((d: any) => ({ question: d.question, score: Number((d.similarity ?? 0).toFixed(3)) })),
    }, corsHeaders);

  } catch (error) {
    console.error("Agent Critical Error:", error);
    return jsonResponse({ error: "Internal Error", text: tr("infra", lang), action: null }, corsHeaders, 500);
  }
});
