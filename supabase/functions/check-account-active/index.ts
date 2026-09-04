// supabase/functions/check-account-active/index.ts
//
// بررسی سمت‌سرور «آیا حساب کاربرِ واردشده هنوز فعال است؟» — پایه‌ی
// خروج اجباری (Forced Logout) وقتی Super Admin یک حساب را غیرفعال می‌کند.
//
// چرا Edge Function و نه فقط یک کوئری در Frontend:
//  - توکن نشست این پروژه یک JWT بدون‌حالت با عمر ۲۴ ساعت است؛ غیرفعال‌شدن
//    حساب در دیتابیس، توکن قبلی را باطل نمی‌کند. تا وقتی سازوکار انقضای
//    سمت‌سرور نداشته باشیم، «تصمیم» باید جایی گرفته شود که کلاینت نتواند
//    جعلش کند.
//  - این تابع امضای توکن فراخوان را واقعاً بررسی می‌کند (jwtUtils، همان
//    مسیر manage-account)، سپس با service_role مستقیم ستون is_active همان
//    حساب را می‌خواند. کلاینت نمی‌تواند پاسخ active=true را جعل کند.
//
// همیشه با HTTP 200 پاسخ می‌دهد تا مدیریت خطا در کلاینت ساده بماند؛
// نتیجه در فیلد active است. در صورت خطای گذرای دیتابیس، عمداً
// active=true برمی‌گرداند (fail-open) تا یک اختلال موقت شبکه/سرور کاربرِ
// معتبر را از سامانه بیرون نیندازد.
//
// Deploy:
//   supabase functions deploy check-account-active

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const TABLE_BY_ROLE: Record<string, string> = {
  admin: "employer_accounts",
  employer: "employer_accounts",
  hse_supervisor: "employer_accounts",
  contractor: "contractors",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  // توکن نامعتبر/منقضی/بدون امضا → حساب دیگر معتبر نیست؛ کلاینت باید خارج شود.
  if (!claims) return json({ active: false, reason: "invalid_token" });

  // Super Admin از این مسیر مدیریت نمی‌شود (پنل و توکن جدا).
  if (claims.is_super_admin === true || claims.app_role === "super_admin") {
    return json({ active: true });
  }

  const accountId = String(claims.sub || "");
  const table = TABLE_BY_ROLE[String(claims.app_role || "")] || "employer_accounts";
  if (!accountId) return json({ active: false, reason: "invalid_token" });

  const res = await restFetch(`${table}?id=eq.${encodeURIComponent(accountId)}&select=id,is_active`);
  if (!res.ok) {
    // خطای گذرای دیتابیس — کاربر را بیرون نمی‌اندازیم.
    return json({ active: true, reason: "check_failed" });
  }
  const rows = Array.isArray(res.data) ? res.data : [];
  if (rows.length === 0) {
    // حساب حذف شده — نشست قبلی نباید ادامه یابد.
    return json({ active: false, reason: "not_found" });
  }
  if (rows[0].is_active === false) {
    return json({ active: false, reason: "deactivated" });
  }
  return json({ active: true });
});
