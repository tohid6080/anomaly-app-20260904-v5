/* ============================================================================ *
 * Energy / Power Consumption Calc Engine — توابعِ خالص، بدونِ React و I/O.
 *
 * فرمول‌های پایه (هرگز جمعِ سادهٔ آمپر به‌عنوانِ مصرف):
 *   تک‌فاز :  P(kW) = V · I · PF / 1000        I(A) = P·1000 / (V · PF)
 *   سه‌فاز :  P(kW) = √3 · V · I · PF / 1000    I(A) = P·1000 / (√3 · V · PF)
 *   DC     :  P(kW) = V · I / 1000              I(A) = P·1000 / V
 *
 * انرژی: kWh = kW_actual · ساعت.  kW_actual = kW_nameplate · qty · LoadFactor · DutyCycle.
 *
 * هیچ نرخ/ضریبی این‌جا Hard-code نیست — همه از tariff (که از energy_tariffs
 * می‌آید) خوانده می‌شود؛ DEFAULT_TARIFF فقط fallback است (نرخ‌ها = 0).
 * این ابزار برآوردی است، نه جایگزینِ قرائتِ کنتور یا ممیزیِ انرژیِ رسمی.
 * ============================================================================ */

const SQRT3 = Math.sqrt(3);

export const PHASES = ["single", "three", "dc"];
export const EQUIP_CATEGORIES = [
  "cooling", "heating", "chiller", "pump", "compressor",
  "fan", "lighting", "office", "welding", "panel", "other",
];

export const DEFAULT_TARIFF = {
  currency: "IRR",
  energyRatePerKwh: 0,
  demandChargePerKw: 0,
  fixedMonthly: 0,
  taxPct: 0,
  diversityFactor: 0.8,
  hoursPerYear: 8760,
};

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
const clampFrac = (v, d = 1) => {
  const n = num(v, d);
  return n <= 0 ? 0 : n > 1 ? 1 : n;
};

// ---------- تبدیلِ توان ↔ جریان ----------
export function currentToKw(currentA, phase, voltageV, pf) {
  const I = num(currentA), V = num(voltageV), PF = phase === "dc" ? 1 : clampFrac(pf, 0.85) || 0.85;
  if (!I || !V) return 0;
  if (phase === "single") return (V * I * PF) / 1000;
  if (phase === "dc") return (V * I) / 1000;
  return (SQRT3 * V * I * PF) / 1000; // three
}
export function kwToCurrent(kw, phase, voltageV, pf) {
  const P = num(kw) * 1000, V = num(voltageV), PF = phase === "dc" ? 1 : clampFrac(pf, 0.85) || 0.85;
  if (!P || !V) return 0;
  if (phase === "single") return P / (V * PF);
  if (phase === "dc") return P / V;
  return P / (SQRT3 * V * PF); // three
}

// ---------- یک ردیف ----------
export function computeItem(item) {
  const phase = PHASES.includes(item?.phase) ? item.phase : "three";
  const V = num(item?.voltageV, 400);
  const pf = phase === "dc" ? 1 : (clampFrac(item?.pf, 0.85) || 0.85);
  const qty = Math.max(0, num(item?.qty, 1));
  const ratingKind = item?.ratingKind === "current" ? "current" : "power";

  const nameplateKw = ratingKind === "current"
    ? currentToKw(item?.currentA, phase, V, pf)
    : num(item?.powerKw);
  const nameplateA = ratingKind === "current"
    ? num(item?.currentA)
    : kwToCurrent(nameplateKw, phase, V, pf);

  const loadFactor = clampFrac(item?.loadFactor, 1);
  const dutyCycle = clampFrac(item?.dutyCycle, 1);

  const installedKw = nameplateKw * qty;                    // توانِ نصب‌شدهٔ این ردیف
  const actualKw = nameplateKw * qty * loadFactor;          // توانِ مصرفیِ واقعی هنگامِ کار
  const runningKwWhileOn = actualKw;                         // در لحظهٔ روشن‌بودن
  const avgKwOverSchedule = actualKw * dutyCycle;           // متوسط در بازهٔ برنامه‌ریزی‌شده

  const hoursPerDay = Math.max(0, num(item?.hoursPerDay, 0));
  const daysPerMonth = Math.max(0, num(item?.daysPerMonth, 0));
  const monthsPerYear = Math.max(0, num(item?.monthsPerYear, 0));

  // ساعتِ مؤثرِ کارکرد (با درنظرگرفتنِ Duty Cycle)
  const effHoursDay = hoursPerDay * dutyCycle;
  const energyPerHourKwh = runningKwWhileOn;                 // هر ساعتِ روشن‌بودن
  const dailyKwh = actualKw * effHoursDay;
  const monthlyKwh = dailyKwh * daysPerMonth;
  const yearlyKwh = monthlyKwh * monthsPerYear;
  const annualRunHours = effHoursDay * daysPerMonth * monthsPerYear;

  return {
    id: item?.id, name: item?.name || "", category: item?.category || "other",
    phase, voltageV: V, pf, qty, ratingKind,
    nameplateKw, nameplateA,
    loadFactor, dutyCycle,
    installedKw, actualKw, avgKwOverSchedule,
    energyPerHourKwh, dailyKwh, monthlyKwh, yearlyKwh, annualRunHours,
  };
}

// ---------- کلِ مطالعه ----------
export function computeEnergy(items, tariff) {
  const T = { ...DEFAULT_TARIFF, ...(tariff || {}) };
  const rows = (Array.isArray(items) ? items : []).map(computeItem);

  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const totalInstalledKw = sum("installedKw");
  const sumActualKw = sum("actualKw");                       // اگر همهٔ تجهیزات هم‌زمان روشن باشند
  const diversity = clampFrac(T.diversityFactor, 1) || 1;
  const peakDemandKw = sumActualKw * diversity;              // پیکِ برآوردیِ کل
  const dailyKwh = sum("dailyKwh");
  const monthlyKwh = sum("monthlyKwh");
  const yearlyKwh = sum("yearlyKwh");

  const hoursPerYear = Math.max(1, num(T.hoursPerYear, 8760));
  const averageLoadKw = yearlyKwh / hoursPerYear;
  const loadFactorPct = peakDemandKw > 0 ? (averageLoadKw / peakDemandKw) * 100 : 0;

  // Top-10 و سهمِ هر تجهیز
  const ranked = rows
    .map((r) => ({ ...r, sharePct: yearlyKwh > 0 ? (r.yearlyKwh / yearlyKwh) * 100 : 0 }))
    .sort((a, b) => b.yearlyKwh - a.yearlyKwh);
  const top10 = ranked.slice(0, 10);

  // سهمِ هر دسته
  const catMap = {};
  ranked.forEach((r) => {
    catMap[r.category] = catMap[r.category] || { category: r.category, yearlyKwh: 0, installedKw: 0, count: 0 };
    catMap[r.category].yearlyKwh += r.yearlyKwh;
    catMap[r.category].installedKw += r.installedKw;
    catMap[r.category].count += 1;
  });
  const byCategory = Object.values(catMap)
    .map((c) => ({ ...c, sharePct: yearlyKwh > 0 ? (c.yearlyKwh / yearlyKwh) * 100 : 0 }))
    .sort((a, b) => b.yearlyKwh - a.yearlyKwh);

  // نمودارِ روند — kWh ماهانه: هر تجهیز روی «ماه‌های فعال»ِ خودش پخش می‌شود
  const monthly = Array(12).fill(0);
  rows.forEach((r) => {
    const activeMonths = Math.min(12, Math.max(0, Math.round(r.monthlyKwh ? r.yearlyKwh / r.monthlyKwh : 0)));
    for (let m = 0; m < activeMonths; m++) monthly[m] += r.monthlyKwh;
  });

  // ---------- هزینه (فقط اگر نرخ وارد شده باشد) ----------
  const rate = num(T.energyRatePerKwh, 0);
  const demandRate = num(T.demandChargePerKw, 0);
  const fixed = num(T.fixedMonthly, 0);
  const taxPct = num(T.taxPct, 0);
  const hasTariff = rate > 0 || demandRate > 0 || fixed > 0;

  const energyCost = (kwh) => kwh * rate;
  const withTax = (v) => v * (1 + taxPct / 100);
  const monthlyEnergyCost = energyCost(monthlyKwh);
  const monthlyDemandCost = peakDemandKw * demandRate;
  const monthlyBillBeforeTax = monthlyEnergyCost + monthlyDemandCost + fixed;
  const cost = hasTariff ? {
    currency: T.currency || "IRR",
    ratePerKwh: rate, demandChargePerKw: demandRate, fixedMonthly: fixed, taxPct,
    hourly: withTax(energyPerHourKwhTotal(rows) * rate),
    daily: withTax(energyCost(dailyKwh)),
    monthly: withTax(monthlyBillBeforeTax),
    yearly: withTax(energyCost(yearlyKwh) + monthlyDemandCost * 12 + fixed * 12),
    monthlyEnergy: withTax(monthlyEnergyCost),
    monthlyDemand: withTax(monthlyDemandCost),
    monthlyFixed: withTax(fixed),
  } : null;

  return {
    generatedAt: new Date().toISOString(),
    itemCount: rows.length,
    perItem: ranked,
    totalInstalledKw,
    sumActualKw,
    diversityFactor: diversity,
    peakDemandKw,
    averageLoadKw,
    loadFactorPct,
    dailyKwh, monthlyKwh, yearlyKwh,
    top10, byCategory,
    monthlySeriesKwh: monthly,
    cost, hasTariff,
    tariffUsed: T,
  };
}

function energyPerHourKwhTotal(rows) {
  // مجموعِ توانِ لحظه‌ایِ همهٔ تجهیزاتِ روشن (kW) = kWh در یک ساعتِ کامل
  return rows.reduce((a, r) => a + (r.actualKw || 0), 0);
}

// یک خطِ فرمول برای نمایش کنارِ نتیجه (بسته به نوعِ فاز)
export function formulaNote(phase) {
  if (phase === "single") return "P(kW) = V·I·PF ÷ 1000 · | · انرژی = P_actual × ساعت";
  if (phase === "dc") return "P(kW) = V·I ÷ 1000 · | · انرژی = P_actual × ساعت";
  return "P(kW) = √3·V·I·PF ÷ 1000 · | · انرژی = P_actual × ساعت";
}
