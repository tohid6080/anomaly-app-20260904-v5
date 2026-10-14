// supabase/functions/submit-proposal-lead/index.ts
//
// عمومی و بدون نیاز به احرازِ هویت — فرمِ انتهاییِ صفحه‌ی مستقلِ
// public/proposal/ (پرپوزال تبلیغاتیِ IHMS). برخلافِ submit-trial-signup،
// اینجا هیچ شرکت/حسابِ واقعی ساخته نمی‌شود — فقط یک ردیفِ سرنخِ فروش در
// proposal_leads ثبت می‌شود تا تیمِ IHMS پیگیری کند.
//
// CAPTCHA (Cloudflare Turnstile) دقیقاً همان الگویِ submit-trial-signup —
// همان TURNSTILE_SECRET_KEY که قبلاً تنظیم شده (fail-closed اگر خالی باشد):
//   supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
//
// Deploy:
//   supabase functions deploy submit-proposal-lead --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const AUDIENCE_TYPES = ["employer", "contractor", "standalone", "hse_expert", ""];
const REQUEST_TYPES = ["consultation", "partnership", "pricing"];

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// تاییدِ CAPTCHA سمتِ سرور — عیناً همان تابعِ submit-trial-signup.
async function verifyTurnstileToken(token: string, remoteIp: string | null) {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (!secretKey) return { ok: false, reason: "TURNSTILE_SECRET_KEY تنظیم نشده است" };
  if (!token) return { ok: false, reason: "توکنِ CAPTCHA ارسال نشده است" };
  try {
    const form = new URLSearchParams();
    form.set("secret", secretKey);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => null);
    if (data?.success === true) return { ok: true };
    return { ok: false, reason: Array.isArray(data?.["error-codes"]) ? data["error-codes"].join(",") : "verify_failed" };
  } catch (e) {
    return { ok: false, reason: String((e as Error)?.message || e) };
  }
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

  const turnstileToken = String(body?.turnstileToken || "");
  const remoteIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
  const captcha = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!captcha.ok) {
    console.error("Turnstile verification failed:", captcha.reason);
    return json({ error: "تأییدِ ربات‌نبودن ناموفق بود — لطفاً دوباره تلاش کنید" }, 403);
  }

  const fullName = String(body?.fullName || "").trim();
  const companyName = String(body?.companyName || "").trim();
  const positionField = String(body?.position || "").trim();
  const phone = String(body?.phone || "").trim();
  const email = String(body?.email || "").trim();
  const audienceType = AUDIENCE_TYPES.includes(String(body?.audienceType || "")) ? String(body?.audienceType || "") : "";
  const requestType = String(body?.requestType || "");
  const message = String(body?.message || "").trim();

  if (!fullName || !companyName || !phone) {
    return json({ error: "نام، نامِ سازمان و شماره‌ی تماس اجباری‌اند" }, 400);
  }
  if (email && !isValidEmailFormat(email)) {
    return json({ error: "فرمتِ ایمیل نامعتبر است" }, 400);
  }
  if (!REQUEST_TYPES.includes(requestType)) {
    return json({ error: "نوعِ درخواست نامعتبر است" }, 400);
  }

  const insertRes = await restFetch("proposal_leads", {
    method: "POST",
    body: JSON.stringify([{
      full_name: fullName,
      company_name: companyName,
      position: positionField,
      phone,
      email,
      audience_type: audienceType,
      request_type: requestType,
      message,
    }]),
    headers: { Prefer: "return=minimal" },
  });

  if (!insertRes.ok) {
    console.error("proposal_leads insert failed:", insertRes.error);
    return json({ error: "ثبتِ درخواست ناموفق بود — لطفاً دوباره تلاش کنید" }, 500);
  }

  return json({ ok: true });
});
