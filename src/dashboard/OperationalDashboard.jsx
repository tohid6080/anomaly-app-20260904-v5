import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, ClipboardCheck, FileWarning, Pencil, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw, GripVertical, RectangleHorizontal, Square } from "lucide-react";
import { THEME, styles, usePersistedState } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadHomeKpiSummary } from "./homeKpiApi.js";
import { CounterWidget } from "./widgets/primitives.jsx";
import MyTaskQueueWidget from "./widgets/MyTaskQueueWidget.jsx";
import AnomalyTrendWidget from "./widgets/AnomalyTrendWidget.jsx";
import HcmsRiskMatrixWidget from "./widgets/HcmsRiskMatrixWidget.jsx";
import BowtieBarrierHealthWidget from "./widgets/BowtieBarrierHealthWidget.jsx";
import ProactiveIndicatorsWidget from "./widgets/ProactiveIndicatorsWidget.jsx";
import { mergeOpLayout, defaultOpLayout, opWidgetLabelKey } from "./widgets/opRegistry.js";

/**
 * داشبورد کاری (Operational) — شبکهٔ ویجت برای کارِ روزمرهٔ سرپرست/کارشناس/
 * پیمانکار، جدا از داشبورد مدیریتی (HomeDashboard).
 *
 * فاز ۳: نمایش/ترتیب/عرضِ ویجت‌ها per-user قابل‌تنظیم است — با دکمهٔ «چیدمانِ
 * من» وارد حالتِ ویرایش می‌شوی، ردیف‌ها را با کشیدن جابه‌جا می‌کنی و عرضِ هر
 * ویجت را بین ۱ و ۲ ستون تغییر می‌دهی. تغییرات فقط در draft می‌ماند و با
 * «ذخیرهٔ چیدمان» در localStorage (کلیدِ هر کاربر) ثبت می‌شود — مطابقِ قانونِ
 * «پیش‌نویسِ محلی، ثبتِ صریح» در CLAUDE.md.
 */
export default function OperationalDashboard({ role, currentUser, onNavigate, onBack }) {
  const { t, dir } = useLanguage();
  const [kpi, setKpi] = useState(null);
  const [savedLayout, setSavedLayout] = usePersistedState(
    "ihms_opdash_layout_" + (currentUser?.username || "anon"), null
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    loadHomeKpiSummary().then(setKpi).catch(() => setKpi({}));
  }, []);

  const layout = useMemo(() => mergeOpLayout(savedLayout), [savedLayout]);
  const k = kpi || {};
  const num = (v) => (kpi ? String(v ?? 0) : "…");

  const renderWidget = (key) => {
    switch (key) {
      case "myTaskQueue":
        return <MyTaskQueueWidget key={key} role={role} currentUser={currentUser} onNavigate={onNavigate} />;
      case "cntOpenAnomalies":
        return (
          <CounterWidget
            key={key} title={t("kpiOpenAnomalies")} icon={AlertTriangle}
            value={num(k.openAnomalies)} tone={k.openAnomalies > 0 ? "bad" : "ok"}
            onClick={() => onNavigate && onNavigate({ module: "anomaly", statusFilter: "not_closed" })}
          />
        );
      case "cntOpenCa":
        return (
          <CounterWidget
            key={key} title={t("kpiOpenCorrectiveActions")} icon={ClipboardCheck}
            value={num(k.openCorrectiveActions)} tone="neutral"
            onClick={() => onNavigate && onNavigate({ module: "correctiveActions" })}
          />
        );
      case "cntIncidents":
        return (
          <CounterWidget
            key={key} title={t("kpiIncidents12m")} icon={FileWarning}
            value={num(k.incidentsCount)} tone={k.incidentsCount > 0 ? "bad" : "ok"}
            onClick={() => onNavigate && onNavigate({ module: "incidents" })}
          />
        );
      case "anomalyTrend":
        return <AnomalyTrendWidget key={key} role={role} currentUser={currentUser} onNavigate={onNavigate} />;
      case "hcmsRiskMatrix":
        return <HcmsRiskMatrixWidget key={key} onNavigate={onNavigate} />;
      case "bowtieBarrierHealth":
        return <BowtieBarrierHealthWidget key={key} role={role} currentUser={currentUser} onNavigate={onNavigate} />;
      case "proactiveIndicators":
        return <ProactiveIndicatorsWidget key={key} onNavigate={onNavigate} />;
      default:
        return null;
    }
  };

  // ---------- حالتِ ویرایشِ چیدمان ----------
  const startEdit = () => { setDraft(layout.map((r) => ({ ...r }))); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); setDragIdx(null); };
  const saveEdit = () => { setSavedLayout(draft); setDraft(null); setEditing(false); setDragIdx(null); };
  const resetDraft = () => setDraft(defaultOpLayout());
  const toggle = (key) => setDraft((p) => p.map((r) => (r.key === key ? { ...r, visible: !r.visible } : r)));
  const setSpan = (key, span) => setDraft((p) => p.map((r) => (r.key === key ? { ...r, span } : r)));
  const move = (key, delta) => setDraft((p) => {
    const arr = p.map((r) => ({ ...r }));
    const i = arr.findIndex((r) => r.key === key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return p;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  // جابه‌جایی با کشیدن (HTML5 DnD خام — بدون کتابخانه، مطابق قید کارایی).
  // «جابه‌جا کن هنگام ورود» که برای فهرستِ عمودی روان‌ترین حالت است.
  const onRowDragStart = (i) => (e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
  const onRowDragEnter = (i) => () => {
    if (dragIdx === null || dragIdx === i) return;
    setDraft((p) => {
      const arr = p.map((r) => ({ ...r }));
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, moved);
      return arr;
    });
    setDragIdx(i);
  };
  const onRowDragEnd = () => setDragIdx(null);

  return (
    <div style={{ direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: THEME.fsTitle, color: THEME.heading, fontWeight: THEME.fwTitle, margin: 0 }}>{t("opDashTitle")}</h2>
        <span style={{ flex: 1 }} />
        {!editing ? (
          <button
            type="button" onClick={startEdit}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: THEME.text2, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 11px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}
          >
            <Pencil size={12} /> {t("opDashEditLayout")}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={resetDraft} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
              <RotateCcw size={11} /> {t("opDashResetDefault")}
            </button>
            <button type="button" onClick={cancelEdit} style={{ fontSize: 11, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "5px 10px", background: "transparent", cursor: "pointer", fontFamily: THEME.font }}>
              {t("commonCancel")}
            </button>
            <button type="button" onClick={saveEdit} style={{ fontSize: 11, fontWeight: 700, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", background: THEME.teal, cursor: "pointer", fontFamily: THEME.font }}>
              {t("opDashSaveLayout")}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>
            <GripVertical size={12} /> {t("opDashDragHint")}
          </p>
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 11, padding: "6px 12px" }}>
            {draft.map((r, i) => (
              <div
                key={r.key}
                draggable
                onDragStart={onRowDragStart(i)}
                onDragEnter={onRowDragEnter(i)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={onRowDragEnd}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 4px",
                  borderBottom: i < draft.length - 1 ? `1px solid ${THEME.border}` : "none",
                  background: dragIdx === i ? THEME.tealSoft : "transparent",
                  opacity: dragIdx !== null && dragIdx !== i ? 0.55 : 1,
                  borderRadius: 8, cursor: "grab",
                }}
              >
                <GripVertical size={14} color={THEME.text3} style={{ flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button type="button" onClick={() => move(r.key, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, padding: 1 }}><ArrowUp size={12} color={THEME.text2} /></button>
                  <button type="button" onClick={() => move(r.key, 1)} disabled={i === draft.length - 1} style={{ background: "none", border: "none", cursor: i === draft.length - 1 ? "default" : "pointer", opacity: i === draft.length - 1 ? 0.3 : 1, padding: 1 }}><ArrowDown size={12} color={THEME.text2} /></button>
                </div>
                <span style={{ flex: 1, fontSize: 12.5, color: THEME.text, fontWeight: 600 }}>{t(opWidgetLabelKey(r.key))}</span>
                <button
                  type="button" onClick={() => setSpan(r.key, r.span === 2 ? 1 : 2)}
                  title={t("opDashResize")}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: THEME.surface2, color: THEME.text2, border: `1px solid ${THEME.border}`, borderRadius: 999, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font }}
                >
                  {r.span === 2 ? <RectangleHorizontal size={13} /> : <Square size={13} />}
                  {r.span === 2 ? t("opDashCol2") : t("opDashCol1")}
                </button>
                <button
                  type="button" onClick={() => toggle(r.key)}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: r.visible ? THEME.okBg : THEME.borderSoft, color: r.visible ? THEME.ok : THEME.text3, border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font }}
                >
                  {r.visible ? <Eye size={13} /> : <EyeOff size={13} />} {r.visible ? t("saVisibleShown") : t("saHidden")}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: THEME.gap, alignItems: "start" }}>
          {layout.filter((r) => r.visible).map((r) => (
            <div key={r.key} style={{ gridColumn: `span ${r.span || 1}`, minWidth: 0 }}>
              {renderWidget(r.key)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
