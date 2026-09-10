// supabase/functions/submit-survey-response/index.ts
//
// عمومی و بدونِ احراز هویت — تنها راهِ نوشتن در survey_responses (که RLS اش
// عمداً هیچ policy ای برای anon/authenticated ندارد). توکن، وضعیت، بازهٔ زمانی،
// سقفِ پاسخ و «الزامی‌بودنِ سؤال‌ها» سمتِ سرور هم بررسی می‌شوند.
//
// Deploy:
//   supabase functions deploy submit-survey-response --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

function isEmpty(v: unknown) {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
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
    if (s.status !== "active") return json({ error: "این نظرسنجی دیگر فعال نیست" }, 410);

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

    // فقط پاسخِ سؤال‌های واقعیِ همین پرسشنامه نگه داشته می‌شود
    const validIds = new Set(questions.filter((q: any) => q?.type !== "section").map((q: any) => q.id));
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) if (validIds.has(k)) clean[k] = v;

    const meta = st.anonymous !== false ? {} : {
      ...(st.collectName && typeof respondentMeta.name === "string" ? { name: String(respondentMeta.name).slice(0, 120) } : {}),
      ...(st.collectUnit && typeof respondentMeta.unit === "string" ? { unit: String(respondentMeta.unit).slice(0, 120) } : {}),
    };

    const id = "sresp_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const inserted = await restFetch("survey_responses", {
      method: "POST",
      body: JSON.stringify([{
        id, survey_id: s.id, company_id: s.company_id,
        answers: clean, respondent_meta: meta, source,
      }]),
    });
    if (!inserted.ok) return json({ error: "خطا در ثبتِ پاسخ" }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
