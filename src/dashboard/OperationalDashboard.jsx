import React, { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, ClipboardCheck, FileWarning, Pencil, Eye, EyeOff, RotateCcw, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
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
 * فاز ۳: با دکمهٔ «چیدمانِ من» وارد حالتِ ویرایش می‌شوی و مستقیم روی خودِ
 * شبکه: کارت‌ها را از دستهٔ بالا با ماوس می‌کشی و جابه‌جا می‌کنی، و از
 * دستهٔ گوشهٔ پایین با ماوس عرضِ هر کارت را بین ۱ و ۲ ستون تغییر می‌دهی.
 * همه‌چیز فقط در draft می‌ماند و با «ذخیرهٔ چیدمان» در localStorage (کلیدِ
 * هر کاربر) ثبت می‌شود — مطابقِ قانونِ «پیش‌نویسِ محلی، ثبتِ صریح» در CLAUDE.md.
 * بدون کتابخانهٔ grid/DnD — HTML5 drag برای جابه‌جایی و Pointer Events برای
 * تغییرِ اندازه (رعایتِ قیدِ کارایی).
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
  const resizeRef = useRef(null); // { key, startX, startSpan }

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

  // جابه‌جایی: HTML5 drag روی دستهٔ بالای کارت (نه کلِ کارت، تا دستهٔ resize
  // یک درگ اشتباهی شروع نکند). «جابه‌جا کن هنگام ورود» روی شبکه.
  const onDragStart = (i) => (e) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", draft[i].key); } catch { /* Firefox */ }
  };
  const onDragEnterCard = (i) => (e) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setDraft((p) => {
      const arr = p.map((r) => ({ ...r }));
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(i, 0, moved);
      return arr;
    });
    setDragIdx(i);
  };
  const onDragEndCard = () => setDragIdx(null);

  // تغییرِ اندازه: کشیدنِ دستهٔ گوشه با ماوس. جهتِ «بیرون» با RTL/LTR فرق
  // می‌کند؛ عبور از ~۵۵px بیرون → ۲ ستون، ~۵۵px داخل → ۱ ستون (اسنپ).
  const onResizeDown = (r) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* بی‌اهمیت */ }
    resizeRef.current = { key: r.key, startX: e.clientX, startSpan: r.span || 1 };
  };
  const onResizeMove = (e) => {
    const s = resizeRef.current;
    if (!s) return;
    const outward = dir === "rtl" ? s.startX - e.clientX : e.clientX - s.startX;
    const span = outward > 55 ? 2 : outward < -55 ? 1 : s.startSpan;
    setSpan(s.key, span);
  };
  const onResizeUp = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* بی‌اهمیت */ }
    resizeRef.current = null;
  };

  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: THEME.gap, alignItems: "start" };

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
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <GripVertical size={12} /> {t("opDashGridEditHint")}
          </p>
          <div style={gridStyle}>
            {draft.map((r, i) => (
              <div
                key={r.key}
                onDragEnter={onDragEnterCard(i)}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  gridColumn: `span ${r.span || 1}`, minWidth: 0, position: "relative",
                  border: `1px dashed ${dragIdx === i ? THEME.teal : THEME.border}`,
                  borderRadius: THEME.radiusCard, padding: 4,
                  background: dragIdx === i ? THEME.tealSoft : "transparent",
                  opacity: !r.visible ? 0.45 : dragIdx !== null && dragIdx !== i ? 0.6 : 1,
                }}
              >
                <div
                  draggable
                  onDragStart={onDragStart(i)}
                  onDragEnd={onDragEndCard}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px 5px", cursor: "grab", userSelect: "none" }}
                >
                  <GripVertical size={13} color={THEME.text3} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: THEME.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t(opWidgetLabelKey(r.key))}
                  </span>
                  <button
                    type="button" onClick={() => toggle(r.key)}
                    title={r.visible ? t("saHidden") : t("saVisibleShown")}
                    aria-label={r.visible ? t("saHidden") : t("saVisibleShown")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: r.visible ? THEME.ok : THEME.text3, display: "flex" }}
                  >
                    {r.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>

                <div style={{ pointerEvents: "none", filter: r.visible ? "none" : "grayscale(0.7)" }}>
                  {renderWidget(r.key)}
                </div>

                <div
                  onPointerDown={onResizeDown(r)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeUp}
                  title={t("opDashResize")}
                  aria-label={t("opDashResize")}
                  style={{
                    position: "absolute", bottom: 3, insetInlineEnd: 3, width: 22, height: 22, borderRadius: 6,
                    background: THEME.surface2, border: `1px solid ${THEME.border}`, cursor: "ew-resize",
                    display: "flex", alignItems: "center", justifyContent: "center", color: THEME.text3,
                    touchAction: "none",
                  }}
                >
                  {r.span === 2 ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={gridStyle}>
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
