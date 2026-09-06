import { sb, sbOk, getCurrentCompanyId } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * DBEE — Weight های قابل‌تنظیم. مقیاس هر وزن ۰ تا ۲ (۱=خنثی). این
 * تضمین می‌کند «امتیاز محاسباتی دستی قابل‌تغییر نباشد» — Admin هر شرکت
 * فقط وزن عامل‌ها را برای همان شرکت عوض می‌کند، هرگز عدد نهایی هیچ
 * Barrier ای را مستقیم. هر شرکت وزن‌دهی مستقل خودش را دارد (نه یک
 * تنظیم سراسری سوپرادمین) — طبق خواسته‌ی صریح.
 */

export const FACTOR_LABEL_KEYS = {
  frequency: "dbeeFactorFrequency", severity: "dbeeFactorSeverity", recurrence: "dbeeFactorRecurrence",
  criticality: "dbeeFactorCriticality", recency: "dbeeFactorRecency",
  source_anomaly: "dbeeFactorSrcAnomaly", source_capa: "dbeeFactorSrcCapa", source_incident: "dbeeFactorSrcIncident",
  source_tripod: "dbeeFactorSrcTripod", source_sbs: "dbeeFactorSrcSbs",
  source_hse_climate: "dbeeFactorSrcHseClimate", source_accident_proneness: "dbeeFactorSrcAccidentProneness",
};
export const factorLabel = (key) => tr(FACTOR_LABEL_KEYS[key] || key);

// خروجی: { factor_key: weight } — فقط برای شرکت جاری. اگر هنوز seed
// نشده باشد (حالت نظری، چون Trigger/seed اولیه این را پوشش می‌دهد)،
// map خالی برمی‌گردد و موتور محاسبه از پیش‌فرض ۱٫۰ استفاده می‌کند.
export async function loadWeights() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return {};
  const rows = await sb(`dbee_weights?company_id=eq.${companyId}&select=factor_key,weight`);
  if (!sbOk(rows)) return {};
  const map = {};
  rows.forEach((r) => { map[r.factor_key] = Number(r.weight); });
  return map;
}

// نسخه‌ی کامل (با id/updatedBy) برای UI مدیریت — فقط ردیف‌های همین شرکت
export async function loadCompanyWeights() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`dbee_weights?company_id=eq.${companyId}&select=*&order=factor_key.asc`);
  return sbOk(rows) ? rows.map((r) => ({ id: r.id, factorKey: r.factor_key, weight: Number(r.weight), updatedBy: r.updated_by || "", updatedAt: r.updated_at })) : [];
}

// نوشتن — RLS خودش تضمین می‌کند فقط Admin همین شرکت اجازه دارد (نگاه
// کنید به policy "company admin update" در SQL). طبق یک باگ واقعی که
// پیدا شد: اگر RLS این UPDATE را بی‌صدا مسدود کند (رفتار استاندارد
// PostgREST — درخواست HTTP موفق برمی‌گردد ولی نتیجه [] است، یعنی صفر
// ردیف واقعاً تغییر کرد)، این را صریحاً به‌عنوان خطا تشخیص می‌دهیم —
// نه یک «موفقیت» ساختگی که فقط باعث می‌شود کاربر فکر کند ذخیره شد.
export async function saveCompanyWeight(id, weight, updatedBy) {
  if (weight < 0 || weight > 2) return { __error: true, message: tr("dbeeWeightRange") };
  const rows = await sb(`dbee_weights?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ weight, updated_by: updatedBy || "", updated_at: new Date().toISOString() }) });
  if (!sbOk(rows)) return { __error: true, message: tr("dbeeErrSaveWeightAdminOnly") };
  if (rows.length === 0) return { __error: true, message: tr("dbeeErrSaveWeightNoAccess") };
  return { ok: true };
}
