/* ============================================================================ *
 * Lifting Safety Validation Engine — ارزیابیِ لحظه‌ایِ یک پلنِ لیفت.
 * توابعِ خالص؛ ورودی: objects از scene + خروجیِ computeLiftCalc + criteria.
 * خروجی: فهرستی از یافته‌ها با سطحِ ok | warn | fail و یک حکمِ کلی (worst).
 * هیچ آستانه‌ای سخت‌کد نیست — همه از calc.criteria خوانده می‌شود.
 * ============================================================================ */

import {
  firstOf, allOf, loadFootprintRadius, segPointDist, rotate,
  powerLineClearance, DEFAULT_CRITERIA,
} from "./liftingCalcEngine.js";

const F = (n, d = 0) =>
  n == null || Number.isNaN(n) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// finding = { level:"ok"|"warn"|"fail", code, msg }
export function validateLiftingPlan(objs, calc, opts = {}) {
  const cr = { ...DEFAULT_CRITERIA, ...(calc?.criteria || opts.criteria || {}) };
  const out = [];
  const add = (level, code, msg) => out.push({ level, code, msg });

  const L = firstOf(objs, "load");
  const sim = calc?.sim || { pick: { x: 0, y: 0 }, place: { x: 0, y: 0 } };
  const buf = L ? loadFootprintRadius(L) : 1.5;

  // ---- ظرفیتِ جرثقیل ----
  const maxU = cr.maxUtilizationPct ?? 85;
  const warnU = cr.warnUtilizationPct ?? 75;
  if (calc?.capacity == null) {
    add("fail", "capacity_offchart", `شعاعِ کار (${F(calc?.radius, 1)} m) فراتر از Load Chartِ واردشده است — ظرفیت نامشخص.`);
  } else if (calc.utilizationPct > 100) {
    add("fail", "overload", `اضافه‌بارِ جرثقیل — بهره‌برداری ${F(calc.utilizationPct, 0)}٪ (> ۱۰۰٪).`);
  } else if (calc.utilizationPct > maxU) {
    add("fail", "over_limit", `بهره‌برداری ${F(calc.utilizationPct, 0)}٪ از حدِ مجازِ ${maxU}٪ بیشتر است.`);
  } else if (calc.utilizationPct > warnU) {
    add("warn", "near_limit", `بهره‌برداری ${F(calc.utilizationPct, 0)}٪ (> آستانه‌ی هشدارِ ${warnU}٪).`);
  } else {
    add("ok", "capacity_ok", `بهره‌برداریِ جرثقیل ${F(calc.utilizationPct, 0)}٪ — در محدوده‌ی مجاز.`);
  }

  // ---- اسلینگ ----
  if (calc?.slingWLL && calc.maxTension > calc.slingWLL) {
    add("fail", "sling_wll", `کششِ شاخه‌ی اسلینگ ${F(calc.maxTension)} kg از WLL (${F(calc.slingWLL)} kg) بیشتر است.`);
  } else if (calc?.slingWLL) {
    add("ok", "sling_ok", `کششِ بیشینه‌ی اسلینگ ${F(calc.maxTension)} kg ≤ WLL ${F(calc.slingWLL)} kg.`);
  }
  const angWarn = cr.slingAngleWarnFromVertical_deg ?? 60;
  if (calc?.minSlingAngle != null && calc.minSlingAngle > angWarn) {
    add("warn", "sling_angle", `زاویه‌ی اسلینگ نسبت به قائم ${F(calc.minSlingAngle, 0)}° (> ${angWarn}°) — کششِ بالا؛ اسپریدر بیم توصیه می‌شود.`);
  }

  // ---- قلاب روی مرکز ثقل ----
  if (calc?.hookToCg != null) {
    const w = cr.hookToCgWarn_m ?? 0.4, f = cr.hookToCgFail_m ?? 1;
    if (calc.hookToCg > f) add("fail", "cg_offset", `قلاب ${F(calc.hookToCg, 2)} m از مرکزِ ثقلِ بار فاصله دارد — کجی و چرخشِ بار.`);
    else if (calc.hookToCg > w) add("warn", "cg_offset", `قلاب ${F(calc.hookToCg, 2)} m از مرکزِ ثقلِ بار فاصله دارد.`);
  }

  // ---- فشارِ روی زمین ----
  if (calc?.groundPressureKpa != null && calc.allowableGroundKpa != null) {
    if (calc.groundPressureKpa > calc.allowableGroundKpa) {
      add("fail", "gbp", `فشارِ روی زمین ${F(calc.groundPressureKpa, 0)} kPa از مجازِ ${F(calc.allowableGroundKpa, 0)} kPa (خاک ${F(calc.soilKpa, 0)} ÷ SF ${calc.sf}) بیشتر است.`);
    } else {
      add("ok", "gbp_ok", `فشارِ روی زمین ${F(calc.groundPressureKpa, 0)} kPa ≤ مجازِ ${F(calc.allowableGroundKpa, 0)} kPa.`);
    }
  }

  // ---- تداخلِ مسیرِ بار (Pick → Place) ----
  const a = { x: sim.pick.x, y: sim.pick.y }, b = { x: sim.place.x, y: sim.place.y };
  const minClear = cr.minPersonnelClearance_m ?? 3;

  allOf(objs, "worker").forEach((w) => {
    const d = segPointDist(w, a, b);
    if (d < buf + minClear) {
      add("fail", "worker_path", `مسیرِ بار از فاصله‌ی ایمنِ نفر «${w.role || "نفر"}» عبور می‌کند (${F(d, 1)} m < ${F(buf + minClear, 1)} m).`);
    }
  });

  allOf(objs, "power_line", "powerline").forEach((pl) => {
    const pa = { x: pl.x, y: pl.y };
    const pb = {
      x: pl.x + Math.cos(((pl.rot || 0) * Math.PI) / 180) * (pl.len || 40),
      y: pl.y + Math.sin(((pl.rot || 0) * Math.PI) / 180) * (pl.len || 40),
    };
    let md = Infinity;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      md = Math.min(md, segPointDist({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, pa, pb));
    }
    const req = powerLineClearance(pl.kv || 132, cr);
    if (md < req + buf) {
      add("fail", "powerline_path", `مسیرِ بار وارد حریمِ خط برقِ ${pl.kv || 132}kV می‌شود (${F(md, 1)} m < ${F(req, 1)} m).`);
    } else {
      add("ok", "powerline_ok", `فاصله‌ی مسیرِ بار تا خط برقِ ${pl.kv || 132}kV = ${F(md, 1)} m ≥ ${F(req, 1)} m.`);
    }
  });

  allOf(objs, "exclusion_zone", "exclusion", "structure").forEach((z) => {
    let hit = false;
    for (let i = 0; i <= 24 && !hit; i++) {
      const t = i / 24;
      const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const rr = rotate(q.x - z.x, q.y - z.y, -(z.rot || 0));
      if (Math.abs(rr[0]) < (z.w || 2) / 2 + buf && Math.abs(rr[1]) < (z.h || 2) / 2 + buf) hit = true;
    }
    if (hit) {
      const isEx = z.type === "exclusion_zone" || z.type === "exclusion";
      add(isEx ? "fail" : "warn", "zone_path",
        `مسیرِ بار با «${z.label || (isEx ? "ناحیه‌ی ممنوعه" : "مانع")}» تداخل دارد.`);
    }
  });

  const worst = out.reduce(
    (m, i) => (i.level === "fail" ? "fail" : i.level === "warn" && m !== "fail" ? "warn" : m),
    "ok"
  );
  return { items: out, worst };
}
