/**
 * رجیستریِ ویجت‌های «داشبورد کاری» — تنها منبعِ حقیقتِ «چه ویجتی هست، به
 * چه ترتیبی، با چه برچسبی». ترتیبِ این آرایه = چیدمانِ پیش‌فرض تا وقتی
 * کاربر خودش چیزی ذخیره نکرده باشد. نمایش/ترتیبِ شخصیِ هر کاربر در
 * localStorage نگه‌داری می‌شود (per-user، کلیدِ ihms_opdash_layout_<username>).
 */
export const OP_WIDGETS = [
  { key: "myTaskQueue", labelKey: "wtqTitle" },
  { key: "cntOpenAnomalies", labelKey: "kpiOpenAnomalies" },
  { key: "cntOpenCa", labelKey: "kpiOpenCorrectiveActions" },
  { key: "cntIncidents", labelKey: "kpiIncidents12m" },
  { key: "anomalyTrend", labelKey: "atrTitle" },
  { key: "hcmsRiskMatrix", labelKey: "hrmTitle" },
  { key: "bowtieBarrierHealth", labelKey: "bbhTitle" },
  { key: "proactiveIndicators", labelKey: "piwTitle" },
];

const KNOWN = new Set(OP_WIDGETS.map((w) => w.key));

export function defaultOpLayout() {
  return OP_WIDGETS.map((w) => ({ key: w.key, visible: true }));
}

/**
 * چیدمانِ ذخیره‌شده را با رجیستری ترکیب می‌کند:
 *  - کلیدهای ناشناخته (ویجتِ حذف‌شده) نادیده گرفته می‌شوند
 *  - ویجتِ جدیدِ رجیستری که در ذخیره نیست، در انتها و «نمایش‌داده‌شده» اضافه می‌شود
 */
export function mergeOpLayout(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return defaultOpLayout();
  const seen = new Set();
  const merged = saved
    .filter((r) => r && KNOWN.has(r.key) && !seen.has(r.key) && seen.add(r.key))
    .map((r) => ({ key: r.key, visible: r.visible !== false }));
  OP_WIDGETS.forEach((w) => {
    if (!seen.has(w.key)) merged.push({ key: w.key, visible: true });
  });
  return merged;
}

export function opWidgetLabelKey(key) {
  return OP_WIDGETS.find((w) => w.key === key)?.labelKey || key;
}
