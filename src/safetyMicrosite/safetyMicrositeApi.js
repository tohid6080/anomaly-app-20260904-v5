import { sb, sbOk, uid, getCurrentCompanyId, SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_APP_URL } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

// فقط چهار آماره‌یِ واقعاً قابلِ‌محاسبه از دیتایِ موجود (نگاه کن به
// computeSafetyAggregates در Edge Function) — نه LTIFR/نرخِ آموزش/نرخِ
// بسته‌شدنِ اقدام‌ها که نیازمندِ دیتایِ موجود نیستند.
export const SHOWABLE_FIELDS = [
  { key: "openAnomaliesCount", labelKey: "smFieldOpenAnomalies" },
  { key: "overdueCorrectiveActionsCount", labelKey: "smFieldOverdueActions" },
  { key: "activePermitsCount", labelKey: "smFieldActivePermits" },
  { key: "daysSinceLastIncident", labelKey: "smFieldDaysSinceIncident" },
];
export const DEFAULT_SHOW_FIELDS = Object.fromEntries(SHOWABLE_FIELDS.map((f) => [f.key, true]));

function fromRow(r) {
  return {
    id: r.id,
    enabled: !!r.enabled,
    publicToken: r.public_token,
    displayName: r.display_name || "",
    showFields: r.show_fields || DEFAULT_SHOW_FIELDS,
  };
}

export async function loadMySafetyMicrosite() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return null;
  const rows = await sb(`company_safety_microsites?select=*&company_id=eq.${companyId}`);
  if (!sbOk(rows) || !rows.length) return null;
  return fromRow(rows[0]);
}

export async function saveSafetyMicrosite({ id, enabled, displayName, showFields }) {
  const payload = {
    enabled: !!enabled, display_name: displayName || "",
    show_fields: showFields || DEFAULT_SHOW_FIELDS, updated_at: new Date().toISOString(),
  };
  if (id) {
    const res = await offlineWrite({ module: "companySafetyMicrosites", table: "company_safety_microsites", action: "update", id, payload });
    if (!res?.ok) return { __error: true, message: res?.error || tr("smErrSave") };
    return { ok: true };
  }
  const newId = uid("safetysite");
  const res = await offlineWrite({
    module: "companySafetyMicrosites", table: "company_safety_microsites", action: "insert", id: newId,
    payload: { ...payload, company_id: getCurrentCompanyId() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("smErrSave") };
  return { ok: true, record: res.record };
}

export function buildSafetyReportLink(publicToken) {
  const base = PUBLIC_APP_URL.endsWith("/") ? PUBLIC_APP_URL : `${PUBLIC_APP_URL}/`;
  return `${base}#safety-report/${publicToken}`;
}

export async function loadPublicSafetyReport(token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-safety-microsite-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("smErrFetchInfo") };
    return data;
  } catch {
    return { __error: true, message: tr("smErrServer") };
  }
}
