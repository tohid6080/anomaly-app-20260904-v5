import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Users, AlertTriangle, ShieldCheck, Building2, Truck, Tag, GitBranch,
  FileClock, Bell, TrendingUp, Sparkles, RadioTower, FileWarning, ClipboardCheck,
  Activity, Download,
} from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPersonnelList, loadNotifications } from "../personnel/personnelApi.js";
import {
  loadDashboardAnomalies, loadDashboardContractors, loadDashboardMachinery, loadDashboardScaffold, loadDashboardBowties,
  loadDashboardIncidents, loadDashboardCorrectiveActions, loadDashboardTripod, loadDashboardProactive,
} from "./homeDashboardApi.js";
import { loadDashboardWidgetConfig } from "../systemConfigApi.js";
import { mergeWidgetConfig, defaultWidgetConfig } from "./dashboardWidgets.js";
import { INCIDENT_TYPES } from "../incidents/incidentsApi.js";
import { TRIPOD_STATUS_LABELS } from "../tripodBeta/tripodAnalysesApi.js";
import { accidentPronenessLevel } from "../proactiveIndicators/proactiveIndicatorsApi.js";

/**
 * Executive / management dashboard — a dense, single-screen overview for a
 * project manager: the real HSE performance of every contractor, drawn
 * entirely from rows already recorded across the system's modules.
 *
 * Every number is computed from real database rows (anomalies, personnel,
 * machinery, scaffold, incidents, corrective actions, Tripod Beta
 * analyses, proactive-indicator assessments). A panel with no underlying
 * data shows "داده‌ای موجود نیست" — nothing here is invented.
 *
 * Which panels appear, in what order, is driven by the shared registry
 * (dashboardWidgets.js) merged with the SuperAdmin config in
 * system_dashboard_widgets. Cross-contractor comparison panels
 * (employerOnly) are never rendered for the CONTRACTOR role.
 */

const norm = (s) => (s || "").trim().toLowerCase();
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}
const monthKey = (iso) => (iso || "").slice(0, 7);
// اقدام اصلاحی «سررسیدشده»: مهلت گذشته و هنوز بسته/منقضی نشده — همان
// تعریفِ isOverdue در correctiveActionsApi.js، ولی روی ردیفِ خام snake_case.
function caIsOverdue(r) {
  if (!r.due_date) return false;
  if (r.status === "closed" || r.status === "expired") return false;
  return new Date(r.due_date) < new Date(new Date().toDateString());
}
const caIsOpen = (r) => r.status !== "closed" && r.status !== "expired";

export default function HomeDashboard({ role, currentUser, onNavigate, onBack }) {
  const { t, dir, lang } = useLanguage();
  const [personnel, setPersonnel] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [scaffold, setScaffold] = useState([]);
  const [bowties, setBowties] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [tripod, setTripod] = useState([]);
  const [proactive, setProactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [widgetRows, setWidgetRows] = useState(null); // null = هنوز بارگذاری‌نشده => fail-open

  const isContractor = role === "CONTRACTOR";
  const myName = norm(currentUser?.name);

  useEffect(() => {
    (async () => {
      const [p, a, c, m, s, b, inc, ca, tri, pro] = await Promise.all([
        loadPersonnelList(), loadDashboardAnomalies(), loadDashboardContractors(),
        loadDashboardMachinery(), loadDashboardScaffold(), loadDashboardBowties(),
        loadDashboardIncidents(), loadDashboardCorrectiveActions(), loadDashboardTripod(), loadDashboardProactive(),
      ]);
      setPersonnel(p); setAnomalies(a); setContractors(c); setMachinery(m); setScaffold(s); setBowties(b);
      setIncidents(inc); setCorrectiveActions(ca); setTripod(tri); setProactive(pro);
      setNotifications(await loadNotifications(isContractor ? "contractor" : "employer"));
      setLoading(false);
    })();
    loadDashboardWidgetConfig().then((rows) => setWidgetRows(rows || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // پنل‌های قابل‌نمایش: رجیستری مرکب با تنظیمِ SuperAdmin، فیلترشده بر
  // اساس نمایش/پنهان و نقش (پنل‌های مقایسه‌ای برای پیمانکار حذف می‌شوند).
  // تا وقتی config بارگذاری نشده، از پیش‌فرضِ رجیستری استفاده می‌شود
  // (رفتار fail-open — هیچ رگرسیونی نسبت به قبل).
  const visibleWidgets = useMemo(() => {
    const merged = widgetRows === null ? defaultWidgetConfig() : mergeWidgetConfig(widgetRows);
    return merged.filter((w) => w.isVisible !== false && !(w.employerOnly && isContractor));
  }, [widgetRows, isContractor]);
  const has = (key) => visibleWidgets.some((w) => w.key === key);
  const groupWidgets = (g) => visibleWidgets.filter((w) => w.group === g);

  const scopedPersonnel = useMemo(
    () => (isContractor ? personnel.filter((p) => norm(p.contractorName) === myName) : personnel),
    [personnel, isContractor, myName]
  );
  const scopedAnomalies = useMemo(
    () => (isContractor ? anomalies.filter((a) => norm(a.contractor) === myName) : anomalies),
    [anomalies, isContractor, myName]
  );
  const scopedMachinery = useMemo(
    () => (isContractor ? machinery.filter((m) => norm(m.contractor_name) === myName) : machinery),
    [machinery, isContractor, myName]
  );
  const scopedScaffold = useMemo(
    () => (isContractor ? scaffold.filter((t) => norm(t.contractor_name) === myName) : scaffold),
    [scaffold, isContractor, myName]
  );
  const scopedIncidents = useMemo(
    () => (isContractor ? incidents.filter((i) => norm(i.contractor_org) === myName) : incidents),
    [incidents, isContractor, myName]
  );
  const scopedCorrectiveActions = useMemo(
    () => (isContractor ? correctiveActions.filter((r) => norm(r.responsible_contractor_name) === myName) : correctiveActions),
    [correctiveActions, isContractor, myName]
  );

  // ---------- ردیف بالا: خلاصه‌ی وضعیت پروژه ----------
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const summary = {
    contractors: contractors.length,
    activePersonnel: scopedPersonnel.filter((p) => p.status === "active").length,
    openAnomalies: scopedAnomalies.filter((a) => a.status !== "Closed").length,
    criticalAnomalies: scopedAnomalies.filter((a) => a.status !== "Closed" && a.riskLevel === "High").length,
    activeMachinery: scopedMachinery.filter((m) => m.approval_status === "approved").length,
    activeScaffold: scopedScaffold.filter((t) => t.status === "tag_issued").length,
    bowties: bowties.length,
    pendingDocs:
      scopedPersonnel.filter((p) => p.status === "pending_documents" || p.status === "pending_employer_review" || p.status === "pending_qualification").length +
      scopedMachinery.filter((m) => m.approval_status === "pending").length +
      scopedScaffold.filter((t) => t.status === "pending_initial_approval").length,
    notifications: notifications.length,
    incidents12m: scopedIncidents.filter((i) => (i.occurred_at || i.created_at || "") >= oneYearAgo).length,
    openCA: scopedCorrectiveActions.filter(caIsOpen).length,
    overdueCA: scopedCorrectiveActions.filter(caIsOverdue).length,
  };

  // ---------- جدول وضعیت HSE پیمانکاران ----------
  const contractorRows = useMemo(() => {
    return contractors.map((c) => {
      const cName = norm(c.name);
      const cPersonnel = personnel.filter((p) => p.contractorId === c.id);
      const cAnomaliesAll = anomalies.filter((a) => norm(a.contractor) === cName);
      const cAnomaliesOpen = cAnomaliesAll.filter((a) => a.status !== "Closed");
      const cMachinery = machinery.filter((m) => m.contractor_id === c.id);
      const cScaffold = scaffold.filter((t) => t.contractor_id === c.id);
      const cCA = correctiveActions.filter((r) => r.responsible_contractor_id === c.id || norm(r.responsible_contractor_name) === cName);
      const cIncidents = incidents.filter((i) => norm(i.contractor_org) === cName);

      const needsHealth = cPersonnel.filter((p) => p.status === "pending_health_visit" || p.status === "pending_health_result" || p.status === "health_expired").length;
      const machineryFaulty = cMachinery.filter((m) => {
        if (m.approval_status === "needs_correction" || m.approval_status === "rejected") return true;
        const d1 = daysUntil(m.insurance_expiry), d2 = daysUntil(m.inspection_expiry);
        return (d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0);
      }).length;
      const scaffoldNeedsVisit = cScaffold.filter((t) => t.status === "pending_installation" || t.status === "needs_correction").length;

      const personnelRate = cPersonnel.length ? cPersonnel.filter((p) => p.status === "active").length / cPersonnel.length : 1;
      const anomalyRate = cAnomaliesAll.length ? cAnomaliesAll.filter((a) => a.status === "Closed").length / cAnomaliesAll.length : 1;
      const machineryRate = cMachinery.length ? cMachinery.filter((m) => m.approval_status === "approved").length / cMachinery.length : 1;
      const scaffoldRate = cScaffold.length ? cScaffold.filter((t) => t.status === "tag_issued" || t.status === "removed").length / cScaffold.length : 1;
      const score = Math.round((personnelRate * 0.3 + anomalyRate * 0.3 + machineryRate * 0.2 + scaffoldRate * 0.2) * 100);
      const level = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";

      return {
        id: c.id, name: c.name, score, level,
        openAnomalies: cAnomaliesOpen.length, needsHealth, machineryFaulty, scaffoldNeedsVisit,
        openCA: cCA.filter(caIsOpen).length,
        overdueCA: cCA.filter(caIsOverdue).length,
        incidents: cIncidents.length,
      };
    }).sort((a, b) => a.score - b.score); // ضعیف‌ترین‌ها بالای جدول، جایی که توجه مدیر بیشتر لازمه
  }, [contractors, personnel, anomalies, machinery, scaffold, correctiveActions, incidents]);

  // ---------- تحلیل هوشمند (قوانین ساده روی داده‌ی واقعی) ----------
  const insights = useMemo(() => {
    const list = [];
    const worstAnomaly = [...contractorRows].sort((a, b) => b.openAnomalies - a.openAnomalies)[0];
    if (worstAnomaly && worstAnomaly.openAnomalies > 0) {
      list.push({ type: "warn", text: t("hdInsightWorstAnomalyCompany", { name: worstAnomaly.name, count: worstAnomaly.openAnomalies }) });
    }
    contractorRows.filter((c) => c.needsHealth > 0).slice(0, 2).forEach((c) => {
      list.push({ type: "warn", text: t("hdInsightNeedsHealthFollowup", { name: c.name, count: c.needsHealth }) });
    });
    const overdueTotal = scopedCorrectiveActions.filter(caIsOverdue).length;
    if (overdueTotal > 0) {
      const worstCA = [...contractorRows].sort((a, b) => b.overdueCA - a.overdueCA)[0];
      list.push({
        type: overdueTotal >= 5 ? "danger" : "warn",
        text: worstCA && worstCA.overdueCA > 0
          ? t("hdInsightOverdueCAWorst", { total: overdueTotal, worst: worstCA.overdueCA, name: worstCA.name })
          : t("hdInsightOverdueCATotal", { total: overdueTotal }),
      });
    }
    const expiredMachines = machinery.filter((m) => {
      const d1 = daysUntil(m.insurance_expiry), d2 = daysUntil(m.inspection_expiry);
      return (d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0);
    });
    if (expiredMachines.length > 0) {
      list.push({ type: "danger", text: t("hdInsightExpiredMachineryDocs", { count: expiredMachines.length }) });
    }
    const seriousIncidents = scopedIncidents.filter((i) => i.is_disabling || i.incident_type === "fatality" || i.incident_type === "disabling").length;
    if (seriousIncidents > 0) {
      list.push({ type: "danger", text: t("hdInsightSeriousIncidents", { count: seriousIncidents }) });
    }
    const best = [...contractorRows].filter((c) => c.score > 0).sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= 80) {
      list.push({ type: "good", text: t("hdInsightBestPerformance", { name: best.name, score: best.score }) });
    }
    return list.slice(0, 6);
  }, [contractorRows, machinery, scopedCorrectiveActions, scopedIncidents]);

  // ---------- هشدارهای فوری (فقط مهم‌ترین‌ها) ----------
  const urgentAlerts = useMemo(() => {
    const list = [];
    scopedAnomalies.filter((a) => a.status !== "Closed" && a.riskLevel === "High").forEach((a) => {
      list.push({ severity: 3, text: t("hdAlertCriticalOpenAnomaly", { tracking: a.trackingNumber || a.area, contractor: a.contractor }), onClick: () => onNavigate({ module: "anomaly", riskFilter: "High" }) });
    });
    scopedCorrectiveActions.filter((r) => caIsOverdue(r) && (r.priority === "critical" || r.priority === "high")).forEach((r) => {
      list.push({ severity: 2, text: t("hdAlertOverdueCA", { priority: r.priority === "critical" ? t("caPriorityCritical") : t("caPriorityHigh") }) + (r.responsible_contractor_name ? ` — ${r.responsible_contractor_name}` : ""), onClick: () => onNavigate({ module: "anomaly" }) });
    });
    scopedPersonnel.filter((p) => p.status === "health_expired").forEach((p) => {
      list.push({ severity: 2, text: t("hdAlertHealthExpired", { name: p.fullName, contractor: p.contractorName }), onClick: () => onNavigate({ module: "personnel", statusFilter: "health_expired" }) });
    });
    scopedMachinery.filter((m) => {
      const d1 = daysUntil(m.insurance_expiry), d2 = daysUntil(m.inspection_expiry);
      return (d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0);
    }).forEach((m) => {
      list.push({ severity: 2, text: t("hdAlertMachineryDocsExpired", { name: m.machine_name, contractor: m.contractor_name }), onClick: () => onNavigate({ module: "machinery" }) });
    });
    return list.sort((a, b) => b.severity - a.severity).slice(0, 6);
  }, [scopedAnomalies, scopedPersonnel, scopedMachinery, scopedCorrectiveActions, onNavigate]);

  // ---------- داده‌ی نمودارها ----------
  const monthlyAnomalyTrend = useMemo(() => {
    const map = {};
    scopedAnomalies.forEach((a) => {
      const k = monthKey(a.date || a.createdAt);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [scopedAnomalies]);

  const healthStatusData = [
    { label: t("chartActive"), value: scopedPersonnel.filter((p) => p.status === "active").length, color: "#16a34a" },
    { label: t("chartNeedsVisit"), value: scopedPersonnel.filter((p) => p.status === "pending_health_visit" || p.status === "pending_health_result").length, color: "#d97706" },
    { label: t("chartExpired"), value: scopedPersonnel.filter((p) => p.status === "health_expired").length, color: "#c92a2a" },
  ];
  const machineryStatusData = [
    { label: t("chartApproved"), value: scopedMachinery.filter((m) => m.approval_status === "approved").length, color: "#16a34a" },
    { label: t("chartPending"), value: scopedMachinery.filter((m) => m.approval_status === "pending").length, color: "#d97706" },
    { label: t("chartNeedsCorrection"), value: scopedMachinery.filter((m) => m.approval_status === "needs_correction" || m.approval_status === "rejected").length, color: "#c92a2a" },
  ];
  const perfChartData = contractorRows.slice(0, 6).map((c) => ({ label: c.name, value: c.score, color: c.level === "green" ? "#16a34a" : c.level === "yellow" ? "#d97706" : "#c92a2a" }));
  const anomalyRiskData = [
    { label: t("chartHigh"), value: scopedAnomalies.filter((a) => a.riskLevel === "High").length, color: "#c92a2a" },
    { label: t("chartMed"), value: scopedAnomalies.filter((a) => a.riskLevel === "Med").length, color: "#d97706" },
    { label: t("chartLow"), value: scopedAnomalies.filter((a) => a.riskLevel === "Low").length, color: "#16a34a" },
  ];

  // --- آمار ایمنی حوادث ---
  const incidentPyramid = INCIDENT_TYPES.map((it) => ({
    label: t(it.labelKey),
    value: scopedIncidents.filter((i) => i.incident_type === it.value).length,
    color: THEME.navy,
  }));
  const incidentTrend = useMemo(() => {
    const map = {};
    scopedIncidents.forEach((i) => {
      const k = monthKey(i.occurred_at || i.created_at);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [scopedIncidents]);
  const totalLostDays = scopedIncidents.reduce((s, i) => s + (Number(i.lost_days) || 0), 0);

  // --- وضعیت تحلیل ریشه‌ای (Tripod Beta) ---
  const rcaRows = useMemo(() => {
    const map = {};
    tripod.forEach((a) => { map[a.status] = (map[a.status] || 0) + 1; });
    return Object.entries(map)
      .filter(([k]) => k !== "NOT_REQUIRED")
      .map(([k, v]) => ({ label: t(TRIPOD_STATUS_LABELS[k] || k), value: v }))
      .sort((a, b) => b.value - a.value);
  }, [tripod, t]);

  // --- شاخص‌های پراکتیو ---
  const proactiveSummary = useMemo(() => {
    const ap = proactive.filter((r) => r.indicator_key === "accident_proneness" && r.final_score != null);
    const climate = proactive.filter((r) => r.indicator_key === "hse_climate" && r.final_score != null)
      .sort((a, b) => (a.assessment_date || "").localeCompare(b.assessment_date || ""));
    const apAvg = ap.length ? Math.round(ap.reduce((s, r) => s + Number(r.final_score), 0) / ap.length) : null;
    const climateTrend = (() => {
      const map = {};
      climate.forEach((r) => { const k = monthKey(r.assessment_date || r.created_at); if (k) (map[k] = map[k] || []).push(Number(r.final_score)); });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
        .map(([m, arr]) => [m, Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)]);
    })();
    return {
      apAvg,
      apLevel: apAvg != null ? accidentPronenessLevel(apAvg) : null,
      latestClimate: climate.length ? Math.round(Number(climate[climate.length - 1].final_score)) : null,
      climateTrend,
      count: proactive.length,
    };
  }, [proactive]);

  // --- عملکرد اقدامات اصلاحی به تفکیک پیمانکار ---
  const caPerfRows = useMemo(() => {
    const buckets = {};
    correctiveActions.forEach((r) => {
      const key = r.responsible_contractor_name || (r.responsible_contractor_id ? contractors.find((c) => c.id === r.responsible_contractor_id)?.name : null) || t("dashUnassigned");
      const b = buckets[key] || (buckets[key] = { name: key, total: 0, closed: 0, open: 0, overdue: 0 });
      b.total += 1;
      if (r.status === "closed") b.closed += 1;
      if (caIsOpen(r)) b.open += 1;
      if (caIsOverdue(r)) b.overdue += 1;
    });
    return Object.values(buckets)
      .map((b) => ({ ...b, closeRate: b.total ? Math.round((b.closed / b.total) * 100) : 0 }))
      .sort((a, b) => b.overdue - a.overdue || a.closeRate - b.closeRate)
      .slice(0, 6);
  }, [correctiveActions, contractors, t]);

  const handleExportExcel = () => {
    const rows = contractorRows.map((c) => ({
      [t("colContractor")]: c.name,
      [t("colScore")]: c.score,
      [t("colStatus")]: c.level === "green" ? t("hdLevelGood") : c.level === "yellow" ? t("hdLevelMedium") : t("hdLevelWeak"),
      [t("colOpenAnomalies")]: c.openAnomalies,
      [t("colNeedsHealthVisit")]: c.needsHealth,
      [t("colFaultyMachinery")]: c.machineryFaulty,
      [t("colScaffoldNeedsVisit")]: c.scaffoldNeedsVisit,
      [t("colOpenCorrectiveActions")]: c.openCA,
      [t("colOverdueActions")]: c.overdueCA,
      [t("colIncidents")]: c.incidents,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [t("colContractor")]: t("noContractorsRegistered") }]);
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, t("panelContractorHse").slice(0, 31));
    XLSX.writeFile(wb, `dashboard-hse-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ---------- رندرِ یک پنل بر اساس کلید رجیستری ----------
  function renderWidget(key) {
    switch (key) {
      case "contractorHse":
        return (
          <Panel key={key} title={t("panelContractorHse")} icon={ShieldCheck}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 620 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                    <th style={thStyle("right")}>{t("colContractor")}</th>
                    <th style={thStyle()}>{t("colScore")}</th>
                    <th style={thStyle()}>{t("colOpenAnomalies")}</th>
                    <th style={thStyle()}>{t("colNeedsHealthVisit")}</th>
                    <th style={thStyle()}>{t("colFaultyMachinery")}</th>
                    <th style={thStyle()}>{t("colScaffoldNeedsVisit")}</th>
                    <th style={thStyle()}>{t("colOpenCorrectiveActions")}</th>
                    <th style={thStyle()}>{t("colOverdueActions")}</th>
                    <th style={thStyle()}>{t("colIncidents")}</th>
                    <th style={thStyle()}>{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {contractorRows.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: "6px", fontWeight: 600, color: THEME.text }}>{c.name}</td>
                      <td style={{ padding: "6px", textAlign: "center", fontWeight: 700 }}>{c.score}</td>
                      <td style={tdC}>{c.openAnomalies}</td>
                      <td style={tdC}>{c.needsHealth}</td>
                      <td style={tdC}>{c.machineryFaulty}</td>
                      <td style={tdC}>{c.scaffoldNeedsVisit}</td>
                      <td style={tdC}>{c.openCA}</td>
                      <td style={{ ...tdC, color: c.overdueCA > 0 ? "#c92a2a" : "inherit", fontWeight: c.overdueCA > 0 ? 700 : 400 }}>{c.overdueCA}</td>
                      <td style={{ ...tdC, color: c.incidents > 0 ? "#c92a2a" : "inherit", fontWeight: c.incidents > 0 ? 700 : 400 }}>{c.incidents}</td>
                      <td style={tdC}><Dot level={c.level} /></td>
                    </tr>
                  ))}
                  {contractorRows.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: 14, textAlign: "center", color: THEME.text3 }}>{t("noContractorsRegistered")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      case "contractorPerformance":
        return (
          <Panel key={key} title={t("panelContractorPerformance")} icon={ShieldCheck} compact>
            <MiniBarChart data={perfChartData} suffix="%" />
          </Panel>
        );
      case "correctiveActionPerf":
        return (
          <Panel key={key} title={t("panelCorrectiveActionPerf")} icon={ClipboardCheck} compact>
            {caPerfRows.length === 0 && <p style={emptyTextStyle}>{t("noChartData")}</p>}
            {caPerfRows.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "5px 0", borderBottom: `1px solid ${THEME.border}`, fontSize: 11 }}>
                <span style={{ color: THEME.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{r.name}</span>
                <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700 }}>{r.closeRate}%</span>
                  <span style={{ color: THEME.text3 }}>{t("hdOpenCount", { count: r.open })}</span>
                  <span style={{ color: r.overdue > 0 ? "#c92a2a" : THEME.text3, fontWeight: r.overdue > 0 ? 700 : 400 }}>{t("hdOverdueCount", { count: r.overdue })}</span>
                </span>
              </div>
            ))}
          </Panel>
        );
      case "urgentAlerts":
        return (
          <Panel key={key} title={t("panelUrgentAlerts")} icon={Bell} compact>
            {urgentAlerts.length === 0 && <p style={emptyTextStyle}>{t("noUrgentAlerts")}</p>}
            {urgentAlerts.map((a, i) => (
              <div key={i} onClick={a.onClick} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i < urgentAlerts.length - 1 ? `1px solid ${THEME.border}` : "none", cursor: a.onClick ? "pointer" : "default" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.severity === 3 ? "#c92a2a" : "#d97706", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: THEME.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</span>
              </div>
            ))}
          </Panel>
        );
      case "smartInsights":
        return (
          <Panel key={key} title={t("panelSmartInsights")} icon={Sparkles} compact>
            {insights.length === 0 && <p style={emptyTextStyle}>{t("noSmartInsights")}</p>}
            {insights.map((ins, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", fontSize: 11, color: THEME.text2, lineHeight: 1.7 }}>
                <span style={{ color: ins.type === "danger" ? "#c92a2a" : ins.type === "good" ? "#16a34a" : "#d97706", flexShrink: 0 }}>●</span>
                {ins.text}
              </div>
            ))}
          </Panel>
        );
      case "incidentSafety":
        return (
          <Panel key={key} title={t("panelIncidentSafety")} icon={FileWarning} compact>
            {scopedIncidents.length === 0 ? (
              <p style={emptyTextStyle}>{t("noChartData")}</p>
            ) : (
              <>
                <MiniBarChart data={incidentPyramid} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: THEME.text2, margin: "8px 0 4px" }}>
                  <span>{t("dashLostDays")}</span>
                  <span style={{ fontWeight: 700 }}>{totalLostDays.toLocaleString(lang === "en" ? "en-US" : "fa-IR")}</span>
                </div>
                <MiniBarChart data={incidentTrend.map(([m, c]) => ({ label: m.slice(5), value: c, color: "#c92a2a" }))} />
              </>
            )}
          </Panel>
        );
      case "rcaStatus":
        return (
          <Panel key={key} title={t("panelRcaStatus")} icon={GitBranch} compact>
            {rcaRows.length === 0 ? (
              <p style={emptyTextStyle}>{t("noChartData")}</p>
            ) : (
              rcaRows.map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.text2, padding: "4px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight: 700 }}>{r.value.toLocaleString(lang === "en" ? "en-US" : "fa-IR")}</span>
                </div>
              ))
            )}
          </Panel>
        );
      case "proactiveScores":
        return (
          <Panel key={key} title={t("panelProactiveScores")} icon={Activity} compact>
            {proactiveSummary.count === 0 ? (
              <p style={emptyTextStyle}>{t("noChartData")}</p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: THEME.text2, padding: "4px 0" }}>
                  <span>{t("dashAvgProneness")}</span>
                  {proactiveSummary.apAvg != null ? (
                    <span style={{ fontWeight: 700, padding: "1px 8px", borderRadius: 999, background: proactiveSummary.apLevel.bg, color: proactiveSummary.apLevel.color }}>
                      {proactiveSummary.apAvg.toLocaleString(lang === "en" ? "en-US" : "fa-IR")} · {proactiveSummary.apLevel.level}
                    </span>
                  ) : <span style={{ color: THEME.text3 }}>—</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.text2, padding: "4px 0" }}>
                  <span>{t("dashLatestClimate")}</span>
                  <span style={{ fontWeight: 700 }}>{proactiveSummary.latestClimate != null ? proactiveSummary.latestClimate.toLocaleString(lang === "en" ? "en-US" : "fa-IR") : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.text2, padding: "4px 0" }}>
                  <span>{t("dashAssessmentCount")}</span>
                  <span style={{ fontWeight: 700 }}>{proactiveSummary.count.toLocaleString(lang === "en" ? "en-US" : "fa-IR")}</span>
                </div>
                {proactiveSummary.climateTrend.length > 1 && (
                  <MiniBarChart data={proactiveSummary.climateTrend.map(([m, v]) => ({ label: m.slice(5), value: v, color: THEME.teal }))} />
                )}
              </>
            )}
          </Panel>
        );
      case "anomalyTrend":
        return (
          <Panel key={key} title={t("panelAnomalyTrend")} icon={TrendingUp} compact>
            <MiniBarChart data={monthlyAnomalyTrend.map(([m, c]) => ({ label: m.slice(5), value: c, color: THEME.navy }))} />
          </Panel>
        );
      case "healthStatus":
        return (
          <Panel key={key} title={t("panelHealthStatus")} icon={Users} compact>
            <MiniDonut data={healthStatusData} />
          </Panel>
        );
      case "machineryStatus":
        return (
          <Panel key={key} title={t("panelMachineryStatus")} icon={Truck} compact>
            <MiniDonut data={machineryStatusData} />
          </Panel>
        );
      case "anomalyByRisk":
        return (
          <Panel key={key} title={t("panelAnomalyByRisk")} icon={AlertTriangle} compact>
            <MiniDonut data={anomalyRiskData} />
          </Panel>
        );
      default:
        return null;
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: THEME.text3, direction: dir }}>{t("loadingDashboard")}</div>;

  const comparison = groupWidgets("comparison");
  const alerts = groupWidgets("alerts");
  const trends = groupWidgets("trends");

  return (
    <div style={{ background: THEME.bg, minHeight: "100%", direction: dir }}>
      <div style={{ background: THEME.navy, color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && <div style={{ cursor: "pointer", fontSize: 12.5, opacity: 0.85 }} onClick={onBack}>{t("dashboardBack")}</div>}
          <RadioTower size={17} />
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t("dashboardTitle")}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, opacity: 0.75 }}>{isContractor ? currentUser?.name : t("dashboardAllContractorsOverview")}</span>
          {!isContractor && (
            <button
              type="button" onClick={handleExportExcel}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font }}
            >
              <Download size={13} /> {t("dashboardExportExcel")}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 14, maxWidth: 1600, margin: "0 auto" }}>
        {has("kpiStrip") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 1, background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, overflow: "hidden", marginBottom: 10 }}>
            <MiniStat icon={Building2} label={t("kpiContractors")} value={summary.contractors} />
            <MiniStat icon={Users} label={t("kpiActivePersonnel")} value={summary.activePersonnel} onClick={() => onNavigate({ module: "personnel", statusFilter: "active" })} />
            <MiniStat icon={AlertTriangle} label={t("kpiOpenAnomalies")} value={summary.openAnomalies} onClick={() => onNavigate({ module: "anomaly", statusFilter: "not_closed" })} />
            <MiniStat icon={AlertTriangle} label={t("kpiCritical")} value={summary.criticalAnomalies} color="#c92a2a" onClick={() => onNavigate({ module: "anomaly", riskFilter: "High" })} />
            <MiniStat icon={FileWarning} label={t("kpiIncidents12m")} value={summary.incidents12m} color={summary.incidents12m > 0 ? "#c92a2a" : undefined} />
            <MiniStat icon={ClipboardCheck} label={t("kpiOpenCorrectiveActions")} value={summary.openCA} />
            <MiniStat icon={ClipboardCheck} label={t("kpiOverdueCorrectiveActions")} value={summary.overdueCA} color={summary.overdueCA > 0 ? "#c92a2a" : undefined} />
            <MiniStat icon={Truck} label={t("kpiActiveMachinery")} value={summary.activeMachinery} onClick={() => onNavigate({ module: "machinery", approvalFilter: "approved" })} />
            <MiniStat icon={Tag} label={t("kpiActiveScaffold")} value={summary.activeScaffold} onClick={() => onNavigate({ module: "scaffold", statusFilter: "tag_issued" })} />
            <MiniStat icon={GitBranch} label={t("kpiBowtie")} value={summary.bowties} />
            <MiniStat icon={FileClock} label={t("kpiPendingApproval")} value={summary.pendingDocs} color="#d97706" />
            <MiniStat icon={Bell} label={t("kpiImportantNotifications")} value={summary.notifications} color="#1d4ed8" />
          </div>
        )}

        {comparison.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 10, marginBottom: 10 }}>
            {comparison.map((w) => (
              <div key={w.key} style={w.key === "contractorHse" ? { gridColumn: "1 / -1" } : undefined}>{renderWidget(w.key)}</div>
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 10, marginBottom: 10 }}>
            {alerts.map((w) => renderWidget(w.key))}
          </div>
        )}

        {trends.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {trends.map((w) => renderWidget(w.key))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= اجزای فشرده =================

const thStyle = (align = "center") => ({ textAlign: align, padding: "5px 6px", fontWeight: 600 });
const tdC = { padding: "6px", textAlign: "center" };
const emptyTextStyle = { fontSize: 11.5, color: THEME.text3, margin: 0 };

function MiniStat({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: "1 1 100px", minWidth: 100, padding: "10px 12px", cursor: onClick ? "pointer" : "default",
        borderInlineEnd: `1px solid ${THEME.border}`, display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: THEME.text3 }}>
        <Icon size={12} />
        <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, color: color || THEME.navy, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, compact }) {
  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: compact ? "10px 12px" : "12px 14px", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={13} color={THEME.teal} />
        <h3 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Dot({ level }) {
  const color = level === "green" ? "#16a34a" : level === "yellow" ? "#d97706" : "#c92a2a";
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color }} />;
}

function MiniBarChart({ data, suffix = "" }) {
  const { t, lang } = useLanguage();
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p style={emptyTextStyle}>{t("commonNoData")}</p>;
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.text2, marginBottom: 2 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{d.value}{suffix}</span>
          </div>
          <div style={{ background: "#eef1f5", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// دونات ساده با SVG خام (بدون کتابخانه‌ی نمودار، برای سبک نگه‌داشتن باندل)
function MiniDonut({ data }) {
  const { t, lang } = useLanguage();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p style={emptyTextStyle}>{t("commonNoData")}</p>;
  const r = 34, cx = 40, cy = 40, circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
        {data.filter((d) => d.value > 0).map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const seg = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div style={{ flex: 1 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: THEME.text2, marginBottom: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            <span style={{ marginInlineStart: "auto", fontWeight: 700 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
