import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * ماژول مدیریت حوادث — لایه‌ی داده‌ی واقعی (نه جدول استاب زیرماژول).
 * فیلدها دقیقاً همان قرارداد بخش ۲ TRIPOD_BETA_INTEGRATION.md هستند تا
 * آداپتور tripodBetaApi.js بدون هیچ نگاشت اضافه‌ای مستقیم از این جدول
 * بخواند.
 */

export const INCIDENT_TYPES = [
  { value: "fatality", labelKey: "incTypeFatality" },
  { value: "disabling", labelKey: "incTypeDisabling" },
  { value: "medical_treatment", labelKey: "incTypeMedicalTreatment" },
  { value: "first_aid", labelKey: "incTypeFirstAid" },
  { value: "near_miss", labelKey: "incTypeNearMiss" },
  { value: "property_damage", labelKey: "incTypePropertyDamage" },
];
export const incidentTypeLabel = (value) => {
  const it = INCIDENT_TYPES.find((x) => x.value === value);
  return it ? tr(it.labelKey) : value;
};

/* ============================================================================ *
 * فرمِ رسمیِ «گزارش حادثه» (کدِ فرم MD1QM-FSW22/01-01) — گزینه‌های هر
 * چک‌باکس‌گروه عیناً متنِ خودِ فرمِ شرکت‌اند، نه لیبلِ i18n؛ همان الگویِ
 * checkgroup در permit/permitModel.js (SYSTEM_TEMPLATE) که گزینه‌های
 * پویا/دیتامحور را رشته‌ی خام نگه می‌دارد، نه ترجمه‌شده.
 * ============================================================================ */
export const FORM_CODE = "MD1QM-FSW22/01-01";

export const INCIDENT_CATEGORIES = ["انسانی", "تجهیزاتی/ساختمانی", "محیط زیست"];

export const BODY_PARTS = [
  "سر", "چشم راست", "چشم چپ", "گوش راست", "گوش چپ", "صورت", "بینی", "دندان",
  "سینه", "پوست", "بازوی دست راست", "انگشتان دست راست", "بازوی دست چپ",
  "آرنج دست راست", "آرنج دست چپ", "انگشتان دست چپ", "ساعد دست راست", "ساعد دست چپ",
  "انگشتان پای راست", "انگشتان پای چپ", "زانوی راست", "زانوی چپ", "لگن",
  "ستون فقرات", "ران پای راست", "ران پای چپ", "ساق پای راست", "ساق پای چپ",
  "دیگر اعضای بدن",
];

export const INCIDENT_CAUSES = [
  "نصب نامناسب", "طراحی نامناسب", "حمل نامناسب", "استقرار نامناسب",
  "راه‌اندازی نامناسب", "ماشین‌آلات", "برق", "ابزار دستی", "مواد شیمیایی",
  "خطای انسانی", "بلایای طبیعی", "سایر",
];

export const INCIDENT_MECHANISMS = [
  "سقوط", "پرتاب اشیا", "لیز خوردن و افتادن", "تصادف", "سایش/خوردگی",
  "تماس با جریان برق", "تماس با مواد شیمیایی", "واژگونی", "آتش‌سوزی و انفجار",
  "تشعشع", "نشت", "تخریب", "سایر",
];

export const INCIDENT_CONSEQUENCES = [
  "مرگ", "قطع عضو", "سوختگی شیمیایی", "سوختگی حرارتی", "ضرب‌دیدگی", "له‌شدگی",
  "بریدگی", "سوراخ‌شدگی", "کوفتگی", "شکستگی", "فتق", "پیچ‌خوردگی", "دررفتگی",
  "خراشیدگی", "ورم", "لطمه به اعتبار سازمان", "خسارت مالی",
  "آسیب/از بین رفتن تجهیز", "تاخیر در روند اجرا (پروژه)", "خسارت زیست‌محیطی",
];

export const PPE_ITEMS = [
  "کلاه ایمنی", "گوشی ایمنی", "کفش ایمنی", "عینک ایمنی", "لباس کار دو تکه",
  "ماسک ایمنی", "دستکش ایمنی", "پیش‌بند", "سایر",
];

function incidentFromRow(r) {
  return {
    id: r.id,
    incidentNo: r.incident_no,
    occurredAt: r.occurred_at,
    location: r.location || "",
    incidentType: r.incident_type || "",
    isDisabling: !!r.is_disabling,
    injuredPersonName: r.injured_person_name || "",
    lostDays: r.lost_days || 0,
    financialCost: r.financial_cost != null ? Number(r.financial_cost) : null,
    description: r.description || "",
    employerOrg: r.employer_org || "",
    contractorOrg: r.contractor_org || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    // ---- فرمِ کاملِ گزارشِ حادثه (MD1QM-FSW22/01-01) ----
    workplaceName: r.workplace_name || "",
    occurredPhase: r.occurred_phase || "",
    employerManagerName: r.employer_manager_name || "",
    activityType: r.activity_type || "",
    workersCount: r.workers_count != null ? Number(r.workers_count) : null,
    workplaceAddressPhone: r.workplace_address_phone || "",
    incidentCategory: Array.isArray(r.incident_category) ? r.incident_category : [],
    occurredTime: r.occurred_time || "",
    injuredAge: r.injured_age != null ? Number(r.injured_age) : null,
    injuredJobTitle: r.injured_job_title || "",
    injuredEducation: r.injured_education || "",
    injuredWorkExperience: r.injured_work_experience || "",
    restDuration: r.rest_duration || "",
    injuredBodyParts: Array.isArray(r.injured_body_parts) ? r.injured_body_parts : [],
    humanNotes: r.human_notes || "",
    equipmentDamaged: r.equipment_damaged || "",
    equipmentDowntime: r.equipment_downtime || "",
    delayDuration: r.delay_duration || "",
    environmentalImpact: r.environmental_impact || "",
    causes: Array.isArray(r.causes) ? r.causes : [],
    causesNotes: r.causes_notes || "",
    incidentMechanism: Array.isArray(r.incident_mechanism) ? r.incident_mechanism : [],
    incidentMechanismNotes: r.incident_mechanism_notes || "",
    consequences: Array.isArray(r.consequences) ? r.consequences : [],
    ppeUsed: Array.isArray(r.ppe_used) ? r.ppe_used : [],
    ppeNotes: r.ppe_notes || "",
    preventionSuggestions: r.prevention_suggestions || "",
    witnesses: Array.isArray(r.witnesses) ? r.witnesses : [],
    actionsTaken: r.actions_taken || "",
    sketchImageUrl: r.sketch_image_url || "",
    contractorSupervisorName: r.contractor_supervisor_name || "",
    contractorSupervisorDate: r.contractor_supervisor_date || "",
    hseSupervisorName: r.hse_supervisor_name || "",
    hseSupervisorDate: r.hse_supervisor_date || "",
    formCode: r.form_code || FORM_CODE,
  };
}

function incidentToDb(rec) {
  return {
    incident_no: rec.incidentNo,
    occurred_at: rec.occurredAt,
    location: rec.location || null,
    incident_type: rec.incidentType || null,
    is_disabling: !!rec.isDisabling,
    injured_person_name: rec.injuredPersonName || null,
    lost_days: Number(rec.lostDays) || 0,
    financial_cost: rec.financialCost !== "" && rec.financialCost != null ? Number(rec.financialCost) : null,
    description: rec.description || null,
    employer_org: rec.employerOrg || null,
    contractor_org: rec.contractorOrg || null,
    // ---- فرمِ کاملِ گزارشِ حادثه (MD1QM-FSW22/01-01) ----
    workplace_name: rec.workplaceName || "",
    occurred_phase: rec.occurredPhase || "",
    employer_manager_name: rec.employerManagerName || "",
    activity_type: rec.activityType || "",
    workers_count: rec.workersCount !== "" && rec.workersCount != null ? Number(rec.workersCount) : null,
    workplace_address_phone: rec.workplaceAddressPhone || "",
    incident_category: Array.isArray(rec.incidentCategory) ? rec.incidentCategory : [],
    occurred_time: rec.occurredTime || "",
    injured_age: rec.injuredAge !== "" && rec.injuredAge != null ? Number(rec.injuredAge) : null,
    injured_job_title: rec.injuredJobTitle || "",
    injured_education: rec.injuredEducation || "",
    injured_work_experience: rec.injuredWorkExperience || "",
    rest_duration: rec.restDuration || "",
    injured_body_parts: Array.isArray(rec.injuredBodyParts) ? rec.injuredBodyParts : [],
    human_notes: rec.humanNotes || "",
    equipment_damaged: rec.equipmentDamaged || "",
    equipment_downtime: rec.equipmentDowntime || "",
    delay_duration: rec.delayDuration || "",
    environmental_impact: rec.environmentalImpact || "",
    causes: Array.isArray(rec.causes) ? rec.causes : [],
    causes_notes: rec.causesNotes || "",
    incident_mechanism: Array.isArray(rec.incidentMechanism) ? rec.incidentMechanism : [],
    incident_mechanism_notes: rec.incidentMechanismNotes || "",
    consequences: Array.isArray(rec.consequences) ? rec.consequences : [],
    ppe_used: Array.isArray(rec.ppeUsed) ? rec.ppeUsed : [],
    ppe_notes: rec.ppeNotes || "",
    prevention_suggestions: rec.preventionSuggestions || "",
    witnesses: Array.isArray(rec.witnesses) ? rec.witnesses : [],
    actions_taken: rec.actionsTaken || "",
    sketch_image_url: rec.sketchImageUrl || "",
    contractor_supervisor_name: rec.contractorSupervisorName || "",
    contractor_supervisor_date: rec.contractorSupervisorDate || null,
    hse_supervisor_name: rec.hseSupervisorName || "",
    hse_supervisor_date: rec.hseSupervisorDate || null,
    form_code: rec.formCode || FORM_CODE,
  };
}

export async function loadIncidents() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`incidents?select=*&order=occurred_at.desc${filter}`);
  return sbOk(rows) ? rows.map(incidentFromRow) : [];
}

export async function loadIncidentById(id) {
  const rows = await sb(`incidents?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length > 0 ? incidentFromRow(rows[0]) : null;
}

export async function createIncident(rec, createdBy) {
  if (!rec.incidentNo?.trim() || !rec.occurredAt) {
    return { __error: true, message: tr("incErrNoAndDateRequired") };
  }
  const payload = { ...incidentToDb(rec), id: uid("inc"), company_id: getCurrentCompanyId(), created_by: createdBy || "" };
  const rows = await sb("incidents", { method: "POST", body: JSON.stringify([payload]) });
  if (!sbOk(rows)) return { __error: true, message: tr("incErrCreate") };
  return incidentFromRow(rows[0]);
}

export async function updateIncident(id, rec) {
  const payload = { ...incidentToDb(rec), updated_at: new Date().toISOString() };
  const rows = await sb(`incidents?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  if (!sbOk(rows)) return { __error: true, message: tr("saErrSave") };
  return incidentFromRow(rows[0]);
}

export async function deleteIncident(id) {
  const rows = await sb(`incidents?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (!sbOk(rows)) return { __error: true, message: tr("incErrDelete") };
  return { ok: true };
}
