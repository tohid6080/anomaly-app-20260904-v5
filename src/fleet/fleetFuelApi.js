import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { isOnline } from "../offline/networkStatus.js";
import { getRecordsByModule, putRecord } from "../offline/offlineDb.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const terr = (key) => translate(getCurrentLang(), key);

/* ============================================================================ *
 * Vehicle Fleet Fuel Consumption Calculator — لایه‌ی داده، IHMS-Native.
 * همان الگوی energy/energyApi.js: xFromRow/xToDb + offlineWrite + company
 * scoping. بانکِ خودرو per Company/Project (+ ردیف‌های سیستمی)؛ Audit Trail.
 * ============================================================================ */

export const FUEL_TYPE_LABEL_KEYS = {
  gasoline: "ffFuelGasoline", diesel: "ffFuelDiesel", cng: "ffFuelCng",
  hybrid: "ffFuelHybrid", lpg: "ffFuelLpg", other: "ffFuelOther",
};

// ---------- نگاشتِ ردیفِ مطالعه ----------

function assessmentFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || "",
    project: r.project || "",
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    title: r.title || "",
    assessmentDate: r.assessment_date || "",
    cityShareDefault: r.city_share_default ?? 0.6,
    items: Array.isArray(r.items) ? r.items : [],
    calc: r.calc && typeof r.calc === "object" ? r.calc : {},
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
    city_share_default: rec.cityShareDefault == null ? 0.6 : Number(rec.cityShareDefault),
    items: Array.isArray(rec.items) ? rec.items : [],
    calc: rec.calc || {},
    notes: rec.notes || "",
  };
}

// ---------- Audit Trail (append-only) ----------

async function logAudit(assessmentId, action, detail, actor) {
  await offlineWrite({
    module: "fleetFuelAudit",
    table: "fleet_fuel_audit",
    action: "insert",
    id: uid("ffaud"),
    payload: {
      assessment_id: assessmentId,
      company_id: getCurrentCompanyId(),
      action,
      detail: detail || {},
      actor: actor || "",
    },
  });
}

export async function loadFleetAudit(assessmentId) {
  const rows = await sb(`fleet_fuel_audit?assessment_id=eq.${assessmentId}&select=*&order=created_at.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, action: r.action, detail: r.detail || {}, actor: r.actor || "", createdAt: r.created_at,
  }));
}

// ---------- لیست / تک ----------

export async function loadFleetAssessments({ includeArchived = true } = {}) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const statusFilter = includeArchived ? "" : "&archived_at=is.null";
  if (isOnline()) {
    const rows = await sb(`fleet_fuel_assessments?select=*&order=created_at.desc${filter}${statusFilter}`);
    if (sbOk(rows)) {
      try {
        for (const r of rows) await putRecord("fleetFuelAssessments", r.id, r, "synced");
        const cached = await getRecordsByModule("fleetFuelAssessments");
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
  const cached = await getRecordsByModule("fleetFuelAssessments");
  return cached
    .filter((c) => !c.data?.deleted)
    .map((c) => assessmentFromRow({ ...c.data, __syncStatus: c.syncStatus }))
    .filter((a) => includeArchived || !a.archivedAt);
}

// ---------- ساخت / ویرایش / بایگانی / حذف ----------

export async function createFleetAssessment(rec, actor) {
  const id = uid("ffa");
  const payload = { ...assessmentToDb(rec), company_id: getCurrentCompanyId(), created_by: actor || "" };
  const result = await offlineWrite({ module: "fleetFuelAssessments", table: "fleet_fuel_assessments", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("errCreate") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "create", { title: payload.title, project: payload.project, yearlyLiters: rec.calc?.yearlyLiters }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function updateFleetAssessment(id, rec, actor) {
  const payload = { ...assessmentToDb(rec), updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "fleetFuelAssessments", table: "fleet_fuel_assessments", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "update", { title: payload.title, yearlyLiters: rec.calc?.yearlyLiters }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function archiveFleetAssessment(id, actor) {
  const result = await offlineWrite({
    module: "fleetFuelAssessments", table: "fleet_fuel_assessments", action: "update", id,
    payload: { archived_at: new Date().toISOString() },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "archive", {}, actor);
  return { ok: true };
}

export async function restoreFleetAssessment(id, actor) {
  const result = await offlineWrite({
    module: "fleetFuelAssessments", table: "fleet_fuel_assessments", action: "update", id,
    payload: { archived_at: null },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "restore", {}, actor);
  return { ok: true };
}

export async function deleteFleetAssessment(id, actor) {
  await logAudit(id, "delete", {}, actor).catch(() => {});
  const result = await offlineWrite({ module: "fleetFuelAssessments", table: "fleet_fuel_assessments", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorDelete") };
  return { ok: true };
}

// ---------- بانکِ خودرو (استاندارد + اختصاصیِ Company/Project) ----------

function bankFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || null,
    project: r.project || "",
    brand: r.brand || "",
    model: r.model || "",
    trim: r.trim || "",
    engine: r.engine || "",
    gearbox: r.gearbox || "",
    fuelType: r.fuel_type || "gasoline",
    modelYear: r.model_year ?? null,
    cityL100: r.city_l100 ?? null,
    highwayL100: r.highway_l100 ?? null,
    combinedL100: r.combined_l100 ?? null,
    source: r.source || "",
    plate: r.plate || "",
    fleetCode: r.fleet_code || "",
    notes: r.notes || "",
    isSystem: !!r.is_system || !r.company_id,
    isActive: r.is_active !== false,
  };
}
function bankToDb(rec) {
  const nn = (v) => (v === "" || v == null ? null : Number(v));
  return {
    project: rec.project || "",
    brand: rec.brand || "",
    model: rec.model || "",
    trim: rec.trim || "",
    engine: rec.engine || "",
    gearbox: rec.gearbox || "",
    fuel_type: ["gasoline", "diesel", "cng", "hybrid", "lpg", "other"].includes(rec.fuelType) ? rec.fuelType : "gasoline",
    model_year: nn(rec.modelYear),
    city_l100: nn(rec.cityL100),
    highway_l100: nn(rec.highwayL100),
    combined_l100: nn(rec.combinedL100),
    source: rec.source || "",
    plate: rec.plate || "",
    fleet_code: rec.fleetCode || "",
    notes: rec.notes || "",
    is_active: rec.isActive !== false,
  };
}

export async function loadVehicleBank() {
  const rows = await sb(`fleet_vehicle_bank?select=*&is_active=eq.true&order=is_system.desc,brand.asc,model.asc`);
  return (sbOk(rows) ? rows : []).map(bankFromRow);
}

export async function upsertBankVehicle(rec, actor) {
  const body = bankToDb(rec);
  if (rec.id && !String(rec.id).startsWith("fvb-sys-")) {
    const rows = await sb(`fleet_vehicle_bank?id=eq.${rec.id}`, {
      method: "PATCH", body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
    return bankFromRow(rows[0]);
  }
  const rows = await sb("fleet_vehicle_bank", {
    method: "POST",
    body: JSON.stringify([{ id: uid("fvb"), company_id: getCurrentCompanyId(), is_system: false, created_by: actor || "", ...body }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("errCreate") };
  return bankFromRow(rows[0]);
}

export async function deleteBankVehicle(id) {
  if (String(id).startsWith("fvb-sys-")) return { __error: true, message: terr("sharedErrUnknown") };
  const res = await sb(`fleet_vehicle_bank?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (res && res.__error) return { __error: true, message: res.message || terr("commonErrorDelete") };
  return { ok: true };
}
