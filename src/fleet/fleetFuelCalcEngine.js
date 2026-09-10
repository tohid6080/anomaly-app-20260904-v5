/* ============================================================================ *
 * Vehicle Fleet Fuel Consumption Calc Engine — توابعِ خالص، بدونِ React/I/O.
 *
 * محاسبه‌ی شهری و جاده‌ای جداگانه؛ مصرفِ ترکیبی بر پایه‌ی نسبتِ واقعیِ پیمایش،
 * نه میانگینِ سادهٔ مصرفِ شهری و جاده‌ای:
 *   لیترِ روزانه = (kmشهری×L100شهری + kmجاده×L100جاده) ÷ 100 × تعداد
 * اگر یکی از دو نرخ نبود، برای همان بخش به «مصرفِ ترکیبی» رجوع می‌شود (با پرچمِ
 * فرضیات). اگر کاربر مصرفِ واقعی (کارت سوخت/کیلومترشمار) وارد کند، همان مبنا
 * است و اختلافِ واقعی−استاندارد هم محاسبه می‌شود.
 *
 * هیچ عددِ مصرفی این‌جا Hard-code نیست — همه از ردیفِ آیتم (که از
 * fleet_vehicle_bank یا ورودیِ کاربر می‌آید) خوانده می‌شود.
 * ============================================================================ */

export const FUEL_TYPES = ["gasoline", "diesel", "cng", "hybrid", "lpg", "other"];

export const DEFAULT_ASSUMPTIONS = {
  cityShareDefault: 0.6,   // نسبتِ km شهری وقتی تفکیک داده نشده (فقط fallback)
  fallbackToCombined: true,
};

const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

// L/100 مؤثر برای یک بخش؛ اگر نرخِ آن بخش نبود → مصرفِ ترکیبی
function rateFor(part, item) {
  const r = part === "city" ? num(item?.cityL100) : num(item?.highwayL100);
  if (r > 0) return { rate: r, fallback: false };
  const c = num(item?.combinedL100);
  return { rate: c > 0 ? c : 0, fallback: c > 0 };
}

// ---------- یک خودرو (یک ردیف) ----------
export function computeVehicle(item, opts = {}) {
  const cityShareDefault = num(opts.cityShareDefault, DEFAULT_ASSUMPTIONS.cityShareDefault) || 0.6;
  const qty = Math.max(0, num(item?.qty, 1));
  const workDays = Math.max(0, num(item?.workDaysPerMonth, 0));
  const activeMonths = Math.max(0, num(item?.activeMonthsPerYear, 0));

  // پیمایشِ روزانه‌ی هر خودرو (km) — شهری و جاده‌ای
  let cityKm = num(item?.cityKmPerDay);
  let hwyKm = num(item?.highwayKmPerDay);
  let split = "explicit";
  if (cityKm <= 0 && hwyKm <= 0) {
    const total = num(item?.kmPerDay);
    if (total > 0) { cityKm = total * cityShareDefault; hwyKm = total * (1 - cityShareDefault); split = "assumed"; }
  }
  const dayKmPerVeh = cityKm + hwyKm;

  const cR = rateFor("city", item), hR = rateFor("highway", item);
  const assumptions = [];
  if (cR.fallback) assumptions.push("city_used_combined");
  if (hR.fallback) assumptions.push("highway_used_combined");
  if (split === "assumed") assumptions.push("km_split_assumed");

  // ---- مسیرِ استاندارد/سازنده ----
  const stdDailyLiters = ((cityKm * cR.rate) + (hwyKm * hR.rate)) / 100 * qty;
  const stdMonthlyLiters = stdDailyLiters * workDays;
  const stdYearlyLiters = stdMonthlyLiters * activeMonths;

  const kmMonth = dayKmPerVeh * workDays * qty;
  const kmYear = kmMonth * activeMonths;
  const stdEffL100 = (dayKmPerVeh * qty) > 0 ? (stdDailyLiters / (dayKmPerVeh * qty)) * 100 : 0;

  // ---- مسیرِ واقعی (کارت سوخت/کیلومترشمار) ----
  const useActual = !!item?.useActual;
  const actualMonthlyLiters = num(item?.actualLitersMonthly);
  const actualMonthlyKm = num(item?.actualKmMonthly);
  const actualYearlyLiters = actualMonthlyLiters * (activeMonths || 12);
  const actualEffL100 = actualMonthlyKm > 0 ? (actualMonthlyLiters / actualMonthlyKm) * 100 : 0;

  const basis = useActual && actualMonthlyLiters > 0 ? "actual" : "standard";
  const monthlyLiters = basis === "actual" ? actualMonthlyLiters : stdMonthlyLiters;
  const yearlyLiters = basis === "actual" ? actualYearlyLiters : stdYearlyLiters;
  const dailyLiters = basis === "actual" ? (workDays > 0 ? actualMonthlyLiters / workDays : 0) : stdDailyLiters;
  const kmMonthUsed = basis === "actual" && actualMonthlyKm > 0 ? actualMonthlyKm : kmMonth;
  const kmYearUsed = basis === "actual" && actualMonthlyKm > 0 ? actualMonthlyKm * (activeMonths || 12) : kmYear;
  const effL100 = basis === "actual" ? actualEffL100 : stdEffL100;

  // اختلافِ واقعی − استاندارد (فقط اگر هر دو موجود باشند)
  let deltaMonthlyLiters = null, deltaPct = null;
  if (actualMonthlyLiters > 0 && stdMonthlyLiters > 0) {
    deltaMonthlyLiters = actualMonthlyLiters - stdMonthlyLiters;
    deltaPct = (deltaMonthlyLiters / stdMonthlyLiters) * 100;
  }

  return {
    id: item?.id, brand: item?.brand || "", model: item?.model || "", plate: item?.plate || "",
    fuelType: item?.fuelType || "gasoline", source: item?.source || "", qty,
    basis, assumptions,
    cityKmPerVeh: cityKm, highwayKmPerVeh: hwyKm, dayKmPerVeh,
    cityRate: cR.rate, highwayRate: hR.rate,
    dailyLiters, monthlyLiters, yearlyLiters,
    kmMonth: kmMonthUsed, kmYear: kmYearUsed,
    effL100,
    stdMonthlyLiters, stdYearlyLiters, stdEffL100,
    actualMonthlyLiters: actualMonthlyLiters || null, actualEffL100: actualEffL100 || null,
    deltaMonthlyLiters, deltaPct,
  };
}

// ---------- کلِ ناوگان ----------
export function computeFleet(items, opts = {}) {
  const rows = (Array.isArray(items) ? items : []).map((it) => computeVehicle(it, opts));
  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);

  const vehicleCount = rows.reduce((a, r) => a + (r.qty || 0), 0);
  const dailyLiters = sum("dailyLiters");
  const monthlyLiters = sum("monthlyLiters");
  const yearlyLiters = sum("yearlyLiters");
  const kmMonth = sum("kmMonth");
  const kmYear = sum("kmYear");
  const kmDay = rows.reduce((a, r) => a + (r.dayKmPerVeh || 0) * (r.qty || 0), 0);
  const fleetEffL100 = kmYear > 0 ? (yearlyLiters / kmYear) * 100 : 0;

  const stdMonthlyLiters = sum("stdMonthlyLiters");
  const actualMonthlyLiters = rows.reduce((a, r) => a + (r.actualMonthlyLiters || 0), 0);
  const hasActual = rows.some((r) => r.actualMonthlyLiters != null);
  const fleetDeltaMonthly = hasActual && stdMonthlyLiters > 0 ? actualMonthlyLiters - stdMonthlyLiters : null;
  const fleetDeltaPct = fleetDeltaMonthly != null && stdMonthlyLiters > 0 ? (fleetDeltaMonthly / stdMonthlyLiters) * 100 : null;

  const ranked = rows
    .map((r) => ({ ...r, sharePct: yearlyLiters > 0 ? (r.yearlyLiters / yearlyLiters) * 100 : 0 }))
    .sort((a, b) => b.yearlyLiters - a.yearlyLiters);
  const top10 = ranked.slice(0, 10);

  // نمودارِ روند — لیترِ ماهانه روی «ماه‌های فعالِ» هر خودرو
  const monthly = Array(12).fill(0);
  (Array.isArray(items) ? items : []).forEach((it, i) => {
    const r = rows[i];
    const active = Math.min(12, Math.max(0, Math.round(num(it?.activeMonthsPerYear, 0))));
    for (let m = 0; m < active; m++) monthly[m] += r.monthlyLiters;
  });

  return {
    generatedAt: new Date().toISOString(),
    itemCount: rows.length,
    vehicleCount,
    perItem: ranked,
    dailyLiters, monthlyLiters, yearlyLiters,
    kmDay, kmMonth, kmYear,
    fleetEffL100,
    stdMonthlyLiters, actualMonthlyLiters: hasActual ? actualMonthlyLiters : null,
    fleetDeltaMonthly, fleetDeltaPct, hasActual,
    top10,
    monthlySeriesLiters: monthly,
    assumptions: Array.from(new Set(rows.flatMap((r) => r.assumptions))),
  };
}

export const FORMULA_NOTE = "لیترِ روزانه = (km_شهری×L100_شهری + km_جاده×L100_جاده) ÷ ۱۰۰ × تعداد · ماهانه = روزانه×روزهای‌کاری · سالانه = ماهانه×ماه‌های‌فعال";
