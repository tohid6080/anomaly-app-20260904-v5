import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./shared.js";

/**
 * درخواست‌های «ارزیابی و پلن آزمایشی» — فرم عمومیِ صفحه‌ی ورود، بدون نیاز
 * به ورود. ثبت (submitTrialRequest) از طریق Edge Function عمومی
 * submit-trial-request انجام می‌شود (دقیقاً همان الگوی امنیتیِ
 * submitHseClimateResponse در proactiveIndicators/proactiveIndicatorsApi.js)
 * چون trial_requests هیچ RLS policy ای برای anon/authenticated ندارد.
 * خواندن/تصمیم‌گیری فقط سمت SuperAdmin است (نگاه کنید به superAdminApi.js).
 */
export async function submitTrialRequest(fields) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-trial-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { __error: true, message: data?.error || "خطا در ثبت درخواست" };
    return { ok: true };
  } catch {
    return { __error: true, message: "خطا در برقراری ارتباط با سرور" };
  }
}
