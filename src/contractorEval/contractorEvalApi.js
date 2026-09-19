import { sb, sbOk, getCurrentCompanyId, uid, THEME } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { daysUntil } from "../machinery/machineryApi.js";
import { isOverdue as caIsOverdue } from "../correctiveActions/correctiveActionsApi.js";
import { computeTripodCandidateFlag } from "../tripodBeta/incidentSource.js";
import { loadHseClimateAggregate } from "../proactiveIndicators/hseClimateCampaignsApi.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);
const norm = (s) => (s || "").trim().toLowerCase();

// هر جدول کلیدِ ماژولِ خودش را در MODULE_TABLE_MAP دارد (نه یک کلیدِ مشترک)
// — دقیقاً همان قراردادِ بقیه‌ی ماژول‌ها، چون offlineWrite این کلید را برای
// پارتیشن‌بندیِ کَشِ IndexedDB هم استفاده می‌کند و یک کلیدِ مشترک بینِ چند
// جدولِ مختلف، شناسه‌ها را با هم قاطی می‌کرد.
const MOD = {
  config: "contractorEvalConfig",
  settings: "contractorEvalSettings",
  indicatorSettings: "contractorEvalIndicatorSettings",
  customFields: "contractorEvalCustomFields",
  periods: "contractorEvalPeriods",
  records: "contractorEvalRecords",
};

/**
 * تعریفِ پیش‌فرضِ ماژول‌ها/شاخص‌ها — طراحی و Preview این ماژول قبلاً با
 * کاربر تأیید شد (HTML Preview جداگانه). این آرایه دقیقاً همان دسته‌ها و
 * فرمول‌هایی است که در آن Preview محاسبه و نمایش داده می‌شد، اینجا متصل به
 * نام‌های واقعی جدول/ستون. هیچ ردیفی برای این پیش‌فرض‌ها در دیتابیس Seed
 * نمی‌شود — یک شرکت فقط با ذخیره‌ی صریح در «تنظیمات ارزیابی» آن‌ها را
 * override می‌کند (همان الگویِ «خالی یعنی پیش‌فرض» که در system_module_config
 * هم استفاده شده).
 */
export const DEFAULT_CATEGORIES = [
  {
    key: "anomaly", weight: 15, active: true,
    label: { fa: "آنومالی (شرایط و اعمال ناایمن)", en: "Anomalies (Unsafe Conditions/Acts)", de: "Anomalien (unsichere Zustände/Handlungen)" },
    source: "anomalies",
    indicators: [
      { key: "closeRate", label: { fa: "درصد بسته‌شدن آنومالی‌ها", en: "Anomaly close rate", de: "Abschlussquote der Anomalien" }, unit: "%", target: 90, coeff: 45 },
      { key: "criticalOpen", label: { fa: "آنومالی‌های بحرانی (ریسک High) باز", en: "Open critical (High-risk) anomalies", de: "Offene kritische Anomalien" }, unit: "count", target: 0, lowerBetter: true, penalty: 20, coeff: 30 },
      { key: "avgCloseDays", label: { fa: "میانگین زمان بازماندن (روز)", en: "Average days open", de: "Durchschnittliche offene Tage" }, unit: "days", target: 15, lowerBetter: true, penalty: 6, coeff: 25 },
    ],
  },
  {
    key: "correctiveActions", weight: 15, active: true,
    label: { fa: "اقدامات اصلاحی", en: "Corrective Actions", de: "Korrekturmaßnahmen" },
    source: "corrective_actions",
    indicators: [
      { key: "onTime", label: { fa: "درصد بسته‌شدن به‌موقع", en: "On-time closure rate", de: "Pünktliche Abschlussquote" }, unit: "%", target: 85, coeff: 40 },
      { key: "overdue", label: { fa: "اقدامات معوق", en: "Overdue actions", de: "Überfällige Maßnahmen" }, unit: "count", target: 0, lowerBetter: true, penalty: 15, coeff: 35 },
      { key: "criticalOpen", label: { fa: "اقدامات بحرانی باز", en: "Open critical actions", de: "Offene kritische Maßnahmen" }, unit: "count", target: 0, lowerBetter: true, penalty: 25, coeff: 25 },
    ],
  },
  {
    key: "occHealth", weight: 10, active: true,
    label: { fa: "طب کار و سلامت شغلی", en: "Occupational Health", de: "Arbeitsmedizin" },
    source: "personnel",
    indicators: [
      { key: "completion", label: { fa: "درصد تکمیل طب کار", en: "Occ. health completion rate", de: "Abschlussquote Arbeitsmedizin" }, unit: "%", target: 100, coeff: 45 },
      { key: "expired", label: { fa: "نفرات منقضی‌شده", en: "Expired personnel", de: "Abgelaufene Mitarbeiter" }, unit: "count", target: 0, lowerBetter: true, penalty: 20, coeff: 30 },
      { key: "pending", label: { fa: "در انتظار مراجعه/نتیجه معاینه", en: "Pending visit/result", de: "Ausstehende Untersuchung/Ergebnis" }, unit: "count", target: 0, lowerBetter: true, penalty: 10, coeff: 25 },
    ],
  },
  {
    key: "training", weight: 10, active: true,
    label: { fa: "آموزش HSE", en: "HSE Training", de: "HSE-Schulung" },
    source: "training_requirements / personnel_documents",
    indicators: [
      { key: "compliance", label: { fa: "درصد تحقق آموزش الزامی", en: "Mandatory training compliance", de: "Pflichtschulungs-Erfüllung" }, unit: "%", target: 90, coeff: 65 },
      { key: "untrained", label: { fa: "نفرات آموزش‌ندیده", en: "Untrained personnel", de: "Ungeschulte Mitarbeiter" }, unit: "count", target: 0, lowerBetter: true, penalty: 12, coeff: 35 },
    ],
  },
  {
    key: "machinery", weight: 10, active: true,
    label: { fa: "مدیریت ماشین‌آلات و تجهیزات", en: "Machinery & Equipment", de: "Maschinen & Ausrüstung" },
    source: "machinery",
    indicators: [
      { key: "inspectionValid", label: { fa: "ماشین‌آلات دارای بازرسی معتبر", en: "Valid inspection rate", de: "Gültige Inspektionsquote" }, unit: "%", target: 100, coeff: 30 },
      { key: "insuranceValid", label: { fa: "ماشین‌آلات دارای بیمه معتبر", en: "Valid insurance rate", de: "Gültige Versicherungsquote" }, unit: "%", target: 100, coeff: 25 },
      { key: "nonConform", label: { fa: "تجهیزات دارای عدم انطباق باز", en: "Open non-conformances", de: "Offene Abweichungen" }, unit: "count", target: 0, lowerBetter: true, penalty: 15, coeff: 25 },
      { key: "licenseExpired", label: { fa: "گواهی رانندگان منقضی", en: "Expired driver licenses", de: "Abgelaufene Führerscheine" }, unit: "count", target: 0, lowerBetter: true, penalty: 20, coeff: 20 },
    ],
  },
  {
    key: "incidents", weight: 10, active: true,
    label: { fa: "مدیریت حوادث + RCA", en: "Incidents + RCA", de: "Vorfälle + RCA" },
    source: "incidents / tripod_analyses",
    indicators: [
      { key: "rca", label: { fa: "درصد تحلیل‌های RCA انجام‌شده", en: "RCA completion rate", de: "RCA-Abschlussquote" }, unit: "%", target: 100, coeff: 40 },
      { key: "openTripodCA", label: { fa: "اقدامات اصلاحیِ ناشی از حادثه، باز", en: "Open incident-derived actions", de: "Offene vorfallbedingte Maßnahmen" }, unit: "count", target: 0, lowerBetter: true, penalty: 18, coeff: 35 },
      { key: "delay", label: { fa: "میانگین تأخیر در تحلیل حادثه (روز)", en: "Average RCA delay (days)", de: "Durchschnittliche RCA-Verzögerung" }, unit: "days", target: 7, lowerBetter: true, penalty: 4, coeff: 25 },
    ],
  },
  {
    key: "proactive", weight: 10, active: true,
    label: { fa: "شاخص‌های پیشرو (Climate/SBS/استعداد حادثه)", en: "Proactive Indicators", de: "Proaktive Indikatoren" },
    source: "hse_climate_campaigns / sbs_* / proactive_indicator_assessments",
    indicators: [
      { key: "climate", label: { fa: "امتیاز HSE Climate (از ۹۰)", en: "HSE Climate score (of 90)", de: "HSE-Klima-Score (von 90)" }, unit: "score", target: 70, coeff: 35 },
      { key: "sbs", label: { fa: "درصد تحقق نمونه‌برداری SBS", en: "SBS sampling completion", de: "SBS-Stichproben-Erfüllung" }, unit: "%", target: 90, coeff: 35 },
      { key: "accidentProneRisk", label: { fa: "درصد پرسنل حساس با ریسک بالای استعداد حادثه", en: "% critical staff at high accident-proneness risk", de: "% Risikopersonal mit hoher Unfallneigung" }, unit: "%", target: 10, lowerBetter: true, penalty: 3, coeff: 30 },
    ],
  },
  {
    key: "pssr", weight: 10, active: true,
    label: { fa: "PSSR", en: "PSSR", de: "PSSR" },
    source: "pssr_action_items",
    indicators: [
      { key: "onTime", label: { fa: "درصد بسته‌شدن به‌موقع اقدامات PSSR", en: "PSSR on-time closure rate", de: "PSSR-Pünktliche Abschlussquote" }, unit: "%", target: 85, coeff: 40 },
      { key: "overdue", label: { fa: "اقدامات PSSR معوق", en: "Overdue PSSR actions", de: "Überfällige PSSR-Maßnahmen" }, unit: "count", target: 0, lowerBetter: true, penalty: 15, coeff: 35 },
      { key: "catA", label: { fa: "اقدامات دسته CAT_A باز", en: "Open CAT_A actions", de: "Offene CAT_A-Maßnahmen" }, unit: "count", target: 0, lowerBetter: true, penalty: 25, coeff: 25 },
    ],
  },
  {
    key: "scaffold", weight: 5, active: true,
    label: { fa: "مدیریت داربست", en: "Scaffold Management", de: "Gerüstmanagement" },
    source: "scaffold_tags",
    indicators: [
      { key: "validTag", label: { fa: "درصد تگ‌های داربست در وضعیت مجاز", en: "Valid scaffold tag rate", de: "Gültige Gerüst-Tag-Quote" }, unit: "%", target: 90, coeff: 60 },
      { key: "revisit", label: { fa: "داربست‌های نیازمند بازدید مجدد", en: "Scaffolds needing re-inspection", de: "Gerüste mit erneuter Prüfung nötig" }, unit: "count", target: 0, lowerBetter: true, penalty: 20, coeff: 40 },
    ],
  },
  {
    key: "risk", weight: 5, active: false,
    label: { fa: "مدیریت ریسک (HCMS/BowTie)", en: "Risk Management (HCMS/BowTie)", de: "Risikomanagement (HCMS/BowTie)" },
    source: "",
    naReason: "hcmsRiskNotContractorLinked", // کلید i18n — دلیل غیرفعال‌بودنِ پیش‌فرض
    indicators: [],
  },
];

function achievementPct(ind, actual) {
  if (actual == null || Number.isNaN(Number(actual))) return null;
  const a = Number(actual);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  if (ind.lowerBetter) {
    if (ind.target === 0) return clamp(100 - a * (ind.penalty || 18));
    return a <= ind.target ? 100 : clamp(100 - (a - ind.target) * (ind.penalty || 6));
  }
  if (!ind.target) return null;
  return clamp((a / ind.target) * 100);
}

export function tierOf(score, cfg) {
  const excellentMin = cfg?.excellentMin ?? 85;
  const goodMin = cfg?.goodMin ?? 70;
  const acceptableMin = cfg?.acceptableMin ?? 50;
  if (score >= excellentMin) return { key: "excellent", label: tr("evalTierExcellent"), color: THEME.ok };
  if (score >= goodMin) return { key: "good", label: tr("evalTierGood"), color: THEME.teal };
  if (score >= acceptableMin) return { key: "acceptable", label: tr("evalTierAcceptable"), color: THEME.warn };
  return { key: "poor", label: tr("evalTierPoor"), color: THEME.danger };
}

// ================================================================
// تنظیمات (Override) — بارگذاری/ذخیره + Audit Trail
// ================================================================
function configFromRow(r) {
  return {
    id: r.id,
    cadence: r.cadence || "quarterly",
    calcMethod: r.calc_method || "redistribute",
    excellentMin: Number(r.excellent_min ?? 85),
    goodMin: Number(r.good_min ?? 70),
    acceptableMin: Number(r.acceptable_min ?? 50),
    hseReviewDeadlineDays: Number(r.hse_review_deadline_days ?? 10),
    employerApprovalDeadlineDays: Number(r.employer_approval_deadline_days ?? 5),
  };
}
const DEFAULT_CONFIG = { cadence: "quarterly", calcMethod: "redistribute", excellentMin: 85, goodMin: 70, acceptableMin: 50, hseReviewDeadlineDays: 10, employerApprovalDeadlineDays: 5 };

export async function loadEvalConfig() {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`contractor_eval_config?company_id=eq.${companyId}&select=*&limit=1`);
  if (!sbOk(rows) || rows.length === 0) return { ...DEFAULT_CONFIG, id: null };
  return configFromRow(rows[0]);
}

export async function saveEvalConfig(patch, updatedBy) {
  const companyId = getCurrentCompanyId();
  const before = await loadEvalConfig();
  const dbPatch = {
    company_id: companyId,
    cadence: patch.cadence ?? before.cadence,
    calc_method: patch.calcMethod ?? before.calcMethod,
    excellent_min: patch.excellentMin ?? before.excellentMin,
    good_min: patch.goodMin ?? before.goodMin,
    acceptable_min: patch.acceptableMin ?? before.acceptableMin,
    hse_review_deadline_days: patch.hseReviewDeadlineDays ?? before.hseReviewDeadlineDays,
    employer_approval_deadline_days: patch.employerApprovalDeadlineDays ?? before.employerApprovalDeadlineDays,
    updated_by: updatedBy || "",
    updated_at: new Date().toISOString(),
  };
  const result = before.id
    ? await offlineWrite({ module: MOD.config, table: "contractor_eval_config", action: "update", id: before.id, payload: dbPatch })
    : await offlineWrite({ module: MOD.config, table: "contractor_eval_config", action: "insert", id: uid("evalcfg"), payload: dbPatch });
  if (result.ok) await writeAuditEntries(before, patch, updatedBy);
  return result;
}

async function writeAuditEntries(before, patch, changedBy) {
  const companyId = getCurrentCompanyId();
  const entries = [];
  for (const k of Object.keys(patch)) {
    if (before[k] !== undefined && String(before[k]) !== String(patch[k])) {
      entries.push({
        id: uid("evalaudit"),
        company_id: companyId,
        changed_by: changedBy || "",
        changed_at: new Date().toISOString(),
        field_changed: k,
        old_value: String(before[k] ?? ""),
        new_value: String(patch[k] ?? ""),
      });
    }
  }
  if (entries.length) await sb("contractor_eval_settings_audit", { method: "POST", body: JSON.stringify(entries) });
}

export async function loadEvalSettingsAudit(limit = 50) {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`contractor_eval_settings_audit?company_id=eq.${companyId}&select=*&order=changed_at.desc&limit=${limit}`);
  return sbOk(rows) ? rows : [];
}

/** وزنِ مؤثرِ هر ماژول = پیش‌فرض + Override شرکت (اگر ذخیره شده باشد). */
export async function loadEffectiveCategories() {
  const companyId = getCurrentCompanyId();
  const [weightRows, indRows] = await Promise.all([
    sb(`contractor_eval_settings?company_id=eq.${companyId}&select=*`),
    sb(`contractor_eval_indicator_settings?company_id=eq.${companyId}&select=*`),
  ]);
  const weightMap = {};
  if (sbOk(weightRows)) for (const r of weightRows) weightMap[r.category_key] = r;
  const indMap = {};
  if (sbOk(indRows)) for (const r of indRows) indMap[`${r.category_key}::${r.indicator_key}`] = r;

  const categories = DEFAULT_CATEGORIES.map((c) => {
    const w = weightMap[c.key];
    const indicators = c.indicators.map((ind) => {
      const o = indMap[`${c.key}::${ind.key}`];
      if (!o) return ind;
      return {
        ...ind,
        coeff: o.coefficient != null ? Number(o.coefficient) : ind.coeff,
        target: o.target_value != null ? Number(o.target_value) : ind.target,
        disabled: o.is_active === false,
      };
    }).filter((ind) => !ind.disabled);
    return {
      ...c,
      weight: w?.weight != null ? Number(w.weight) : c.weight,
      active: (w?.is_active != null ? w.is_active : c.active) && indicators.length > 0,
      indicators,
    };
  });

  // شاخص‌های سفارشیِ کارفرما (بندِ ۶ بریف) — به دسته‌ی مربوطه اضافه می‌شوند
  const customs = sbOk(indRows) ? indRows.filter((r) => r.is_custom) : [];
  for (const c of customs) {
    const cat = categories.find((x) => x.key === c.category_key);
    if (!cat) continue;
    cat.indicators.push({
      key: c.indicator_key, custom: true,
      label: { fa: c.label_fa, en: c.label_en || c.label_fa, de: c.label_de || c.label_en || c.label_fa },
      unit: "%", target: Number(c.target_value ?? 100), coeff: Number(c.coefficient ?? 0),
    });
  }
  return categories;
}

export async function saveCategoryWeight(categoryKey, weight, updatedBy) {
  const companyId = getCurrentCompanyId();
  const existing = await sb(`contractor_eval_settings?company_id=eq.${companyId}&category_key=eq.${categoryKey}&select=id`);
  const payload = { company_id: companyId, category_key: categoryKey, weight, is_active: true, updated_by: updatedBy || "", updated_at: new Date().toISOString() };
  const id = sbOk(existing) && existing[0] ? existing[0].id : uid("evalw");
  const action = sbOk(existing) && existing[0] ? "update" : "insert";
  const before = { weight: DEFAULT_CATEGORIES.find((c) => c.key === categoryKey)?.weight };
  const result = await offlineWrite({ module: MOD.settings, table: "contractor_eval_settings", action, id, payload });
  if (result.ok) await writeAuditEntries(before, { weight: `${categoryKey}=${weight}` }, updatedBy);
  return result;
}

export async function saveIndicatorSetting(categoryKey, indicatorKey, patch, updatedBy) {
  const companyId = getCurrentCompanyId();
  const existing = await sb(`contractor_eval_indicator_settings?company_id=eq.${companyId}&category_key=eq.${categoryKey}&indicator_key=eq.${indicatorKey}&select=id`);
  const payload = {
    company_id: companyId, category_key: categoryKey, indicator_key: indicatorKey,
    coefficient: patch.coefficient, target_value: patch.targetValue, is_active: patch.isActive !== false,
    is_custom: !!patch.isCustom, label_fa: patch.labelFa || "", label_en: patch.labelEn || "", label_de: patch.labelDe || "",
    updated_by: updatedBy || "", updated_at: new Date().toISOString(),
  };
  const id = sbOk(existing) && existing[0] ? existing[0].id : uid("evalind");
  const action = sbOk(existing) && existing[0] ? "update" : "insert";
  return offlineWrite({ module: MOD.indicatorSettings, table: "contractor_eval_indicator_settings", action, id, payload });
}

export async function addCustomField(categoryKey, field, createdBy) {
  const companyId = getCurrentCompanyId();
  const payload = {
    company_id: companyId, category_key: categoryKey, field_key: field.key || uid("f"),
    label_fa: field.labelFa || "", label_en: field.labelEn || "", label_de: field.labelDe || "",
    field_type: field.type || "number", coefficient: field.coefficient || 0, is_active: true, created_by: createdBy || "",
  };
  return offlineWrite({ module: MOD.customFields, table: "contractor_eval_custom_fields", action: "insert", id: uid("evalfield"), payload });
}

export async function loadCustomFields() {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`contractor_eval_custom_fields?company_id=eq.${companyId}&is_active=eq.true&select=*`);
  return sbOk(rows) ? rows : [];
}

// ================================================================
// دوره‌های ارزیابی
// ================================================================
const CADENCE_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

export function nextPeriodRange(cadence, anchorDate = new Date()) {
  const months = CADENCE_MONTHS[cadence] || 3;
  const start = new Date(anchorDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function loadEvalPeriods() {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`contractor_eval_periods?company_id=eq.${companyId}&select=*&order=period_start.desc`);
  return sbOk(rows) ? rows : [];
}

export async function createEvalPeriod({ title, cadence, periodStart, periodEnd }, createdBy) {
  const companyId = getCurrentCompanyId();
  const payload = {
    company_id: companyId, title: title || "", cadence: cadence || "quarterly",
    period_start: periodStart, period_end: periodEnd, status: "active", created_by: createdBy || "",
  };
  return offlineWrite({ module: MOD.periods, table: "contractor_eval_periods", action: "insert", id: uid("evalperiod"), payload });
}

export async function getOrCreateEvalRecord(periodId, contractorId, createdBy) {
  const companyId = getCurrentCompanyId();
  const existing = await sb(`contractor_eval_records?period_id=eq.${periodId}&contractor_id=eq.${contractorId}&select=*&limit=1`);
  if (sbOk(existing) && existing[0]) return existing[0];
  const payload = { period_id: periodId, company_id: companyId, contractor_id: contractorId, status: "draft", created_by: createdBy || "" };
  const result = await offlineWrite({ module: MOD.records, table: "contractor_eval_records", action: "insert", id: uid("evalrec"), payload });
  return result.ok ? result.record : null;
}

export async function loadEvalRecordsForPeriod(periodId) {
  const rows = await sb(`contractor_eval_records?period_id=eq.${periodId}&select=*,contractors(name)&order=total_score.desc`);
  return sbOk(rows) ? rows : [];
}

export async function loadEvalHistoryForContractor(contractorId, limit = 6) {
  const companyId = getCurrentCompanyId();
  const rows = await sb(
    `contractor_eval_records?contractor_id=eq.${contractorId}&company_id=eq.${companyId}&status=eq.final&select=*,contractor_eval_periods(title,period_start,period_end)&order=finalized_at.desc&limit=${limit}`
  );
  return sbOk(rows) ? rows.reverse() : [];
}

export async function loadEvalRecordDetail(recordId) {
  const [recRows, catRows, indRows, fieldRows] = await Promise.all([
    sb(`contractor_eval_records?id=eq.${recordId}&select=*,contractors(name),contractor_eval_periods(title,period_start,period_end,cadence)`),
    sb(`contractor_eval_category_scores?eval_record_id=eq.${recordId}&select=*`),
    sb(`contractor_eval_indicator_results?eval_record_id=eq.${recordId}&select=*`),
    sb(`contractor_eval_custom_field_values?eval_record_id=eq.${recordId}&select=*`),
  ]);
  return {
    record: sbOk(recRows) && recRows[0] ? recRows[0] : null,
    categoryScores: sbOk(catRows) ? catRows : [],
    indicatorResults: sbOk(indRows) ? indRows : [],
    customFieldValues: sbOk(fieldRows) ? fieldRows : [],
  };
}

// ================================================================
// جمع‌آوریِ خودکارِ داده از ماژول‌های واقعی IHMS
// ================================================================
async function gatherAnomalyMetrics(companyId, contractorName) {
  const rows = await sb(`anomalies?company_id=eq.${companyId}&select=status,risk_level,created_at,close_date,contractor`);
  const mine = sbOk(rows) ? rows.filter((r) => norm(r.contractor) === norm(contractorName)) : [];
  if (mine.length === 0) return null;
  const closed = mine.filter((r) => r.status === "Closed");
  const closeRate = Math.round((closed.length / mine.length) * 100);
  const criticalOpen = mine.filter((r) => r.status !== "Closed" && r.risk_level === "High").length;
  const closeDays = closed
    .filter((r) => r.created_at && r.close_date)
    .map((r) => Math.max(0, (new Date(r.close_date) - new Date(r.created_at)) / 86400000));
  const avgCloseDays = closeDays.length ? Math.round(closeDays.reduce((a, b) => a + b, 0) / closeDays.length) : 0;
  return { closeRate, criticalOpen, avgCloseDays };
}

async function gatherCorrectiveActionMetrics(companyId, contractorId, contractorName) {
  const rows = await sb(`corrective_actions?company_id=eq.${companyId}&select=status,priority,due_date,completed_at,responsible_contractor_id,responsible_contractor_name`);
  if (!sbOk(rows)) return null;
  const mine = rows.filter((r) => r.responsible_contractor_id === contractorId || norm(r.responsible_contractor_name) === norm(contractorName));
  if (mine.length === 0) return null;
  const closable = mine.filter((r) => r.status !== "expired");
  const closed = closable.filter((r) => r.status === "closed");
  const onTime = closable.length ? Math.round((closed.length / closable.length) * 100) : 100;
  const overdue = mine.filter((r) => caIsOverdue({ dueDate: r.due_date, status: r.status })).length;
  const criticalOpen = mine.filter((r) => r.priority === "critical" && r.status !== "closed" && r.status !== "expired").length;
  return { onTime, overdue, criticalOpen };
}

async function gatherOccHealthMetrics(companyId, contractorId) {
  const rows = await sb(`personnel?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&employment_status=eq.active&select=occ_health_path,status`);
  if (!sbOk(rows) || rows.length === 0) return null;
  const completed = rows.filter((r) => r.occ_health_path === "has_certificate").length;
  const completion = Math.round((completed / rows.length) * 100);
  const expired = rows.filter((r) => r.status === "health_expired").length;
  const pending = rows.filter((r) => r.status === "pending_health_visit" || r.status === "pending_health_result").length;
  return { completion, expired, pending };
}

async function gatherTrainingMetrics(companyId, contractorId) {
  const personnelRows = await sb(`personnel?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&employment_status=eq.active&select=id,job_title`);
  if (!sbOk(personnelRows) || personnelRows.length === 0) return null;
  const jobTitles = [...new Set(personnelRows.map((p) => p.job_title).filter(Boolean))];
  if (jobTitles.length === 0) return null;
  const posFilter = jobTitles.map((t) => `"${t.replace(/"/g, "")}"`).join(",");
  const positions = await sb(`job_positions?company_id=eq.${companyId}&title=in.(${posFilter})&select=id,title`);
  const posIds = sbOk(positions) ? positions.map((p) => p.id) : [];
  if (posIds.length === 0) return null;
  const reqs = await sb(`training_requirements?company_id=eq.${companyId}&job_position_id=in.(${posIds.join(",")})&select=job_position_id,training_id`);
  if (!sbOk(reqs) || reqs.length === 0) return null;

  const posByTitle = {};
  for (const p of sbOk(positions) ? positions : []) posByTitle[p.title] = p.id;
  const reqsByPos = {};
  for (const r of reqs) (reqsByPos[r.job_position_id] ||= []).push(r.training_id);

  const personnelIds = personnelRows.map((p) => p.id);
  const docs = await sb(
    `personnel_documents?personnel_id=in.(${personnelIds.join(",")})&doc_type=eq.specialized_safety_training&select=personnel_id,training_id,status`
  );
  const approvedByPersonTraining = new Set(
    (sbOk(docs) ? docs : []).filter((d) => d.status === "approved").map((d) => `${d.personnel_id}::${d.training_id}`)
  );

  let required = 0, done = 0, untrainedPeople = new Set();
  for (const p of personnelRows) {
    const posId = posByTitle[p.job_title];
    const need = posId ? reqsByPos[posId] || [] : [];
    for (const trainingId of need) {
      required += 1;
      if (approvedByPersonTraining.has(`${p.id}::${trainingId}`)) done += 1;
      else untrainedPeople.add(p.id);
    }
  }
  if (required === 0) return null;
  return { compliance: Math.round((done / required) * 100), untrained: untrainedPeople.size };
}

async function gatherMachineryMetrics(companyId, contractorId) {
  const rows = await sb(`machinery?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&traffic_status=eq.active&select=insurance_expiry,inspection_expiry,driver_license_expiry,approval_status`);
  if (!sbOk(rows) || rows.length === 0) return null;
  const validInspection = rows.filter((r) => (daysUntil(r.inspection_expiry) ?? -1) >= 0).length;
  const validInsurance = rows.filter((r) => (daysUntil(r.insurance_expiry) ?? -1) >= 0).length;
  const nonConform = rows.filter((r) => r.approval_status === "needs_correction" || r.approval_status === "rejected").length;
  const licenseExpired = rows.filter((r) => r.driver_license_expiry && (daysUntil(r.driver_license_expiry) ?? 0) < 0).length;
  return {
    inspectionValid: Math.round((validInspection / rows.length) * 100),
    insuranceValid: Math.round((validInsurance / rows.length) * 100),
    nonConform, licenseExpired,
  };
}

async function gatherIncidentMetrics(companyId, contractorName) {
  const rows = await sb(`incidents?company_id=eq.${companyId}&select=id,occurred_at,is_disabling,lost_days,contractor_org`);
  const mine = sbOk(rows) ? rows.filter((r) => norm(r.contractor_org) === norm(contractorName)) : [];
  if (mine.length === 0) return null;
  const rcaRequired = mine.filter(computeTripodCandidateFlag);
  let rca = 100, delay = 0, openTripodCA = 0;
  if (rcaRequired.length > 0) {
    const ids = rcaRequired.map((i) => i.id);
    const analyses = await sb(`tripod_analyses?incident_id=in.(${ids.join(",")})&select=id,incident_id,status,created_at`);
    const done = sbOk(analyses) ? analyses.filter((a) => a.status === "APPROVED" || a.status === "FINAL") : [];
    rca = Math.round((done.length / rcaRequired.length) * 100);
    const delays = done
      .map((a) => {
        const inc = rcaRequired.find((i) => i.id === a.incident_id);
        return inc?.occurred_at ? Math.max(0, (new Date(a.created_at) - new Date(inc.occurred_at)) / 86400000) : null;
      })
      .filter((d) => d != null);
    delay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
    if (sbOk(analyses) && analyses.length) {
      const analysisIds = analyses.map((a) => a.id);
      const tca = await sb(`tripod_corrective_actions?analysis_id=in.(${analysisIds.join(",")})&select=status`);
      openTripodCA = sbOk(tca) ? tca.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length : 0;
    }
  }
  return { rca, openTripodCA, delay };
}

async function gatherProactiveMetrics(companyId, contractorId, contractorName) {
  const out = {};
  try {
    const climate = await loadHseClimateAggregate({ contractorId });
    if (climate?.averageTotal != null) out.climate = Math.round(climate.averageTotal);
  } catch { /* اختیاری — نبودِ کمپینِ فعال برای این پیمانکار خطا نیست */ }

  const assignments = await sb(`sbs_sample_size_assignments?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&select=total_sample_size&order=created_at.desc&limit=1`);
  if (sbOk(assignments) && assignments[0]?.total_sample_size) {
    const target = assignments[0].total_sample_size;
    const obs = await sb(`sbs_observations?company_id=eq.${companyId}&select=contractor_org`);
    const done = sbOk(obs) ? obs.filter((o) => norm(o.contractor_org) === norm(contractorName)).length : 0;
    out.sbs = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : null;
  }

  const personnelRows = await sb(`personnel?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&employment_status=eq.active&select=id`);
  const personnelIds = sbOk(personnelRows) ? personnelRows.map((p) => p.id) : [];
  if (personnelIds.length) {
    const assess = await sb(`proactive_indicator_assessments?indicator_key=eq.accident_proneness&personnel_id=in.(${personnelIds.join(",")})&select=personnel_id,total_level&order=assessment_date.desc`);
    if (sbOk(assess) && assess.length) {
      const latestByPerson = {};
      for (const a of assess) if (!latestByPerson[a.personnel_id]) latestByPerson[a.personnel_id] = a.total_level;
      const values = Object.values(latestByPerson);
      const highRisk = values.filter((lvl) => lvl === "high" || lvl === "veryHigh" || lvl === "very_high").length;
      out.accidentProneRisk = Math.round((highRisk / values.length) * 100);
    }
  }
  return Object.keys(out).length ? out : null;
}

async function gatherPssrMetrics(companyId, contractorId) {
  const rows = await sb(`pssr_action_items?company_id=eq.${companyId}&responsible_contractor_id=eq.${contractorId}&select=status,due_date,cat`);
  if (!sbOk(rows) || rows.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const closable = rows; // همه‌ی اقدامات (بدونِ حالتِ expired جدا در این ماژول)
  const closed = closable.filter((r) => r.status === "closed").length;
  const onTime = closable.length ? Math.round((closed / closable.length) * 100) : 100;
  const overdue = rows.filter((r) => r.status !== "closed" && r.due_date && r.due_date < today).length;
  const catA = rows.filter((r) => r.status !== "closed" && r.cat === "CAT_A").length;
  return { onTime, overdue, catA };
}

async function gatherScaffoldMetrics(companyId, contractorId) {
  const rows = await sb(`scaffold_tags?company_id=eq.${companyId}&contractor_id=eq.${contractorId}&select=status`);
  if (!sbOk(rows) || rows.length === 0) return null;
  const valid = rows.filter((r) => r.status === "tag_issued" || r.status === "removed").length;
  const revisit = rows.filter((r) => r.status === "needs_correction").length;
  return { validTag: Math.round((valid / rows.length) * 100), revisit };
}

const GATHERERS = {
  anomaly: (ctx) => gatherAnomalyMetrics(ctx.companyId, ctx.contractorName),
  correctiveActions: (ctx) => gatherCorrectiveActionMetrics(ctx.companyId, ctx.contractorId, ctx.contractorName),
  occHealth: (ctx) => gatherOccHealthMetrics(ctx.companyId, ctx.contractorId),
  training: (ctx) => gatherTrainingMetrics(ctx.companyId, ctx.contractorId),
  machinery: (ctx) => gatherMachineryMetrics(ctx.companyId, ctx.contractorId),
  incidents: (ctx) => gatherIncidentMetrics(ctx.companyId, ctx.contractorName),
  proactive: (ctx) => gatherProactiveMetrics(ctx.companyId, ctx.contractorId, ctx.contractorName),
  pssr: (ctx) => gatherPssrMetrics(ctx.companyId, ctx.contractorId),
  scaffold: (ctx) => gatherScaffoldMetrics(ctx.companyId, ctx.contractorId),
};

// ================================================================
// محاسبه‌ی امتیاز — «جمع‌آوری خودکار → محاسبه» در Workflow
// ================================================================
export async function calculateEvalRecord(recordId, calculatedBy) {
  const companyId = getCurrentCompanyId();
  const [recRows, categories, config] = await Promise.all([
    sb(`contractor_eval_records?id=eq.${recordId}&select=*,contractors(id,name)`),
    loadEffectiveCategories(),
    loadEvalConfig(),
  ]);
  const record = sbOk(recRows) && recRows[0] ? recRows[0] : null;
  if (!record) return { ok: false, error: tr("evalErrRecordNotFound") };
  const contractorId = record.contractor_id;
  const contractorName = record.contractors?.name || "";
  const ctx = { companyId, contractorId, contractorName };

  const metricsByCategory = {};
  for (const c of categories.filter((c) => c.active)) {
    metricsByCategory[c.key] = await GATHERERS[c.key] ? await GATHERERS[c.key](ctx) : null;
  }

  const activeCats = categories.filter((c) => c.active);
  const applicableCats = activeCats.filter((c) => metricsByCategory[c.key] != null);
  const naCats = activeCats.filter((c) => metricsByCategory[c.key] == null);
  const inactiveCats = categories.filter((c) => !c.active);

  const weightPool = applicableCats.reduce((s, c) => s + c.weight, 0);
  const redistFactor = config.calcMethod === "full_score" ? 1 : (weightPool > 0 ? 100 / weightPool : 1);

  const categoryScoreRows = [];
  const indicatorRows = [];
  let total = 0;

  for (const c of activeCats) {
    const metrics = metricsByCategory[c.key];
    const isApplicable = metrics != null;
    let raw = null, effWeight = 0, contribution = 0;
    if (isApplicable) {
      raw = 0;
      for (const ind of c.indicators) {
        const actual = metrics[ind.key];
        const ach = achievementPct(ind, actual);
        const points = ach == null ? null : ach * (ind.coeff / 100);
        if (points != null) raw += points;
        indicatorRows.push({
          id: uid("evalindr"), eval_record_id: recordId, company_id: companyId,
          category_key: c.key, indicator_key: ind.key,
          actual_value: actual ?? null, target_value: ind.target ?? null, achievement_pct: ach,
          coefficient: ind.coeff, points_earned: points, source_module: c.source, source_note: "",
        });
      }
      raw = Math.round(raw * 10) / 10;
      effWeight = config.calcMethod === "full_score" ? c.weight : c.weight * redistFactor;
      contribution = (raw * effWeight) / 100;
      total += contribution;
    }
    categoryScoreRows.push({
      id: uid("evalcat"), eval_record_id: recordId, company_id: companyId, category_key: c.key,
      weight_applied: effWeight, raw_score: raw, weighted_contribution: contribution,
      is_applicable: isApplicable, na_reason: isApplicable ? "" : "noContractorData",
    });
  }
  for (const c of inactiveCats) {
    categoryScoreRows.push({
      id: uid("evalcat"), eval_record_id: recordId, company_id: companyId, category_key: c.key,
      weight_applied: 0, raw_score: null, weighted_contribution: 0, is_applicable: false,
      na_reason: c.naReason || "categoryDisabled",
    });
  }

  total = Math.round(total * 10) / 10;
  const tier = tierOf(total, config);

  await sb("contractor_eval_category_scores", { method: "POST", body: JSON.stringify(categoryScoreRows) });
  if (indicatorRows.length) await sb("contractor_eval_indicator_results", { method: "POST", body: JSON.stringify(indicatorRows) });

  const updateResult = await offlineWrite({
    module: MOD.records, table: "contractor_eval_records", action: "update", id: recordId,
    payload: { status: "calculated", total_score: total, level: tier.key, calculated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });
  return { ok: updateResult.ok, total, tier, naCategories: naCats.map((c) => c.key) };
}

// ================================================================
// Workflow: بررسی سرپرست HSE → تأیید کارفرما → نهایی‌شدن / بازگشت برای اصلاح
// ================================================================
export async function submitHseReview(recordId, note, reviewedBy) {
  return offlineWrite({
    module: MOD.records, table: "contractor_eval_records", action: "update", id: recordId,
    payload: { status: "employer_review", hse_reviewed_by: reviewedBy || "", hse_reviewed_at: new Date().toISOString(), hse_review_note: note || "", updated_at: new Date().toISOString() },
  });
}

export async function approveByEmployer(recordId, note, approvedBy) {
  return offlineWrite({
    module: MOD.records, table: "contractor_eval_records", action: "update", id: recordId,
    payload: {
      status: "final", employer_approved_by: approvedBy || "", employer_approved_at: new Date().toISOString(),
      employer_note: note || "", finalized_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  });
}

export async function returnForCorrection(recordId, note, by) {
  return offlineWrite({
    module: MOD.records, table: "contractor_eval_records", action: "update", id: recordId,
    payload: { status: "returned", return_note: note || "", updated_at: new Date().toISOString() },
  });
}

// دسترسیِ پیمانکار به ارزیابیِ خودش — فقط رکوردهایِ «نهایی»، فیلترشده در
// همین لایه (نه RLS) چون در کلِ این پروژه محدودیتِ per-contractor همین‌جا
// اعمال می‌شود، نه سطحِ دیتابیس (رجوع به یادداشتِ Migration).
export async function loadOwnFinalEvaluations(contractorId, limit = 12) {
  const companyId = getCurrentCompanyId();
  const rows = await sb(
    `contractor_eval_records?contractor_id=eq.${contractorId}&company_id=eq.${companyId}&status=eq.final&select=*,contractor_eval_periods(title,period_start,period_end)&order=finalized_at.desc&limit=${limit}`
  );
  return sbOk(rows) ? rows : [];
}
