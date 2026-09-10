import { sb, sbOk } from "./shared.js";

/* ============================================================================ *
 * Module pricing & services — لایه‌ی داده + محاسبه‌ی خالصِ سبدِ خرید.
 *
 * قیمت‌ها Data-driven است (جدول‌های module_prices / services). محاسبه‌ی نهایی
 * سمتِ سرور هم تکرار می‌شود (زرین‌پال Edge Function / تأییدِ کارت‌به‌کارت) —
 * این توابع فقط برای نمایشِ لحظه‌ای در صفحه‌ی خرید است.
 * ============================================================================ */

// ---------- خواندن (هر لاگینی، حتی صفحه‌ی قفلِ اشتراک) ----------
export async function loadModulePrices() {
  const rows = await sb("module_prices?is_active=eq.true&select=*&order=sort_order.asc,module_key.asc");
  if (!sbOk(rows)) return [];
  return rows.map(mpFromRow);
}
export async function loadServices() {
  const rows = await sb("services?is_active=eq.true&select=*&order=sort_order.asc,name.asc");
  if (!sbOk(rows)) return [];
  return rows.map(svcFromRow);
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
    return sbOk(rows) ? mpFromRow(rows[0]) : { __error: true, message: rows?.message };
  }
  const rows = await sb("module_prices", { method: "POST", body: JSON.stringify([{ module_key: rec.moduleKey, ...body }]) }, "super_admin");
  return sbOk(rows) ? mpFromRow(rows[0]) : { __error: true, message: rows?.message };
}

export async function upsertService(rec, createdBy) {
  const body = {
    name: rec.name || "",
    description: rec.description || "",
    price_monthly: Number(rec.priceMonthly) || 0,
    price_yearly: Number(rec.priceYearly) || 0,
    period: ["monthly", "yearly", "once"].includes(rec.period) ? rec.period : "monthly",
    sort_order: Number(rec.sortOrder) || 0,
    is_active: rec.isActive !== false,
    updated_at: new Date().toISOString(),
  };
  if (rec.id) {
    const rows = await sb(`services?id=eq.${rec.id}`, { method: "PATCH", body: JSON.stringify(body) }, "super_admin");
    return sbOk(rows) ? svcFromRow(rows[0]) : { __error: true, message: rows?.message };
  }
  const id = "svc-" + Date.now().toString(36);
  const rows = await sb("services", { method: "POST", body: JSON.stringify([{ id, created_by: createdBy || "", ...body }]) }, "super_admin");
  return sbOk(rows) ? svcFromRow(rows[0]) : { __error: true, message: rows?.message };
}
export async function deleteService(id) {
  const res = await sb(`services?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (res && res.__error) return { __error: true, message: res.message };
  return { ok: true };
}

/* ---------------------------------------------------------------------------- *
 * محاسبه‌ی خالص
 * ---------------------------------------------------------------------------- */

// جهانِ ماژول‌های یک پلن (module_universe یا features)
export function planUniverse(plan) {
  if (plan && Array.isArray(plan.moduleUniverse) && plan.moduleUniverse.length) return plan.moduleUniverse;
  return Array.isArray(plan?.features) ? plan.features : [];
}

// ارزان‌ترین پلنی که کلِ انتخاب زیرمجموعه‌ی جهانش است و تعداد در بازه‌ی min/max.
// plans: آرایه‌ای از پلن‌ها با فیلدهای camelCase (features, moduleUniverse, minModules, maxModules, priceMonthly, priceYearly).
export function resolvePlanForSelection(selectedRealKeys, plans, billingCycle) {
  const sel = selectedRealKeys || [];
  const cands = (plans || []).filter((p) => {
    const uni = planUniverse(p);
    if (!uni.length) return false;
    const subset = sel.every((k) => uni.indexOf(k) > -1);
    const min = p.minModules == null ? 0 : p.minModules;
    const max = p.maxModules == null ? 999 : p.maxModules;
    return subset && sel.length >= min && sel.length <= max;
  });
  const price = (p) => (billingCycle === "monthly" ? p.priceMonthly : p.priceYearly) || p.priceMonthly || 0;
  cands.sort((a, b) => price(a) - price(b));
  return cands[0] || null;
}

/**
 * محاسبه‌ی سبدِ خرید.
 *  selectedModuleKeys : کلیدهای ماژولِ انتخابیِ کاربر (شاملِ رایگان‌ها هم اشکالی ندارد)
 *  selectedServiceIds : آیدیِ خدماتِ انتخابی
 *  chosenPlan         : پلنِ آماده‌ای که کاربر انتخاب کرده (یا null → انتخابِ آزاد)
 *  plans, modulePrices, services : داده‌های خام (camelCase)
 *  billingCycle       : 'monthly' | 'yearly'
 * برمی‌گرداند breakdown + مبلغِ نهایی + پلنِ پیشنهادی (اگر انتخاب به محدوده‌ی پلنی رسید).
 */
export function computeCartTotal({ selectedModuleKeys, selectedServiceIds, chosenPlan, plans, modulePrices, services, billingCycle }) {
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
  const isFree = (k) => !!(mpMap[k] && mpMap[k].isFree);

  const selReal = (selectedModuleKeys || []).filter((k) => mpMap[k] && !mpMap[k].isFree);
  const uni = chosenPlan ? planUniverse(chosenPlan) : [];
  const included = selReal.filter((k) => uni.indexOf(k) > -1);
  const addons = selReal.filter((k) => uni.indexOf(k) === -1);

  const planPrice = chosenPlan ? ((billingCycle === "monthly" ? chosenPlan.priceMonthly : chosenPlan.priceYearly) || chosenPlan.priceMonthly || 0) : 0;
  const addonsTotal = addons.reduce((a, k) => a + priceOf(k), 0);
  const sumAllModules = selReal.reduce((a, k) => a + priceOf(k), 0);

  // خدمات
  const svcIds = (selectedServiceIds || []).filter((id) => svcMap[id]);
  const svcRecurring = svcIds.reduce((a, id) => {
    const s = svcMap[id];
    if (s.period === "once") return a;
    return a + ((billingCycle === "monthly" ? s.priceMonthly : s.priceYearly) || s.priceMonthly || 0);
  }, 0);
  const svcOnce = svcIds.reduce((a, id) => (svcMap[id].period === "once" ? a + (svcMap[id].priceMonthly || svcMap[id].priceYearly || 0) : a), 0);

  // پلنِ پیشنهادی بر پایه‌ی کلِ انتخاب
  const suggestedPlan = resolvePlanForSelection(selReal, plans, billingCycle);

  let recurringBase;
  if (chosenPlan) {
    recurringBase = planPrice + addonsTotal;
  } else {
    recurringBase = suggestedPlan
      ? Math.min(sumAllModules, (billingCycle === "monthly" ? suggestedPlan.priceMonthly : suggestedPlan.priceYearly) || suggestedPlan.priceMonthly || 0)
      : sumAllModules;
  }

  const discount = (chosenPlan && suggestedPlan && suggestedPlan.id !== chosenPlan.id)
    ? Math.max(0, recurringBase - ((billingCycle === "monthly" ? suggestedPlan.priceMonthly : suggestedPlan.priceYearly) || suggestedPlan.priceMonthly || 0))
    : (!chosenPlan && suggestedPlan ? Math.max(0, sumAllModules - recurringBase) : 0);

  const recurringTotal = recurringBase + svcRecurring;
  const grandTotal = recurringTotal + svcOnce;

  // اگر پلنِ متناظر نبود → resolvedPlanId خالی است و module_overrides ست می‌شود
  const resolvedPlan = chosenPlan || (suggestedPlan && sameSet(selReal, planUniverse(suggestedPlan)) ? suggestedPlan : null);

  return {
    billingCycle,
    selReal, included, addons,
    planPrice, addonsTotal, sumAllModules,
    svcRecurring, svcOnce, serviceIds: svcIds,
    suggestedPlan: suggestedPlan ? { id: suggestedPlan.id, name: suggestedPlan.name } : null,
    resolvedPlanId: resolvedPlan ? resolvedPlan.id : null,
    discount,
    recurringTotal, grandTotal,
    label: chosenPlan ? chosenPlan.name : (suggestedPlan ? suggestedPlan.name : (selReal.length ? "سفارشی" : "")),
  };
}

function sameSet(a, b) {
  if (!a || !b) return false;
  const A = new Set(a), B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
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
