// supabase/functions/survey-response-public/index.ts
//
// عمومی و بدونِ احراز هویت — نتیجه‌ی یک پاسخِ مشخص را برمی‌گرداند تا خودِ ادمین
// بتواند لینکِ نتیجه‌ی یک شرکت‌کننده را برایِ خودِ همان شخص بفرستد. شناسه‌ی
// پاسخ (id ردیفِ survey_responses، حاصلِ crypto.randomUUID با ۸۰ بیت
// تصادفی‌بودن) خودش به‌عنوانِ توکنِ یکتا و غیرقابلِ‌حدس استفاده می‌شود — نیازی
// به ستونِ توکنِ جداگانه نیست. مثلِ survey-results-public، فقط اگر
// settings.shareResults روشن باشد کار می‌کند.
//
// Deploy:
//   supabase functions deploy survey-response-public --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const SCORABLE = ["single_choice", "multi_choice", "dropdown", "yes_no"];

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
  const responseId = String(body?.responseId || "").trim();
  if (!responseId) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const rRes = await restFetch(
      `survey_responses?id=eq.${encodeURIComponent(responseId)}&select=id,survey_id,answers,respondent_meta,score,max_score,percent,passed,submitted_at`,
    );
    const r = rRes.ok && Array.isArray(rRes.data) && rRes.data.length ? rRes.data[0] : null;
    if (!r) return json({ error: "این لینک معتبر نیست" }, 404);

    const sRes = await restFetch(`surveys?id=eq.${encodeURIComponent(r.survey_id)}&select=title,questions,settings`);
    const s = sRes.ok && Array.isArray(sRes.data) && sRes.data.length ? sRes.data[0] : null;
    if (!s) return json({ error: "این لینک معتبر نیست" }, 404);

    const st = s.settings || {};
    if (st.mode !== "exam") return json({ error: "این لینک معتبر نیست" }, 404);
    if (!st.shareResults) return json({ error: "اشتراکِ نتایجِ این آزمون خاموش است" }, 403);

    const questions: any[] = Array.isArray(s.questions) ? s.questions : [];
    const review = questions
      .filter((q) => q?.type !== "section" && SCORABLE.includes(q.type) && Array.isArray(q.config?.correct) && q.config.correct.length > 0)
      .map((q) => {
        const a = r.answers?.[q.id];
        const correct: string[] = q.config.correct;
        return {
          questionId: q.id,
          title: q.title || "",
          type: q.type,
          options: (q.config?.options || []).map((o: any) => ({ id: o.id, label: o.label || "" })),
          yourAnswer: a ?? null,
          correctAnswer: q.type === "multi_choice" ? correct : correct[0],
          correct: isCorrect(q, a),
        };
      });

    return json({
      title: s.title || "",
      name: st.collectName && r.respondent_meta?.name ? String(r.respondent_meta.name) : null,
      submittedAt: r.submitted_at,
      score: r.score,
      maxScore: r.max_score,
      percent: r.percent,
      passed: r.passed,
      passScore: Number(st.passScore) || 60,
      review,
    });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
