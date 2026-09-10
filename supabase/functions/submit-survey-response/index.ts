// supabase/functions/submit-survey-response/index.ts
//
// عمومی و بدونِ احراز هویت — تنها راهِ نوشتن در survey_responses. توکن، وضعیت،
// بازهٔ زمانی، سقفِ پاسخ و «الزامی‌بودنِ سؤال‌ها» سمتِ سرور بررسی می‌شوند.
// در حالتِ آزمون، نمره هم همین‌جا (با کلیدِ پاسخِ سمتِ سرور) محاسبه و ذخیره
// می‌شود — نه در مرورگر — تا قابلِ دستکاری نباشد.
//
// Deploy:
//   supabase functions deploy submit-survey-response --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const SCORABLE = ["single_choice", "multi_choice", "dropdown", "yes_no"];

function isEmpty(v: unknown) {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

// آینهٔ scoreExam در src/survey/surveyModel.js
function scoreExam(questions: any[], answers: Record<string, unknown>, passScore: number) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    if (!q || q.type === "section" || !SCORABLE.includes(q.type)) continue;
    const pts = Number(q.config?.points);
    const correct: string[] = Array.isArray(q.config?.correct) ? q.config.correct : [];
    if (!(pts > 0) || correct.length === 0) continue;
    maxScore += pts;
    const a = answers[q.id];
    let right = false;
    if (q.type === "multi_choice") {
      const got: string[] = Array.isArray(a) ? a : [];
      right = got.length === correct.length && correct.every((c) => got.includes(c));
    } else {
      right = a != null && a === correct[0];
    }
    if (right) score += pts;
  }
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percent, passed: maxScore > 0 && percent >= passScore };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400); }

  const token = String(body?.token || "").trim();
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : null;
  const respondentMeta = body?.respondentMeta && typeof body.respondentMeta === "object" ? body.respondentMeta : {};
  const source = ["link", "qr", "preview"].includes(body?.source) ? body.source : "link";
  if (!token) return json({ error: "لینک نامعتبر است" }, 400);
  if (!answers) return json({ error: "پاسخی ارسال نشده است" }, 400);

  try {
    const res = await restFetch(
      `surveys?public_token=eq.${encodeURIComponent(token)}&select=id,company_id,questions,settings,status,response_count`,
    );
    const s = res.ok && Array.isArray(res.data) && res.data.length ? res.data[0] : null;
    if (!s) return json({ error: "این لینک معتبر نیست" }, 404);
    if (s.status !== "active") return json({ error: "این نظرسنجی/آزمون دیگر فعال نیست" }, 410);

    const st = s.settings || {};
    const now = Date.now();
    if (st.startAt && now < Date.parse(st.startAt + "T00:00:00")) return json({ error: "زمانِ شروع هنوز نرسیده است" }, 410);
    if (st.endAt && now > Date.parse(st.endAt + "T23:59:59")) return json({ error: "مهلتِ پاسخ به پایان رسیده است" }, 410);
    if (st.maxResponses && Number(s.response_count) >= Number(st.maxResponses)) return json({ error: "ظرفیتِ پاسخ‌ها تکمیل شده است" }, 410);

    const questions = Array.isArray(s.questions) ? s.questions : [];
    for (const q of questions) {
      if (q?.type === "section") continue;
      if (q?.required && isEmpty(answers[q.id])) {
        return json({ error: "همه‌ی سؤال‌های الزامی باید پاسخ داده شوند" }, 400);
      }
    }

    const validIds = new Set(questions.filter((q: any) => q?.type !== "section").map((q: any) => q.id));
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) if (validIds.has(k)) clean[k] = v;

    const meta = st.anonymous !== false ? {} : {
      ...(st.collectName && typeof respondentMeta.name === "string" ? { name: String(respondentMeta.name).slice(0, 120) } : {}),
      ...(st.collectUnit && typeof respondentMeta.unit === "string" ? { unit: String(respondentMeta.unit).slice(0, 120) } : {}),
    };

    const isExam = st.mode === "exam";
    const sc = isExam ? scoreExam(questions, clean, Number(st.passScore) || 60) : null;

    const id = "sresp_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const row: Record<string, unknown> = {
      id, survey_id: s.id, company_id: s.company_id,
      answers: clean, respondent_meta: meta, source,
    };
    if (sc) { row.score = sc.score; row.max_score = sc.maxScore; row.percent = sc.percent; row.passed = sc.passed; }

    const inserted = await restFetch("survey_responses", { method: "POST", body: JSON.stringify([row]) });
    if (!inserted.ok) return json({ error: "خطا در ثبتِ پاسخ" }, 500);

    if (sc && st.showScoreToRespondent !== false) {
      return json({ ok: true, score: sc.score, maxScore: sc.maxScore, percent: sc.percent, passed: sc.passed });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
