import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./shared.js";
import { translate, getCurrentLang } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * درخواست «خرید مستقیم توسطِ بازدیدکننده» — روی صفحه‌ی عمومیِ «مشاهده
 * پلن‌ها برای خرید» (پیش از ورود)، بدون نیاز به حساب. ثبت از طریق Edge
 * Function عمومی submit-guest-purchase-request انجام می‌شود (دقیقاً همان
 * الگوی امنیتیِ submitTrialRequest) چون guest_purchase_requests هیچ RLS
 * policy ای برای anon/authenticated ندارد. بررسی/ساختِ شرکت فقط سمت
 * SuperAdmin است (نگاه کنید به superAdminApi.js).
 */
export async function submitGuestPurchaseRequest(fields) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-guest-purchase-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { __error: true, message: data?.error || tr("gprErrSubmit") };
    return { ok: true };
  } catch {
    return { __error: true, message: tr("saErrServerConn") };
  }
}
