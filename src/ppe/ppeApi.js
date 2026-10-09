import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * مدیریتِ PPE (تجهیزاتِ حفاظتِ فردی) — دو کلاسِ جدولِ متفاوت:
 * ppe_items/ppe_requirements رجیستری/ماتریسِ تعریف‌اند (مثلِ
 * training_courses/training_requirements — همیشه آنلاین، بدونِ
 * uid()/offlineWrite)؛ ppe_distributions لاگِ تراکنشیِ توزیع است (مثلِ
 * personnel_documents — از طریقِ offlineWrite).
 */

function ppeItemFromRow(r) {
  return { id: r.id, name: r.name, isActive: r.is_active !== false };
}

export async function loadPpeItems(includeInactive = true) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const activeFilter = includeInactive ? "" : "&is_active=eq.true";
  const rows = await sb(`ppe_items?select=*&order=name.asc${filter}${activeFilter}`);
  return sbOk(rows) ? rows.map(ppeItemFromRow) : [];
}

export async function createPpeItem(name) {
  const companyId = getCurrentCompanyId();
  const rows = await sb("ppe_items", { method: "POST", body: JSON.stringify([{ name: name.trim(), company_id: companyId }]) });
  if (!sbOk(rows)) return { __error: true, message: tr("ppeErrCreateItem") };
  return ppeItemFromRow(rows[0]);
}

export async function updatePpeItem(id, patch) {
  const dbPatch = {};
  if ("name" in patch) dbPatch.name = patch.name;
  if ("isActive" in patch) dbPatch.is_active = patch.isActive;
  const rows = await sb(`ppe_items?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dbPatch) });
  if (!sbOk(rows)) return { __error: true, message: tr("ppeErrSaveItem") };
  return ppeItemFromRow(rows[0]);
}

export async function deletePpeItem(id) {
  await sb(`ppe_requirements?ppe_item_id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  const result = await sb(`ppe_items?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (result?.__error) return { __error: true, message: result.message || tr("ppeErrDeleteItem") };
  return { ok: true };
}

// ---------- ماتریسِ عنوانِ‌شغلی × قلمِ PPE ----------

export async function loadPpeRequirementsMatrix() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`ppe_requirements?select=ppe_item_id,job_position_id${filter}`);
  return sbOk(rows) ? rows.map((r) => ({ ppeItemId: r.ppe_item_id, jobPositionId: r.job_position_id })) : [];
}

export async function setPpeRequirement(ppeItemId, jobPositionId, required) {
  if (required) {
    const existing = await sb(`ppe_requirements?ppe_item_id=eq.${ppeItemId}&job_position_id=eq.${jobPositionId}&select=id`);
    if (sbOk(existing) && existing.length > 0) return { ok: true };
    const result = await sb("ppe_requirements", { method: "POST", body: JSON.stringify([{ ppe_item_id: ppeItemId, job_position_id: jobPositionId, company_id: getCurrentCompanyId() }]), prefer: "return=minimal" });
    if (result?.__error) return { __error: true, message: tr("ppeErrSaveItem") };
    return { ok: true };
  }
  await sb(`ppe_requirements?ppe_item_id=eq.${ppeItemId}&job_position_id=eq.${jobPositionId}`, { method: "DELETE", prefer: "return=minimal" });
  return { ok: true };
}

// ---------- اقلامِ موردنیازِ یک عنوانِ شغلیِ خاص (برایِ ماژولِ پرسنل) ----------

export async function loadRequiredPpeForJobTitle(jobTitle) {
  if (!jobTitle) return [];
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const posRows = await sb(`job_positions?title=eq.${encodeURIComponent(jobTitle)}&select=id${filter}`);
  if (!sbOk(posRows) || posRows.length === 0) return [];
  const positionId = posRows[0].id;
  const reqRows = await sb(`ppe_requirements?job_position_id=eq.${positionId}&select=ppe_items(id,name,is_active)`);
  if (!sbOk(reqRows)) return [];
  return reqRows
    .map((r) => r.ppe_items)
    .filter((it) => it && it.is_active !== false)
    .map((it) => ({ id: it.id, name: it.name }));
}

// ---------- توزیع (تراکنشی، از طریقِ offlineWrite) ----------

function distributionFromRow(r) {
  return {
    id: r.id,
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    personnelId: r.personnel_id,
    ppeItemId: r.ppe_item_id,
    distributedAt: r.distributed_at || "",
    status: r.status || "pending",
    note: r.note || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

export async function loadPpeDistributions(personnelId) {
  const rows = await sb(`ppe_distributions?personnel_id=eq.${personnelId}&select=*`);
  return sbOk(rows) ? rows.map(distributionFromRow) : [];
}

// یک رکوردِ توزیع به‌ازایِ هر (پرسنل، قلمِ PPE) — ثبتِ دوباره، رکوردِ قبلیِ
// همان جفت را جایگزین می‌کند (مثلِ upsertDocument در personnelApi.js).
export async function recordPpeDistribution({ personnelId, contractorId, contractorName, ppeItemId, status, note, createdBy }) {
  const existing = await sb(`ppe_distributions?personnel_id=eq.${personnelId}&ppe_item_id=eq.${ppeItemId}&select=id`);
  if (sbOk(existing) && existing.length > 0) {
    for (const row of existing) {
      await offlineWrite({ module: "ppeDistributions", table: "ppe_distributions", action: "delete", id: row.id, payload: {} });
    }
  }
  const id = uid("ppedist");
  const payload = {
    personnel_id: personnelId,
    contractor_id: contractorId || null,
    contractor_name: contractorName || "",
    ppe_item_id: ppeItemId,
    status: status || "pending",
    note: note || "",
    distributed_at: status === "distributed" ? new Date().toISOString() : null,
    created_by: createdBy || "",
    company_id: getCurrentCompanyId(),
  };
  const result = await offlineWrite({ module: "ppeDistributions", table: "ppe_distributions", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || tr("commonErrorSave") };
  return { ok: true };
}
