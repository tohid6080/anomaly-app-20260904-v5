import React, { useState, useEffect, useCallback } from "react";
import { Activity } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { WidgetCard, WidgetSkeleton, WidgetError } from "./primitives.jsx";
import { loadBowtieBarrierHealth } from "./bowtieBarrierHealthApi.js";

/**
 * ویجت «بریرها و اثربخشی» (طرح D-007) — نوارِ توزیعِ ۵‌وضعیتیِ اثربخشی +
 * جعبهٔ بریرِ بحرانی + فهرستِ بدترین بریرهای رو به افت (از loadDegradedBarrierAlerts).
 */
const EFF = [
  { k: "effective", c: "#16a34a", key: "effStatusEffective" },
  { k: "reducing", c: "#eab308", key: "effStatusReducing" },
  { k: "weak", c: "#f97316", key: "effStatusWeak" },
  { k: "failed", c: "#dc2626", key: "effStatusFailed" },
  { k: "not_assessed", c: "#9ca3af", key: "effStatusNotAssessed" },
];

export default function BowtieBarrierHealthWidget({ role, currentUser, onNavigate }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadBowtieBarrierHealth({ role, currentUser })
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [role, currentUser]);
  useEffect(() => { load(); }, [load]);

  const d = state.data;
  const allNa = d && d.barrierTotal > 0 && d.dist.not_assessed === d.barrierTotal;

  return (
    <WidgetCard
      title={t("bbhTitle")} icon={Activity}
      tools={d ? <span style={{ fontFamily: THEME.font, fontSize: 9, color: THEME.text3 }}>{t("bbhSubcount", { models: d.modelCount, barriers: d.barrierTotal })}</span> : null}
    >
      {state.status === "loading" && <WidgetSkeleton rows={4} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && d.barrierTotal === 0 && (
        <div style={{ fontSize: 10, color: THEME.text3, padding: "12px 4px", textAlign: "center" }}>{t("bbhEmpty")}</div>
      )}
      {state.status === "ok" && d.barrierTotal > 0 && (
        <>
          <div style={{ display: "flex", height: 14, borderRadius: 5, overflow: "hidden", background: THEME.surface2 }}>
            {EFF.map((e) => d.dist[e.k] > 0 && (
              <div key={e.k} style={{ width: `${(d.dist[e.k] / d.barrierTotal) * 100}%`, background: e.c }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 10px", fontSize: 8.5, color: THEME.text2 }}>
            {EFF.map((e) => (
              <span key={e.k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: 2, background: e.c, display: "inline-block", flexShrink: 0 }} />
                {t(e.key)}
                <b style={{ marginInlineStart: "auto", fontFamily: THEME.font, color: THEME.heading }}>{d.dist[e.k]}</b>
              </span>
            ))}
          </div>

          {allNa ? (
            <div style={{ fontSize: 8.5, color: THEME.warn, background: THEME.warnBg, borderRadius: 6, padding: "4px 8px" }}>{t("bbhAllNotAssessed")}</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: THEME.dangerBg, border: "1px solid rgba(207,74,63,0.35)" }}>
              <span style={{ fontFamily: THEME.font, fontSize: 18, fontWeight: 800, color: THEME.danger, lineHeight: 1 }}>{d.critical}</span>
              <span style={{ fontSize: 9, color: THEME.text2, lineHeight: 1.5 }}>{t("bbhCriticalLabel")}</span>
            </div>
          )}

          {d.degraded.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: THEME.text2 }}>{t("bbhDegradedHeader")}</div>
              {d.degraded.map((a) => (
                <button
                  key={a.key} type="button"
                  onClick={() => onNavigate && onNavigate(a.target || { module: "bowtie" })}
                  style={{ display: "block", width: "100%", textAlign: "start", fontSize: 9.5, color: THEME.heading, background: THEME.surface2, border: `1px solid ${THEME.borderSoft}`, borderRadius: 7, padding: "6px 8px", cursor: "pointer", fontFamily: THEME.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
