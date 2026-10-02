import { sb, sbOk, getCurrentCompanyId } from "../shared.js";
import { manageProjectHse } from "../sessionToken.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

// ---------- قالب‌های پروژه ----------
// پیکربندیِ ثابت (نه داده‌ی واقعی — طبقِ خواسته‌ی صریح)؛ فقط به کلیدهایِ
// واقعیِ HSE_MODULES (App.jsx) اشاره می‌کند، بدونِ هیچ فعال/غیرفعال‌سازیِ
// واقعیِ ماژولی — صرفاً یک چک‌لیستِ مرجع در پروفایلِ پروژه.
// suggestedModuleLabelKeys مستقیماً همان labelKeyهایِ واقعیِ HSE_MODULES
// (App.jsx) را نگه می‌دارد — نه کلیدِ ماژول را، چون import از App.jsx به
// اینجا یک وابستگیِ حلقوی می‌ساخت (App.jsx خودش ProjectsDashboard را mount
// می‌کند). اگر روزی labelKeyِ یکی از ماژول‌ها در App.jsx تغییر کرد، همین‌جا
// هم باید دستی هماهنگ شود.
export const PROJECT_TEMPLATES = [
  { key: "industrial", labelKey: "projTplIndustrial", suggestedModuleLabelKeys: ["moduleAnomalyReport", "moduleMachinery", "moduleScaffold", "moduleRiskAssessment", "moduleProactiveIndicators"] },
  { key: "construction", labelKey: "projTplConstruction", suggestedModuleLabelKeys: ["moduleAnomalyReport", "moduleScaffold", "moduleMachinery", "moduleRiskAssessment"] },
  { key: "power_plant", labelKey: "projTplPowerPlant", suggestedModuleLabelKeys: ["moduleAnomalyReport", "moduleMachinery", "moduleRiskAssessment", "modulePermitToWork", "modulePssr"] },
  { key: "oil_gas", labelKey: "projTplOilGas", suggestedModuleLabelKeys: ["moduleAnomalyReport", "modulePermitToWork", "moduleRiskAssessment", "moduleMachinery", "moduleIncidentManagement"] },
];

// ---------- نگاشت رکورد Project (contractor_companies) ----------
function projectFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    name: r.name,
    description: r.description || "",
    templateKey: r.template_key || "",
    isActive: r.is_active !== false,
    createdBy: r.created_by || "",
    createdAt: r.created_at,
  };
}

// ---------- CRUD پروژه ----------
export async function loadProjects() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`contractor_companies?company_id=eq.${companyId}&select=*&order=name.asc`);
  return sbOk(rows) ? rows.map(projectFromRow) : [];
}

export async function createProject({ name, description, templateKey }) {
  const companyId = getCurrentCompanyId();
  const clean = (name || "").trim();
  if (!clean) return { __error: true, message: tr("projErrNameRequired") };
  const payload = { company_id: companyId, name: clean, description: description || "", template_key: templateKey || null };
  const rows = await sb("contractor_companies", { method: "POST", body: JSON.stringify([payload]) });
  if (!sbOk(rows)) return { __error: true, message: tr("projErrCreate") };
  return projectFromRow(rows[0]);
}

export async function renameProject(id, name) {
  const clean = (name || "").trim();
  if (!clean) return { __error: true, message: tr("projErrNameRequired") };
  const rows = await sb(`contractor_companies?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ name: clean }) });
  if (!sbOk(rows)) return { __error: true, message: tr("projErrRename") };
  return { ok: true };
}

export async function updateProjectProfile(id, { description, templateKey } = {}) {
  const payload = {};
  if (description !== undefined) payload.description = description || "";
  if (templateKey !== undefined) payload.template_key = templateKey || null;
  const rows = await sb(`contractor_companies?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  if (!sbOk(rows)) return { __error: true, message: tr("projErrSaveProfile") };
  return { ok: true };
}

export async function setProjectActive(id, active) {
  const rows = await sb(`contractor_companies?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ is_active: active }) });
  if (!sbOk(rows)) return { __error: true, message: tr("projErrToggleStatus") };
  return { ok: true };
}

export async function deleteProject(id) {
  const result = await sb(`contractor_companies?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (!sbOk(result)) return { __error: true, message: tr("projErrDelete") };
  return { ok: true };
}

// ---------- «HSE پروژه» (contractors نام‌منطبق‌شده با پروژه) ----------
// خواندن مستقیم sb() (همان RLS موجودِ company-scoped که بقیه‌ی ماژول‌ها هم
// برای contractors استفاده می‌کنند — نگاه کن به chatApi.js/correctiveActionsApi.js)؛
// فقط نوشتن (create/update/deactivate/reset/delete) از Edge Function
// مضیق manage-project-hse رد می‌شود، چون credential می‌سازد/عوض می‌کند.
function projectHseAccountFromRow(r) {
  return {
    id: r.id,
    name: r.name || "",
    username: r.username || "",
    contactPersonName: r.contact_person_name || "",
    jobPositionId: r.job_position_id || "",
    startDate: r.start_date || "",
    contractDetails: r.contract_details || "",
    phone: r.phone || "",
    email: r.email || "",
    isActive: r.is_active !== false,
  };
}

export async function loadProjectHseAccounts() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`contractors?company_id=eq.${companyId}&select=*&order=name.asc`);
  return sbOk(rows) ? rows.map(projectHseAccountFromRow) : [];
}

function normalizeHseResult(result) {
  if (result?.error) return { __error: true, message: result.message, needsTransfer: result.needsTransfer };
  return result;
}

export async function createProjectHseAccount(fields) {
  return normalizeHseResult(await manageProjectHse("create", { fields }));
}
export async function updateProjectHseAccount(id, fields) {
  return normalizeHseResult(await manageProjectHse("update", { targetId: id, fields }));
}
export async function setProjectHseAccountActive(id, active) {
  return normalizeHseResult(await manageProjectHse(active ? "reactivate" : "deactivate", { targetId: id }));
}
export async function resetProjectHseAccountPassword(id, newPassword) {
  return normalizeHseResult(await manageProjectHse("reset_password", { targetId: id, newPassword }));
}
export async function deleteProjectHseAccount(id, opts = {}) {
  return normalizeHseResult(await manageProjectHse("delete", { targetId: id, ...opts }));
}

// ---------- کارشناسانِ فعالِ شرکت رویِ یک پروژه (مشتق‌شده، بدونِ جدولِ تازه) ----------
// از همان corrective_actions.project_name/responsible_employer_account_id که
// فیچرِ «کارهای در دست اقدام» همین نشست ساخته — فقط گروه‌بندی‌شده بر اساسِ پروژه.
export async function loadActiveExpertsForProject(projectName) {
  const companyId = getCurrentCompanyId();
  if (!projectName) return [];
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`corrective_actions?project_name=eq.${encodeURIComponent(projectName)}&status=neq.closed&status=neq.expired&responsible_employer_account_id=not.is.null&select=responsible_employer_account_id,responsible_employer_account_name${filter}`);
  if (!sbOk(rows)) return [];
  const seen = new Map();
  rows.forEach((r) => {
    if (r.responsible_employer_account_id) seen.set(r.responsible_employer_account_id, r.responsible_employer_account_name || "");
  });
  return Array.from(seen, ([id, name]) => ({ id, name }));
}

// ---------- داده‌ی واقعیِ مقایسه/داشبورد — یک‌بار واکشی در سطحِ شرکت ----------
// هیچ project_id به anomalies/corrective_actions/machinery تزریق نمی‌شود؛
// فقط رویِ ستون‌هایِ متنیِ project/project_name موجود فیلتر/گروه‌بندی می‌شود
// (طبقِ محدودیتِ صریحِ این فاز). یک Promise.all برای کلِ شرکت، نه N کوئری
// به ازایِ هر پروژه — تابعِ برگشتی را UI برایِ هر پروژه صدا می‌زند.
export async function loadProjectMetricsBundle() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const today = new Date(new Date().toDateString());
  const [anomalyRows, caRows, machineryRows] = await Promise.all([
    sb(`anomalies?select=project,status${filter}`).catch(() => []),
    sb(`corrective_actions?select=project_name,status,due_date${filter}`).catch(() => []),
    sb(`machinery?select=project,inspection_expiry${filter}`).catch(() => []),
  ]);
  const anomalies = sbOk(anomalyRows) ? anomalyRows : [];
  const correctiveActions = sbOk(caRows) ? caRows : [];
  const machinery = sbOk(machineryRows) ? machineryRows : [];

  return function metricsForProject(projectName) {
    const openAnomalies = anomalies.filter((a) => a.project === projectName && a.status !== "Closed").length;
    const caForProject = correctiveActions.filter((c) => c.project_name === projectName);
    const openActions = caForProject.filter((c) => c.status !== "closed" && c.status !== "expired").length;
    const overdueActions = caForProject.filter((c) => c.due_date && c.status !== "closed" && c.status !== "expired" && new Date(c.due_date) < today).length;
    const machineryForProject = machinery.filter((m) => m.project === projectName);
    const expiredInspections = machineryForProject.filter((m) => m.inspection_expiry && new Date(m.inspection_expiry) < today).length;
    return { openAnomalies, openActions, overdueActions, machineryCount: machineryForProject.length, expiredInspections };
  };
}
