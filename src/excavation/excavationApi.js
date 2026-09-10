import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { isOnline } from "../offline/networkStatus.js";
import { getRecordsByModule, putRecord } from "../offline/offlineDb.js";
import { uploadBase64ToStorage } from "../offline/storageUpload.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const terr = (key) => translate(getCurrentLang(), key);

/* ============================================================================ *
 * Excavation Slope & Width Calculator — لایه‌ی داده، IHMS-Native.
 * همان الگوی lifting/liftingPlanApi.js: xFromRow/xToDb + offlineWrite +
 * company scoping. Standard Profile به‌شکلِ Configurable + Versioned (دقیقاً
 * هم‌الگوی lifting_acceptance_criteria)؛ Audit Trail در جدولِ append-only.
 * ============================================================================ */

export const SOIL_TYPE_LABEL_KEYS = {
  stable_rock: "excSoilStableRock",
  type_a: "excSoilTypeA",
  type_b: "excSoilTypeB",
  type_c: "excSoilTypeC",
};
export const PROTECTION_METHOD_LABEL_KEYS = {
  sloping: "excMethodSloping",
  benching: "excMethodBenching",
  shoring: "excMethodShoring",
  shield: "excMethodShield",
};

// ---------- نگاشتِ ردیف ----------

function assessmentFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || "",
    project: r.project || "",
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    title: r.title || "",
    assessmentDate: r.assessment_date || "",
    depthM: r.depth_m ?? 0,
    bottomWidthM: r.bottom_width_m ?? 0,
    lengthM: r.length_m ?? 0,
    soilType: r.soil_type || "type_b",
    hasWater: !!r.has_water,
    edgeLoad: !!r.edge_load,
    adjacentStructure: !!r.adjacent_structure,
    vibration: !!r.vibration,
    protectionMethod: r.protection_method || "sloping",
    standardProfileVersionId: r.standard_profile_version_id || "",
    calc: r.calc && typeof r.calc === "object" ? r.calc : {},
    photoIds: Array.isArray(r.photo_ids) ? r.photo_ids : [],
    notes: r.notes || "",
    archivedAt: r.archived_at || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

function assessmentToDb(rec) {
  return {
    project: rec.project || "",
    contractor_id: rec.contractorId || null,
    contractor_name: rec.contractorName || "",
    title: rec.title || "",
    assessment_date: rec.assessmentDate || null,
    depth_m: +rec.depthM || 0,
    bottom_width_m: +rec.bottomWidthM || 0,
    length_m: +rec.lengthM || 0,
    soil_type: rec.soilType || "type_b",
    has_water: !!rec.hasWater,
    edge_load: !!rec.edgeLoad,
    adjacent_structure: !!rec.adjacentStructure,
    vibration: !!rec.vibration,
    protection_method: rec.protectionMethod || "sloping",
    standard_profile_version_id: rec.standardProfileVersionId || null,
    calc: rec.calc || {},
    notes: rec.notes || "",
  };
}

// ---------- Audit Trail (append-only) ----------

async function logAudit(assessmentId, action, detail, actor) {
  await offlineWrite({
    module: "excavationAudit",
    table: "excavation_audit",
    action: "insert",
    id: uid("exaud"),
    payload: {
      assessment_id: assessmentId,
      company_id: getCurrentCompanyId(),
      action,
      detail: detail || {},
      actor: actor || "",
    },
  });
}

export async function loadExcavationAudit(assessmentId) {
  const rows = await sb(`excavation_audit?assessment_id=eq.${assessmentId}&select=*&order=created_at.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, action: r.action, detail: r.detail || {}, actor: r.actor || "", createdAt: r.created_at,
  }));
}

// ---------- لیست / تک ----------

export async function loadExcavationAssessments({ includeArchived = true } = {}) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const statusFilter = includeArchived ? "" : "&archived_at=is.null";
  if (isOnline()) {
    const rows = await sb(`excavation_assessments?select=*&order=created_at.desc${filter}${statusFilter}`);
    if (sbOk(rows)) {
      try {
        for (const r of rows) await putRecord("excavationAssessments", r.id, r, "synced");
        const cached = await getRecordsByModule("excavationAssessments");
        const serverIds = new Set(rows.map((r) => r.id));
        const localOnly = cached.filter((c) => c.syncStatus !== "synced" && !serverIds.has(c.id) && !c.data?.deleted);
        return [
          ...localOnly.map((c) => assessmentFromRow({ ...c.data, __syncStatus: c.syncStatus })),
          ...rows.map((r) => assessmentFromRow({ ...r, __syncStatus: "synced" })),
        ].filter((a) => includeArchived || !a.archivedAt);
      } catch {
        return rows.map((r) => assessmentFromRow({ ...r, __syncStatus: "synced" }));
      }
    }
  }
  const cached = await getRecordsByModule("excavationAssessments");
  return cached
    .filter((c) => !c.data?.deleted)
    .map((c) => assessmentFromRow({ ...c.data, __syncStatus: c.syncStatus }))
    .filter((a) => includeArchived || !a.archivedAt);
}

// ---------- ساخت / ویرایش / بایگانی / حذف ----------

export async function createExcavationAssessment(rec, actor) {
  const id = uid("exa");
  const payload = {
    ...assessmentToDb(rec),
    photo_ids: [],
    company_id: getCurrentCompanyId(),
    created_by: actor || "",
  };
  const result = await offlineWrite({ module: "excavationAssessments", table: "excavation_assessments", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("errCreate") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "create", { title: payload.title, project: payload.project, verdict: rec.calc?.verdict }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function updateExcavationAssessment(id, rec, actor) {
  const payload = { ...assessmentToDb(rec), updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "excavationAssessments", table: "excavation_assessments", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "update", { title: payload.title, verdict: rec.calc?.verdict }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function archiveExcavationAssessment(id, actor) {
  const result = await offlineWrite({
    module: "excavationAssessments", table: "excavation_assessments", action: "update", id,
    payload: { archived_at: new Date().toISOString() },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "archive", {}, actor);
  return { ok: true };
}

export async function restoreExcavationAssessment(id, actor) {
  const result = await offlineWrite({
    module: "excavationAssessments", table: "excavation_assessments", action: "update", id,
    payload: { archived_at: null },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "restore", {}, actor);
  return { ok: true };
}

export async function deleteExcavationAssessment(id, actor) {
  await logAudit(id, "delete", {}, actor).catch(() => {});
  const result = await offlineWrite({ module: "excavationAssessments", table: "excavation_assessments", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorDelete") };
  return { ok: true };
}

// ---------- عکس ----------
// آپلودِ مستقیم در Storage (مثلِ document_idsِ lifting_plans یک آرایه‌ی
// ارجاع روی خودِ رکورد است، نه یک جدولِ جدا) — چون تصویر یک شاهدِ تکمیلی
// است نه خودِ محاسبه، اگر آفلاین باشد کاربر باید دوباره وصل شده و امتحان
// کند؛ خودِ ارزیابی (متن) از مسیرِ offlineWrite همیشه ایمن ذخیره می‌شود.
export async function uploadExcavationPhoto(assessmentId, base64Data, contentType) {
  const ext = (contentType || "").includes("png") ? "png" : "jpg";
  const path = `${assessmentId}/${uid("photo")}.${ext}`;
  try {
    const publicUrl = await uploadBase64ToStorage("excavation-photos", path, base64Data, contentType);
    return { ok: true, url: publicUrl };
  } catch (e) {
    return { __error: true, message: e?.message || terr("owErrUploadFile") };
  }
}

export async function saveExcavationPhotoIds(id, photoIds, actor) {
  const result = await offlineWrite({
    module: "excavationAssessments", table: "excavation_assessments", action: "update", id,
    payload: { photo_ids: photoIds || [], updated_at: new Date().toISOString() },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "photo_upload", { count: (photoIds || []).length }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ---------- Standard Profile — Configurable + Versioned ----------

export async function loadStandardProfile() {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`excavation_standard_profiles?select=*&is_active=eq.true&order=version.desc`);
  const list = sbOk(rows) ? rows : [];
  const own = list.find((r) => r.company_id && r.company_id === companyId);
  const sys = list.find((r) => !r.company_id);
  const pick = own || sys;
  if (!pick) return null;
  return {
    id: pick.id, companyId: pick.company_id || null, version: pick.version,
    profile: pick.profile || {}, note: pick.note || "", isSystemDefault: !pick.company_id,
  };
}

export async function loadStandardProfileHistory() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`excavation_standard_profiles?company_id=eq.${companyId}&select=*&order=version.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, version: r.version, isActive: r.is_active !== false, profile: r.profile || {},
    note: r.note || "", createdBy: r.created_by || "", createdAt: r.created_at,
  }));
}

// نسخه‌ی جدیدِ Standard Profile را برای شرکت ثبت می‌کند: نسخه‌های قبلیِ همان
// شرکت غیرفعال، نسخه‌ی جدید فعال. قالبِ سیستمی (company_id is null) دست‌نخورده می‌ماند.
export async function saveStandardProfile(profile, note, actor) {
  const companyId = getCurrentCompanyId();
  if (!companyId) return { __error: true, message: terr("sharedErrUnknown") };
  const existing = await sb(`excavation_standard_profiles?company_id=eq.${companyId}&select=version&order=version.desc&limit=1`);
  const nextVersion = sbOk(existing) && existing.length ? (existing[0].version || 0) + 1 : 1;
  await sb(`excavation_standard_profiles?company_id=eq.${companyId}`, {
    method: "PATCH", body: JSON.stringify({ is_active: false }), prefer: "return=minimal",
  });
  const rows = await sb("excavation_standard_profiles", {
    method: "POST",
    body: JSON.stringify([{
      id: uid("exp"), company_id: companyId, version: nextVersion, is_active: true,
      profile: profile || {}, note: note || "", created_by: actor || "",
    }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
  return { id: rows[0].id, version: rows[0].version, profile: rows[0].profile || {}, note: rows[0].note || "" };
}
