import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * FMEA (Failure Mode & Effects Analysis) — فرمتِ استانداردِ صنعتی: هر ردیف
 * یک حالتِ خرابی با severity/occurrence/detection (۱ تا ۱۰) است؛ rpn یک
 * ستونِ generated always as در دیتابیس است (حاصل‌ضربِ ساده) — کلاینت
 * هرگز آن را محاسبه/ارسال نمی‌کند.
 */

function fmeaFromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    processOrComponent: r.process_or_component || "",
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    status: r.status || "draft",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

function fmeaToDb(rec) {
  return {
    title: rec.title || "",
    process_or_component: rec.processOrComponent || "",
    contractor_id: rec.contractorId || null,
    contractor_name: rec.contractorName || "",
    status: rec.status || "draft",
    created_by: rec.createdBy || "",
    company_id: getCurrentCompanyId(),
  };
}

export async function loadFmeaAssessments() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`fmea_assessments?select=*&order=created_at.desc${filter}`);
  return sbOk(rows) ? rows.map(fmeaFromRow) : [];
}

export async function loadFmeaAssessmentById(id) {
  const rows = await sb(`fmea_assessments?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length > 0 ? fmeaFromRow(rows[0]) : null;
}

export async function createFmeaAssessment(rec, createdBy) {
  const id = uid("fmea");
  const result = await offlineWrite({ module: "fmeaAssessments", table: "fmea_assessments", action: "insert", id, payload: fmeaToDb({ ...rec, createdBy }) });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return fmeaFromRow(result.record);
}

export async function updateFmeaAssessment(id, rec) {
  const result = await offlineWrite({ module: "fmeaAssessments", table: "fmea_assessments", action: "update", id, payload: { ...fmeaToDb(rec), updated_at: new Date().toISOString() } });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return fmeaFromRow(result.record);
}

export async function deleteFmeaAssessment(id) {
  const result = await offlineWrite({ module: "fmeaAssessments", table: "fmea_assessments", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorDelete") };
  return { ok: true };
}

// ---------- ردیف‌هایِ FMEA ----------

function fmeaItemFromRow(r) {
  return {
    id: r.id,
    fmeaId: r.fmea_id,
    seq: r.seq || 0,
    failureMode: r.failure_mode || "",
    effect: r.effect || "",
    severity: r.severity || 1,
    cause: r.cause || "",
    occurrence: r.occurrence || 1,
    currentControls: r.current_controls || "",
    detection: r.detection || 1,
    rpn: r.rpn != null ? Number(r.rpn) : null,
    recommendedAction: r.recommended_action || "",
    responsible: r.responsible || "",
    dueDate: r.due_date || "",
    createdAt: r.created_at,
  };
}

// rpn عمداً اینجا نیست — ستونِ generated always as، کلاینت هرگز آن را نمی‌فرستد.
function fmeaItemToDb(fmeaId, rec) {
  return {
    fmea_id: fmeaId,
    seq: rec.seq || 0,
    failure_mode: rec.failureMode || "",
    effect: rec.effect || "",
    severity: Number(rec.severity) || 1,
    cause: rec.cause || "",
    occurrence: Number(rec.occurrence) || 1,
    current_controls: rec.currentControls || "",
    detection: Number(rec.detection) || 1,
    recommended_action: rec.recommendedAction || "",
    responsible: rec.responsible || "",
    due_date: rec.dueDate || null,
    company_id: getCurrentCompanyId(),
  };
}

export async function loadFmeaItems(fmeaId) {
  const rows = await sb(`fmea_items?fmea_id=eq.${fmeaId}&select=*&order=seq.asc`);
  return sbOk(rows) ? rows.map(fmeaItemFromRow) : [];
}

export async function addFmeaItem(fmeaId, rec) {
  const id = uid("fmeaitem");
  const result = await offlineWrite({ module: "fmeaItems", table: "fmea_items", action: "insert", id, payload: fmeaItemToDb(fmeaId, rec) });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return fmeaItemFromRow(result.record);
}

export async function deleteFmeaItem(id) {
  const result = await offlineWrite({ module: "fmeaItems", table: "fmea_items", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorDelete") };
  return { ok: true };
}
