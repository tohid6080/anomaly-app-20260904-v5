import React, { useState, useEffect } from "react";
import { AlertTriangle, ClipboardCheck, FileWarning } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadHomeKpiSummary } from "./homeKpiApi.js";
import { CounterWidget } from "./widgets/primitives.jsx";
import MyTaskQueueWidget from "./widgets/MyTaskQueueWidget.jsx";

/**
 * داشبورد کاری (Operational) — شبکهٔ ویجت برای کارِ روزمرهٔ سرپرست/کارشناس/پیمانکار،
 * جدا از داشبورد مدیریتی (HomeDashboard). فاز ۱: شبکهٔ واکنش‌گرای ثابت با
 * ویجتِ «کارتابل فوری من» + چند شمارندهٔ کلیدی. جابه‌جایی/تغییرِ اندازه و
 * ذخیرهٔ چیدمان per-user در فازهای بعد اضافه می‌شود.
 */
export default function OperationalDashboard({ role, currentUser, onNavigate, onBack }) {
  const { t, dir } = useLanguage();
  const [kpi, setKpi] = useState(null);

  useEffect(() => {
    loadHomeKpiSummary().then(setKpi).catch(() => setKpi({}));
  }, []);

  const k = kpi || {};
  const num = (v) => (kpi ? String(v ?? 0) : "…");

  return (
    <div style={{ direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>}
      <h2 style={{ fontSize: 17, color: THEME.navy, fontWeight: 800, margin: "0 0 14px" }}>{t("opDashTitle")}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, alignItems: "start" }}>
        <MyTaskQueueWidget role={role} currentUser={currentUser} onNavigate={onNavigate} />

        <CounterWidget
          title={t("kpiOpenAnomalies")} icon={AlertTriangle}
          value={num(k.openAnomalies)} tone={k.openAnomalies > 0 ? "bad" : "ok"}
          onClick={() => onNavigate && onNavigate({ module: "anomaly", statusFilter: "not_closed" })}
        />
        <CounterWidget
          title={t("kpiOpenCorrectiveActions")} icon={ClipboardCheck}
          value={num(k.openCorrectiveActions)} tone="neutral"
          onClick={() => onNavigate && onNavigate({ module: "correctiveActions" })}
        />
        <CounterWidget
          title={t("kpiIncidents12m")} icon={FileWarning}
          value={num(k.incidentsCount)} tone={k.incidentsCount > 0 ? "bad" : "ok"}
          onClick={() => onNavigate && onNavigate({ module: "incidents" })}
        />
      </div>
    </div>
  );
}
