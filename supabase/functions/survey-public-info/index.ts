// supabase/functions/survey-public-info/index.ts
//
// عمومی و بدونِ احراز هویت — ساختارِ یک پرسشنامه/آزمون را با public_token
// برمی‌گرداند، فقط اگر status='active' و در بازهٔ زمانی و زیرِ سقفِ پاسخ باشد.
// در حالتِ آزمون، «کلیدِ پاسخ» (config.correct / config.points) از خروجی حذف
// می‌شود تا در مرورگرِ پاسخ‌دهنده دیده نشود.
//
// Deploy:
//   supabase functions deploy survey-public-info --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

function stripAnswerKey(questions: any[]) {
  return (Array.isArray(questions) ? questions : []).map((q) => {
    if (!q || typeof q !== "object") return q;
    const cfg = { ...(q.config || {}) };
    delete cfg.correct;
    delete cfg.points;
    return { ...q, config: cfg };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }

  const token = String(body?.token || "").trim();
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);

  try {
    const res = await restFetch(
      `surveys?public_token=eq.${encodeURIComponent(token)}&select=id,title,description,questions,settings,status,response_count`,
    );
    const s = res.ok && Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    if (!s) return json({ error: "این لینک معتبر نیست" }, 404);
    if (s.status !== "active") return json({ error: "این نظرسنجی/آزمون در حالِ حاضر فعال نیست" }, 410);

    const st = s.settings || {};
    const now = Date.now();
    if (st.startAt && now < Date.parse(st.startAt + "T00:00:00")) return json({ error: "زمانِ شروع هنوز نرسیده است" }, 410);
    if (st.endAt && now > Date.parse(st.endAt + "T23:59:59")) return json({ error: "مهلتِ پاسخ به پایان رسیده است" }, 410);
    if (st.maxResponses && Number(s.response_count) >= Number(st.maxResponses)) return json({ error: "ظرفیتِ پاسخ‌ها تکمیل شده است" }, 410);

    const isExam = st.mode === "exam";

    return json({
      title: s.title || "",
      description: s.description || "",
      questions: isExam ? stripAnswerKey(s.questions) : (Array.isArray(s.questions) ? s.questions : []),
      settings: {
        mode: isExam ? "exam" : "survey",
        anonymous: st.anonymous !== false,
        collectName: !!st.collectName,
        collectUnit: !!st.collectUnit,
        onePerDevice: st.onePerDevice !== false,
        thankYouText: st.thankYouText || "",
        passScore: Number(st.passScore) || 60,
        showScoreToRespondent: st.showScoreToRespondent !== false,
        shuffleQuestions: !!st.shuffleQuestions,
        timeLimitMin: Number(st.timeLimitMin) > 0 ? Number(st.timeLimitMin) : null,
      },
    });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
