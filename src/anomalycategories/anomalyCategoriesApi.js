import { sb, sbOk, getCurrentCompanyId } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

function categoryFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    isActive: r.is_active !== false,
    orderIndex: r.order_index || 0,
    // گردشِ کارِ تاییدِ دسته‌بندیِ «سایر» — نگاه کنید به proposeAnomalyCategory/
    // approveAnomalyCategory/rejectAnomalyCategory پایینِ همین فایل.
    status: r.status || "active",
    proposedBy: r.proposed_by || "",
    reviewNote: r.review_note || "",
    reviewedBy: r.reviewed_by || "",
    reviewedAt: r.reviewed_at || "",
  };
}

export async function loadActiveAnomalyCategories() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`anomaly_categories?is_active=eq.true&status=eq.active&select=*&order=order_index.asc${filter}`);
  return (sbOk(rows) ? rows : []).map(categoryFromRow);
}

export async function loadAllAnomalyCategories() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`anomaly_categories?select=*&order=order_index.asc${filter}`);
  return (sbOk(rows) ? rows : []).map(categoryFromRow);
}

export async function loadPendingAnomalyCategories() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`anomaly_categories?status=eq.pending_review&select=*&order=created_at.asc${filter}`);
  return sbOk(rows) ? rows.map(categoryFromRow) : [];
}

async function nextOrderIndex(companyId) {
  const existing = await sb(`anomaly_categories?select=order_index&order=order_index.desc&limit=1${companyId ? `&company_id=eq.${companyId}` : ""}`);
  return sbOk(existing) && existing.length > 0 ? (existing[0].order_index || 0) + 1 : 1;
}

export async function createAnomalyCategory(name) {
  const companyId = getCurrentCompanyId();
  const nextOrder = await nextOrderIndex(companyId);
  const rows = await sb("anomaly_categories", { method: "POST", body: JSON.stringify([{ name: name.trim(), order_index: nextOrder, company_id: companyId }]) });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrCreateDetail", { detail: rows?.message || tr("acatUnknown") }) };
  return categoryFromRow(rows[0]);
}

// پیشنهادِ دسته‌بندیِ تازه («سایر» در فرمِ ثبتِ آنومالی) — تا تاییدِ سرپرست/
// کارفرما در dropdown دیده نمی‌شود (ر.ک. loadActiveAnomalyCategories بالا).
export async function proposeAnomalyCategory(name, proposedBy) {
  const companyId = getCurrentCompanyId();
  const nextOrder = await nextOrderIndex(companyId);
  const rows = await sb("anomaly_categories", {
    method: "POST",
    body: JSON.stringify([{ name: name.trim(), order_index: nextOrder, company_id: companyId, status: "pending_review", proposed_by: proposedBy || "" }]),
  });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrCreateDetail", { detail: rows?.message || tr("acatUnknown") }) };
  return categoryFromRow(rows[0]);
}

export async function approveAnomalyCategory(id, reviewedBy) {
  const rows = await sb(`anomaly_categories?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active", reviewed_by: reviewedBy || "", reviewed_at: new Date().toISOString() }),
  });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrSaveDetail", { detail: rows?.message || tr("acatUnknown") }) };
  return categoryFromRow(rows[0]);
}

// رد — طبقِ همان قاعده‌ی رایجِ سامانه (hse_gate_items/survey_approval_workflow)، یادداشتِ دلیل اجباری است.
export async function rejectAnomalyCategory(id, reviewedBy, note) {
  if (!note || !note.trim()) return { __error: true, message: tr("acatErrRejectReasonRequired") };
  const rows = await sb(`anomaly_categories?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "rejected", review_note: note.trim(), reviewed_by: reviewedBy || "", reviewed_at: new Date().toISOString() }),
  });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrSaveDetail", { detail: rows?.message || tr("acatUnknown") }) };
  return categoryFromRow(rows[0]);
}

export async function updateAnomalyCategory(id, name) {
  const rows = await sb(`anomaly_categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrSaveDetail", { detail: rows?.message || tr("acatUnknown") }) };
  return categoryFromRow(rows[0]);
}

export async function setAnomalyCategoryActive(id, isActive) {
  const rows = await sb(`anomaly_categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) });
  if (!sbOk(rows)) return { __error: true, message: tr("acatErrToggleStatus") };
  return categoryFromRow(rows[0]);
}
