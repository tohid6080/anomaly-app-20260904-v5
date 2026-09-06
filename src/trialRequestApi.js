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
    if (!res.ok || !data?.ok) return { __error: true, message: data?.error || tr("trmErrSubmit") };
    return { ok: true };
  } catch {
    return { __error: true, message: tr("saErrServerConn") };
  }
}
