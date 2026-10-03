import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ClipboardList, FileSpreadsheet, CalendarClock } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicSafetyReport } from "./safetyMicrositeApi.js";

const STAT_META = {
  openAnomaliesCount: { icon: AlertTriangle, labelKey: "smFieldOpenAnomalies", color: THEME.warn },
  overdueCorrectiveActionsCount: { icon: ClipboardList, labelKey: "smFieldOverdueActions", color: THEME.danger },
  activePermitsCount: { icon: FileSpreadsheet, labelKey: "smFieldActivePermits", color: THEME.ok },
  daysSinceLastIncident: { icon: CalendarClock, labelKey: "smFieldDaysSinceIncident", color: THEME.heading },
};
const STAT_ORDER = ["daysSinceLastIncident", "openAnomaliesCount", "overdueCorrectiveActionsCount", "activePermitsCount"];

// صفحه‌ی عمومیِ گزارشِ ایمنیِ شرکت — با لینک/QR باز می‌شود
// (#safety-report/<public_token> در App.jsx). بدونِ نیاز به ورود؛ فقط
// شمارش‌هایِ تجمیعی، هیچ داده‌یِ شخصی/پیمانکاری.
export default function PublicSafetyMicrosite({ publicToken }) {
  const { t, dir } = useLanguage();
  const [report, setReport] = useState(undefined); // undefined=loading

  useEffect(() => { loadPublicSafetyReport(publicToken).then(setReport); }, [publicToken]);

  const stats = report && !report.__error ? STAT_ORDER.filter((k) => report[k] !== undefined) : [];

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, padding: "32px 16px", fontFamily: THEME.font }} dir={dir}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {report === undefined ? (
          <p style={{ color: THEME.text3, fontSize: 13, textAlign: "center", padding: 40 }}>{t("commonLoading")}</p>
        ) : report.__error ? (
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <AlertTriangle size={30} color={THEME.danger} style={{ marginBottom: 10 }} />
            <p style={{ color: THEME.danger, fontSize: 13, fontWeight: 600 }}>{report.message}</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 24 }}>
              <ShieldCheck size={26} color={THEME.ok} />
              <h1 style={{ fontSize: 19, fontWeight: 800, color: THEME.heading, margin: 0, textAlign: "center" }}>{report.displayName || t("smTitle")}</h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14 }}>
              {stats.map((key) => {
                const meta = STAT_META[key];
                const Icon = meta.icon;
                const value = report[key];
                const display = key === "daysSinceLastIncident"
                  ? (value === null ? t("smNoIncidentsYet") : t("smDaysValue", { days: value }))
                  : String(value);
                return (
                  <div key={key} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, textAlign: "center" }}>
                    <Icon size={22} color={meta.color} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: key === "daysSinceLastIncident" && value === null ? 14 : 24, fontWeight: 800, color: THEME.heading }}>{display}</div>
                    <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 4 }}>{t(meta.labelKey)}</div>
                  </div>
                );
              })}
            </div>
            {stats.length === 0 && (
              <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("smNoFieldsShown")}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
