// supabase/functions/survey-results-public/index.ts
//
// عمومی و بدونِ احراز هویت — خلاصهٔ *تجمیعیِ* نتایجِ یک نظرسنجی/آزمون را با
// results_token برمی‌گرداند، فقط اگر settings.shareResults روشن باشد. هیچ پاسخِ
// فردی، هیچ نام/واحدِ پاسخ‌دهنده و هیچ متنِ آزادِ پاسخ برنمی‌گردد.
//
// Deploy:
//   supabase functions deploy survey-results-public --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const CHOICE = ["single_choice", "multi_choice", "dropdown"];
const SCORABLE = ["single_choice", "multi_choice", "dropdown", "yes_no"];
const NUMERIC = ["rating", "linear_scale", "number"];

function isCorrect(q: any, a: unknown) {
  const correct: string[] = Array.isArray(q.config?.correct) ? q.config.correct : [];
  if (correct.length === 0) return null;
  if (q.type === "multi_choice") {
    const got: string[] = Array.isArray(a) ? a : [];
    return got.length === correct.length && correct.every((c) => got.includes(c));
  }
  return a != null && a === correct[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }
  const token = String(body?.token || "").trim();
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const sRes = await restFetch(`surveys?results_token=eq.${encodeURIComponent(token)}&select=id,title,description,questions,settings`);
    const s = sRes.ok && Array.isArray(sRes.data) && sRes.data.length ? sRes.data[0] : null;
    if (!s) return json({ error: "این لینک معتبر نیست" }, 404);
    const st = s.settings || {};
    if (!st.shareResults) return json({ error: "اشتراکِ نتایجِ این نظرسنجی خاموش است" }, 403);

    const rRes = await restFetch(`survey_responses?survey_id=eq.${encodeURIComponent(s.id)}&select=answers,percent,passed,submitted_at`);
    const responses: any[] = rRes.ok && Array.isArray(rRes.data) ? rRes.data : [];
    const questions: any[] = Array.isArray(s.questions) ? s.questions : [];
    const isExam = st.mode === "exam";

    const perQuestion = questions.filter((q) => q?.type !== "section").map((q) => {
      const vals = responses.map((r) => r.answers?.[q.id]).filter((v) => v != null && v !== "");
      const base: any = { id: q.id, title: q.title || "", type: q.type };
      if (CHOICE.includes(q.type)) {
        const counts: Record<string, number> = {};
        (q.config?.options || []).forEach((o: any) => { counts[o.id] = 0; });
        vals.forEach((v) => (Array.isArray(v) ? v : [v]).forEach((id) => { if (id in counts) counts[id] += 1; }));
        base.options = (q.config?.options || []).map((o: any) => ({ label: o.label || "", count: counts[o.id] || 0 }));
        base.total = vals.length;
      } else if (q.type === "yes_no") {
        const yes = vals.filter((v) => v === "yes").length;
        base.yes = yes; base.no = vals.length - yes; base.total = vals.length;
      } else if (NUMERIC.includes(q.type)) {
        const nums = vals.map(Number).filter((n) => !Number.isNaN(n));
        base.avg = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;
        base.min = nums.length ? Math.min(...nums) : null;
        base.max = nums.length ? Math.max(...nums) : null;
        base.count = nums.length;
      } else {
        base.count = vals.length; // متنِ آزاد: فقط شمارش، بدونِ محتوا
      }
      if (isExam && SCORABLE.includes(q.type) && (q.config?.correct || []).length > 0) {
        const graded = responses.filter((r) => r.answers?.[q.id] != null);
        const right = graded.filter((r) => isCorrect(q, r.answers[q.id])).length;
        base.correctRate = graded.length ? Math.round((right / graded.length) * 100) : 0;
      }
      return base;
    });

    const byDayMap: Record<string, number> = {};
    responses.forEach((r) => { const d = (r.submitted_at || "").slice(0, 10); if (d) byDayMap[d] = (byDayMap[d] || 0) + 1; });
    const trend = Object.keys(byDayMap).sort().map((day) => ({ day, count: byDayMap[day] }));

    let exam = null;
    if (isExam) {
      const scored = responses.filter((r) => r.percent != null);
      const pcts = scored.map((r) => r.percent);
      exam = {
        passScore: Number(st.passScore) || 60,
        count: scored.length,
        avg: scored.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / scored.length) : null,
        passRate: scored.length ? Math.round((scored.filter((r) => r.passed).length / scored.length) * 100) : null,
        high: scored.length ? Math.max(...pcts) : null,
        low: scored.length ? Math.min(...pcts) : null,
        buckets: [0, 1, 2, 3, 4].map((i) => ({ label: `${i * 20}–${i * 20 + 20}`, count: scored.filter((r) => Math.min(4, Math.floor(r.percent / 20)) === i).length })),
      };
    }

    return json({
      title: s.title || "",
      description: s.description || "",
      mode: isExam ? "exam" : "survey",
      responseCount: responses.length,
      perQuestion,
      trend,
      exam,
    });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
