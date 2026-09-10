import { sb, sbOk, uid, getCurrentCompanyId, THEME } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { isOnline } from "../offline/networkStatus.js";
import { getRecordsByModule, putRecord } from "../offline/offlineDb.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { syncCraneRig } from "./liftingCalcEngine.js";
import { deleteGateItemsForRecord } from "../hseGateApi.js";

const terr = (key) => translate(getCurrentLang(), key);

/* ============================================================================ *
 * Lifting Plan Designer — لایه‌ی داده، IHMS-Native.
 * همان الگوی بقیه‌ی ماژول‌ها: xFromRow/xToDb + offlineWrite + company scoping.
 * scene/calc داده‌محورند (JSONB) — نه اسکرین‌شات. Versioning در جدولِ جدا،
 * Audit Trail در جدولِ append-only.
 * ============================================================================ */

export const LIFTING_STATUS_META = {
  draft:     { labelKey: "lpStatusDraft",    color: THEME.text3,  bg: THEME.surface2 },
  in_review: { labelKey: "lpStatusInReview", color: THEME.warn,   bg: THEME.warnBg },
  approved:  { labelKey: "lpStatusApproved", color: THEME.ok,     bg: THEME.okBg },
  rejected:  { labelKey: "lpStatusRejected", color: THEME.danger, bg: THEME.dangerBg },
  archived:  { labelKey: "lpStatusArchived", color: THEME.text3,  bg: THEME.surface2 },
};
export const LIFTING_STATUS_ORDER = ["draft", "in_review", "approved", "rejected", "archived"];

export function liftingStatusMeta(v) {
  return LIFTING_STATUS_META[v] || LIFTING_STATUS_META.draft;
}

export const CRANE_TYPES = [
  { value: "mobile", labelKey: "lpCraneMobile" },
  { value: "crawler", labelKey: "lpCraneCrawler" },
  { value: "tower", labelKey: "lpCraneTower" },
  { value: "telehandler", labelKey: "lpCraneTelehandler" },
  { value: "overhead", labelKey: "lpCraneOverhead" },
  { value: "other", labelKey: "lpCraneOther" },
];

// انواعِ اشیای نقشه — داده‌محور، برای فاز ۲ (بوم). اینجا نگه داشته می‌شود تا
// scene همیشه با یک واژه‌نامه‌ی واحد ساخته شود.
export const LIFTING_OBJECT_TYPES = [
  "crane", "load", "hook", "sling", "shackle", "spreader_beam",
  "structure", "truck", "power_line", "worker", "barrier", "exclusion_zone",
];

// نسخه‌ی مدلِ صحنه: 2 = مدلِ CAD (مختصات به متر، فیلدها صاف).
export const SCENE_MODEL = 2;
export const EMPTY_SCENE = {
  v: SCENE_MODEL,
  canvas: { grid: true },
  env: { soilKpa: 250, sf: 2, travelHeight: 12 },
  objects: [],
};

// صحنه‌های قدیمی‌ترِ فاز ۲ (مختصات به px، فیلدها زیرِ props) را به مدلِ CAD
// تبدیل می‌کند. اگر صحنه از قبل CAD باشد، بدونِ تغییر برمی‌گردد.
export function normalizeScene(scene) {
  if (!scene || typeof scene !== "object") return { ...EMPTY_SCENE };
  const objs = Array.isArray(scene.objects) ? scene.objects : [];
  if (scene.v === SCENE_MODEL || !objs.some((o) => o && o.props)) {
    // پلن‌های CADِ قدیمی‌تر بدونِ فیلدهای بوم را هم به مجموعه‌ی جرثقیل ارتقا بده
    const upgraded = objs.map((o) =>
      o && o.type === "crane" && o.boomLengthM == null
        ? { ...o, boomLengthM: 24, boomAngleDeg: 65 }
        : o
    );
    return { ...EMPTY_SCENE, ...scene, v: SCENE_MODEL, env: { ...EMPTY_SCENE.env, ...(scene.env || {}) }, objects: syncCraneRig(upgraded) };
  }
  const mPerPx = scene.canvas?.scale_m_per_px || 0.1;
  const conv = objs.map((o) => {
    const p = o.props || {};
    const wm = (o.w || 0) * mPerPx, hm = (o.h || 0) * mPerPx;
    const b = { id: o.id, type: o.type, rot: o.rot || 0, x: (o.x || 0) * mPerPx, y: (o.y || 0) * mPerPx };
    if (o.type === "load") {
      return { ...b, shape: "rect", w: wm || 4, h: hm || 2, weightKg: +p.weightKg || 0, label: p.label || "",
        cg: { x: 0, y: 0 },
        picks: [{ x: -(wm || 4) / 2 * 0.8, y: -(hm || 2) / 2 * 0.8 }, { x: (wm || 4) / 2 * 0.8, y: -(hm || 2) / 2 * 0.8 },
          { x: (wm || 4) / 2 * 0.8, y: (hm || 2) / 2 * 0.8 }, { x: -(wm || 4) / 2 * 0.8, y: (hm || 2) / 2 * 0.8 }] };
    }
    if (o.type === "crane") return { ...b, model: p.model || "", weightKg: +p.weightKg || 50000, pads: +p.pads || 4, padArea: +p.padArea || 0.5, boomLengthM: +p.boomLengthM || 24, boomAngleDeg: p.boomAngleDeg == null ? 65 : +p.boomAngleDeg, craneModelId: p.craneModelId || "", machineryId: p.machineryId || "", chart: Array.isArray(p.chart) ? p.chart : [], chartRef: p.chartRef || "" };
    if (o.type === "hook") return { ...b, weightKg: +p.weightKg || 200, wllKg: +p.wllKg || 20000, riggingH: +p.riggingH || 4 };
    if (o.type === "sling") return { ...b, type: "slingset", count: +p.count || 4, wllKg: +p.wllKg || 10000, weightKg: +p.weightKg || 120, len: +p.lengthM || 6 };
    if (o.type === "shackle") return { ...b, count: +p.count || 4, wllKg: +p.wllKg || 9500, weightKg: +p.weightKg || 120 };
    if (o.type === "spreader_beam") return { ...b, type: "spreader", len: +p.lengthM || 4, wllKg: +p.wllKg || 16000, weightKg: +p.weightKg || 600, enabled: true };
    if (o.type === "power_line") return { ...b, len: wm || 30, kv: +p.voltageKv || 132, heightM: +p.heightM || 11 };
    if (o.type === "worker") return { ...b, role: p.role || "", personnelId: p.personnelId || "" };
    return { ...b, w: wm || 4, h: hm || 3, label: p.label || "" };
  });
  return { ...EMPTY_SCENE, ...scene, v: SCENE_MODEL, env: { ...EMPTY_SCENE.env, ...(scene.env || {}) }, objects: syncCraneRig(conv) };
}

// ---------- نگاشتِ ردیف ----------

function planFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id || "",
    planNumber: r.plan_number || "",
    revision: r.revision || "0",
    planDate: r.plan_date || "",
    project: r.project || "",
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    title: r.title || "",
    preparedBy: r.prepared_by || "",
    reviewedBy: r.reviewed_by || "",
    approvedBy: r.approved_by || "",
    status: r.status || "draft",
    scene: r.scene && typeof r.scene === "object" ? r.scene : { ...EMPTY_SCENE },
    calc: r.calc && typeof r.calc === "object" ? r.calc : {},
    criteriaVersionId: r.criteria_version_id || "",
    linkedRiskAssessmentId: r.linked_risk_assessment_id || "",
    linkedCapaIds: Array.isArray(r.linked_capa_ids) ? r.linked_capa_ids : [],
    documentIds: Array.isArray(r.document_ids) ? r.document_ids : [],
    archivedAt: r.archived_at || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

// فقط فیلدهای متادیتا — scene/calc مسیرِ ذخیره‌ی جداگانه دارند (draft-first).
function planMetaToDb(rec) {
  return {
    plan_number: rec.planNumber || "",
    revision: rec.revision || "0",
    plan_date: rec.planDate || null,
    project: rec.project || "",
    contractor_id: rec.contractorId || null,
    contractor_name: rec.contractorName || "",
    title: rec.title || "",
    prepared_by: rec.preparedBy || "",
    reviewed_by: rec.reviewedBy || "",
    approved_by: rec.approvedBy || "",
  };
}

// ---------- Audit Trail (append-only) ----------

async function logAudit(planId, action, detail, actor) {
  const id = uid("lpaud");
  await offlineWrite({
    module: "liftingPlanAudit",
    table: "lifting_plan_audit",
    action: "insert",
    id,
    payload: {
      plan_id: planId,
      company_id: getCurrentCompanyId(),
      action,
      detail: detail || {},
      actor: actor || "",
    },
  });
}

export async function loadLiftingAudit(planId) {
  const rows = await sb(`lifting_plan_audit?plan_id=eq.${planId}&select=*&order=created_at.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, action: r.action, detail: r.detail || {}, actor: r.actor || "", createdAt: r.created_at,
  }));
}

// ---------- لیست / تک ----------

export async function loadLiftingPlans({ includeArchived = true } = {}) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const statusFilter = includeArchived ? "" : "&status=neq.archived";
  if (isOnline()) {
    const rows = await sb(`lifting_plans?select=*&order=created_at.desc${filter}${statusFilter}`);
    if (sbOk(rows)) {
      try {
        for (const r of rows) await putRecord("liftingPlans", r.id, r, "synced");
        const cached = await getRecordsByModule("liftingPlans");
        const serverIds = new Set(rows.map((r) => r.id));
        const localOnly = cached.filter((c) => c.syncStatus !== "synced" && !serverIds.has(c.id) && !c.data?.deleted);
        return [
          ...localOnly.map((c) => planFromRow({ ...c.data, __syncStatus: c.syncStatus })),
          ...rows.map((r) => planFromRow({ ...r, __syncStatus: "synced" })),
        ].filter((p) => includeArchived || p.status !== "archived");
      } catch {
        return rows.map((r) => planFromRow({ ...r, __syncStatus: "synced" }));
      }
    }
  }
  const cached = await getRecordsByModule("liftingPlans");
  return cached
    .filter((c) => !c.data?.deleted)
    .map((c) => planFromRow({ ...c.data, __syncStatus: c.syncStatus }))
    .filter((p) => includeArchived || p.status !== "archived");
}

export async function loadLiftingPlan(id) {
  const rows = await sb(`lifting_plans?id=eq.${id}&select=*`);
  if (sbOk(rows) && rows.length) return planFromRow(rows[0]);
  const cached = await getRecordsByModule("liftingPlans");
  const hit = cached.find((c) => c.id === id);
  return hit ? planFromRow({ ...hit.data, __syncStatus: hit.syncStatus }) : null;
}

// ---------- ساخت / ویرایشِ متادیتا ----------

export async function createLiftingPlan(rec, actor) {
  const id = uid("lplan");
  const payload = {
    ...planMetaToDb(rec),
    status: "draft",
    scene: { ...EMPTY_SCENE },
    calc: {},
    linked_capa_ids: [],
    document_ids: [],
    company_id: getCurrentCompanyId(),
    created_by: actor || rec.createdBy || "",
  };
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("errCreate") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  await logAudit(id, "create", { planNumber: payload.plan_number, project: payload.project }, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function updateLiftingPlanMeta(id, rec, actor, prev) {
  const payload = { ...planMetaToDb(rec), updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  if (!result.record) return { __error: true, message: terr("errServerInvalidResponse") };
  const changed = {};
  if (prev) {
    for (const k of Object.keys(planMetaToDb(rec))) {
      const before = planMetaToDb(prev)[k];
      const after = planMetaToDb(rec)[k];
      if (String(before ?? "") !== String(after ?? "")) changed[k] = { from: before, to: after };
    }
  }
  await logAudit(id, "update", changed, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ذخیره‌ی محتوای نقشه (فاز ۲) — یک commit صریح، نه on-change.
export async function saveLiftingScene(id, scene, calc, actor) {
  const payload = { scene: scene || { ...EMPTY_SCENE }, updated_at: new Date().toISOString() };
  if (calc !== undefined) payload.calc = calc || {};
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, calc !== undefined ? "calc_run" : "scene_save", { objects: (scene?.objects || []).length }, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ---------- وضعیت ----------

export async function setLiftingPlanStatus(id, status, actor, fromStatus) {
  const payload = { status, updated_at: new Date().toISOString() };
  if (status === "archived") payload.archived_at = new Date().toISOString();
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, status === "archived" ? "archive" : "status_change", { from: fromStatus || "", to: status }, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

export async function archiveLiftingPlan(id, actor, fromStatus) {
  return setLiftingPlanStatus(id, "archived", actor, fromStatus);
}

export async function restoreLiftingPlan(id, actor) {
  const payload = { status: "draft", archived_at: null, updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorSave") };
  await logAudit(id, "restore", { to: "draft" }, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ---------- Duplicate ----------

export async function duplicateLiftingPlan(id, actor) {
  const src = await loadLiftingPlan(id);
  if (!src) return { __error: true, message: terr("commonErrorLoad") };
  const newId = uid("lplan");
  const payload = {
    plan_number: src.planNumber ? `${src.planNumber}-copy` : "",
    revision: "0",
    plan_date: src.planDate || null,
    project: src.project || "",
    contractor_id: src.contractorId || null,
    contractor_name: src.contractorName || "",
    title: src.title ? `${src.title} (کپی)` : "",
    prepared_by: src.preparedBy || "",
    reviewed_by: "",
    approved_by: "",
    status: "draft",
    scene: src.scene || { ...EMPTY_SCENE },
    calc: {},
    criteria_version_id: src.criteriaVersionId || null,
    linked_capa_ids: [],
    document_ids: [],
    company_id: getCurrentCompanyId(),
    created_by: actor || "",
  };
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "insert", id: newId, payload });
  if (!result.ok) return { __error: true, message: result.error || terr("errCreate") };
  await logAudit(newId, "duplicate", { sourcePlanId: id }, actor);
  return { ...planFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ---------- Versioning ----------

function nextRevision(rev) {
  const n = Number(rev);
  if (Number.isFinite(n)) return String(n + 1);
  return `${rev || "0"}-1`;
}

export async function freezeLiftingRevision(id, note, actor) {
  const plan = await loadLiftingPlan(id);
  if (!plan) return { __error: true, message: terr("commonErrorLoad") };
  const revId = uid("lprev");
  const snapRes = await offlineWrite({
    module: "liftingPlanRevisions",
    table: "lifting_plan_revisions",
    action: "insert",
    id: revId,
    payload: {
      plan_id: id,
      company_id: getCurrentCompanyId(),
      revision: plan.revision || "0",
      snapshot: plan,
      note: note || "",
      created_by: actor || "",
    },
  });
  if (!snapRes.ok) return { __error: true, message: snapRes.error || terr("commonErrorSave") };
  const newRev = nextRevision(plan.revision);
  const upd = await offlineWrite({
    module: "liftingPlans",
    table: "lifting_plans",
    action: "update",
    id,
    payload: { revision: newRev, updated_at: new Date().toISOString() },
  });
  if (!upd.ok) return { __error: true, message: upd.error || terr("commonErrorSave") };
  await logAudit(id, "revision", { frozenRevision: plan.revision, newRevision: newRev, note: note || "" }, actor);
  return { ...planFromRow(upd.record), syncStatus: upd.offline ? "pending" : "synced" };
}

export async function loadLiftingRevisions(planId) {
  const rows = await sb(`lifting_plan_revisions?plan_id=eq.${planId}&select=*&order=created_at.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, revision: r.revision, snapshot: r.snapshot || {}, note: r.note || "",
    createdBy: r.created_by || "", createdAt: r.created_at,
  }));
}

// ---------- حذف ----------

export async function deleteLiftingPlan(id, actor) {
  await logAudit(id, "delete", {}, actor).catch(() => {});
  const result = await offlineWrite({ module: "liftingPlans", table: "lifting_plans", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || terr("commonErrorDelete") };
  // طبق همان رفعِ Machinery/Personnel/Anomaly: رکورد گیت مربوطه هم پاک شود —
  // وگرنه یتیم می‌ماند و برای همیشه در «کارهای در دست اقدام من» باقی می‌ماند.
  deleteGateItemsForRecord("liftingPlan", id).catch(() => {});
  return { ok: true };
}

// ---------- Master Data: مدلِ جرثقیل + Load Chart ----------

export const CRANE_MODEL_TYPES = ["mobile", "crawler", "tower", "telehandler", "overhead", "other"];

function craneModelFromRow(r) {
  const lc = Array.isArray(r.load_chart) ? r.load_chart : [];
  // پشتیبانی از هر دو شکل: [[radius,cap]] و [{radius_m,capacity_kg}]
  const loadChart = lc.map((x) =>
    Array.isArray(x)
      ? { radius_m: +x[0], capacity_kg: +x[1] }
      : { radius_m: +x.radius_m, capacity_kg: +x.capacity_kg }
  ).filter((p) => Number.isFinite(p.radius_m) && Number.isFinite(p.capacity_kg));
  return {
    id: r.id, machineryId: r.machinery_id || "", manufacturer: r.manufacturer || "", model: r.model || "",
    craneType: r.crane_type || "mobile", configLabel: r.config_label || "",
    loadChart, chartSource: r.chart_source || "",
    maxCapacityKg: r.max_capacity_kg ?? null, isActive: r.is_active !== false,
    createdBy: r.created_by || "", createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function craneModelToDb(rec) {
  const chart = (rec.loadChart || [])
    .map((p) => ({ radius_m: +p.radius_m, capacity_kg: +p.capacity_kg }))
    .filter((p) => Number.isFinite(p.radius_m) && Number.isFinite(p.capacity_kg))
    .sort((a, b) => a.radius_m - b.radius_m);
  return {
    machinery_id: rec.machineryId || null,
    manufacturer: rec.manufacturer || "",
    model: rec.model || "",
    crane_type: rec.craneType || "mobile",
    config_label: rec.configLabel || "",
    load_chart: chart,
    chart_source: rec.chartSource || "",
    max_capacity_kg: chart.length ? Math.max(...chart.map((p) => p.capacity_kg)) : (rec.maxCapacityKg ?? null),
    is_active: rec.isActive !== false,
  };
}

export async function loadCraneModels({ activeOnly = false } = {}) {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const act = activeOnly ? "&is_active=eq.true" : "";
  const rows = await sb(`lifting_crane_models?select=*&order=created_at.desc${filter}${act}`);
  return (sbOk(rows) ? rows : []).map(craneModelFromRow);
}

export async function upsertCraneModel(rec, actor) {
  const body = craneModelToDb(rec);
  if (rec.id) {
    const rows = await sb(`lifting_crane_models?id=eq.${rec.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
    return craneModelFromRow(rows[0]);
  }
  const rows = await sb("lifting_crane_models", {
    method: "POST",
    body: JSON.stringify([{ id: uid("lcm"), company_id: getCurrentCompanyId(), created_by: actor || "", ...body }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("errCreate") };
  return craneModelFromRow(rows[0]);
}

export async function deleteCraneModel(id) {
  const res = await sb(`lifting_crane_models?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (res && res.__error) return { __error: true, message: res.message || terr("commonErrorDelete") };
  return { ok: true };
}

// ---------- Acceptance Criteria — Configurable + Versioned ----------

export async function loadAcceptanceCriteria() {
  const companyId = getCurrentCompanyId();
  // نسخه‌ی فعالِ شرکت اگر بود، وگرنه قالبِ سیستمی (company_id is null)
  const rows = await sb(`lifting_acceptance_criteria?select=*&is_active=eq.true&order=version.desc`);
  const list = sbOk(rows) ? rows : [];
  const own = list.find((r) => r.company_id && r.company_id === companyId);
  const sys = list.find((r) => !r.company_id);
  const pick = own || sys;
  if (!pick) return null;
  return {
    id: pick.id, companyId: pick.company_id || null, version: pick.version,
    criteria: pick.criteria || {}, note: pick.note || "", isSystemDefault: !pick.company_id,
  };
}

export async function loadCriteriaHistory() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`lifting_acceptance_criteria?company_id=eq.${companyId}&select=*&order=version.desc`);
  return (sbOk(rows) ? rows : []).map((r) => ({
    id: r.id, version: r.version, isActive: r.is_active !== false, criteria: r.criteria || {},
    note: r.note || "", createdBy: r.created_by || "", createdAt: r.created_at,
  }));
}

// نسخه‌ی جدیدِ معیارها را برای شرکت ثبت می‌کند: نسخه‌های قبلیِ همان شرکت
// غیرفعال، نسخه‌ی جدید فعال. قالبِ سیستمی (company_id is null) دست‌نخورده می‌ماند.
export async function saveAcceptanceCriteria(criteria, note, actor) {
  const companyId = getCurrentCompanyId();
  if (!companyId) return { __error: true, message: terr("sharedErrUnknown") };
  const existing = await sb(`lifting_acceptance_criteria?company_id=eq.${companyId}&select=version&order=version.desc&limit=1`);
  const nextVersion = sbOk(existing) && existing.length ? (existing[0].version || 0) + 1 : 1;
  await sb(`lifting_acceptance_criteria?company_id=eq.${companyId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: false }),
    prefer: "return=minimal",
  });
  const rows = await sb("lifting_acceptance_criteria", {
    method: "POST",
    body: JSON.stringify([{
      id: uid("lac"), company_id: companyId, version: nextVersion, is_active: true,
      criteria: criteria || {}, note: note || "", created_by: actor || "",
    }]),
  });
  if (!sbOk(rows)) return { __error: true, message: rows?.message || terr("commonErrorSave") };
  return { id: rows[0].id, version: rows[0].version, criteria: rows[0].criteria || {}, note: rows[0].note || "" };
}
