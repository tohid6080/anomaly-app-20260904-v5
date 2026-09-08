import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Pencil, RotateCcw, GripVertical, Plus, Trash2, Copy, RefreshCw, X, Eye, EyeOff } from "lucide-react";
import { THEME, styles, usePersistedState } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadHomeKpiSummary } from "./homeKpiApi.js";
import {
  DASHBOARD_WIDGETS, DASHBOARD_CATEGORIES, DASHBOARD_GRID,
  getWidgetDef, opWidgetLabelKey, defaultDashboardLayout, mergeLayout,
  addWidgetInstance, removeWidgetInstance,
} from "./widgets/opRegistry.jsx";

const Grid = WidthProvider(Responsive);

/**
 * داشبورد کاری (Operational) — یک Dashboard Builder واقعی: در حالتِ ویرایش،
 * مدیر ویجت‌ها را از سرِ کارت با ماوس می‌کشد و جابه‌جا می‌کند (برخورد =
 * جابه‌جاییِ هوشمند، نه حذف)، اندازه‌شان را با دستهٔ گوشه/لبه تغییر می‌دهد،
 * ویجتِ جدید اضافه/حذف/کپی می‌کند. همه‌چیز فقط در draft است و با «ذخیرهٔ
 * تغییرات» در localStorageِ همان کاربر ثبت می‌شود (مطابقِ CLAUDE.md).
 * موتورِ گرید: react-grid-layout (۱۲ ستونه، responsive، compact عمودی).
 */

const RGL_CSS = `
.react-grid-layout { position: relative; transition: height 200ms ease; }
.react-grid-item { transition: all 180ms ease; transition-property: left, top, width, height; box-sizing: border-box; }
.react-grid-item.cssTransforms { transition-property: transform, width, height; }
.react-grid-item.resizing { transition: none; z-index: 3; }
.react-grid-item.react-draggable-dragging { transition: none; z-index: 3; }
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
  const canEdit = ["EMPLOYER", "HSE_SUPERVISOR"].includes(currentUser?.role);

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

  const startEdit = () => { setDraft(mergeLayout(saved)); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); setAddOpen(false); };
  const saveEdit = () => {
    setSaved(draft);
    setDraft(null); setEditing(false); setAddOpen(false);
    setToast(t("dashLayoutSaved")); setTimeout(() => setToast(""), 2800);
  };
  const resetLayout = () => { setDraft(defaultDashboardLayout()); setToast(t("dashLayoutReset")); setTimeout(() => setToast(""), 2800); };

  const mutate = (fn) => setDraft((d) => fn(d || mergeLayout(saved)));
  const toggleVisible = (i) => mutate((d) => ({ ...d, items: d.items.map((it) => (it.i === i ? { ...it, visible: !it.visible } : it)) }));
  const duplicate = (i) => mutate((d) => {
    const it = d.items.find((x) => x.i === i);
    return it ? addWidgetInstance(d, it.type, it.config) : d;
  });
  const removeOne = (i) => mutate((d) => removeWidgetInstance(d, i));
  const addWidget = (type) => { mutate((d) => addWidgetInstance(d, type)); setAddOpen(false); };

  const gridProps = {
    className: "dash-rgl",
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
    measureBeforeMount: false,
    useCSSTransforms: true,
  };

  const visibleItems = state.items.filter((it) => isEditing || it.visible);

  return (
    <div style={{ direction: dir }}>
      <style>{RGL_CSS}</style>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: THEME.fsTitle, color: THEME.heading, fontWeight: THEME.fwTitle, margin: 0 }}>{t("opDashTitle")}</h2>
        <span style={{ flex: 1 }} />
        {!editing && canEdit && (
          <button type="button" onClick={startEdit}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: THEME.text2, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 11px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
            <Pencil size={12} /> {t("dashEditMode")}
          </button>
        )}
        {editing && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setAddOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: THEME.teal, border: `1px solid ${THEME.teal}`, borderRadius: 8, padding: "5px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
              <Plus size={12} /> {t("dashAddWidget")}
            </button>
            <button type="button" onClick={resetLayout}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
              <RotateCcw size={11} /> {t("dashResetLayout")}
            </button>
            <button type="button" onClick={cancelEdit}
              style={{ fontSize: 11, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
              {t("dashCancel")}
            </button>
            <button type="button" onClick={saveEdit}
              style={{ fontSize: 11, fontWeight: 700, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", background: THEME.teal, cursor: "pointer", fontFamily: THEME.font }}>
              {t("dashSave")}
            </button>
          </div>
        )}
      </div>

      {editing && !wideEnough && (
        <p style={{ fontSize: 11, color: THEME.warn, margin: "0 0 10px" }}>{t("dashEditDesktopOnly")}</p>
      )}
      {isEditing && (
        <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <GripVertical size={12} /> {t("dashGridEditHint")}
        </p>
      )}

      <div dir="ltr">
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
