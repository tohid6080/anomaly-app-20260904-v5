import { sb, sbOk } from "../shared.js";

/**
 * لایه‌ی داده‌ی «ماژول‌های فعال شرکت» (Module-Based) — جایگزینِ
 * companies.plan_id/module_overrides. هر ردیف یک ماژولِ یک شرکت با
 * تاریخ+ساعتِ دقیقِ شروع/پایان است. فقط سوپرادمین می‌نویسد (RLS همین را
 * اجبار می‌کند)؛ همان جدول برای خودِ شرکت هم قابلِ خواندن است (برای
 * loadCurrentCompanyPlanFeatures در shared.js).
 */

function cmFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    moduleKey: r.module_key,
    isActive: r.is_active !== false,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    priceMonthly: Number(r.price_monthly) || 0,
    priceYearly: Number(r.price_yearly) || 0,
    source: r.source || "admin_grant",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function loadCompanyModules(companyId) {
  if (!companyId) return [];
  const rows = await sb(`company_modules?company_id=eq.${companyId}&select=*&order=module_key.asc`, {}, "super_admin");
  return sbOk(rows) ? rows.map(cmFromRow) : [];
}

// همه‌ی ردیف‌های همه‌ی شرکت‌ها یکجا — برای نمای مرورگرِ «شرکت‌های فعلی» در
// کنسولِ قیمت‌گذاری (یک کوئری، نه یکی‌به‌ازای‌هر‌شرکت).
export async function loadAllCompanyModules() {
  const rows = await sb("company_modules?select=*", {}, "super_admin");
  return sbOk(rows) ? rows.map(cmFromRow) : [];
}

export async function addCompanyModule(companyId, moduleKey, { startsAt, endsAt, priceMonthly, priceYearly, source } = {}, createdBy) {
  const body = {
    company_id: companyId,
    module_key: moduleKey,
    is_active: true,
    starts_at: startsAt || new Date().toISOString(),
    ends_at: endsAt || null,
    price_monthly: Number(priceMonthly) || 0,
    price_yearly: Number(priceYearly) || 0,
    source: source === "purchase" ? "purchase" : "admin_grant",
    created_by: createdBy || "",
  };
  const rows = await sb("company_modules?on_conflict=company_id,module_key", {
    method: "POST", body: JSON.stringify([body]), prefer: "resolution=merge-duplicates,return=representation",
  }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: rows?.message };
  return rows[0] ? cmFromRow(rows[0]) : { ...body };
}

export async function updateCompanyModule(id, patch) {
  const body = { updated_at: new Date().toISOString() };
  if ("isActive" in patch) body.is_active = !!patch.isActive;
  if ("startsAt" in patch) body.starts_at = patch.startsAt || new Date().toISOString();
  if ("endsAt" in patch) body.ends_at = patch.endsAt || null;
  if ("priceMonthly" in patch) body.price_monthly = Number(patch.priceMonthly) || 0;
  if ("priceYearly" in patch) body.price_yearly = Number(patch.priceYearly) || 0;
  const rows = await sb(`company_modules?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: rows?.message };
  return rows[0] ? cmFromRow(rows[0]) : { ok: true };
}

export async function removeCompanyModule(id) {
  const res = await sb(`company_modules?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (res && res.__error) return { __error: true, message: res.message };
  return { ok: true };
}
