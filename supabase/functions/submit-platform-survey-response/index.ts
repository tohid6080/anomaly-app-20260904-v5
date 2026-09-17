// supabase/functions/submit-platform-survey-response/index.ts
//
// عمومی و بدون نیاز به احراز هویت — تنها راهِ نوشتن در
// platform_survey_responses/platform_survey_impressions (که RLSشان عمداً
// هیچ policy ای برای anon/authenticated ندارد، دقیقاً همان الگویِ
// submit-trial-request/chat-visitor). چه بازدیدکننده‌ی ناشناسِ نوعِ
// public چه کاربرِ واردشده‌ی نوعِ welcome/event، از همین یک مسیر رد
// می‌شوند — هویتِ کاربرِ واردشده را کلاینت در بدنه می‌فرستد (حساسیتِ این
// داده — «آیا این نظرسنجی را دیده/پاسخ داده» — پایین است).
//
// Deploy:
//   supabase functions deploy submit-platform-survey-response --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const action = String(body?.action || "");
  const surveyId = String(body?.surveyId || "");
  if (!surveyId) return json({ error: "نظرسنجی نامعتبر است" }, 400);

  // ---------- ثبت/افزایشِ شمارنده‌ی نمایش (فقط کاربرِ واردشده) ----------
  if (action === "recordImpression") {
    const username = String(body?.username || "");
    if (!username) return json({ error: "شناسه‌ی کاربر نامعتبر است" }, 400);

    const existingRes = await restFetch(
      `platform_survey_impressions?survey_id=eq.${surveyId}&username=eq.${encodeURIComponent(username)}&select=id,shown_count,dismissed`
    );
    const existing = existingRes.ok && Array.isArray(existingRes.data) ? existingRes.data[0] : null;

    if (existing) {
      const newCount = (Number(existing.shown_count) || 0) + 1;
      await restFetch(`platform_survey_impressions?id=eq.${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ shown_count: newCount, last_shown_at: new Date().toISOString() }),
        headers: { Prefer: "return=minimal" },
      });
      return json({ shownCount: newCount, dismissed: existing.dismissed === true });
    }

    await restFetch("platform_survey_impressions", {
      method: "POST",
      body: JSON.stringify([{ survey_id: surveyId, username, shown_count: 1 }]),
      headers: { Prefer: "return=minimal" },
    });
    return json({ shownCount: 1, dismissed: false });
  }

  // ---------- ردِ نظرسنجی بدونِ پاسخ (فقط کاربرِ واردشده) ----------
  if (action === "dismiss") {
    const username = String(body?.username || "");
    if (!username) return json({ error: "شناسه‌ی کاربر نامعتبر است" }, 400);

    const existingRes = await restFetch(
      `platform_survey_impressions?survey_id=eq.${surveyId}&username=eq.${encodeURIComponent(username)}&select=id`
    );
    const existing = existingRes.ok && Array.isArray(existingRes.data) ? existingRes.data[0] : null;
    if (existing) {
      await restFetch(`platform_survey_impressions?id=eq.${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ dismissed: true }),
        headers: { Prefer: "return=minimal" },
      });
    } else {
      await restFetch("platform_survey_impressions", {
        method: "POST",
        body: JSON.stringify([{ survey_id: surveyId, username, shown_count: 1, dismissed: true }]),
        headers: { Prefer: "return=minimal" },
      });
    }
    return json({ ok: true });
  }

  // ---------- ثبتِ پاسخ ----------
  if (action === "submit") {
    const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
    const respondent = body?.respondent && typeof body.respondent === "object" ? body.respondent : {};
    const username = String(respondent.username || "");

    const surveyRes = await restFetch(`platform_surveys?id=eq.${surveyId}&status=eq.active&select=questions`);
    const survey = surveyRes.ok && Array.isArray(surveyRes.data) ? surveyRes.data[0] : null;
    if (!survey) return json({ error: "این نظرسنجی دیگر فعال نیست" }, 404);

    const questions = Array.isArray(survey.questions) ? survey.questions : [];
    for (const q of questions) {
      if (!q.required) continue;
      const value = answers[q.id];
      const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) return json({ error: `پاسخ به سؤالِ «${q.label || ""}» الزامی است` }, 400);
    }

    const payload = {
      survey_id: surveyId,
      respondent_username: username || null,
      respondent_role: respondent.role || null,
      respondent_company_id: respondent.companyId || null,
      answers,
    };
    const insertRes = await restFetch("platform_survey_responses", { method: "POST", body: JSON.stringify([payload]) });
    if (!insertRes.ok || !Array.isArray(insertRes.data) || insertRes.data.length === 0) {
      return json({ error: "خطا در ثبتِ پاسخ" }, 500);
    }

    if (username) {
      const existingRes = await restFetch(
        `platform_survey_impressions?survey_id=eq.${surveyId}&username=eq.${encodeURIComponent(username)}&select=id`
      );
      const existing = existingRes.ok && Array.isArray(existingRes.data) ? existingRes.data[0] : null;
      if (existing) {
        await restFetch(`platform_survey_impressions?id=eq.${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ dismissed: true }),
          headers: { Prefer: "return=minimal" },
        });
      } else {
        await restFetch("platform_survey_impressions", {
          method: "POST",
          body: JSON.stringify([{ survey_id: surveyId, username, shown_count: 1, dismissed: true }]),
          headers: { Prefer: "return=minimal" },
        });
      }
    }

    return json({ ok: true });
  }

  return json({ error: "عملیات نامعتبر است" }, 400);
});
