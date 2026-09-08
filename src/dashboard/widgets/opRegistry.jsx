import React from "react";
import { AlertTriangle, ClipboardCheck, FileWarning, TrendingUp, Grid3x3, Activity, Radar } from "lucide-react";
import { CounterWidget } from "./primitives.jsx";
import MyTaskQueueWidget from "./MyTaskQueueWidget.jsx";
import AnomalyTrendWidget from "./AnomalyTrendWidget.jsx";
import HcmsRiskMatrixWidget from "./HcmsRiskMatrixWidget.jsx";
import BowtieBarrierHealthWidget from "./BowtieBarrierHealthWidget.jsx";
import ProactiveIndicatorsWidget from "./ProactiveIndicatorsWidget.jsx";

/**
 * رجیستریِ ویجت‌های «داشبورد کاری» — تنها منبعِ حقیقتِ «چه ویجتی هست، در
 * چه دسته‌ای، با چه اندازه‌ای، و چطور رندر می‌شود». شبکه ۱۲ ستونه است و
 * اندازه‌ها بر حسبِ سلولِ گرید‌اند (w در ستون، h در ردیفِ ~۳۶px).
 *
 * چیدمانِ هر کاربر در localStorage نگه‌داری می‌شود (کلیدِ
 * ihms_opdash_layout_<username>) با اسکیمای:
 *   { v: 2, layouts: { lg:[{i,x,y,w,h}], md:[...], sm:[...] }, items: [{i,type,visible,config}] }
 * شناسه‌ی نمونه i = "<type>-<n>" تا Duplicate ممکن باشد.
 */

export const DASHBOARD_GRID = { cols: { lg: 12, md: 8, sm: 4, xs: 2 }, breakpoints: { lg: 1200, md: 900, sm: 600, xs: 0 }, rowHeight: 36, margin: [14, 14] };

export const DASHBOARD_CATEGORIES = [
  { key: "kpi", labelKey: "dashCatKpi" },
  { key: "operations", labelKey: "dashCatOperations" },
  { key: "risk", labelKey: "dashCatRisk" },
  { key: "safety", labelKey: "dashCatSafety" },
  { key: "analysis", labelKey: "dashCatAnalysis" },
];

// render(ctx) — ctx: { t, role, currentUser, onNavigate, kpi, config }
export const DASHBOARD_WIDGETS = [
  {
    type: "cntOpenAnomalies", labelKey: "kpiOpenAnomalies", descKey: "dashDescCntOpenAnomalies",
    icon: AlertTriangle, category: "kpi", defaultW: 3, defaultH: 3, minW: 2, minH: 3, maxH: 4, defaultVisible: true,
    render: ({ t, kpi, onNavigate }) => (
      <CounterWidget
        title={t("kpiOpenAnomalies")} icon={AlertTriangle}
        value={kpi ? String(kpi.openAnomalies ?? 0) : "…"} tone={kpi?.openAnomalies > 0 ? "bad" : "ok"}
        onClick={() => onNavigate && onNavigate({ module: "anomaly", statusFilter: "not_closed" })}
      />
    ),
  },
  {
    type: "cntOpenCa", labelKey: "kpiOpenCorrectiveActions", descKey: "dashDescCntOpenCa",
    icon: ClipboardCheck, category: "kpi", defaultW: 3, defaultH: 3, minW: 2, minH: 3, maxH: 4, defaultVisible: true,
    render: ({ t, kpi, onNavigate }) => (
      <CounterWidget
        title={t("kpiOpenCorrectiveActions")} icon={ClipboardCheck}
        value={kpi ? String(kpi.openCorrectiveActions ?? 0) : "…"} tone="neutral"
        onClick={() => onNavigate && onNavigate({ module: "correctiveActions" })}
      />
    ),
  },
  {
    type: "cntIncidents", labelKey: "kpiIncidents12m", descKey: "dashDescCntIncidents",
    icon: FileWarning, category: "kpi", defaultW: 3, defaultH: 3, minW: 2, minH: 3, maxH: 4, defaultVisible: true,
    render: ({ t, kpi, onNavigate }) => (
      <CounterWidget
        title={t("kpiIncidents12m")} icon={FileWarning}
        value={kpi ? String(kpi.incidentsCount ?? 0) : "…"} tone={kpi?.incidentsCount > 0 ? "bad" : "ok"}
        onClick={() => onNavigate && onNavigate({ module: "incidents" })}
      />
    ),
  },
  {
    type: "myTaskQueue", labelKey: "wtqTitle", descKey: "dashDescMyTaskQueue",
    icon: ClipboardCheck, category: "operations", defaultW: 6, defaultH: 11, minW: 4, minH: 6, defaultVisible: true,
    render: ({ role, currentUser, onNavigate }) => (
      <MyTaskQueueWidget role={role} currentUser={currentUser} onNavigate={onNavigate} />
    ),
  },
  {
    type: "anomalyTrend", labelKey: "atrTitle", descKey: "dashDescAnomalyTrend",
    icon: TrendingUp, category: "analysis", defaultW: 4, defaultH: 7, minW: 3, minH: 5, defaultVisible: true,
    render: ({ role, currentUser, onNavigate }) => (
      <AnomalyTrendWidget role={role} currentUser={currentUser} onNavigate={onNavigate} />
    ),
  },
  {
    type: "hcmsRiskMatrix", labelKey: "hrmTitle", descKey: "dashDescHcmsRiskMatrix",
    icon: Grid3x3, category: "risk", defaultW: 5, defaultH: 12, minW: 4, minH: 8, defaultVisible: true,
    render: ({ onNavigate }) => <HcmsRiskMatrixWidget onNavigate={onNavigate} />,
  },
  {
    type: "bowtieBarrierHealth", labelKey: "bbhTitle", descKey: "dashDescBowtieBarrierHealth",
    icon: Activity, category: "risk", defaultW: 6, defaultH: 8, minW: 4, minH: 5, defaultVisible: true,
    render: ({ role, currentUser, onNavigate }) => (
      <BowtieBarrierHealthWidget role={role} currentUser={currentUser} onNavigate={onNavigate} />
    ),
  },
  {
    type: "proactiveIndicators", labelKey: "piwTitle", descKey: "dashDescProactiveIndicators",
    icon: Radar, category: "safety", defaultW: 6, defaultH: 8, minW: 4, minH: 5, defaultVisible: true,
    render: ({ onNavigate }) => <ProactiveIndicatorsWidget onNavigate={onNavigate} />,
  },
];

const BY_TYPE = Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.type, w]));
export const getWidgetDef = (type) => BY_TYPE[type] || null;
export const opWidgetLabelKey = (type) => BY_TYPE[type]?.labelKey || type;

// ---- چیدمانِ پیش‌فرضِ حرفه‌ای: ردیفِ KPI، سپس کارتابل + روند، سپس ماتریسِ
// ریسک، سپس ویجت‌های پهنِ مدیریتی. md/sm/xs از روی lg ساخته می‌شوند: عرضِ
// هر ویجت نسبتِ 12→cols کوچک می‌شود و ویجت‌ها از چپ‌به‌راست چیده می‌شوند و
// در پرشدنِ ردیف به سطرِ بعد می‌روند. چون هر ویجت مختصاتِ صریحِ x/y می‌گیرد،
// تغییرِ بزرگ‌نماییِ مرورگر (که ممکن است breakpoint را عوض کند) دیگر باعثِ
// جابه‌جاییِ بی‌قاعده و بالا/پایین‌پریدنِ ویجت‌ها نمی‌شود.
function itemId(type, n) { return `${type}-${n}`; }

const LG = [
  { type: "cntOpenAnomalies", x: 0, y: 0, w: 3, h: 3 },
  { type: "cntOpenCa", x: 3, y: 0, w: 3, h: 3 },
  { type: "cntIncidents", x: 6, y: 0, w: 3, h: 3 },
  { type: "anomalyTrend", x: 9, y: 0, w: 3, h: 7 },
  { type: "myTaskQueue", x: 0, y: 3, w: 6, h: 11 },
  { type: "hcmsRiskMatrix", x: 6, y: 3, w: 6, h: 12 },
  { type: "bowtieBarrierHealth", x: 0, y: 14, w: 6, h: 8 },
  { type: "proactiveIndicators", x: 6, y: 15, w: 6, h: 8 },
];

function scaleLayout(list, cols) {
  let x = 0, y = 0, rowH = 0;
  return list.map((r) => {
    const def = BY_TYPE[r.type] || {};
    const minW = Math.min(def.minW || 1, cols);
    let w = Math.round((r.w * cols) / 12);
    w = Math.max(minW, Math.min(w, cols));
    if (x + w > cols) { x = 0; y += rowH || 1; rowH = 0; }
    const rect = { i: itemId(r.type, 1), x, y, w, h: r.h };
    x += w;
    rowH = Math.max(rowH, r.h);
    return rect;
  });
}

export function defaultDashboardLayout() {
  const items = LG.map((r) => ({ i: itemId(r.type, 1), type: r.type, visible: true, config: {} }));
  return {
    v: 2,
    items,
    layouts: {
      lg: LG.map((r) => ({ i: itemId(r.type, 1), x: r.x, y: r.y, w: r.w, h: r.h })),
      md: scaleLayout(LG, 8),
      sm: scaleLayout(LG, 4),
      xs: scaleLayout(LG, 2),
    },
  };
}

// ---- ترکیبِ چیدمانِ ذخیره‌شده با رجیستری ----
export function mergeLayout(saved) {
  if (!saved || saved.v !== 2 || !Array.isArray(saved.items) || !saved.layouts) {
    return defaultDashboardLayout();
  }
  const items = saved.items.filter((it) => it && BY_TYPE[it.type]).map((it) => ({
    i: String(it.i), type: it.type, visible: it.visible !== false, config: it.config && typeof it.config === "object" ? it.config : {},
  }));
  if (items.length === 0) return defaultDashboardLayout();

  const ids = new Set(items.map((it) => it.i));
  const layouts = {};
  ["lg", "md", "sm", "xs"].forEach((bp) => {
    const src = Array.isArray(saved.layouts[bp]) ? saved.layouts[bp] : [];
    layouts[bp] = src.filter((r) => r && ids.has(String(r.i))).map((r) => ({
      i: String(r.i), x: Math.max(0, r.x | 0), y: Math.max(0, r.y | 0),
      w: Math.max(1, r.w | 0), h: Math.max(1, r.h | 0),
    }));
    // آیتمی که rect ندارد → ته‌ی گرید
    items.forEach((it) => {
      if (!layouts[bp].some((r) => r.i === it.i)) {
        const def = BY_TYPE[it.type];
        layouts[bp].push({ i: it.i, x: 0, y: Infinity, w: Math.min(def.defaultW, DASHBOARD_GRID.cols[bp] || 12), h: def.defaultH });
      }
    });
  });

  // ویجتِ جدیدِ رجیستری که کاربر هنوز ندارد و defaultVisible است → افزوده شود
  DASHBOARD_WIDGETS.forEach((w) => {
    if (!w.defaultVisible) return;
    if (items.some((it) => it.type === w.type)) return;
    const i = itemId(w.type, 1);
    items.push({ i, type: w.type, visible: true, config: {} });
    ["lg", "md", "sm", "xs"].forEach((bp) => {
      layouts[bp].push({ i, x: 0, y: Infinity, w: Math.min(w.defaultW, DASHBOARD_GRID.cols[bp] || 12), h: w.defaultH });
    });
  });

  return { v: 2, items, layouts };
}

// ---- افزودن یک نمونه‌ی جدید از یک نوع (Add / Duplicate) ----
export function addWidgetInstance(state, type, config) {
  const def = BY_TYPE[type];
  if (!def) return state;
  let n = 1;
  while (state.items.some((it) => it.i === itemId(type, n))) n += 1;
  const i = itemId(type, n);
  const items = [...state.items, { i, type, visible: true, config: config || {} }];
  const layouts = {};
  ["lg", "md", "sm", "xs"].forEach((bp) => {
    layouts[bp] = [
      ...(state.layouts[bp] || []),
      { i, x: 0, y: Infinity, w: Math.min(def.defaultW, DASHBOARD_GRID.cols[bp] || 12), h: def.defaultH },
    ];
  });
  return { v: 2, items, layouts, __focus: i };
}

// ---- حذف یک نمونه ----
export function removeWidgetInstance(state, i) {
  const items = state.items.filter((it) => it.i !== i);
  const layouts = {};
  ["lg", "md", "sm", "xs"].forEach((bp) => {
    layouts[bp] = (state.layouts[bp] || []).filter((r) => r.i !== i);
  });
  return { v: 2, items, layouts };
}
