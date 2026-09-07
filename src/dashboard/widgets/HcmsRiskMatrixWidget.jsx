import React, { useState, useEffect, useCallback } from "react";
import { Grid3x3 } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { RISK_LEVEL_META } from "../../hcms/hcmsApi.js";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, WidgetError } from "./primitives.jsx";
import { loadHcmsRiskMatrix } from "./hcmsRiskMatrixApi.js";

/**
 * ویجت «ماتریس ریسک HCMS» (طرح D-006) — شبکهٔ ۶×۵ با همان رنگ‌ها/جهتِ ماژول
 * (RISK_LEVEL_META، ردیف = شدت ۰..۵، ستون = احتمال A..E)، روی هر خانه تعدادِ
 * ارزیابیِ فعال. کلیکِ خانه → فهرستِ HCMS.
 */
export default function HcmsRiskMatrixWidget({ onNavigate }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadHcmsRiskMatrix()
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const d = state.data;

  return (
    <WidgetCard title={t("hrmTitle")} icon={Grid3x3} style={{ gridColumn: "span 2" }}>
      {state.status === "loading" && <WidgetSkeleton rows={5} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `auto repeat(${d.letters.length}, 1fr)`, gap: 3 }}>
            <span />
            {d.letters.map((l) => (
              <span key={l} style={{ fontFamily: THEME.font, fontSize: 9, fontWeight: 700, color: THEME.text2, textAlign: "center" }}>{l}</span>
            ))}
            {d.severities.map((s) => (
              <React.Fragment key={s}>
                <span style={{ fontFamily: THEME.font, fontSize: 8.5, color: THEME.text3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingInlineEnd: 4 }}>{s}</span>
                {d.letters.map((l) => {
                  const cell = d.cells[`${s}${l}`] || { level: "Low", count: 0 };
                  const meta = RISK_LEVEL_META[cell.level] || RISK_LEVEL_META.Low;
                  return (
                    <button
                      key={l} type="button"
                      onClick={() => onNavigate && onNavigate({ module: "hcms", rpnFilter: `${s}${l}` })}
                      title={`${s}${l} — ${t(meta.labelKey)} — ${cell.count}`}
                      style={{
                        aspectRatio: "1.7 / 1", borderRadius: 4, border: "1px solid rgba(0,0,0,0.06)",
                        background: meta.bg, color: meta.color, opacity: cell.count ? 1 : 0.4,
                        fontFamily: THEME.font, fontSize: 9, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                      }}
                    >
                      {cell.count ? cell.count : `${s}${l}`}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 9, color: THEME.text2, marginTop: 4 }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: RISK_LEVEL_META.Low.bg, marginInlineEnd: 4 }} />{t("hcmsLevelLow")}</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: RISK_LEVEL_META.Medium.bg, marginInlineEnd: 4 }} />{t("hcmsLevelMedium")}</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: RISK_LEVEL_META.High.bg, marginInlineEnd: 4 }} />{t("hcmsLevelHigh")}</span>
          </div>

          {d.total === 0 ? (
            <div style={{ fontSize: 9, color: THEME.text3 }}>{t("hrmEmpty")}</div>
          ) : (
            <div style={{ fontSize: 9, color: THEME.text3 }}>{t("hrmSummary", { high: d.byLevel.High, total: d.total })}</div>
          )}
          {d.unplacedCount > 0 && (
            <div style={{ fontSize: 8.5, color: THEME.warn }}>{t("hrmUnplaced", { n: d.unplacedCount })}</div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
