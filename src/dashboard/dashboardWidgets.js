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
  { key: "kpi", label: "شاخص‌های کلیدی (نوار بالا)" },
  { key: "comparison", label: "مقایسه و رتبه‌بندی پیمانکاران" },
  { key: "alerts", label: "هشدارها و تحلیل" },
  { key: "trends", label: "روندها و توزیع‌ها" },
];

// ترتیبِ این آرایه = ترتیبِ پیش‌فرضِ پنل‌ها روی داشبورد (تا وقتی SuperAdmin
// چیز دیگری ذخیره نکرده باشد). employerOnly یعنی این پنل برای نقش
// CONTRACTOR اصلاً رندر نمی‌شود (داده‌ی مقایسه‌ی بین‌پیمانکاری).
export const DASHBOARD_WIDGETS = [
  { key: "kpiStrip", group: "kpi", label: "نوار شاخص‌های کلیدی", defaultVisible: true },
  { key: "contractorHse", group: "comparison", label: "جدول امتیاز HSE پیمانکاران", defaultVisible: true, employerOnly: true },
  { key: "contractorPerformance", group: "comparison", label: "نمودار امتیاز عملکرد پیمانکاران", defaultVisible: true, employerOnly: true },
  { key: "correctiveActionPerf", group: "comparison", label: "عملکرد اقدامات اصلاحی به تفکیک پیمانکار", defaultVisible: true, employerOnly: true },
  { key: "urgentAlerts", group: "alerts", label: "هشدارهای فوری", defaultVisible: true },
  { key: "smartInsights", group: "alerts", label: "تحلیل هوشمند", defaultVisible: true },
  { key: "incidentSafety", group: "trends", label: "آمار ایمنی حوادث (هرم و روند)", defaultVisible: true },
  { key: "rcaStatus", group: "trends", label: "وضعیت تحلیل ریشه‌ای Tripod Beta", defaultVisible: true },
  { key: "proactiveScores", group: "trends", label: "شاخص‌های پراکتیو (استعداد حادثه‌پذیری / HSE Climate)", defaultVisible: true },
  { key: "anomalyTrend", group: "trends", label: "روند آنومالی (۶ ماه اخیر)", defaultVisible: true },
  { key: "healthStatus", group: "trends", label: "وضعیت طب کار", defaultVisible: true },
  { key: "machineryStatus", group: "trends", label: "وضعیت ماشین‌آلات", defaultVisible: true },
  { key: "anomalyByRisk", group: "trends", label: "آنومالی بر اساس ریسک", defaultVisible: true },
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
      label: w.label,
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
    label: w.label,
    group: w.group,
    employerOnly: !!w.employerOnly,
    isVisible: w.defaultVisible !== false,
    sortOrder: idx + 1,
  }));
}

export function widgetGroupLabel(groupKey) {
  return DASHBOARD_WIDGET_GROUPS.find((g) => g.key === groupKey)?.label || groupKey;
}

export function isKnownWidget(key) {
  return !!WIDGET_BY_KEY[key];
}
