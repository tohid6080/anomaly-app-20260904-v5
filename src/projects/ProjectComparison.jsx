import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { BarChart3 } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadProjectMetricsBundle } from "./projectsApi.js";

const thStyle = { textAlign: "center", fontSize: 11, fontWeight: 700, color: THEME.text3, padding: "8px 10px", borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" };
const tdStyle = { textAlign: "center", fontSize: 13, fontWeight: 700, color: THEME.heading, padding: "9px 10px", borderBottom: `1px solid ${THEME.border}` };
const nameTdStyle = { ...tdStyle, textAlign: "start", fontWeight: 700, color: THEME.heading };

// نمایِ مقایسه‌ایِ سرپرست — فقط ستون‌هایِ واقعی (طبقِ یافته‌ی schema این
// فاز: anomalies.project / corrective_actions.project_name / machinery.project
// از قبل وجود دارند). «آموزش» و «ریسک» عمداً «ثبت نشده» نشان داده می‌شوند،
// نه یک عددِ ساختگی — چون هیچ ستونِ پروژه‌ای در bowtie/training وجود ندارد
// و تزریقِ آن به فازِ بعدی موکول شده (طبقِ خواسته‌ی صریحِ کاربر).
export default function ProjectComparison({ projects, wide, onBack }) {
  const { t, dir } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const metricsFn = await loadProjectMetricsBundle();
      setRows(projects.map((p) => ({ project: p, metrics: metricsFn(p.name) })));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "10px 0 14px", display: "flex", alignItems: "center", gap: 7 }}>
        <BarChart3 size={17} color={THEME.teal} /> {t("projCompareTitle")}
      </h2>

      {loading ? (
        <p style={{ color: THEME.text3, fontSize: 12, textAlign: "center", padding: 24 }}>{t("commonLoading")}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: THEME.text3, fontSize: 12, textAlign: "center", padding: 24 }}>{t("projEmptyList")}</p>
      ) : (
        <div style={{ overflowX: "auto", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "start" }}>{t("projCompareColProject")}</th>
                <th style={thStyle}>{t("maapKpiOpenAnomalies")}</th>
                <th style={thStyle}>{t("maapKpiOpenActions")}</th>
                <th style={thStyle}>{t("maapKpiOverdue")}</th>
                <th style={thStyle}>{t("pwsKpiExpiredInspections")}</th>
                <th style={thStyle}>{t("projCompareColTraining")}</th>
                <th style={thStyle}>{t("projCompareColRisk")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, metrics }) => (
                <tr key={project.id}>
                  <td style={nameTdStyle}>
                    {project.name}
                    {!project.isActive && (
                      <span style={{ marginInlineStart: 6, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: THEME.surface2, color: THEME.text3 }}>
                        {t("commonInactive")}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: metrics.openAnomalies > 0 ? THEME.warn : THEME.heading }}>{metrics.openAnomalies}</td>
                  <td style={tdStyle}>{metrics.openActions}</td>
                  <td style={{ ...tdStyle, color: metrics.overdueActions > 0 ? THEME.danger : THEME.heading }}>{metrics.overdueActions}</td>
                  <td style={{ ...tdStyle, color: metrics.expiredInspections > 0 ? THEME.danger : THEME.heading }}>{metrics.expiredInspections}</td>
                  <td style={{ ...tdStyle, color: THEME.text3, fontWeight: 400, fontSize: 11 }}>{t("projCompareNotAvailable")}</td>
                  <td style={{ ...tdStyle, color: THEME.text3, fontWeight: 400, fontSize: 11 }}>{t("projCompareNotAvailable")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10 }}>{t("projCompareFootnote")}</p>
    </div>
  );
}
