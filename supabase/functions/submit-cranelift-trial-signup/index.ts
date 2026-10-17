// supabase/functions/submit-cranelift-trial-signup/index.ts
//
// عمومی و بدون نیاز به احراز هویت — صدا زده می‌شود از صفحه‌ی وبِ IHMS
// CraneLift 3D (میزبانیِ جدا، GitHub Pages) تا یک کاربرِ آزمایشیِ ۱روزه
// ثبت کند. برخلافِ submit-trial-signup (که یک شرکتِ کاملِ IHMS می‌سازد)،
// این تابع فقط یک ردیف در cranelift_trial_users می‌نویسد — بدونِ رمزِ
// عبور، بدونِ ساختِ شرکت/حساب. دوره‌ی آزمایشی ۱ روزه است.
//
// اگر همین شماره‌موبایل قبلاً ثبت‌نام کرده و دوره‌ی آزمایشی‌اش هنوز منقضی
// نشده، همان ردیفِ قبلی (با همان trial_expires_at) برگردانده می‌شود — نه
// یک دوره‌ی آزمایشیِ تازه — تا صرفِ بستن/بازکردنِ دوباره‌ی مرورگر باعثِ
// تمدیدِ نامحدودِ آزمایشی نشود.
//
// اعلانِ تلگرام/ایمیل — کاملاً اختیاری، همان secretهای مشترکِ
// submit-proposal-lead (اگر از قبل تنظیم شده‌اند، همین‌جا هم کار می‌کنند):
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxxx TELEGRAM_CHAT_ID=xxxx
//   supabase secrets set RESEND_API_KEY=xxxx NOTIFY_EMAIL_TO=you@example.com
//
// Deploy:
//   supabase functions deploy submit-cranelift-trial-signup --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";
import { sendTelegramNotification, sendEmailNotification } from "../_shared/notify.ts";

function isValidMobileFormat(phone: string) {
  return /^09\d{9}$/.test(phone);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const firstName = String(body?.firstName || "").trim();
  const lastName = String(body?.lastName || "").trim();
  const mobile = String(body?.mobile || "").trim();
  const companyName = String(body?.companyName || "").trim();

  if (!firstName || !lastName || !mobile) {
    return json({ error: "نام، نام‌خانوادگی و شماره موبایل الزامی است" }, 400);
  }
  if (!isValidMobileFormat(mobile)) {
    return json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, 400);
  }

  try {
    // اگر دوره‌ی آزمایشیِ قبلیِ همین شماره هنوز منقضی نشده، همان را برگردان.
    const existingRes = await restFetch(
      `cranelift_trial_users?mobile=eq.${encodeURIComponent(mobile)}&is_active=eq.true&select=id,trial_expires_at&order=created_at.desc&limit=1`
    );
    const existing = existingRes.ok && Array.isArray(existingRes.data) ? existingRes.data[0] : null;
    if (existing && new Date(existing.trial_expires_at).getTime() > Date.now()) {
      return json({ ok: true, trialExpiresAt: existing.trial_expires_at, alreadyRegistered: true });
    }

    const nowIso = new Date().toISOString();
    const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const insertRes = await restFetch("cranelift_trial_users", {
      method: "POST",
      body: JSON.stringify([{
        first_name: firstName, last_name: lastName, mobile, company_name: companyName,
        trial_started_at: nowIso, trial_expires_at: trialExpiresAt, is_active: true,
      }]),
    });
    if (!insertRes.ok || !Array.isArray(insertRes.data) || insertRes.data.length === 0) {
      return json({ error: "خطا در ثبتِ کاربرِ آزمایشی — لطفاً بعداً دوباره تلاش کنید" }, 500);
    }

    const summary = [
      "🏗️ ثبت‌نامِ تازه در نسخه‌ی آزمایشیِ وبِ IHMS CraneLift 3D",
      `نام: ${firstName} ${lastName}`,
      companyName ? `شرکت: ${companyName}` : null,
      `موبایل: ${mobile}`,
      `پایانِ دوره‌ی آزمایشی: ${trialExpiresAt}`,
    ].filter(Boolean).join("\n");
    await Promise.allSettled([
      sendTelegramNotification(summary),
      sendEmailNotification("ثبت‌نامِ تازه — CraneLift 3D", summary),
    ]);

    return json({ ok: true, trialExpiresAt, alreadyRegistered: false });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
