import React, { useEffect, useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicSurveyResults } from "./surveyApi.js";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const wrap = { minHeight: "100vh", background: THEME.bg, fontFamily: THEME.font };

/** صفحهٔ عمومیِ نتایجِ تجمیعی — #survey-results/<token>. فقط داده‌ی جمعی. */
export default function PublicSurveyResults({ resultsToken }) {
  const { t, dir } = useLanguage();
  const [d, setD] = useState(undefined);

  useEffect(() => { loadPublicSurveyResults(resultsToken).then(setD); }, [resultsToken]);

  if (d === undefined) return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: THEME.text3 }}>{t("commonLoading")}</p></div>;
  if (d?.__error) {
    return (
      <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <AlertTriangle size={40} color={THEME.danger} style={{ marginBottom: 12 }} />
          <p style={{ color: THEME.text2, fontSize: 14, lineHeight: 1.9 }}>{d.message}</p>
        </div>
      </div>
    );
  }

  const maxTrend = Math.max(1, ...(d.trend || []).map((x) => x.count));

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 60px", direction: dir }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <BarChart3 size={18} color={THEME.teal} />
          <h1 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, margin: 0 }}>{d.title || t("svUntitled")}</h1>
        </div>
        {d.description && <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{d.description}</p>}
        <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 18px" }}>{t("svResponsesN", { n: d.responseCount })} · {t(d.mode === "exam" ? "svModeExam" : "svModeSurvey")}</p>

        {d.exam && d.exam.count > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 18 }}>
            <Kpi label={t("svKpiPassRate")} value={`${d.exam.passRate}%`} />
            <Kpi label={t("svKpiAvg")} value={`${d.exam.avg}%`} />
            <Kpi label={t("svKpiHigh")} value={`${d.exam.high}%`} />
            <Kpi label={t("svKpiLow")} value={`${d.exam.low}%`} />
          </div>
        )}

        {d.exam && d.exam.count > 0 && (
          <Card title={t("svScoreDistribution")}>
            {d.exam.buckets.map((b) => (
              <Bar key={b.label} label={b.label} count={b.count} pct={d.exam.count ? Math.round((b.count / d.exam.count) * 100) : 0} />
            ))}
          </Card>
        )}

        {(d.trend || []).length > 1 && (
          <Card title={t("svResponseTrend")}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }}>
              {d.trend.map((x) => (
                <div key={x.day} title={`${x.day}: ${x.count}`} style={{ flex: 1, background: THEME.teal, borderRadius: "3px 3px 0 0", height: `${Math.max(6, (x.count / maxTrend) * 100)}%` }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: THEME.text3, marginTop: 4 }}>
              <span>{d.trend[0].day}</span><span>{d.trend[d.trend.length - 1].day}</span>
            </div>
          </Card>
        )}

        {(d.perQuestion || []).map((q, i) => (
          <Card key={q.id} title={`${i + 1}. ${q.title || q.id}`} note={q.correctRate != null ? t("svCorrectRateNote", { pct: q.correctRate }) : null}>
            {q.options && q.options.map((o, oi) => (
              <Bar key={oi} label={o.label || "—"} count={o.count} pct={q.total ? Math.round((o.count / q.total) * 100) : 0} />
            ))}
            {q.yes != null && (
              <>
                <Bar label={t("commonYes")} count={q.yes} pct={q.total ? Math.round((q.yes / q.total) * 100) : 0} />
                <Bar label={t("commonNo")} count={q.no} pct={q.total ? Math.round((q.no / q.total) * 100) : 0} />
              </>
            )}
            {q.avg !== undefined && q.options == null && q.yes == null && (
              <p style={{ fontSize: 12, color: THEME.text2, margin: 0 }}>
                {t("svAvg")}: <b style={{ color: THEME.heading, fontFamily: MONO }}>{q.avg ?? "—"}</b>
                <span style={{ color: THEME.text3, marginInlineStart: 10 }}>{t("svRangeMinMax", { min: q.min ?? "—", max: q.max ?? "—", n: q.count })}</span>
              </p>
            )}
            {q.avg === undefined && q.options == null && q.yes == null && (
              <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>{t("svTextAnswersCount", { n: q.count })}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Card({ title, note, children }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading, marginBottom: 8 }}>{title}
        {note && <span style={{ fontSize: 10.5, fontWeight: 700, color: THEME.teal, marginInlineStart: 8 }}>{note}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{children}</div>
    </div>
  );
}
function Kpi({ label, value }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: THEME.text3, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, fontFamily: MONO, color: THEME.heading, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function Bar({ label, count, pct }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: THEME.text2, marginBottom: 2 }}>
        <span>{label}</span><span style={{ fontFamily: MONO }}>{count} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: THEME.surface2, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: THEME.teal }} />
      </div>
    </div>
  );
}
