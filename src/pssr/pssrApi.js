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

// وارد کردن ۹ چک‌لیست مرجع از فایل رسمی (به‌ازای هر شرکت) — بدون تغییر
// محتوایی؛ داده در pssrChecklistSeedData.js عیناً از اکسل استخراج شده.
// «خودترمیم‌شونده» است: اگر چک‌لیستی از قبل ساخته شده ولی به هر دلیلی
// (مثلاً قطعیِ شبکه وسطِ درجِ دسته‌ای) بخشی از Requirementهایش کم باشد،
// همان مواردِ کم‌شده را تکمیل می‌کند — هرگز ردیفِ موجودی را حذف نمی‌کند
// (چون ممکن است همان‌ها قبلاً در یک جلسه‌ی واقعی پاسخ گرفته باشند)، پس
// هربار اجرا با خیال راحت قابلِ تکرار است.
export async function seedOfficialChecklists(createdBy) {
  const companyId = getCurrentCompanyId();
  const existing = await sb(`pssr_checklist_templates?is_current=eq.true&select=id,code&company_id=eq.${companyId}`);
  const existingByCode = {};
  (sbOk(existing) ? existing : []).forEach((r) => { existingByCode[r.code] = r.id; });

  let imported = 0, repaired = 0;
  const failedCodes = [];

  for (const cl of PSSR_CHECKLIST_SEED) {
    let templateId = existingByCode[cl.code];
    let isNew = false;

    if (!templateId) {
      isNew = true;
      templateId = uid("psc");
      const tplRows = await sb("pssr_checklist_templates", {
        method: "POST",
        body: JSON.stringify([{
          id: templateId, company_id: companyId, code: cl.code, discipline: cl.discipline,
          title: cl.title, version: 1, is_current: true, created_by: createdBy || "",
        }]),
      });
      if (!sbOk(tplRows)) { failedCodes.push(cl.code); continue; }
    }

    // فقط Requirementهایی که واقعاً کم‌اند درج می‌شوند — تطبیق بر اساسِ
    // order_index (۱ به ۱ با آرایه‌ی seed مطابقت دارد).
    const existingReqs = await sb(`pssr_requirement_templates?checklist_template_id=eq.${templateId}&select=order_index`);
    const existingOrders = new Set((sbOk(existingReqs) ? existingReqs : []).map((r) => r.order_index));
    const missing = cl.requirements.filter((r) => !existingOrders.has(r.order));
    if (missing.length === 0) { if (isNew) imported++; continue; }

    const reqPayload = missing.map((r) => ({
      id: uid("psreq"), checklist_template_id: templateId, company_id: companyId,
      req_no: r.reqNo, group_title: r.group, requirement_text: r.text, order_index: r.order,
    }));
    let allOk = true;
    for (let i = 0; i < reqPayload.length; i += 100) {
      const rows = await sb("pssr_requirement_templates", { method: "POST", body: JSON.stringify(reqPayload.slice(i, i + 100)) });
      if (!sbOk(rows)) { allOk = false; break; }
    }
    if (!allOk) { failedCodes.push(cl.code); continue; }
    if (isNew) imported++; else repaired++;
  }
  return { ok: failedCodes.length === 0, imported, repaired, failedCodes };
}

// ---------- ویرایش/نگارش‌گذاریِ چک‌لیستِ مرجع ----------
// ویرایش هرگز نگارشِ فعلی را جا‌به‌جا نمی‌کند — یک نگارشِ کاملاً جدید
// می‌سازد (checklist_template + requirement_templates تازه)، و فقط بعد از
// موفقیتِ کاملِ درجِ Requirementهای نگارشِ جدید، نگارشِ قبلی را is_current=false
// و نگارشِ جدید را is_current=true می‌کند؛ اگر جایی وسطِ کار شکست بخورد،
// نگارشِ قبلی همچنان فعال می‌ماند (چیزی خراب نمی‌شود). PSSRهای موجود همچنان
// به همان requirement_template_id قدیمی وصل‌اند، پس سابقه‌شان دست‌نخورده می‌ماند.
export async function createChecklistVersion(checklistTemplateId, requirements, createdBy) {
  const oldRows = await sb(`pssr_checklist_templates?id=eq.${checklistTemplateId}&select=*`);
  if (!sbOk(oldRows) || oldRows.length === 0) return { __error: true, message: tr("pssrErrSave") };
  const old = oldRows[0];

  const newId = uid("psc");
  const tplRows = await sb("pssr_checklist_templates", {
    method: "POST",
    body: JSON.stringify([{
      id: newId, company_id: old.company_id, code: old.code, discipline: old.discipline,
      title: old.title, version: (old.version || 1) + 1, is_current: false, created_by: createdBy || "",
    }]),
  });
  if (!sbOk(tplRows)) return { __error: true, message: tr("pssrErrSave") };

  const payload = requirements.map((r, i) => ({
    id: uid("psreq"), checklist_template_id: newId, company_id: old.company_id,
    req_no: r.reqNo || "", group_title: r.groupTitle || null, requirement_text: r.requirementText || "", order_index: i + 1,
  }));
  for (let i = 0; i < payload.length; i += 100) {
    const rows = await sb("pssr_requirement_templates", { method: "POST", body: JSON.stringify(payload.slice(i, i + 100)) });
    if (!sbOk(rows)) return { __error: true, message: tr("pssrErrSave") };
  }

  await sb(`pssr_checklist_templates?id=eq.${checklistTemplateId}`, { method: "PATCH", body: JSON.stringify({ is_current: false }) });
  const flip = await sb(`pssr_checklist_templates?id=eq.${newId}`, { method: "PATCH", body: JSON.stringify({ is_current: true }) });
  if (!sbOk(flip)) return { __error: true, message: tr("pssrErrSave") };
  return { ok: true, id: newId, version: (old.version || 1) + 1 };
}
