import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { PSSR_CHECKLIST_SEED } from "./pssrChecklistSeedData.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);

/* ============================================================================ *
 * PSSR — سرِ رکورد (هدر) + چک‌لیست‌های مرجع (Master، نگارش‌دار).
 * ============================================================================ */

function pssrFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    reportNo: r.report_no || "",
    revisionNo: r.revision_no || "00",
    reportDate: r.report_date || "",
    companyOrganization: r.company_organization || "",
    unitTrain: r.unit_train || "",
    systemNo: r.system_no || "",
    subsystemNo: r.subsystem_no || "",
    status: r.status || "draft",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function loadPssrs() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`pssrs?select=*&order=created_at.desc${filter}`);
  return sbOk(rows) ? rows.map(pssrFromRow) : [];
}

export async function loadPssrById(id) {
  const rows = await sb(`pssrs?id=eq.${id}&select=*`);
  return sbOk(rows) && rows.length > 0 ? pssrFromRow(rows[0]) : null;
}

export async function createPssr(rec, createdBy) {
  if (!rec.reportNo?.trim()) return { __error: true, message: tr("pssrErrReportNoRequired") };
  const id = uid("pssr");
  const res = await offlineWrite({
    module: "pssrs", table: "pssrs", action: "insert", id,
    payload: {
      company_id: getCurrentCompanyId(),
      report_no: rec.reportNo, revision_no: rec.revisionNo || "00",
      report_date: rec.reportDate || null,
      company_organization: rec.companyOrganization || "",
      unit_train: rec.unitTrain || "", system_no: rec.systemNo || "", subsystem_no: rec.subsystemNo || "",
      status: "draft", created_by: createdBy || "",
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return pssrFromRow(res.record);
}

export async function updatePssr(id, patch) {
  const dbPatch = { updated_at: new Date().toISOString() };
  if ("reportNo" in patch) dbPatch.report_no = patch.reportNo;
  if ("revisionNo" in patch) dbPatch.revision_no = patch.revisionNo;
  if ("reportDate" in patch) dbPatch.report_date = patch.reportDate || null;
  if ("companyOrganization" in patch) dbPatch.company_organization = patch.companyOrganization;
  if ("unitTrain" in patch) dbPatch.unit_train = patch.unitTrain;
  if ("systemNo" in patch) dbPatch.system_no = patch.systemNo;
  if ("subsystemNo" in patch) dbPatch.subsystem_no = patch.subsystemNo;
  if ("status" in patch) dbPatch.status = patch.status;
  const res = await offlineWrite({ module: "pssrs", table: "pssrs", action: "update", id, payload: dbPatch });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return pssrFromRow(res.record);
}

export async function deletePssr(id) {
  const res = await offlineWrite({ module: "pssrs", table: "pssrs", action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pssrErrSave") };
  return { ok: true };
}

/* ============================================================================ *
 * چک‌لیست‌های مرجع (Master، نگارش‌دار) — هر PSSR به requirement_template_id
 * ثابتِ همان نگارش وصل می‌شود، نه به «آخرین نگارش»؛ پس ویرایشِ آینده،
 * سوابقِ PSSRهای قبلی را دست‌نخورده نگه می‌دارد.
 * ============================================================================ */

function checklistFromRow(r) {
  return {
    id: r.id, companyId: r.company_id, code: r.code, discipline: r.discipline,
    title: r.title || "", version: r.version || 1, isCurrent: r.is_current !== false,
    createdBy: r.created_by || "", createdAt: r.created_at,
  };
}
function requirementFromRow(r) {
  return {
    id: r.id, checklistTemplateId: r.checklist_template_id, reqNo: r.req_no || "",
    groupTitle: r.group_title || "", requirementText: r.requirement_text || "",
    orderIndex: r.order_index || 0,
  };
}

// چک‌لیست‌های جاری (نگارش فعلی) این شرکت، به‌همراه Requirementهایشان
export async function loadCurrentChecklists() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const templates = await sb(`pssr_checklist_templates?is_current=eq.true&select=*&order=code.asc${filter}`);
  if (!sbOk(templates)) return [];
  const ids = templates.map((t) => t.id);
  if (ids.length === 0) return [];
  const reqs = await sb(`pssr_requirement_templates?checklist_template_id=in.(${ids.join(",")})&select=*&order=order_index.asc`);
  const reqByChecklist = {};
  (sbOk(reqs) ? reqs : []).forEach((r) => {
    (reqByChecklist[r.checklist_template_id] = reqByChecklist[r.checklist_template_id] || []).push(requirementFromRow(r));
  });
  return templates.map((t) => ({ ...checklistFromRow(t), requirements: reqByChecklist[t.id] || [] }));
}

// وارد کردن ۹ چک‌لیست مرجع از فایل رسمی (یک‌بار، به‌ازای هر شرکت) — بدون
// تغییر محتوایی؛ داده در pssrChecklistSeedData.js عیناً از اکسل استخراج شده.
// اگر چک‌لیستی با همین code از قبل «جاری» باشد، دوباره وارد نمی‌شود (idempotent).
export async function seedOfficialChecklists(createdBy) {
  const companyId = getCurrentCompanyId();
  const existing = await sb(`pssr_checklist_templates?is_current=eq.true&select=code&company_id=eq.${companyId}`);
  const existingCodes = new Set((sbOk(existing) ? existing : []).map((r) => r.code));
  let imported = 0;
  for (const cl of PSSR_CHECKLIST_SEED) {
    if (existingCodes.has(cl.code)) continue;
    const templateId = uid("psc");
    const tplRows = await sb("pssr_checklist_templates", {
      method: "POST",
      body: JSON.stringify([{
        id: templateId, company_id: companyId, code: cl.code, discipline: cl.discipline,
        title: cl.title, version: 1, is_current: true, created_by: createdBy || "",
      }]),
    });
    if (!sbOk(tplRows)) continue;
    const reqPayload = cl.requirements.map((r) => ({
      id: uid("psreq"), checklist_template_id: templateId, company_id: companyId,
      req_no: r.reqNo, group_title: r.group, requirement_text: r.text, order_index: r.order,
    }));
    // درجِ دسته‌ای: این «داده‌ی مرجعِ یک‌باره» است (Import اولیه)، نه ثبتِ
    // میدانیِ روزمره — پس نیازی به صفِ آفلاینِ تکی‌به‌تکی ندارد.
    for (let i = 0; i < reqPayload.length; i += 100) {
      await sb("pssr_requirement_templates", { method: "POST", body: JSON.stringify(reqPayload.slice(i, i + 100)) });
    }
    imported++;
  }
  return { ok: true, imported };
}
