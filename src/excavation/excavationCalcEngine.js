/* ============================================================================ *
 * Excavation Calc Engine — توابعِ خالصِ محاسبه‌ی شیب/عرضِ ایمنِ گودبرداری.
 * بدونِ React، بدونِ I/O. مرجع: OSHA 29 CFR 1926 Subpart P, Appendix B,
 * Table B-1 "Maximum Allowable Slopes". هیچ آستانه‌ای این‌جا Hard-code نیست؛
 * همه از profile (که از excavation_standard_profiles می‌آید) خوانده می‌شود —
 * DEFAULT_PROFILE فقط fallback است، دقیقاً هم‌الگوی DEFAULT_CRITERIA در
 * liftingCalcEngine.js.
 *
 * این ابزار Decision Support است، نه جایگزینِ طراحیِ مهندسی یا بازرسیِ
 * Competent Person — هر خروجی باید همیشه کنارِ این هشدار نمایش داده شود.
 * ============================================================================ */

export const SOIL_TYPES = ["stable_rock", "type_a", "type_b", "type_c"];
export const PROTECTION_METHODS = ["sloping", "benching", "shoring", "shield"];

// Table B-1 — نسبتِ افقی‌به‌عمودی (H به‌ازای ۱ واحدِ V) برای هر نوعِ خاک
export const DEFAULT_PROFILE = {
  slopes: {
    stable_rock: { hRatio: 0, maxAngleDeg: 90 },
    type_a: { hRatio: 0.75, maxAngleDeg: 53 },
    type_b: { hRatio: 1, maxAngleDeg: 45 },
    type_c: { hRatio: 1.5, maxAngleDeg: 34 },
  },
  peRequiredDepthM: 6.1,          // OSHA 1926.652(b)(3)/(c) — بیش از ۲۰ فوت
  minEdgeLoadSetbackM: 0.6,       // OSHA 1926.651(j)(2) — حداقلِ عقب‌نشینیِ بار/خاکِ حفاری از لبه
  treatWaterAsOneClassWeaker: true,
};

const WEAKER_SOIL = { stable_rock: "type_a", type_a: "type_b", type_b: "type_c", type_c: "type_c" };

function mergeProfile(profile) {
  const p = profile || {};
  return {
    ...DEFAULT_PROFILE,
    ...p,
    slopes: { ...DEFAULT_PROFILE.slopes, ...(p.slopes || {}) },
  };
}

// زاویه‌ی شیب از افق، بر حسبِ درجه — hRatio=0 (Stable Rock) یعنی دیواره‌ی قائم (۹۰°)
export function slopeAngleFromHRatio(hRatio) {
  const h = +hRatio || 0;
  if (h <= 0) return 90;
  return (Math.atan(1 / h) * 180) / Math.PI;
}

/**
 * محاسبه‌ی کاملِ شیب/عرض/حجمِ یک گودبرداریِ مستطیلی با شیبِ یکنواخت در هر
 * چهار طرف. خروجی: هندسه + فهرستی از کدهای هشدار (نه متنِ ترجمه‌شده — ترجمه
 * در لایه‌ی UI با t() انجام می‌شود) + یک حکمِ کلی ok|warn|bad.
 */
export function computeExcavation(inputs, profile) {
  const p = mergeProfile(profile);
  const { depthM, bottomWidthM, lengthM, soilType, hasWater, edgeLoad, adjacentStructure, vibration, protectionMethod } = inputs || {};
  const depth = Math.max(0, +depthM || 0);
  const bottomWidth = Math.max(0, +bottomWidthM || 0);
  const length = Math.max(0, +lengthM || 0);
  const warnings = [];

  const peRequired = depth > (p.peRequiredDepthM ?? 6.1);

  // Shoring/Shield: دیواره می‌تواند تقریباً قائم بماند، به‌شرطِ سیستمِ
  // طراحی‌شده/جدولِ سازنده یا طراحیِ PE — نسبتِ شیبِ این محاسبه‌گر اصلاً
  // به این دو روش اعمال نمی‌شود.
  if (protectionMethod === "shoring" || protectionMethod === "shield") {
    if (peRequired) warnings.push("pe_required");
    warnings.push("shoring_shield_not_slope_based");
    if (hasWater) warnings.push("water_present");
    if (edgeLoad) warnings.push("edge_load");
    if (adjacentStructure) warnings.push("adjacent_structure");
    if (vibration) warnings.push("vibration");
    return {
      applicable: false, protectionMethod, soilType, depthM: depth, bottomWidthM: bottomWidth, lengthM: length,
      peRequiredDepthM: p.peRequiredDepthM, minEdgeLoadSetbackM: p.minEdgeLoadSetbackM,
      verdict: peRequired ? "bad" : "warn", warnings,
    };
  }

  let effectiveSoilType = soilType;
  if (hasWater && p.treatWaterAsOneClassWeaker) {
    effectiveSoilType = WEAKER_SOIL[soilType] || soilType;
    warnings.push("water_downgrade");
  }

  if (protectionMethod === "benching" && effectiveSoilType === "type_c") {
    warnings.push("benching_not_allowed_type_c");
  }

  const slope = p.slopes[effectiveSoilType] || p.slopes.type_c;
  const hRatio = Math.max(0, +slope.hRatio || 0);
  const angleDeg = slopeAngleFromHRatio(hRatio);
  const setbackM = depth * hRatio;
  const topWidthM = bottomWidth + 2 * setbackM;
  const topLengthM = length + 2 * setbackM;
  const bottomArea = bottomWidth * length;
  const topArea = topWidthM * topLengthM;
  const volumeM3 = (depth / 3) * (bottomArea + topArea + Math.sqrt(Math.max(0, bottomArea * topArea)));

  if (edgeLoad) warnings.push("edge_load");
  if (adjacentStructure) warnings.push("adjacent_structure");
  if (vibration) warnings.push("vibration");
  if (peRequired) warnings.push("pe_required");

  // حکمِ کلی: هیچ‌وقت «قابل قبول»ِ خالص نیست مگر هیچ شرایطِ خاصی پرچم نخورده
  // باشد و عمق زیرِ آستانه‌ی PE باشد — دقیقاً طبقِ خواسته‌ی صریح.
  let verdict = "ok";
  if (peRequired) verdict = "bad";
  else if (warnings.length > 0) verdict = "warn";

  return {
    applicable: true, protectionMethod, soilType, effectiveSoilType,
    depthM: depth, bottomWidthM: bottomWidth, lengthM: length,
    hRatio, angleDeg, setbackM, topWidthM, topLengthM, bottomArea, topArea, volumeM3,
    minEdgeLoadSetbackM: p.minEdgeLoadSetbackM, peRequiredDepthM: p.peRequiredDepthM,
    verdict, warnings,
  };
}
