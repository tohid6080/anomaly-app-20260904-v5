import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Responsive as Grid } from "react-grid-layout";
import { Pencil, RotateCcw, GripVertical, Plus, Trash2, Copy, RefreshCw, X, Eye, EyeOff, ClipboardList } from "lucide-react";
import { THEME, usePersistedState } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { usePageBar } from "../shared/PageBar.jsx";
import { loadHomeKpiSummary } from "./homeKpiApi.js";
import {
  DASHBOARD_WIDGETS, DASHBOARD_CATEGORIES, DASHBOARD_GRID,
  getWidgetDef, opWidgetLabelKey, defaultDashboardLayout, mergeLayout,
  addWidgetInstance, removeWidgetInstance,
} from "./widgets/opRegistry.jsx";

// عرضِ گرید را خودمان با ResizeObserver می‌سنجیم، نه با WidthProvider‌ی که
// react-grid-layout می‌دهد. WidthProvider فقط به window.resize گوش می‌دهد؛
// وقتی سایدبار باز/بسته می‌شود یا هر چیزی عرضِ ظرف را بدونِ resizeِ پنجره
// عوض می‌کند، عرض را به‌روز نمی‌کند و ویجت‌ها از سمتِ راست زیرِ سایدبار
// می‌روند. ResizeObserver هر تغییرِ عرضِ ظرف را می‌گیرد.
function useElementWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);
  return [ref, w];
}

/**
 * داشبورد کاری (Operational) — یک Dashboard Builder واقعی: در حالتِ ویرایش،
 * مدیر ویجت‌ها را از سرِ کارت با ماوس می‌کشد و جابه‌جا می‌کند (برخورد =
 * جابه‌جاییِ هوشمند، نه حذف)، اندازه‌شان را با دستهٔ گوشه/لبه تغییر می‌دهد،
 * ویجتِ جدید اضافه/حذف/کپی می‌کند. همه‌چیز فقط در draft است و با «ذخیرهٔ
 * تغییرات» در localStorageِ همان کاربر ثبت می‌شود (مطابقِ CLAUDE.md).
 * موتورِ گرید: react-grid-layout (۱۲ ستونه، responsive، compact عمودی).
 */

const RGL_CSS = `
.react-grid-layout { position: relative; }
.react-grid-item { box-sizing: border-box; }
/* انیمیشنِ جابه‌جایی فقط در حالتِ ویرایش (بازخوردِ درگ/افزودن/حذف). در
   حالتِ نمایش هیچ transitionی نیست تا تغییرِ بزرگ‌نمایی/اندازهٔ پنجره
   باعثِ سُر خوردنِ آبشاریِ ویجت‌ها نشود. */
.dash-rgl--edit .react-grid-item { transition: transform 160ms ease, width 160ms ease, height 160ms ease; }
.dash-rgl--edit .react-grid-item.resizing { transition: none; z-index: 3; }
.dash-rgl--edit .react-grid-item.react-draggable-dragging { transition: none; z-index: 3; }
@media (prefers-reduced-motion: reduce) { .dash-rgl--edit .react-grid-item { transition: none; } }
.react-grid-item.react-grid-placeholder { background: var(--ihms-teal, #14b8a6); opacity: 0.16; border-radius: 12px; transition-duration: 100ms; z-index: 2; user-select: none; }
.react-grid-item > .react-resizable-handle { position: absolute; width: 18px; height: 18px; }
.react-grid-item > .react-resizable-handle::after { content: ""; position: absolute; right: 4px; bottom: 4px; width: 6px; height: 6px; border-right: 2px solid var(--ihms-text3, #6a8290); border-bottom: 2px solid var(--ihms-text3, #6a8290); }
.react-grid-item > .react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
.react-grid-item > .react-resizable-handle-sw { bottom: 0; left: 0; cursor: sw-resize; }
.react-grid-item > .react-resizable-handle-sw::after { right: auto; left: 4px; border-right: 0; border-left: 2px solid var(--ihms-text3, #6a8290); }
.react-grid-item > .react-resizable-handle-s { bottom: 0; left: 50%; margin-left: -9px; cursor: s-resize; }
.react-grid-item > .react-resizable-handle-e { right: 0; top: 50%; margin-top: -9px; cursor: e-resize; }
.dash-rgl .react-grid-item { overflow: hidden; }
`;

function IconBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button" onClick={onClick} title={label} aria-label={label}
      style={{
        width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${THEME.border}`, background: THEME.surface2, cursor: "pointer", padding: 0,
        color: danger ? THEME.danger : THEME.text2,
      }}
    >
      <Icon size={12} />
    </button>
  );
}

export default function OperationalDashboard({ role, currentUser, onNavigate, onBack }) {
  const { t, dir } = useLanguage();
  // چیدمانِ داشبورد کاری per-user در localStorage است و هیچ داده‌ی HSE‌ای
  // را تغییر نمی‌دهد؛ پس هر کاربرِ واردشده می‌تواند چیدمانِ خودش را ویرایش
  // و جابه‌جا کند (پیمانکار و کارفرما یکسان).
  const canEdit = !!currentUser;

  const [gridRef, gridWidth] = useElementWidth();
  const [kpi, setKpi] = useState(null);
  const [saved, setSaved] = usePersistedState("ihms_opdash_layout_" + (currentUser?.username || "anon"), null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bp, setBp] = useState("lg");
  const [toast, setToast] = useState("");
  const [ticks, setTicks] = useState({}); // per-widget remount counter (Refresh)

  useEffect(() => { loadHomeKpiSummary().then(setKpi).catch(() => setKpi({})); }, []);

  const refreshOne = useCallback((i) => {
    setTicks((m) => ({ ...m, [i]: (m[i] || 0) + 1 }));
    loadHomeKpiSummary().then(setKpi).catch(() => {});
  }, []);

  const state = useMemo(() => (editing && draft ? draft : mergeLayout(saved)), [editing, draft, saved]);
  const wideEnough = bp === "lg" || bp === "md";
  const isEditing = editing && wideEnough;

  const ctxBase = useMemo(() => ({ t, role, currentUser, onNavigate, kpi }), [t, role, currentUser, onNavigate, kpi]);

  // خروجی رندرِ هر ویجت را memoize می‌کنیم تا کشیدن/تغییرِ اندازه باعثِ
  // رندرِ دوباره‌ی محتوای همه‌ی ویجت‌ها نشود.
  const bodies = useMemo(() => {
    const m = {};
    state.items.forEach((it) => {
      const def = getWidgetDef(it.type);
      m[it.i] = def ? def.render({ ...ctxBase, config: it.config }) : null;
    });
    return m;
  }, [state.items, ctxBase]);

  // layouts با تزریقِ min/max از رجیستری + static در حالتِ نمایش
  const layouts = useMemo(() => {
    const out = {};
    ["lg", "md", "sm", "xs"].forEach((k) => {
      const list = state.layouts[k] || [];
      out[k] = list
        .filter((r) => {
          const it = state.items.find((x) => x.i === r.i);
          return it && (isEditing || it.visible);
        })
        .map((r) => {
          const it = state.items.find((x) => x.i === r.i);
          const def = getWidgetDef(it.type) || {};
          return { ...r, minW: def.minW, minH: def.minH, maxH: def.maxH, static: !isEditing };
        });
    });
    return out;
  }, [state, isEditing]);

  const onLayoutChange = useCallback((_cur, all) => {
    if (!isEditing) return;
    setDraft((d) => {
      const base = d || mergeLayout(saved);
      const merged = { ...base.layouts };
      Object.keys(all).forEach((k) => {
        merged[k] = all[k].map((r) => ({ i: r.i, x: r.x, y: r.y, w: r.w, h: r.h }));
      });
      return { ...base, layouts: merged };
    });
  }, [isEditing, saved]);

  // draft در حالتِ ویرایش با هر درگ عوض می‌شود؛ برای اینکه هویتِ saveEdit
  // (و در نتیجه اکشن‌های PageBar) پایدار بماند، draft را از ref می‌خوانیم.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const startEdit = useCallback(() => { setDraft(mergeLayout(saved)); setEditing(true); }, [saved]);
  const cancelEdit = useCallback(() => { setDraft(null); setEditing(false); setAddOpen(false); }, []);
  const openAdd = useCallback(() => setAddOpen(true), []);
  const saveEdit = useCallback(() => {
    if (draftRef.current) setSaved(draftRef.current);
    setDraft(null); setEditing(false); setAddOpen(false);
    setToast(t("dashLayoutSaved")); setTimeout(() => setToast(""), 2800);
  }, [setSaved, t]);
  const resetLayout = useCallback(() => { setDraft(defaultDashboardLayout()); setToast(t("dashLayoutReset")); setTimeout(() => setToast(""), 2800); }, [t]);

  const mutate = (fn) => setDraft((d) => fn(d || mergeLayout(saved)));
  const toggleVisible = (i) => mutate((d) => ({ ...d, items: d.items.map((it) => (it.i === i ? { ...it, visible: !it.visible } : it)) }));
  const duplicate = (i) => mutate((d) => {
    const it = d.items.find((x) => x.i === i);
    return it ? addWidgetInstance(d, it.type, it.config) : d;
  });
  const removeOne = (i) => mutate((d) => removeWidgetInstance(d, i));
  const addWidget = (type) => { mutate((d) => addWidgetInstance(d, type)); setAddOpen(false); };

  // دکمه‌های اقدامِ صفحه که در PageBar (نوارِ زیرِ هدر) نشان داده می‌شوند.
  // با useMemo پایدارشان می‌کنیم تا usePageBar در حلقهٔ رندر نیفتد.
  const pageBarActions = useMemo(() => {
    if (!canEdit) return null;
    const base = { fontSize: 11, fontWeight: 600, borderRadius: 8, padding: "6px 11px", background: "transparent", cursor: "pointer", fontFamily: THEME.font, display: "inline-flex", alignItems: "center", gap: 5 };
    if (!editing) {
      return (
        <button type="button" onClick={startEdit} style={{ ...base, color: THEME.text2, border: `1px solid ${THEME.border}` }}>
          <Pencil size={12} /> {t("dashEditMode")}
        </button>
      );
    }
    return (
      <>
        <button type="button" onClick={openAdd} style={{ ...base, color: THEME.teal, border: `1px solid ${THEME.teal}` }}>
          <Plus size={12} /> {t("dashAddWidget")}
        </button>
        <button type="button" onClick={resetLayout} style={{ ...base, color: THEME.text3, border: `1px solid ${THEME.border}` }}>
          <RotateCcw size={11} /> {t("dashResetLayout")}
        </button>
        <button type="button" onClick={cancelEdit} style={{ ...base, color: THEME.text3, border: `1px solid ${THEME.border}` }}>
          {t("dashCancel")}
        </button>
        <button type="button" onClick={saveEdit} style={{ ...base, color: "#fff", fontWeight: 700, border: "none", background: THEME.teal }}>
          {t("dashSave")}
        </button>
      </>
    );
  }, [canEdit, editing, t, startEdit, openAdd, resetLayout, cancelEdit, saveEdit]);

  usePageBar({ title: t("opDashTitle"), icon: ClipboardList, onBack, actions: pageBarActions });

  const gridProps = {
    className: isEditing ? "dash-rgl dash-rgl--edit" : "dash-rgl",
    breakpoints: DASHBOARD_GRID.breakpoints,
    cols: DASHBOARD_GRID.cols,
    rowHeight: DASHBOARD_GRID.rowHeight,
    margin: DASHBOARD_GRID.margin,
    containerPadding: [0, 0],
    compactType: "vertical",
    layouts,
    onLayoutChange,
    onBreakpointChange: setBp,
    isDraggable: isEditing,
    isResizable: isEditing,
    draggableHandle: ".dash-drag",
    resizeHandles: ["se", "sw", "s", "e"],
    width: gridWidth,
    useCSSTransforms: true,
  };

  const visibleItems = state.items.filter((it) => isEditing || it.visible);

  return (
    <div style={{ direction: dir }}>
      <style>{RGL_CSS}</style>

      {editing && !wideEnough && (
        <p style={{ fontSize: 11, color: THEME.warn, margin: "0 0 10px" }}>{t("dashEditDesktopOnly")}</p>
      )}
      {isEditing && (
        <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <GripVertical size={12} /> {t("dashGridEditHint")}
        </p>
      )}

      <div dir="ltr" ref={gridRef} style={{ maxWidth: "100%", overflow: "hidden" }}>
        {gridWidth > 0 && (
        <Grid {...gridProps}>
          {visibleItems.map((it) => (
            <div key={it.i} style={{ height: "100%" }}>
              {isEditing ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", border: `1px dashed ${THEME.border}`, borderRadius: THEME.radiusCard, background: THEME.surface, overflow: "hidden" }}>
                  <div className="dash-drag" style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", cursor: "grab", background: THEME.surface2, borderBottom: `1px solid ${THEME.border}`, direction: dir }}>
                    <GripVertical size={13} color={THEME.text3} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: THEME.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t(opWidgetLabelKey(it.type))}
                    </span>
                    <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "flex", gap: 4 }}>
                      <IconBtn icon={it.visible ? Eye : EyeOff} label={it.visible ? t("saHidden") : t("saVisibleShown")} onClick={() => toggleVisible(it.i)} />
                      <IconBtn icon={RefreshCw} label={t("dashRefreshWidget")} onClick={() => refreshOne(it.i)} />
                      <IconBtn icon={Copy} label={t("dashDuplicateWidget")} onClick={() => duplicate(it.i)} />
                      <IconBtn icon={Trash2} label={t("dashRemoveWidget")} onClick={() => removeOne(it.i)} danger />
                    </span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden", pointerEvents: "none", opacity: it.visible ? 1 : 0.4, direction: dir }}>
                    <React.Fragment key={ticks[it.i] || 0}>{bodies[it.i]}</React.Fragment>
                  </div>
                </div>
              ) : (
                <div style={{ height: "100%", direction: dir }}>
                  <React.Fragment key={ticks[it.i] || 0}>{bodies[it.i]}</React.Fragment>
                </div>
              )}
            </div>
          ))}
        </Grid>
        )}
      </div>

      {addOpen && (
        <AddWidgetDrawer
          t={t} dir={dir}
          onClose={() => setAddOpen(false)}
          onAdd={addWidget}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", insetInlineStart: "50%", transform: "translateX(-50%)", bottom: 24, background: THEME.ok, color: "#04210f", fontSize: 12.5, fontWeight: 700, padding: "9px 18px", borderRadius: 10, zIndex: 200 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function AddWidgetDrawer({ t, dir, onClose, onAdd }) {
  const grouped = DASHBOARD_CATEGORIES
    .map((c) => ({ ...c, widgets: DASHBOARD_WIDGETS.filter((w) => w.category === c.key) }))
    .filter((c) => c.widgets.length > 0);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4,12,18,0.55)", zIndex: 210, display: "flex", justifyContent: dir === "rtl" ? "flex-start" : "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(360px, 92vw)", height: "100%", overflowY: "auto", background: THEME.surface, borderInlineEnd: `1px solid ${THEME.border}`, direction: dir, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.heading, flex: 1 }}>{t("dashAddWidgetTitle")}</h3>
          <button type="button" onClick={onClose} aria-label={t("commonCancel")} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.text3, padding: 2 }}><X size={16} /></button>
        </div>
        {grouped.map((c) => (
          <div key={c.key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.text3, margin: "0 0 6px" }}>{t(c.labelKey)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {c.widgets.map((w) => {
                const Icon = w.icon;
                return (
                  <button key={w.type} type="button" onClick={() => onAdd(w.type)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 9, textAlign: "start", padding: "9px 10px", borderRadius: 9, border: `1px solid ${THEME.border}`, background: THEME.surface2, cursor: "pointer", fontFamily: THEME.font }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color={THEME.tealDeep} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: THEME.text }}>{t(w.labelKey)}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: THEME.text3, lineHeight: 1.6 }}>{t(w.descKey)}</span>
                    </span>
                    <Plus size={13} color={THEME.teal} style={{ flexShrink: 0, marginTop: 2 }} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
