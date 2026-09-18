import { sb, sbOk } from "./shared.js";

/* ============================================================================ *
 * Module pricing & services — لایه‌ی داده + محاسبه‌ی خالصِ سبدِ خرید.
 *
 * قیمت‌ها Data-driven است (جدول‌های module_prices / services). محاسبه‌ی نهایی
 * سمتِ سرور هم تکرار می‌شود (زرین‌پال Edge Function / تأییدِ کارت‌به‌کارت) —
 * این توابع فقط برای نمایشِ لحظه‌ای در صفحه‌ی خرید است.
 * ============================================================================ */

/* ---------------------------------------------------------------------------- *
 * انتشار (Save ≠ Publish)
 * «ذخیره» رکوردهای زنده‌ی module_prices / services را می‌نویسد (پیش‌نویسِ داخلی).
 * «انتشار» یک عکسِ فوری از قیمت‌ها/خدمات را در system_settings می‌گذارد؛ صفحه‌ی
 * خریدِ مشتری همان عکسِ منتشرشده را می‌خواند. تا اولین انتشار، رفتار دقیقاً مثلِ
 * امروز است (خواندنِ مستقیمِ جدول‌ها) — کاملاً افزایشی و بدونِ رگرسیون.
 * گروه‌بندیِ دلخواهِ ماژول‌ها هم در همان جدول (کلیدِ module_pricing_groups) است؛
 * فقط برچسبِ نمایشی است و روی دسترسی/قیمت اثر ندارد.
 * ---------------------------------------------------------------------------- */
const SS_SNAPSHOT_KEY = "module_pricing_snapshot";
const SS_GROUPS_KEY = "module_pricing_groups";

async function readSystemSettingJson(key) {
  try {
    const rows = await sb(`system_settings?key=eq.${key}&select=value_text`);
    if (!sbOk(rows) || !rows.length || !rows[0].value_text) return null;
    return JSON.parse(rows[0].value_text);
  } catch { return null; }
}
async function writeSystemSettingJson(key, obj, updatedBy) {
  const payload = [{ key, value_text: JSON.stringify(obj), value_numeric: null, updated_at: new Date().toISOString(), updated_by: updatedBy || "" }];
  const rows = await sb("system_settings?on_conflict=key", { method: "POST", body: JSON.stringify(payload), prefer: "resolution=merge-duplicates,return=representation" }, "super_admin");
  return sbOk(rows) ? { ok: true } : { __error: true, message: rows?.message };
}

// ---------- خواندن (هر لاگینی، حتی صفحه‌ی قفلِ اشتراک) ----------
// opts.live === true → همیشه از جدولِ زنده بخوان (برای کنسولِ سوپرادمین که
// پیش‌نویس را ویرایش می‌کند). پیش‌فرض: اگر عکسِ منتشرشده وجود دارد، همان.
export async function loadModulePrices(opts) {
  if (!opts || !opts.live) {
    const snap = await readSystemSettingJson(SS_SNAPSHOT_KEY);
    if (snap && Array.isArray(snap.modules)) return snap.modules.map(mpFromSnap);
  }
  const rows = await sb("module_prices?is_active=eq.true&select=*&order=sort_order.asc,module_key.asc");
  if (!sbOk(rows)) return [];
  return rows.map(mpFromRow);
}
export async function loadServices(opts) {
  if (!opts || !opts.live) {
    const snap = await readSystemSettingJson(SS_SNAPSHOT_KEY);
    if (snap && Array.isArray(snap.services)) return snap.services.map(svcFromSnap);
  }
  const rows = await sb("services?is_active=eq.true&select=*&order=sort_order.asc,name.asc");
  if (!sbOk(rows)) return [];
  return rows.map(svcFromRow);
}

function mpFromSnap(m) {
  return {
    moduleKey: m.moduleKey, label: m.label || "",
    priceMonthly: Number(m.priceMonthly) || 0, priceYearly: Number(m.priceYearly) || 0,
    isFree: !!m.isFree, requires: Array.isArray(m.requires) ? m.requires : [],
    sortOrder: m.sortOrder ?? 0, isActive: true,
  };
}
function svcFromSnap(s) {
  return {
    id: s.id, name: s.name || "", description: s.description || "",
    priceWeekly: Number(s.priceWeekly) || 0, priceMonthly: Number(s.priceMonthly) || 0, priceYearly: Number(s.priceYearly) || 0,
    period: s.period || "monthly", sortOrder: s.sortOrder ?? 0, isActive: true,
  };
}

// module_prices.label فقط فارسی است (یک ستونِ متنیِ ساده در دیتابیس، بدونِ
// چندزبانگی) — صفحه‌ی خریدِ ماژول‌ها و صفحه‌ی «اشتراکِ شما به پایان رسیده
// است» هر دو مستقیم همین label خام را نشان می‌دادند، حتی در زبانِ en/de.
// این نگاشت هر moduleKey را به یک کلیدِ i18n وصل می‌کند تا نامِ ماژول با
// زبانِ فعلیِ سایت هماهنگ باشد؛ اگر moduleKey ای در آینده اضافه شود و اینجا
// ثبت نشود، به همان label خامِ فارسیِ دیتابیس برمی‌گردد (نه خالی/خطا).
export const MODULE_PRICE_LABEL_KEYS = {
  chat: "mpLabelChat",
  notifications: "mpLabelNotifications",
  profile: "mpLabelProfile",
  quickTools: "mpLabelQuickTools",
  anomalyReport: "mpLabelAnomalyReport",
  incidentManagement: "mpLabelIncidentManagement",
  proactiveIndicators: "mpLabelProactiveIndicators",
  scaffoldManagement: "mpLabelScaffoldManagement",
  personnelAccess: "mpLabelPersonnelAccess",
  riskAssessment: "mpLabelRiskAssessment",
  hcmsDashboard: "mpLabelHcmsDashboard",
  riskKnowledgeManagement: "mpLabelRiskKnowledgeManagement",
  operationalDashboard: "mpLabelOperationalDashboard",
  managementDashboard: "mpLabelManagementDashboard",
  machineryManagement: "mpLabelMachineryManagement",
  liftingPlan: "mpLabelLiftingPlan",
  "energy-calculator": "mpLabelEnergyCalculator",
  "fleet-fuel-calculator": "mpLabelFleetFuelCalculator",
  "excavation-calculator": "mpLabelExcavationCalculator",
  archiveManagement: "mpLabelArchiveManagement",
  trainingManagement: "mpLabelTrainingManagement",
  permissionManagement: "mpLabelPermissionManagement",
  jobPositionManagement: "mpLabelJobPositionManagement",
  effectivenessThresholds: "mpLabelEffectivenessThresholds",
  hcmsMatrixManagement: "mpLabelHcmsMatrixManagement",
  chatAccessManagement: "mpLabelChatAccessManagement",
  scaffoldCodeManagement: "mpLabelScaffoldCodeManagement",
  anomalyCategoryManagement: "mpLabelAnomalyCategoryManagement",
  hseSurvey: "mpLabelHseSurvey",
  permitToWork: "mpLabelPermitToWork",
  pssr: "mpLabelPssr",
};
export function moduleDisplayLabel(m, t) {
  const key = MODULE_PRICE_LABEL_KEYS[m?.moduleKey];
  return key ? t(key) : (m?.label || m?.moduleKey || "");
}

// گروه‌بندیِ دلخواه — { groups: [{id,name}], byModule: { moduleKey: groupId } }
export async function loadPricingGroups() {
  const g = await readSystemSettingJson(SS_GROUPS_KEY);
  return {
    groups: Array.isArray(g?.groups) ? g.groups : [],
    byModule: g && typeof g.byModule === "object" && g.byModule ? g.byModule : {},
  };
}
export async function savePricingGroups(obj, updatedBy) {
  return writeSystemSettingJson(SS_GROUPS_KEY, {
    groups: Array.isArray(obj?.groups) ? obj.groups : [],
    byModule: obj && obj.byModule ? obj.byModule : {},
  }, updatedBy);
}

// وضعیتِ آخرین انتشار (برای نشانِ «منتشرشده / پیش‌نویس»)
export async function loadPricingPublishInfo() {
  const snap = await readSystemSettingJson(SS_SNAPSHOT_KEY);
  return snap ? { publishedAt: snap.publishedAt || null, publishedBy: snap.publishedBy || "" } : null;
}

// انتشار: عکسِ فعلیِ قیمت‌ها/خدمات را ذخیره کن تا مشتری ببیند.
export async function publishPricingSnapshot({ modules, services }, publishedBy) {
  const snap = {
    v: 1, publishedAt: new Date().toISOString(), publishedBy: publishedBy || "",
    modules: (modules || []).map((m) => ({
      moduleKey: m.moduleKey, label: m.label || "",
      priceMonthly: Number(m.priceMonthly) || 0, priceYearly: Number(m.priceYearly) || 0,
      isFree: !!m.isFree, requires: Array.isArray(m.requires) ? m.requires : [], sortOrder: m.sortOrder ?? 0,
    })),
    services: (services || []).map((s) => ({
      id: s.id, name: s.name || "", description: s.description || "",
      priceWeekly: Number(s.priceWeekly) || 0, priceMonthly: Number(s.priceMonthly) || 0, priceYearly: Number(s.priceYearly) || 0,
      period: s.period || "monthly", sortOrder: s.sortOrder ?? 0,
    })),
  };
  return writeSystemSettingJson(SS_SNAPSHOT_KEY, snap, publishedBy);
}

function mpFromRow(r) {
  return {
    moduleKey: r.module_key,
    label: r.label || "",
    priceMonthly: Number(r.price_monthly) || 0,
    priceYearly: Number(r.price_yearly) || 0,
    isFree: !!r.is_free,
    requires: Array.isArray(r.requires) ? r.requires : [],
    sortOrder: r.sort_order ?? 0,
    isActive: r.is_active !== false,
  };
}
function svcFromRow(r) {
  return {
    id: r.id,
    name: r.name || "",
    description: r.description || "",
    priceWeekly: Number(r.price_weekly) || 0,
    priceMonthly: Number(r.price_monthly) || 0,
    priceYearly: Number(r.price_yearly) || 0,
    period: r.period || "monthly",
    sortOrder: r.sort_order ?? 0,
    isActive: r.is_active !== false,
  };
}

// ---------- نوشتن (Super Admin) ----------
export async function saveModulePrice(rec, updatedBy) {
  const body = {
    label: rec.label || "",
    price_monthly: Number(rec.priceMonthly) || 0,
    price_yearly: Number(rec.priceYearly) || 0,
    is_free: !!rec.isFree,
    requires: Array.isArray(rec.requires) ? rec.requires : [],
    sort_order: Number(rec.sortOrder) || 0,
    is_active: rec.isActive !== false,
    updated_by: updatedBy || "",
    updated_at: new Date().toISOString(),
  };
  const existing = await sb(`module_prices?module_key=eq.${encodeURIComponent(rec.moduleKey)}&select=module_key`, {}, "super_admin");
  if (sbOk(existing) && existing.length) {
    const rows = await sb(`module_prices?module_key=eq.${encodeURIComponent(rec.moduleKey)}`, { method: "PATCH", body: JSON.stringify(body) }, "super_admin");
    if (!sbOk(rows)) return { __error: true, message: rows?.message };
    return rows[0] ? mpFromRow(rows[0]) : { ...rec };
  }
  const rows = await sb("module_prices", { method: "POST", body: JSON.stringify([{ module_key: rec.moduleKey, ...body }]) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: rows?.message };
  return rows[0] ? mpFromRow(rows[0]) : { ...rec };
}

export async function upsertService(rec, createdBy) {
  const body = {
    name: rec.name || "",
    description: rec.description || "",
    price_weekly: Number(rec.priceWeekly) || 0,
    price_monthly: Number(rec.priceMonthly) || 0,
    price_yearly: Number(rec.priceYearly) || 0,
    period: ["weekly", "monthly", "yearly", "once"].includes(rec.period) ? rec.period : "monthly",
    sort_order: Number(rec.sortOrder) || 0,
    is_active: rec.isActive !== false,
    updated_at: new Date().toISOString(),
  };
  if (rec.id) {
    const rows = await sb(`services?id=eq.${rec.id}`, { method: "PATCH", body: JSON.stringify(body) }, "super_admin");
    if (!sbOk(rows)) return { __error: true, message: rows?.message };
    return rows[0] ? svcFromRow(rows[0]) : { ...rec };
  }
  const id = "svc-" + Date.now().toString(36);
  const rows = await sb("services", { method: "POST", body: JSON.stringify([{ id, created_by: createdBy || "", ...body }]) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: rows?.message };
  return rows[0] ? svcFromRow(rows[0]) : { ...rec, id };
}
export async function deleteService(id) {
  const res = await sb(`services?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (res && res.__error) return { __error: true, message: res.message };
  return { ok: true };
}

/* ---------------------------------------------------------------------------- *
 * محاسبه‌ی خالص — Module-Based: صرفاً مجموعِ قیمتِ ماژول‌های انتخابی + خدمات.
 * هیچ مفهومِ پلن/بسته/تخفیفِ بسته‌ای دیگر در کار نیست.
 * ---------------------------------------------------------------------------- */

/**
 * محاسبه‌ی سبدِ خرید.
 *  selectedModuleKeys : کلیدهای ماژولِ انتخابیِ کاربر (شاملِ رایگان‌ها هم اشکالی ندارد)
 *  selectedServiceIds : آیدیِ خدماتِ انتخابی
 *  modulePrices, services : داده‌های خام (camelCase)
 *  billingCycle       : 'monthly' | 'yearly'
 */
// قیمتِ واقعیِ یک خدمت — از دوره‌ی خودِ همان ردیف (weekly/monthly/yearly)
// می‌آید، نه از تاگلِ کلیِ سبد. 'once' هم از همان priceMonthly (مبلغِ
// یک‌بارهٔ ثبت‌شده) می‌خواند. هم در محاسبه‌ی سبد، هم در نمایشِ صفحه‌ی خرید استفاده می‌شود.
export function servicePriceFor(s) {
  if (!s) return 0;
  if (s.period === "weekly") return s.priceWeekly || 0;
  if (s.period === "yearly") return s.priceYearly || 0;
  return s.priceMonthly || 0; // 'monthly' و 'once' هر دو از همین فیلد
}

export function computeCartTotal({ selectedModuleKeys, selectedServiceIds, modulePrices, services, billingCycle }) {
  billingCycle = billingCycle === "monthly" ? "monthly" : "yearly";
  const mpMap = {};
  (modulePrices || []).forEach((m) => { mpMap[m.moduleKey] = m; });
  const svcMap = {};
  (services || []).forEach((s) => { svcMap[s.id] = s; });

  const priceOf = (k) => {
    const m = mpMap[k];
    if (!m || m.isFree) return 0;
    return (billingCycle === "monthly" ? m.priceMonthly : m.priceYearly) || m.priceMonthly || 0;
  };

  const selReal = (selectedModuleKeys || []).filter((k) => mpMap[k] && !mpMap[k].isFree);
  const sumAllModules = selReal.reduce((a, k) => a + priceOf(k), 0);

  // خدمات — قیمتِ هر خدمت از دوره‌ی خودِ همان ردیف می‌آید (weekly/monthly/
  // yearly/once)، نه از تاگلِ کلیِ ماهانه/سالانه‌ی سبد. یک خدمتِ هفتگی
  // همیشه قیمتِ هفتگی‌اش را دارد، حتی اگر کاربر برای ماژول‌ها «سالانه» را انتخاب کرده باشد.
  const svcIds = (selectedServiceIds || []).filter((id) => svcMap[id]);
  const svcRecurring = svcIds.reduce((a, id) => {
    const s = svcMap[id];
    if (s.period === "once") return a;
    return a + servicePriceFor(s);
  }, 0);
  const svcOnce = svcIds.reduce((a, id) => (svcMap[id].period === "once" ? a + servicePriceFor(svcMap[id]) : a), 0);

  const recurringTotal = sumAllModules + svcRecurring;
  const grandTotal = recurringTotal + svcOnce;

  return {
    billingCycle,
    selReal,
    sumAllModules,
    svcRecurring, svcOnce, serviceIds: svcIds,
    recurringTotal, grandTotal,
  };
}

// وابستگی‌ها را اعمال می‌کند: انتخابِ یک ماژول، requires آن را هم روشن می‌کند.
export function applyModuleDeps(selected, modulePrices) {
  const set = new Set(selected);
  const mpMap = {};
  (modulePrices || []).forEach((m) => { mpMap[m.moduleKey] = m; });
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of Array.from(set)) {
      const reqs = (mpMap[k] && mpMap[k].requires) || [];
      for (const r of reqs) if (!set.has(r)) { set.add(r); changed = true; }
    }
  }
  return Array.from(set);
}
