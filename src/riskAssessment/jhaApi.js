import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * JHA (Job Hazard Analysis) — رجیستریِ مسطحِ گام‌به‌گام، دقیقاً الگویِ
 * ساختاریِ HCMS (hcmsApi.js) ولی بدونِ منطقِ چندسطحیِ RPN آن. تراکنشی است
 * (id text + uid() کلاینت + offlineWrite)، نه الگویِ ادمین-کانفیگ.
 */

function jhaFromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    workActivity: r.work_activity || "",
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    status: r.status || "draft",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

function jhaToDb(rec) {
  return {
    title: rec.title || "",
    work_activity: rec.workActivity || "",
    contractor_id: rec.contractorId || null,
    contractor_name: rec.contractorName || "",
    status: rec.status || "draft",
    created_by: rec.createdBy || "",
    company_id: getCurrentCompanyId(),
  };
}

export async function loadJhaAssessments() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`jha_assessments?select=*&order=created_at.desc${filter}`);
  return sbOk(rows) ? rows.map(jhaFromRow) : [];
}

export async function loadJhaAssessmentById(id) {
  const rows = await sb(`jha_assessments?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length > 0 ? jhaFromRow(rows[0]) : null;
}

export async function createJhaAssessment(rec, createdBy) {
  const id = uid("jha");
  const result = await offlineWrite({ module: "jhaAssessments", table: "jha_assessments", action: "insert", id, payload: jhaToDb({ ...rec, createdBy }) });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return jhaFromRow(result.record);
}

export async function updateJhaAssessment(id, rec) {
  const result = await offlineWrite({ module: "jhaAssessments", table: "jha_assessments", action: "update", id, payload: { ...jhaToDb(rec), updated_at: new Date().toISOString() } });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return jhaFromRow(result.record);
}

export async function deleteJhaAssessment(id) {
  const result = await offlineWrite({ module: "jhaAssessments", table: "jha_assessments", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorDelete") };
  return { ok: true };
}

// ---------- گام‌هایِ JHA ----------

function jhaStepFromRow(r) {
  return {
    id: r.id,
    jhaId: r.jha_id,
    seq: r.seq || 0,
    stepDescription: r.step_description || "",
    hazards: r.hazards || "",
    existingControls: r.existing_controls || "",
    riskLevel: r.risk_level || "",
    additionalControls: r.additional_controls || "",
    responsible: r.responsible || "",
    createdAt: r.created_at,
  };
}

function jhaStepToDb(jhaId, rec) {
  return {
    jha_id: jhaId,
    seq: rec.seq || 0,
    step_description: rec.stepDescription || "",
    hazards: rec.hazards || "",
    existing_controls: rec.existingControls || "",
    risk_level: rec.riskLevel || "",
    additional_controls: rec.additionalControls || "",
    responsible: rec.responsible || "",
    company_id: getCurrentCompanyId(),
  };
}

export async function loadJhaSteps(jhaId) {
  const rows = await sb(`jha_steps?jha_id=eq.${jhaId}&select=*&order=seq.asc`);
  return sbOk(rows) ? rows.map(jhaStepFromRow) : [];
}

export async function addJhaStep(jhaId, rec) {
  const id = uid("jhastep");
  const result = await offlineWrite({ module: "jhaSteps", table: "jha_steps", action: "insert", id, payload: jhaStepToDb(jhaId, rec) });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return jhaStepFromRow(result.record);
}

export async function deleteJhaStep(id) {
  const result = await offlineWrite({ module: "jhaSteps", table: "jha_steps", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorDelete") };
  return { ok: true };
}
