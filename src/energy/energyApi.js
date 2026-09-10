import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { isOnline } from "../offline/networkStatus.js";
import { getRecordsByModule, putRecord } from "../offline/offlineDb.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const terr = (key) => translate(getCurrentLang(), key);

/* ============================================================================ *
 * Energy / Power Consumption Calculator — لایه‌ی داده، IHMS-Native.
 * همان الگوی excavation/excavationApi.js و lifting/liftingPlanApi.js:
 * xFromRow/xToDb + offlineWrite + company scoping. تعرفه به‌شکلِ
 * Configurable + Versioned؛ بانکِ تجهیزات per Company/Project؛ Audit Trail.
 * ============================================================================ */

export const EQUIP_CATEGORY_LABEL_KEYS = {
  cooling: "enCatCooling", heating: "enCatHeating", chiller: "enCatChiller",
  pump: "enCatPump", compressor: "enCatCompressor", fan: "enCatFan",
  lighting: "enCatLighting", office: "enCatOffice", welding: "enCatWelding",
  panel: "enCatPanel", other: "enCatOther",
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
    tariffVersionId: r.tariff_version_id || "",
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
    tariff_version_id: rec.tariffVersionId || null,
    items: Array.isArray(rec.items) ? rec.items : [],
    calc: rec.calc || {},
    notes: rec.notes || "",
  };
}

// ---------- Audit Trail (append-only) ----------

async function logAudit(assessmentId, action, detail, actor) {
  await offlineWrite({
    module: "energyAudit",
    table: "energy_audit",
    action: "insert",
    id: uid("enaud"),
    payload: {
      assessment_id: assessmentId,
      company_id: getCurrentCompanyId(),
      action,
      detail: detail || {},
      actor: actor || "",
    },
  });
}

export async function loadEnergyAudit(assessmentId) {
  const rows = await sb(`energy_audit?assessment_id=eq.${assessmentId}&select=*&order=created_at.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, action: r.action, detail: r.detail || {}, actor: r.actor || "", createdAt: r.created_at,
  }));
}

// ---------- لیست / تک ----------

export async function loadEnergyAssessments({ includeArchived = true } = {}) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const statusFilter = includeArchived ? "" : "&archived_at=is.null";
  if (isOnline()) {
    const rows = await sb(`energy_assessments?select=*&order=created_at.desc${filter}${statusFilter}`);
    if (sbOk(rows)) {
      try {
        for (const r of rows) await putRecord("energyAssessments", r.id, r, "synced");
        const cached = await getRecordsByModule("energyAssessments");
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
  const cached = await getRecordsByModule("energyAssessments");
  return cached
    .filter((c) => !c.data?.deleted)
    .map((c) => assessmentFromRow({ ...c.data, __syncStatus: c.syncStatus }))
    .filter((a) => includeArchived || !a.archivedAt);
}

// ---------- ساخت / ویرایش / بایگانی / حذف ----------

export async function createEnergyAssessment(rec, actor) {
  const id = uid("ena");
  const payload = { ...assessmentToDb(rec), company_id: getCurrentCompanyId(), created_by: actor || "" };
  const result = await offlineWrite({ module: "energyAssessments", table: "energy_assessments", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("errCreate") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "create", { title: payload.title, project: payload.project, yearlyKwh: rec.calc?.yearlyKwh }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function updateEnergyAssessment(id, rec, actor) {
  const payload = { ...assessmentToDb(rec), updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "energyAssessments", table: "energy_assessments", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "update", { title: payload.title, yearlyKwh: rec.calc?.yearlyKwh }, actor);
  return { ...assessmentFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function archiveEnergyAssessment(id, actor) {
  const result = await offlineWrite({
    module: "energyAssessments", table: "energy_assessments", action: "update", id,
    payload: { archived_at: new Date().toISOString() },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "archive", {}, actor);
  return { ok: true };
}

export async function restoreEnergyAssessment(id, actor) {
  const result = await offlineWrite({
    module: "energyAssessments", table: "energy_assessments", action: "update", id,
    payload: { archived_at: null },
  });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "restore", {}, actor);
  return { ok: true };
}

export async function deleteEnergyAssessment(id, actor) {
  await logAudit(id, "delete", {}, actor).catch(() => {});
  const result = await offlineWrite({ module: "energyAssessments", table: "energy_assessments", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorDelete") };
  return { ok: true };
}

// ---------- بانکِ تجهیزات (استاندارد + اختصاصیِ Company/Project) ----------

function bankFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || null,
    project: r.project || "",
    name: r.name || "",
    category: r.category || "other",
    ratingKind: r.rating_kind || "power",
    powerKw: r.power_kw ?? null,
    currentA: r.current_a ?? null,
    voltageV: r.voltage_v ?? 400,
    phase: r.phase || "three",
    pf: r.power_factor ?? 0.85,
    loadFactor: r.default_load_factor ?? 1,
    dutyCycle: r.default_duty_cycle ?? 1,
    notes: r.notes || "",
    isSystem: !!r.is_system || !r.company_id,
    isActive: r.is_active !== false,
  };
}
function bankToDb(rec) {
  return {
    project: rec.project || "",
    name: rec.name || "",
    category: rec.category || "other",
    rating_kind: rec.ratingKind === "current" ? "current" : "power",
    power_kw: rec.powerKw === "" || rec.powerKw == null ? null : Number(rec.powerKw),
    current_a: rec.currentA === "" || rec.currentA == null ? null : Number(rec.currentA),
    voltage_v: Number(rec.voltageV) || 400,
    phase: ["single", "three", "dc"].includes(rec.phase) ? rec.phase : "three",
    power_factor: Number(rec.pf) || 0.85,
    default_load_factor: rec.loadFactor == null ? 1 : Number(rec.loadFactor),
    default_duty_cycle: rec.dutyCycle == null ? 1 : Number(rec.dutyCycle),
    notes: rec.notes || "",
    is_active: rec.isActive !== false,
  };
}

// همه‌ی ردیف‌های خواندنی: سیستمی (company_id is null) + همین شرکت. UI بر پایه‌ی
// project فیلتر/گروه‌بندی می‌کند (project='' یعنی سطحِ شرکت).
export async function loadEnergyBank() {
  const rows = await sb(`energy_equipment_bank?select=*&is_active=eq.true&order=is_system.desc,category.asc,name.asc`);
  return (sbOk(rows) ? rows : []).map(bankFromRow);
}

export async function upsertBankEquipment(rec, actor) {
  const body = bankToDb(rec);
  if (rec.id && !String(rec.id).startsWith("eeb-sys-")) {
    const rows = await sb(`energy_equipment_bank?id=eq.${rec.id}`, {
      method: "PATCH", body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
    return bankFromRow(rows[0]);
  }
  const rows = await sb("energy_equipment_bank", {
    method: "POST",
    body: JSON.stringify([{ id: uid("eeb"), company_id: getCurrentCompanyId(), is_system: false, created_by: actor || "", ...body }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("errCreate") };
  return bankFromRow(rows[0]);
}

export async function deleteBankEquipment(id) {
  if (String(id).startsWith("eeb-sys-")) return { __error: true, message: terr("sharedErrUnknown") };
  const res = await sb(`energy_equipment_bank?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (res && res.__error) return { __error: true, message: res.message || terr("commonErrorDelete") };
  return { ok: true };
}

// ---------- تعرفه — Configurable + Versioned ----------

export async function loadEnergyTariff() {
  const companyId = getCurrentCompanyId();
  const rows = await sb(`energy_tariffs?select=*&is_active=eq.true&order=version.desc`);
  const list = sbOk(rows) ? rows : [];
  const own = list.find((r) => r.company_id && r.company_id === companyId);
  const sys = list.find((r) => !r.company_id);
  const pick = own || sys;
  if (!pick) return null;
  return {
    id: pick.id, companyId: pick.company_id || null, version: pick.version,
    tariff: pick.tariff || {}, note: pick.note || "", isSystemDefault: !pick.company_id,
  };
}

export async function loadEnergyTariffHistory() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`energy_tariffs?company_id=eq.${companyId}&select=*&order=version.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, version: r.version, isActive: r.is_active !== false, tariff: r.tariff || {},
    note: r.note || "", createdBy: r.created_by || "", createdAt: r.created_at,
  }));
}

export async function saveEnergyTariff(tariff, note, actor) {
  const companyId = getCurrentCompanyId();
  if (!companyId) return { __error: true, message: terr("sharedErrUnknown") };
  const existing = await sb(`energy_tariffs?company_id=eq.${companyId}&select=version&order=version.desc&limit=1`);
  const nextVersion = sbOk(existing) && existing.length ? (existing[0].version || 0) + 1 : 1;
  await sb(`energy_tariffs?company_id=eq.${companyId}`, {
    method: "PATCH", body: JSON.stringify({ is_active: false }), prefer: "return=minimal",
  });
  const rows = await sb("energy_tariffs", {
    method: "POST",
    body: JSON.stringify([{
      id: uid("etar"), company_id: companyId, version: nextVersion, is_active: true,
      tariff: tariff || {}, note: note || "", created_by: actor || "",
    }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
  return { id: rows[0].id, version: rows[0].version, tariff: rows[0].tariff || {}, note: rows[0].note || "" };
}
