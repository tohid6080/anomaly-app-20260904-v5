/**
 * رجیستری واحدِ پنل‌های «داشبورد مدیریتی».
 *
 * تنها منبعِ حقیقتِ «چه پنل‌هایی روی داشبورد وجود دارد». هم
 * HomeDashboard.jsx (برای رندر و ترتیب) و هم SuperAdminPanel.jsx (برای
 * مدیریت نمایش/ترتیب) از همین‌جا می‌خوانند — افزودن یک پنل جدید فقط یک
 * سطر اینجاست، نه ویرایش دو فایل.
 *
 * وضعیتِ نمایش/ترتیبِ هر پنل در جدول system_dashboard_widgets ذخیره
 * می‌شود (widget_key + is_visible + sort_order). این فایل فقط «تعریف»
 * است، نه «حالت».
 */

export const DASHBOARD_WIDGET_GROUPS = [
  { key: "kpi", labelKey: "dwGroupKpi" },
  { key: "comparison", labelKey: "dwGroupComparison" },
  { key: "alerts", labelKey: "dwGroupAlerts" },
  { key: "trends", labelKey: "dwGroupTrends" },
];

// ترتیبِ این آرایه = ترتیبِ پیش‌فرضِ پنل‌ها روی داشبورد (تا وقتی SuperAdmin
// چیز دیگری ذخیره نکرده باشد). employerOnly یعنی این پنل برای نقش
// CONTRACTOR اصلاً رندر نمی‌شود (داده‌ی مقایسه‌ی بین‌پیمانکاری).
export const DASHBOARD_WIDGETS = [
  { key: "kpiStrip", group: "kpi", labelKey: "dwKpiStrip", defaultVisible: true },
  { key: "contractorHse", group: "comparison", labelKey: "dwContractorHse", defaultVisible: true, employerOnly: true },
  { key: "contractorPerformance", group: "comparison", labelKey: "dwContractorPerformance", defaultVisible: true, employerOnly: true },
  { key: "correctiveActionPerf", group: "comparison", labelKey: "dwCorrectiveActionPerf", defaultVisible: true, employerOnly: true },
  { key: "urgentAlerts", group: "alerts", labelKey: "dwUrgentAlerts", defaultVisible: true },
  { key: "smartInsights", group: "alerts", labelKey: "dwSmartInsights", defaultVisible: true },
  { key: "incidentSafety", group: "trends", labelKey: "dwIncidentSafety", defaultVisible: true },
  { key: "rcaStatus", group: "trends", labelKey: "dwRcaStatus", defaultVisible: true },
  { key: "proactiveScores", group: "trends", labelKey: "dwProactiveScores", defaultVisible: true },
  { key: "anomalyTrend", group: "trends", labelKey: "dwAnomalyTrend", defaultVisible: true },
  { key: "healthStatus", group: "trends", labelKey: "dwHealthStatus", defaultVisible: true },
  { key: "machineryStatus", group: "trends", labelKey: "dwMachineryStatus", defaultVisible: true },
  { key: "anomalyByRisk", group: "trends", labelKey: "dwAnomalyByRisk", defaultVisible: true },
];

const WIDGET_BY_KEY = Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.key, w]));

/**
 * رجیستری را با ردیف‌های ذخیره‌شده‌ی DB ترکیب می‌کند و آرایه‌ی نهاییِ
 * مرتب‌شده برمی‌گرداند: { key, label, group, employerOnly, isVisible, sortOrder }.
 *
 * رجیستری = مرجعِ وجود/برچسب/گروه/پیش‌فرض. DB = override نمایش + ترتیب.
 * کلیدی که در DB ردیف ندارد fail-open است: با defaultVisible و ترتیبِ
 * رجیستری. ردیفِ DB برای کلیدی که دیگر در رجیستری نیست نادیده گرفته می‌شود.
 */
export function mergeWidgetConfig(dbRows = []) {
  const byKey = Object.fromEntries((dbRows || []).map((r) => [r.widgetKey, r]));
  return DASHBOARD_WIDGETS.map((w, idx) => {
    const row = byKey[w.key];
    return {
      key: w.key,
      labelKey: w.labelKey,
      group: w.group,
      employerOnly: !!w.employerOnly,
      isVisible: row ? row.isVisible !== false : w.defaultVisible !== false,
      sortOrder: row && row.sortOrder != null ? row.sortOrder : idx + 1,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

// حالتِ «بازگردانی پیش‌فرض»: همان ترتیب و نمایشِ خودِ رجیستری.
export function defaultWidgetConfig() {
  return DASHBOARD_WIDGETS.map((w, idx) => ({
    key: w.key,
    labelKey: w.labelKey,
    group: w.group,
    employerOnly: !!w.employerOnly,
    isVisible: w.defaultVisible !== false,
    sortOrder: idx + 1,
  }));
}

export function widgetGroupLabelKey(groupKey) {
  return DASHBOARD_WIDGET_GROUPS.find((g) => g.key === groupKey)?.labelKey || groupKey;
}

export function isKnownWidget(key) {
  return !!WIDGET_BY_KEY[key];
}
