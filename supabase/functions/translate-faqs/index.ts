import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONAL one-off: populates support_faqs.{question,answer}_{km,zh} with free
// machine translation via Google's public translate endpoint (no API key, no
// per-day cap — unlike Gemini). Brand/technical terms are masked with
// placeholders so they survive translation. Resumable: only touches FAQs still
// missing a translation, so re-run until {remaining: 0}:
//   curl -X POST ".../functions/v1/translate-faqs?limit=20"
//
// NOTE: machine quality — Chinese is good, Khmer is rougher; human review of the
// answer_km/answer_zh columns is recommended. Deploy with:
//   supabase functions deploy translate-faqs --no-verify-jwt
// Delete the deployment once the columns are populated + reviewed.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Longer terms first so e.g. "T.A Coin" is masked before any sub-token.
const PROTECT = ["T.A Coin", "KHQR", "Bakong", "ACLEDA", "ABA", "Wing", "SERC", "NBC", "KYC", "P2P", "OTP", "2FA"];
function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function mask(text: string): { masked: string; map: Array<[string, string]> } {
  let out = text;
  const map: Array<[string, string]> = [];
  PROTECT.forEach((term, i) => {
    const re = new RegExp(escapeRe(term), "g");
    if (re.test(out)) {
      const token = `MZ${i}ZM`;
      out = out.replace(re, token);
      map.push([token, term]);
    }
  });
  return { masked: out, map };
}
function unmask(text: string, map: Array<[string, string]>): string {
  let out = text;
  for (const [token, term] of map) {
    // Tolerate spaces/case the translator may inject into the token.
    const re = new RegExp(token.split("").join("\\s*"), "gi");
    out = out.replace(re, term);
  }
  return out;
}

async function gtrans(text: string, tl: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.status === 429 || r.status === 503) { await sleep(1000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`gtx ${r.status}: ${(await r.text()).slice(0, 80)}`);
    const data = await r.json();
    if (!Array.isArray(data?.[0])) throw new Error("unexpected gtx response");
    return (data[0] as any[]).map((seg) => seg?.[0] || "").join("");
  }
  throw new Error("gtx rate-limited after retries");
}

async function translateField(text: string, tl: string): Promise<string> {
  const { masked, map } = mask(String(text || ""));
  const translated = await gtrans(masked, tl);
  return unmask(translated, map);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const limit = Math.min(90, Math.max(1, parseInt(url.searchParams.get("limit") || "84", 10)));
  const gap = Math.max(0, parseInt(url.searchParams.get("gap") || "250", 10));
  try {
    const { data: faqs, error } = await supabase
      .from("support_faqs").select("id, question, answer")
      .eq("is_published", true)
      .or("answer_km.is.null,answer_km.eq.,answer_zh.is.null,answer_zh.eq.")
      .limit(limit);
    if (error) throw error;

    const results: any[] = [];
    for (const f of (faqs || [])) {
      try {
        const [qzh, azh, qkm, akm] = [
          await translateField(f.question, "zh-CN"),
          await translateField(f.answer, "zh-CN"),
          await translateField(f.question, "km"),
          await translateField(f.answer, "km"),
        ];
        const { error: upErr } = await supabase.from("support_faqs").update({
          question_zh: qzh, answer_zh: azh, question_km: qkm, answer_km: akm,
        }).eq("id", f.id);
        if (upErr) throw upErr;
        results.push({ id: f.id, ok: true });
      } catch (e) {
        results.push({ id: f.id, ok: false, error: String((e as Error)?.message || e) });
      }
      if (gap) await sleep(gap);
    }

    const { count: remaining } = await supabase
      .from("support_faqs").select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or("answer_km.is.null,answer_km.eq.,answer_zh.is.null,answer_zh.eq.");

    return new Response(JSON.stringify({
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).slice(0, 5),
      remaining: remaining ?? null,
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
