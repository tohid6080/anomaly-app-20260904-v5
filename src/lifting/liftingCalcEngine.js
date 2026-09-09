/* ============================================================================ *
 * Lifting Calc Engine — توابعِ خالصِ محاسبه‌ی لیفت. بدونِ React، بدونِ I/O،
 * بدونِ threshold سخت‌کدشده: هر آستانه از آرگومانِ criteria خوانده می‌شود
 * (که از lifting_acceptance_criteria می‌آید) و ظرفیتِ جرثقیل فقط از Load
 * Chartِ واقعیِ سازنده درون‌یابی می‌شود — اگر شعاع فراتر از چارت باشد،
 * capacity = null (یعنی «خارج از چارت»)، نه یک مقدارِ فرضی.
 *
 * ورودی: آرایه‌ی objects از scene (همان شکلِ LiftingPlanCanvas)، شماره‌ی
 * مرحله و کسرِ آن برای شبیه‌سازی، و env = { soilKpa, sf, travelHeight }.
 * ============================================================================ */

export const LIFT_PHASES = ["setup", "pick", "lift", "slew", "travel", "place"];

// معیارهای پیش‌فرض — دقیقاً همان چیزی که در migration به‌عنوان قالبِ سیستمی
// seed شد. همیشه با criteriaِ واقعیِ شرکت override می‌شود؛ اینجا فقط fallback.
export const DEFAULT_CRITERIA = {
  maxUtilizationPct: 85,
  warnUtilizationPct: 75,
  minPersonnelClearance_m: 3,
  groundBearingSafetyFactor: 2,
  windLimit_ms: 9.8,
  minLoadRadiusMargin_m: 0,
  slingAngleWarnFromVertical_deg: 60,
  hookToCgWarn_m: 0.4,
  hookToCgFail_m: 1,
  powerLineClearance: [
    { maxKv: 1, clearance_m: 3 },
    { maxKv: 50, clearance_m: 3 },
    { maxKv: 200, clearance_m: 4.6 },
    { maxKv: 350, clearance_m: 6.1 },
    { maxKv: 500, clearance_m: 7.6 },
    { maxKv: 1000, clearance_m: 10.7 },
  ],
};

const GVT = 9.80665; // m/s²

// ---------- هندسه ----------
export function rotate(px, py, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [px * c - py * s, px * s + py * c];
}
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function bearing(fromX, fromY, toX, toY) { return Math.atan2(toY - fromY, toX - fromX); }

export function segPointDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// ---------- کمک‌کننده‌های شیء ----------
const isType = (o, ...types) => types.includes(o.type);
export const firstOf = (objs, ...types) => objs.find((o) => isType(o, ...types)) || null;
export const allOf = (objs, ...types) => objs.filter((o) => isType(o, ...types));

export function loadWorldPicks(L) {
  if (!L || !Array.isArray(L.picks)) return [];
  return L.picks.map((p) => {
    const r = rotate(p.x, p.y, L.rot || 0);
    return { x: L.x + r[0], y: L.y + r[1] };
  });
}
export function loadWorldCG(L) {
  const cg = L?.cg || { x: 0, y: 0 };
  const r = rotate(cg.x, cg.y, L?.rot || 0);
  return { x: (L?.x || 0) + r[0], y: (L?.y || 0) + r[1] };
}
// نقطه‌ی سرِ بوم در نمای بالا (متر) از پیکربندیِ بوم: طول × cos(زاویه) در راستای
// اسلوِ جرثقیل (crane.rot). hReach = مؤلفه‌ی قائمِ سرِ بوم (برای نمای جانبی).
export function boomReach(crane) {
  const len = +crane?.boomLengthM || 0;
  const ang = (crane?.boomAngleDeg == null ? 65 : +crane.boomAngleDeg) * Math.PI / 180;
  const slew = (crane?.rot || 0) * Math.PI / 180;
  const r = len * Math.cos(ang);
  return {
    x: (crane?.x || 0) + r * Math.cos(slew),
    y: (crane?.y || 0) + r * Math.sin(slew),
    r,
    hReach: len * Math.sin(ang),
  };
}

// قلاب را (به‌عنوان یک شیءِ متصل) روی سرِ بومِ جرثقیل می‌نشاند. اگر جرثقیل یا
// قلاب نباشد، آرایه بدون تغییر برمی‌گردد.
export function syncCraneRig(objs) {
  if (!Array.isArray(objs)) return objs;
  const crane = objs.find((o) => o.type === "crane" && +o.boomLengthM);
  if (!crane) return objs;
  const hook = objs.find((o) => o.type === "hook");
  if (!hook) return objs;
  const br = boomReach(crane);
  const nx = +br.x.toFixed(3), ny = +br.y.toFixed(3);
  if (Math.abs((hook.x || 0) - nx) < 1e-3 && Math.abs((hook.y || 0) - ny) < 1e-3 && hook.craneId === crane.id) return objs;
  return objs.map((o) => (o.id === hook.id ? { ...o, x: nx, y: ny, craneId: crane.id } : o));
}

export function loadFootprintRadius(L) {
  if (!L) return 1.5;
  if (L.shape === "circle") return L.r || 1.5;
  if (L.shape === "poly" && Array.isArray(L.pts) && L.pts.length) {
    return L.pts.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0) || 1.5;
  }
  return Math.hypot((L.w || 2) / 2, (L.h || 2) / 2);
}

// ---------- Load Chart ----------
// خطیِ تکه‌ای بین نقاطِ چارت. بیرون از دامنه‌ی چارت → null («خارج از چارت»).
export function interpolateChart(chart, radiusM) {
  if (!Array.isArray(chart) || chart.length === 0) return null;
  const s = chart
    .map((row) => (Array.isArray(row) ? { r: +row[0], c: +row[1] } : { r: +row.radius_m, c: +row.capacity_kg }))
    .filter((p) => Number.isFinite(p.r) && Number.isFinite(p.c))
    .sort((a, b) => a.r - b.r);
  if (!s.length) return null;
  if (radiusM <= s[0].r) return s[0].c;
  if (radiusM >= s[s.length - 1].r) return null;
  for (let i = 1; i < s.length; i++) {
    if (radiusM <= s[i].r) {
      const f = (radiusM - s[i - 1].r) / (s[i].r - s[i - 1].r);
      return s[i - 1].c + f * (s[i].c - s[i - 1].c);
    }
  }
  return null;
}

export function powerLineClearance(kv, criteria = DEFAULT_CRITERIA) {
  const bands = criteria.powerLineClearance || DEFAULT_CRITERIA.powerLineClearance;
  for (const b of bands) if (kv <= b.maxKv) return b.clearance_m;
  return bands[bands.length - 1]?.clearance_m ?? 12;
}

// ---------- شبیه‌سازی: موقعیتِ قلاب در هر مرحله ----------
// phaseIndex 0..5، frac 0..1. z = ارتفاعِ قلاب نسبت به نقطه‌ی Pick (m).
export function computeHookState(objs, phaseIndex, frac, env = {}) {
  const c = firstOf(objs, "crane");
  const L = firstOf(objs, "load");
  const tg = firstOf(objs, "target");
  const cx = c?.x ?? 0, cy = c?.y ?? 0;
  const pick = { x: L?.x ?? 0, y: L?.y ?? 0 };
  const place = tg ? { x: tg.x, y: tg.y } : pick;
  const rP = dist(cx, cy, pick.x, pick.y);
  const rQ = dist(cx, cy, place.x, place.y);
  const aP = bearing(cx, cy, pick.x, pick.y);
  const aQ = bearing(cx, cy, place.x, place.y);
  let dA = aQ - aP;
  while (dA > Math.PI) dA -= 2 * Math.PI;
  while (dA < -Math.PI) dA += 2 * Math.PI;
  const TH = env.travelHeight ?? 12;
  const ph = Math.max(0, Math.min(5, phaseIndex | 0));
  const f = Math.max(0, Math.min(1, frac || 0));
  let pos = { ...pick }, z = TH;
  if (ph === 0) {
    // استقرار: قلاب سرِ بوم طبقِ طول/زاویه/اسلوِ پیکربندی‌شده (اگر بوم تعریف شده باشد)
    pos = (c && +c.boomLengthM) ? boomReach(c) : pick;
    z = TH;
  }
  else if (ph === 1) { pos = pick; z = TH * (1 - f); }
  else if (ph === 2) { pos = pick; z = TH * f; }
  else if (ph === 3) { const a = aP + dA * f; pos = { x: cx + rP * Math.cos(a), y: cy + rP * Math.sin(a) }; z = TH; }
  else if (ph === 4) { const r = rP + (rQ - rP) * f; pos = { x: cx + r * Math.cos(aQ), y: cy + r * Math.sin(aQ) }; z = TH; }
  else { pos = place; z = TH * (1 - f); }
  return { x: pos.x, y: pos.y, z, pick, place, rP, rQ, radius: dist(cx, cy, pos.x, pos.y) };
}

// ---------- محاسبه‌ی کاملِ لیفت ----------
export function computeLiftCalc(objs, phaseIndex = 0, frac = 0, env = {}, criteria = DEFAULT_CRITERIA) {
  const cr = { ...DEFAULT_CRITERIA, ...(criteria || {}) };
  const c = firstOf(objs, "crane");
  const L = firstOf(objs, "load");
  const hook = firstOf(objs, "hook");
  const slings = firstOf(objs, "slingset", "sling");
  const shackle = firstOf(objs, "shackle");
  const spreader = firstOf(objs, "spreader", "spreader_beam");
  const sim = computeHookState(objs, phaseIndex, frac, env);

  const loadW = (L && +L.weightKg) || 0;
  const rigW =
    ((hook && +hook.weightKg) || 0) +
    ((slings && +slings.weightKg) || 0) +
    ((shackle && +shackle.weightKg) || 0) +
    ((spreader && spreader.enabled && +spreader.weightKg) || 0);
  const total = loadW + rigW;

  const radius = sim.radius;
  const TH = env.travelHeight ?? 12;
  const liftHeight = TH - sim.z;

  const capacity = c ? interpolateChart(c.chart, radius) : null;
  const utilizationPct = capacity ? (total / capacity) * 100 : null;

  // اسلینگ‌ها: از قلاب به هر Pick Point، هندسه‌ی واقعی
  const picks = loadWorldPicks(L);
  const rigH = (hook && +hook.riggingH) || 4;
  const share = picks.length ? total / picks.length : total;
  const legs = picks.map((p) => {
    const horiz = Math.hypot(p.x - sim.x, p.y - sim.y);
    const angFromVertical = (Math.atan2(horiz, rigH) * 180) / Math.PI;
    const tension = share / Math.cos((Math.min(89.5, angFromVertical) * Math.PI) / 180);
    return { horiz, angFromVertical, tension };
  });
  const maxTension = legs.reduce((m, l) => Math.max(m, l.tension), 0);
  const minSlingAngle = legs.reduce((m, l) => Math.min(m, l.angFromVertical), Infinity);
  const slingWLL = (slings && +slings.wllKg) || 0;

  // فشارِ روی زمین (بدترین پَد)
  const pads = (c && +c.pads) || 4;
  const padArea = (c && +c.padArea) || 0.5;
  const reactionKg = ((c && +c.weightKg) || 0) + total;
  const worstPadFrac = phaseIndex === 3 || phaseIndex === 4 ? 0.6 : 0.35;
  const groundPressureKpa = ((reactionKg * GVT) / 1000) * worstPadFrac / padArea;
  const soilKpa = env.soilKpa ?? 250;
  const sf = env.sf ?? cr.groundBearingSafetyFactor ?? 2;
  const allowableGroundKpa = soilKpa / sf;

  let hookToCg = null;
  if (L) {
    const cg = loadWorldCG(L);
    hookToCg = Math.hypot(cg.x - sim.x, cg.y - sim.y);
  }

  return {
    sim, loadW, rigW, total,
    radius, liftHeight,
    capacity, utilizationPct,
    legs, maxTension, minSlingAngle: Number.isFinite(minSlingAngle) ? minSlingAngle : null, slingWLL,
    pads, padArea, groundPressureKpa, allowableGroundKpa, soilKpa, sf,
    hookToCg,
    criteria: cr,
  };
}
