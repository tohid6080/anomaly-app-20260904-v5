import React, { useState, useEffect, useCallback } from "react";
import { Radar } from "lucide-react";
import { THEME } from "../../shared.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { WidgetCard, WidgetSkeleton, WidgetError } from "./primitives.jsx";
import { loadProactiveIndicatorsSummary } from "./proactiveIndicatorsWidgetApi.js";

/**
 * ویجت «شاخص‌های پیشرو» (طرح D-009) — تا سه ردیف: جوّ ایمنی (۹ بُعد) /
 * استعداد حادثه‌پذیری / SBS، فقط برای زیرشاخص‌های فعال در پلن.
 * جهتِ رنگِ معنایی برای هر ردیف فرق می‌کند (جوّ ایمنیِ بالا = خوب،
 * استعداد حادثه و ناایمنیِ بالا = بد).
 */
const climateChip = { "پایین": [THEME.dangerBg, THEME.danger], "متوسط": [THEME.warnBg, THEME.warn], "بالا": [THEME.okBg, THEME.ok] };
const AP = [
  { k: "low", c: THEME.ok }, { k: "medium", c: "#2563eb" }, { k: "high", c: "#ea580c" }, { k: "veryHigh", c: "#dc2626" },
];

function Chip({ text, bg, fg }) {
  return <span style={{ fontFamily: THEME.font, fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }}>{text}</span>;
}

export default function ProactiveIndicatorsWidget({ onNavigate }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    loadProactiveIndicatorsSummary()
      .then((data) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error", data: null }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const d = state.data;
  if (state.status === "ok" && !d.anyEnabled) return null;

  const go = () => onNavigate && onNavigate({ module: "proactiveIndicators" });

  return (
    <WidgetCard title={t("piwTitle")} icon={Radar}>
      {state.status === "loading" && <WidgetSkeleton rows={3} />}
      {state.status === "error" && <WidgetError onRetry={load} />}
      {state.status === "ok" && d.anyEnabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {/* جوّ ایمنی — اگر زیرشاخص فعال است ردیف نشان داده می‌شود؛ نبودِ داده = خطِ «ثبت نشده» */}
          {d.climate && d.climate.empty && (
            <div onClick={go} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, color: THEME.text2, paddingBottom: 6, borderBottom: `1px solid ${THEME.border}` }}>
              {t("piwClimate")}
              <span style={{ marginInlineStart: "auto", fontSize: 9, fontWeight: 400, color: THEME.text3 }}>{t("piwNoData")}</span>
            </div>
          )}
          {d.climate && !d.climate.empty && (
            <div onClick={go} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, paddingBottom: 6, borderBottom: `1px solid ${THEME.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, color: THEME.text2 }}>
                {t("piwClimate")}
                <Chip text={d.climate.level} bg={(climateChip[d.climate.level] || climateChip["متوسط"])[0]} fg={(climateChip[d.climate.level] || climateChip["متوسط"])[1]} />
                <span style={{ marginInlineStart: "auto", fontFamily: THEME.font, fontSize: 14, fontWeight: 800, color: THEME.heading }}>
                  {d.climate.total == null ? "—" : d.climate.total} <span style={{ fontSize: 9, color: THEME.text3 }}>/ ۹۰</span>
                </span>
              </div>
              {d.climate.dims.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
                  {d.climate.dims.map((dm, i) => (
                    <i key={i} title={`${dm.title} ${dm.score}`} style={{
                      flex: 1, minHeight: 2, height: `${Math.max(8, (dm.score / 10) * 100)}%`, borderRadius: "2px 2px 0 0",
                      background: dm.level === "پایین" ? THEME.danger : dm.level === "متوسط" ? THEME.warn : THEME.ok,
                    }} />
                  ))}
                </div>
              )}
              {d.climate.weakest.length > 0 && d.climate.weakest[0].title && (
                <div style={{ fontSize: 8, color: THEME.text3 }}>
                  {t("piwWeakest")}: {d.climate.weakest.map((w) => `${w.title} ${w.score}`).join(" · ")}
                </div>
              )}
            </div>
          )}

          {/* استعداد حادثه‌پذیری */}
          {d.accidentProneness && (
            <div onClick={go} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, paddingBottom: 6, borderBottom: d.sbs ? `1px solid ${THEME.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, color: THEME.text2 }}>
                {t("piwAccidentProneness")}
                {d.accidentProneness.atRisk > 0 && <Chip text={t("piwApAtRisk", { n: d.accidentProneness.atRisk })} bg={THEME.dangerBg} fg={THEME.danger} />}
                <span style={{ marginInlineStart: "auto", fontFamily: THEME.font, fontSize: 12, fontWeight: 800, color: THEME.heading }}>
                  {t("piwApCount", { n: d.accidentProneness.total })}
                </span>
              </div>
              {d.accidentProneness.total > 0 && (
                <div style={{ display: "flex", height: 10, borderRadius: 4, overflow: "hidden", background: THEME.surface2 }}>
                  {AP.map((a) => d.accidentProneness.byLevel[a.k] > 0 && (
                    <div key={a.k} style={{ width: `${(d.accidentProneness.byLevel[a.k] / d.accidentProneness.total) * 100}%`, background: a.c }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SBS */}
          {d.sbs && (
            <div onClick={go} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, color: THEME.text2 }}>
              {t("piwSbs")}
              {d.sbs.total === 0 ? (
                <span style={{ marginInlineStart: "auto", fontSize: 9, fontWeight: 400, color: THEME.text3 }}>{t("piwNoData")}</span>
              ) : (
                <>
                  <Chip
                    text={t("piwSbsUnsafePct", { pct: d.sbs.unsafePct })}
                    bg={d.sbs.unsafePct >= 15 ? THEME.dangerBg : d.sbs.unsafePct >= 8 ? THEME.warnBg : THEME.okBg}
                    fg={d.sbs.unsafePct >= 15 ? THEME.danger : d.sbs.unsafePct >= 8 ? THEME.warn : THEME.ok}
                  />
                  <span style={{ marginInlineStart: "auto", fontFamily: THEME.font, fontSize: 11, color: THEME.text3 }}>
                    {t("piwSbsCount", { unsafe: d.sbs.unsafe, total: d.sbs.total })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
