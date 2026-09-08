/**
 * رجیستریِ ویجت‌های «داشبورد کاری» — تنها منبعِ حقیقتِ «چه ویجتی هست، به
 * چه ترتیبی، با چه برچسبی». ترتیبِ این آرایه = چیدمانِ پیش‌فرض تا وقتی
 * کاربر خودش چیزی ذخیره نکرده باشد. نمایش/ترتیبِ شخصیِ هر کاربر در
 * localStorage نگه‌داری می‌شود (per-user، کلیدِ ihms_opdash_layout_<username>).
 */
// span = عرضِ پیش‌فرضِ ویجت در شبکه (۱ یا ۲ ستون). ویجت‌های فهرست‌محور و
// پرمحتوا پیش‌فرض ۲ ستون‌اند؛ شمارنده‌ها و نمودارهای فشرده ۱ ستون.
export const OP_WIDGETS = [
  { key: "myTaskQueue", labelKey: "wtqTitle", span: 2 },
  { key: "cntOpenAnomalies", labelKey: "kpiOpenAnomalies", span: 1 },
  { key: "cntOpenCa", labelKey: "kpiOpenCorrectiveActions", span: 1 },
  { key: "cntIncidents", labelKey: "kpiIncidents12m", span: 1 },
  { key: "anomalyTrend", labelKey: "atrTitle", span: 1 },
  { key: "hcmsRiskMatrix", labelKey: "hrmTitle", span: 2 },
  { key: "bowtieBarrierHealth", labelKey: "bbhTitle", span: 2 },
  { key: "proactiveIndicators", labelKey: "piwTitle", span: 2 },
];

const KNOWN = new Set(OP_WIDGETS.map((w) => w.key));
const DEFAULT_SPAN = Object.fromEntries(OP_WIDGETS.map((w) => [w.key, w.span]));
const clampSpan = (s, dflt) => (s === 1 || s === 2 ? s : dflt || 1);

export function defaultOpLayout() {
  return OP_WIDGETS.map((w) => ({ key: w.key, visible: true, span: w.span }));
}

/**
 * چیدمانِ ذخیره‌شده را با رجیستری ترکیب می‌کند:
 *  - کلیدهای ناشناخته (ویجتِ حذف‌شده) نادیده گرفته می‌شوند
 *  - ویجتِ جدیدِ رجیستری که در ذخیره نیست، در انتها و «نمایش‌داده‌شده» اضافه می‌شود
 *  - span از ذخیره خوانده می‌شود؛ نبود/نامعتبر = پیش‌فرضِ رجیستری (سازگاری با چیدمان‌های قدیمی)
 */
export function mergeOpLayout(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return defaultOpLayout();
  const seen = new Set();
  const merged = saved
    .filter((r) => r && KNOWN.has(r.key) && !seen.has(r.key) && seen.add(r.key))
    .map((r) => ({ key: r.key, visible: r.visible !== false, span: clampSpan(r.span, DEFAULT_SPAN[r.key]) }));
  OP_WIDGETS.forEach((w) => {
    if (!seen.has(w.key)) merged.push({ key: w.key, visible: true, span: w.span });
  });
  return merged;
}

export function opWidgetLabelKey(key) {
  return OP_WIDGETS.find((w) => w.key === key)?.labelKey || key;
}
