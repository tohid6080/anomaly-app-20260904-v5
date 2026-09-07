import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { numLocale } from "../../i18n/translations.js";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, WidgetError } from "./primitives.jsx";
import { loadAnomalyTrend } from "./anomalyTrendApi.js";

/**
 * ویجت «روند آنومالی» (طرح D-005) — میله‌های افقی، یکی برای هر ماهِ جلالی،
 * به‌همراهِ یک خطِ آمار (کل ثبت‌شده / نرخِ بستن). window پیش‌فرض ۶ ماه.
 */
export default function AnomalyTrendWidget({ role, currentUser, onNavigate, window = 6 }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadAnomalyTrend({ window, role, currentUser })
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, [window, role, currentUser]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n) => Number(n).toLocaleString(numLocale(lang));

  return (
    <WidgetCard
      title={t("atrTitle")} icon={TrendingUp}
      tools={<span style={{ fontFamily: THEME.font, fontSize: 9, fontWeight: 600, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "1px 6px" }}>{t("atrWindowMonths", { n: window })}</span>}
    >
      {state.status === "loading" && <WidgetSkeleton rows={4} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && !state.data.hasEnough && (
        <WidgetEmpty text={t("atrEmpty")} />
      )}
      {state.status === "ok" && state.data.hasEnough && (
        <>
          <div
            onClick={() => onNavigate && onNavigate({ module: "anomaly", statusFilter: "not_closed" })}
            style={{ cursor: onNavigate ? "pointer" : "default" }}
          >
            {(() => {
              const max = Math.max(1, ...state.data.series.map((b) => b.registered));
              return state.data.series.map((b) => (
                <div key={b.key} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: THEME.text2, marginBottom: 2 }}>
                    <span>{b.label}</span>
                    <span style={{ fontWeight: 700, fontFamily: THEME.font }}>{fmt(b.registered)}</span>
                  </div>
                  <div style={{ background: THEME.borderSoft, borderRadius: 4, height: 5, overflow: "hidden" }}>
                    <div style={{ width: `${(b.registered / max) * 100}%`, height: "100%", background: THEME.navy, borderRadius: 4 }} />
                  </div>
                </div>
              ));
            })()}
          </div>
          <div style={{ fontSize: 9, color: THEME.text3, marginTop: 2 }}>
            {t("atrFooter", {
              total: fmt(state.data.totalRegistered),
              rate: state.data.closeRate == null ? "—" : fmt(state.data.closeRate),
            })}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
