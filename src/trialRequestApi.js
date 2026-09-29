import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./shared.js";
import { translate, getCurrentLang } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

// نگاشتِ کدِ ماژول → کلیدِ ترجمه — مقدار ذخیره‌شده در trial_requests یک
// کدِ پایدار است، نه متنِ محلی‌شده؛ نمایش در فرم و پنل SuperAdmin با t()
export const TRIAL_MODULE_LABEL_KEYS = {
  anomaly: "trmModAnomaly", risk: "trmModRisk", personnel: "trmModPersonnel", proactive: "trmModProactive",
  incident: "trmModIncident", machinery: "trmModMachinery", scaffold: "trmModScaffold",
  dashboard: "trmModDashboard", chat_archive: "trmModChatArchive",
};
export const trialModuleLabel = (value) => (TRIAL_MODULE_LABEL_KEYS[value] ? tr(TRIAL_MODULE_LABEL_KEYS[value]) : value);

/**
 * «ارزیابی و پلن آزمایشی» — فرم عمومیِ صفحه‌ی ورود، بدون نیاز به ورود.
 * ثبت (submitTrialSignup) از طریق Edge Function عمومی submit-trial-signup
 * انجام می‌شود (همان الگوی امنیتیِ submitHseClimateResponse در
 * proactiveIndicators/proactiveIndicatorsApi.js) چون trial_requests هیچ
 * RLS policy ای برای anon/authenticated ندارد. برخلافِ نسخه‌ی قبلی (که فقط
 * یک سرنخِ منتظرِ بررسیِ دستیِ SuperAdmin ثبت می‌کرد)، این‌جا خودِ شرکت +
 * حساب کارفرما + حساب پیمانکار (هر دو با نام‌کاربری/رمزِ انتخابیِ خودِ
 * فرم) + دورهٔ آزمایشیِ ۳۰روزه با همه‌ی ماژول‌ها بلافاصله ساخته می‌شوند —
 * بدونِ فعال‌سازیِ دستی. یک ردیفِ trial_requests هم برایِ تاریخچه با
 * status='approved' ثبت می‌شود؛ صفحه‌ی بررسیِ دستیِ SuperAdmin دست‌نخورده
 * می‌ماند (برایِ سرنخ‌های احتمالیِ دیگر)، فقط این دکمه دیگر چیزی «در
 * انتظار» در آن نمی‌گذارد.
 */
export async function submitTrialSignup(fields) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-trial-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { __error: true, message: data?.error || tr("trmErrSubmit") };
    return {
      ok: true,
      companyName: data.companyName,
      employerUsername: data.employerUsername,
      contractorUsername: data.contractorUsername,
      trialEnd: data.trialEnd,
    };
  } catch {
    return { __error: true, message: tr("saErrServerConn") };
  }
}
