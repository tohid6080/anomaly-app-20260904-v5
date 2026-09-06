import React, { useState, useEffect } from "react";
import { ShieldAlert, Plus, LogOut, Send, CreditCard, AlertTriangle, UserPlus, KeyRound, Layers, Trash2, History, Activity, TrendingDown, Clock, LogIn, ShieldX, LayoutDashboard, Building2, Users, FileClock, ChevronLeft, HardDrive, RefreshCw, Settings2, Copy, GripVertical, ArrowUp, ArrowDown, RotateCcw, Eye, EyeOff, LayoutGrid, PanelsTopLeft, Bell, Palette, Megaphone, Sparkles, Gift, Info, ImagePlus, X, ClipboardList, Smartphone, UploadCloud, CheckCircle2, Download } from "lucide-react";
import { loadAppReleases, createAppRelease, setReleasePublished, deleteAppRelease, loadLatestPublishedRelease, nextPatchVersion, triggerMobileBuild } from "./appReleaseApi.js";
import { APP_VERSION, APP_VERSION_CODE } from "../shared.js";
import { THEME } from "../shared.js";
import { changeMyPassword } from "../sessionToken.js";
import { loadModuleConfig, saveModuleConfig, loadNotificationTypes, saveNotificationType, syncNotificationTypesWithPlans, loadAppearanceConfig, saveAppearanceConfig, loadAllAnnouncements, createAnnouncement, updateAnnouncement, setAnnouncementActive, deleteAnnouncement, loadDashboardWidgetConfig, saveDashboardWidgetsBulk, notificationTypeLabel, notificationTypeDescription } from "../systemConfigApi.js";
import { DASHBOARD_WIDGET_GROUPS, mergeWidgetConfig, defaultWidgetConfig } from "../dashboard/dashboardWidgets.js";
import { uploadBase64ToStorage, deleteFromStorage, parseStorageUrl } from "../offline/storageUpload.js";
import AccountManagement from "./AccountManagement.jsx";
import { toJalaliSafe, toJalaliDateTime, JalaliDateInput } from "../personnel/jalaliDate.jsx";
import {
  loadCompanies, createCompany, updateCompany, deleteCompanySecure, setCompanyActive,
  loadCompanyPayments, addCompanyPayment, PAYMENT_TYPES,
  loadCompanyUserAccounts,
  SUBSCRIPTION_TYPES, SUBSCRIPTION_STATUSES,
  loadPlans, createPlan, updatePlan, deactivatePlan, activatePlan, movePlan, deletePlan, assignPlanToCompany, loadCompanySubscriptionHistory,
  PLAN_FEATURES, computeContractAmount, computeMonthlyRecurringAmount,
  computePaymentStatus, isPaymentOverdue, computeMonthlyPaymentAlarm, computeSubscriptionAlertTier,
  loadCompanyUsageStats, loadRecentLogins, loadRecentFailedLogins, computeInactiveCompanies,
  loadAuditLog, loadStorageUsage, setStorageCapacity, storageUsageStatus,
  copyBowtiesToCompany, copyRiskKnowledgeToCompany,
  loadCardTransferPayments, approveCardTransferPayment, rejectCardTransferPayment, saveCardTransferSettings,
  loadTrialRequests, approveTrialRequest, rejectTrialRequest,
} from "./superAdminApi.js";
import { computeSubscriptionAccess, loadOnlinePaymentsForCompany, loadCardTransferSettings } from "../subscriptionApi.js";
import { loadErrorReports, updateErrorReportStatus } from "../errorReportsApi.js";
import DocumentViewerModal from "../personnel/DocumentViewerModal.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import LanguageSelect from "../i18n/LanguageSelect.jsx";
import { trialModuleLabel } from "../trialRequestApi.js";
import { translate, getCurrentLang, listSep, pctSign as _pctSign, numLocale as _numLocale } from "../i18n/translations.js";

// قالب‌بندی اعداد/تاریخ وابسته به زبان فعال: فارسی → ارقام فارسی، آلمانی →
// de-DE، بقیه → en-US. (نگه‌داشتنِ همین دو helper بی‌آرگومان تا صدها محلِ
// فراخوانیِ فعلی numLocale()/pctSign() دست‌نخورده بماند.)
const numLocale = () => _numLocale(getCurrentLang());
const pctSign = () => _pctSign(getCurrentLang());

const inputStyle ={ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${THEME.border}`, fontSize: 12.5, fontFamily: THEME.font, boxSizing: "border-box" };
const btnStyle = (bg) => ({ padding: "7px 14px", borderRadius: 8, border: "none", background: bg || THEME.teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font });
const smallLabelStyle = { display: "block", marginBottom: 4, fontSize: 11.5, fontWeight: 600, color: THEME.text2 };

export default function SuperAdminPanel({ currentAdmin, onLogout }) {
  const { t, dir } = useLanguage();
  const [page, setPage] = useState("overview");
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [usageStats, setUsageStats] = useState({ personnelByCompany: {}, anomalyByCompany: {}, attachmentByCompany: {} });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("trial");
  const [newStatus, setNewStatus] = useState("active");
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newStartTime, setNewStartTime] = useState("00:00");
  const [newEndDate, setNewEndDate] = useState("");
  const [newEndTime, setNewEndTime] = useState("00:00");
  const [expandedId, setExpandedId] = useState(null);
  const [payments, setPayments] = useState({});

  const load = async () => {
    setCompanies(await loadCompanies());
    setPlans(await loadPlans());
    setUsageStats(await loadCompanyUsageStats());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const startIso = newStartDate ? new Date(`${newStartDate}T${newStartTime || "00:00"}:00`).toISOString() : null;
    const endIso = newEndDate ? new Date(`${newEndDate}T${newEndTime || "00:00"}:00`).toISOString() : null;
    const result = await createCompany({ name: newName.trim(), subscriptionType: newType, subscriptionStatus: newStatus, subscriptionStartDate: startIso, subscriptionEndDate: endIso });
    if (!result?.__error) {
      setNewName(""); setNewEndDate(""); setNewStartTime("00:00"); setNewEndTime("00:00");
      setShowCreate(false);
      await load();
    }
  };

  const handleUpdate = async (id, patch) => {
    await updateCompany(id, patch);
    await load();
  };

  const handleDelete = async (id, confirmName) => {
    const result = await deleteCompanySecure(id, confirmName);
    if (result?.__error) { alert(result.message + (result.detail ? t("saTechDetailsSuffix", { detail: result.detail }) : "")); return; }
    await load();
  };

  const handleSetActive = async (id, active) => {
    const result = await setCompanyActive(id, active);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  const toggleExpand = async (c) => {
    if (expandedId === c.id) { setExpandedId(null); return; }
    setExpandedId(c.id);
    if (!payments[c.id]) setPayments((prev) => ({ ...prev, [c.id]: loadCompanyPayments(c.id) }));
  };

  const handleAddPayment = async (companyId, amount, paymentType, trackingNumber, note) => {
    if (!amount) return;
    await addCompanyPayment(companyId, Number(amount), paymentType, trackingNumber, note);
    setPayments((prev) => ({ ...prev, [companyId]: loadCompanyPayments(companyId) }));
  };

  const summary = {
    total: companies.length,
    active: companies.filter((c) => c.subscriptionStatus === "active").length,
    expired: companies.filter((c) => c.subscriptionStatus === "expired").length,
    disabled: companies.filter((c) => c.subscriptionStatus === "disabled").length,
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  const NAV_ITEMS = [
    { key: "overview", labelKey: "saNavOverview", icon: LayoutDashboard },
    { key: "companies", labelKey: "saNavCompanies", icon: Building2 },
    { key: "accounts", labelKey: "saNavAccounts", icon: Users },
    { key: "plans", labelKey: "saNavPlans", icon: Layers },
    { key: "storage", labelKey: "saStorageUsageTitle", icon: HardDrive },
    { key: "monitoring", labelKey: "saNavMonitoring", icon: Activity },
    { key: "systemConfig", labelKey: "saNavSystemConfig", icon: Settings2 },
    { key: "auditLog", labelKey: "saNavAuditLog", icon: FileClock },
    { key: "errorReports", labelKey: "saNavErrorReports", icon: AlertTriangle },
    { key: "cardTransferPayments", labelKey: "saNavCardPayments", icon: CreditCard },
    { key: "trialRequests", labelKey: "saNavTrialRequests", icon: ClipboardList },
  ];

  return (
    <div style={{ background: THEME.bg, minHeight: "100vh", fontFamily: THEME.font, direction: dir }}>
      <div style={{ background: THEME.navyDeep, color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldAlert size={18} />
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t("saHeaderTitle")}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <LanguageSelect variant="dark" />
          <button type="button" onClick={() => setShowChangePassword((v) => !v)} style={{ ...btnStyle("rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", gap: 6 }}>
            <KeyRound size={13} /> {t("saChangeMyPassword")}
          </button>
          <button type="button" onClick={() => { if (window.confirm(t("saLogoutConfirm"))) onLogout(); }} style={{ ...btnStyle("rgba(255,255,255,0.15)"), display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={13} /> {t("saLogout")}
          </button>
        </div>
      </div>

      {showChangePassword && <SuperAdminChangePassword onClose={() => setShowChangePassword(false)} />}

      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 1400, margin: "0 auto" }}>
        <nav style={{ width: 200, flexShrink: 0, background: THEME.surface, borderInlineStart: `1px solid ${THEME.border}`, minHeight: "calc(100vh - 53px)", padding: "16px 10px" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.key;
            return (
              <button
                key={item.key} type="button" onClick={() => setPage(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "start",
                  padding: "10px 12px", borderRadius: 8, border: "none", marginBottom: 4, cursor: "pointer",
                  background: active ? THEME.teal : "transparent", color: active ? "#fff" : THEME.text2,
                  fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: THEME.font,
                }}
              >
                <Icon size={14} /> {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1, padding: 18, minWidth: 0 }}>
          {page === "overview" && (
            <DashboardOverview
              companies={companies} summary={summary} usageStats={usageStats}
              onNavigate={setPage}
            />
          )}
          {page === "companies" && (
            <CompaniesPage
              companies={companies} plans={plans} currentAdmin={currentAdmin} usageStats={usageStats}
              expandedId={expandedId} showCreate={showCreate} newName={newName} newType={newType} newStatus={newStatus} setNewStatus={setNewStatus}
              newStartDate={newStartDate} setNewStartDate={setNewStartDate} newStartTime={newStartTime} setNewStartTime={setNewStartTime}
              newEndDate={newEndDate} setNewEndDate={setNewEndDate} newEndTime={newEndTime} setNewEndTime={setNewEndTime}
              setShowCreate={setShowCreate} setNewName={setNewName} setNewType={setNewType}
              onCreate={handleCreate} onToggleExpand={toggleExpand}
              onUpdate={handleUpdate} onDelete={handleDelete} onSetActive={handleSetActive}
              payments={payments} onAddPayment={handleAddPayment} onPlanChanged={load}
            />
          )}
          {page === "accounts" && <AccountManagement currentAdmin={currentAdmin} />}
          {page === "plans" && <PlansManager plans={plans} companies={companies} currentAdmin={currentAdmin} onChanged={load} />}
          {page === "storage" && <StorageUsagePage />}
          {page === "monitoring" && <SystemInsights companies={companies} />}
          {page === "systemConfig" && <SystemConfigPage currentAdmin={currentAdmin} companies={companies} />}
          {page === "auditLog" && <AuditLogPage companies={companies} />}
          {page === "errorReports" && <ErrorReportsPage currentAdmin={currentAdmin} />}
          {page === "cardTransferPayments" && <CardTransferPaymentsPage currentAdmin={currentAdmin} />}
          {page === "trialRequests" && <TrialRequestsPage currentAdmin={currentAdmin} />}
        </div>
      </div>
    </div>
  );
}

function DashboardOverview({ companies, summary, usageStats, onNavigate }) {
  const { t } = useLanguage();
  const [failedLoginCount, setFailedLoginCount] = useState(null);
  const [inactiveCount, setInactiveCount] = useState(null);
  const [paymentAlertCount, setPaymentAlertCount] = useState(null);

  useEffect(() => {
    if (companies.length === 0) return;
    loadRecentFailedLogins(30).then((rows) => {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      setFailedLoginCount(rows.filter((r) => new Date(r.created_at).getTime() >= since).length);
    });
    computeInactiveCompanies(companies, 30).then((rows) => setInactiveCount(rows.length));
    Promise.all(companies.map((c) => loadCompanyPayments(c.id).then((rows) => computePaymentStatus(c.finalAmount, rows).remaining > 0))).then(
      (flags) => setPaymentAlertCount(flags.filter(Boolean).length)
    );
  }, [companies]);

  // هشدار پایان اشتراک — پلکان دقیق (۳۰/۱۵/۷/۳/امروز/منقضی)، نه فقط یک بازه‌ی ساده
  const subscriptionAlertCount = companies.filter((c) => computeSubscriptionAlertTier(c.subscriptionEndDate)).length;
  const totalPersonnel = Object.values(usageStats?.personnelByCompany || {}).reduce((a, b) => a + b, 0);
  const totalAnomalies = Object.values(usageStats?.anomalyByCompany || {}).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h2 style={{ fontSize: 16, color: THEME.navy, fontWeight: 700, margin: "0 0 14px" }}>{t("saOverviewTitle")}</h2>

      <StorageOverviewCard onNavigate={onNavigate} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 1, background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, overflow: "hidden", marginBottom: 16 }}>
        <StatBox label={t("saStatTotalCompanies")} value={summary.total} />
        <StatBox label={t("saStatActiveSub")} value={summary.active} color="#166534" />
        <StatBox label={t("saStatExpired")} value={summary.expired} color="#c92a2a" />
        <StatBox label={t("saStatDisabled")} value={summary.disabled} color="#5b6b7d" />
        <StatBox label={t("saStatTotalPersonnel")} value={totalPersonnel} />
        <StatBox label={t("saStatTotalAnomalies")} value={totalAnomalies} />
      </div>

      <h3 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 10px" }}>{t("saNeedsAttention")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <AttentionCard
          icon={AlertTriangle} color="#92400e" bg="#fef3c7"
          label={t("saSubAlertLabel")} value={subscriptionAlertCount}
          onClick={() => onNavigate("monitoring")}
        />
        <AttentionCard
          icon={CreditCard} color="#b91c1c" bg="#fee2e2"
          label={t("saPaymentAlertLabel")} value={paymentAlertCount}
          onClick={() => onNavigate("monitoring")}
        />
        <AttentionCard
          icon={TrendingDown} color="#b91c1c" bg="#fee2e2"
          label={t("saInactiveLabel")} value={inactiveCount}
          onClick={() => onNavigate("monitoring")}
        />
        <AttentionCard
          icon={ShieldX} color="#b91c1c" bg="#fee2e2"
          label={t("saFailedLoginLabel")} value={failedLoginCount}
          onClick={() => onNavigate("monitoring")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        <QuickLinkCard icon={Building2} label={t("saQuickCompanies")} onClick={() => onNavigate("companies")} />
        <QuickLinkCard icon={Users} label={t("saQuickAccounts")} onClick={() => onNavigate("accounts")} />
        <QuickLinkCard icon={Layers} label={t("saQuickPlans")} onClick={() => onNavigate("plans")} />
        <QuickLinkCard icon={FileClock} label={t("saQuickAuditLog")} onClick={() => onNavigate("auditLog")} />
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes === 0) return translate(getCurrentLang(), "saBytesZero");
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toLocaleString(numLocale(), { maximumFractionDigits: 1 })} MB`;
  return `${(mb / 1024).toLocaleString(numLocale(), { maximumFractionDigits: 2 })} GB`;
}

// هوک ساده‌ی داخلی — بارگذاری اولیه + رفرش دستی + رفرش خودکار حداکثر هر ۶۰ ثانیه
function useStorageData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    const result = await loadStorageUsage();
    setLoading(false);
    if (result?.__error) { setError(result.message); return; }
    setError("");
    setData(result);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh };
}

function StorageOverviewCard({ onNavigate }) {
  const { t } = useLanguage();
  const { data, loading, error, refresh } = useStorageData();

  const capacityBytes = data?.capacityMb ? data.capacityMb * 1024 * 1024 : null;
  const usedBytes = data?.totalBytesUsed || 0;
  const percent = capacityBytes ? Math.min(100, (usedBytes / capacityBytes) * 100) : null;
  const status = percent != null ? storageUsageStatus(percent) : null;

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <HardDrive size={14} color={THEME.teal} /> Storage
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onNavigate && (
            <button type="button" onClick={() => onNavigate("storage")} style={{ ...btnStyle(THEME.navyMid), fontSize: 11 }}>{t("saDetails")}</button>
          )}
          <button type="button" onClick={refresh} disabled={loading} style={{ ...btnStyle(THEME.navyMid), fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
            <RefreshCw size={11} /> {loading ? "..." : t("saRefresh")}
          </button>
        </div>
      </div>

      {error && <p style={{ color: THEME.danger, fontSize: 12 }}>{error}</p>}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
            <MiniStat label={t("saCapacityTotal")} value={capacityBytes ? formatBytes(capacityBytes) : t("saCapacityNotSet")} />
            <MiniStat label={t("saCapacityUsed")} value={formatBytes(usedBytes)} />
            <MiniStat label={t("saCapacityRemaining")} value={capacityBytes ? formatBytes(Math.max(0, capacityBytes - usedBytes)) : "—"} />
            <MiniStat label={t("saCapacityPercent")} value={percent != null ? `${percent.toLocaleString(numLocale(), { maximumFractionDigits: 1 })}${pctSign()}` : "—"} color={status?.color} />
          </div>
          {percent != null && (
            <div style={{ height: 8, background: "#eef1f5", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${percent}%`, background: status.color, transition: "width 0.3s" }} />
            </div>
          )}
          {status && (
            <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: status.bg, color: status.color, fontWeight: 600 }}>
              {t("saStatusLabel", { label: status.label })}
            </span>
          )}
          <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10, marginBottom: 0 }}>
            {t("saLastUpdated", { time: new Date(data.generatedAt).toLocaleTimeString(numLocale()) })}
          </p>
        </>
      )}
      {!data && loading && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("commonLoading")}</p>}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || THEME.navy }}>{value}</div>
      <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StorageUsagePage() {
  const { t } = useLanguage();
  const { data, loading, error, refresh } = useStorageData();
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityInput, setCapacityInput] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);

  const capacityBytes = data?.capacityMb ? data.capacityMb * 1024 * 1024 : null;
  const usedBytes = data?.totalBytesUsed || 0;
  const percent = capacityBytes ? Math.min(100, (usedBytes / capacityBytes) * 100) : null;
  const status = percent != null ? storageUsageStatus(percent) : null;

  const handleSaveCapacity = async () => {
    const mb = Number(capacityInput);
    if (!mb || mb <= 0) return;
    setSavingCapacity(true);
    const result = await setStorageCapacity(mb);
    setSavingCapacity(false);
    if (result?.__error) { alert(result.message); return; }
    setEditingCapacity(false);
    await refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, color: THEME.navy, fontWeight: 700, margin: 0 }}>{t("saStorageUsageTitle")}</h2>
        <button type="button" onClick={refresh} disabled={loading} style={{ ...btnStyle(THEME.navyMid), display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> {loading ? t("saRefreshing") : t("saRefresh")}
        </button>
      </div>

      <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>
        {t("saStorageNote")}
      </p>

      {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {data && (
        <>
          <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: 0 }}>{t("saOverallSummary")}</h3>
              <button type="button" onClick={() => { setEditingCapacity((v) => !v); setCapacityInput(String(data.capacityMb || "")); }} style={{ ...btnStyle(THEME.navyMid), fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                <Settings2 size={11} /> {t("saSetTotalCapacity")}
              </button>
            </div>

            {editingCapacity && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, background: THEME.bg, padding: 10, borderRadius: 8 }}>
                <input type="number" style={{ ...inputStyle, width: 160 }} value={capacityInput} onChange={(e) => setCapacityInput(e.target.value)} placeholder={t("saCapacityMbPlaceholder")} dir="ltr" />
                <button type="button" onClick={handleSaveCapacity} disabled={savingCapacity} style={btnStyle()}>{savingCapacity ? "..." : t("commonSave")}</button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 12 }}>
              <MiniStat label={t("saCapacityTotal")} value={capacityBytes ? formatBytes(capacityBytes) : t("saCapacityNotSet")} />
              <MiniStat label={t("saCapacityUsed")} value={formatBytes(usedBytes)} />
              <MiniStat label={t("saCapacityRemaining")} value={capacityBytes ? formatBytes(Math.max(0, capacityBytes - usedBytes)) : "—"} />
              <MiniStat label={t("saCapacityPercent")} value={percent != null ? `${percent.toLocaleString(numLocale(), { maximumFractionDigits: 1 })}${pctSign()}` : "—"} color={status?.color} />
              <MiniStat label={t("saTotalObjectCount")} value={data.totalObjects?.toLocaleString(numLocale()) ?? "—"} />
            </div>
            {percent != null && (
              <div style={{ height: 10, background: "#eef1f5", borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${percent}%`, background: status.color, transition: "width 0.3s" }} />
              </div>
            )}
            <p style={{ fontSize: 10.5, color: THEME.text3, margin: 0 }}>
              {t("saLastUpdated", { time: new Date(data.generatedAt).toLocaleString(numLocale()) })}
            </p>
          </div>

          <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 12px" }}>{t("saUsagePerCompany")}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                    <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColCompany")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColAllocatedSpace")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColActualUsage")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saCapacityRemaining")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saCapacityPercent")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("commonStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCompany.map((c) => {
                    const allocBytes = c.allocatedMb * 1024 * 1024;
                    const pct = allocBytes ? Math.min(100, (c.usedBytes / allocBytes) * 100) : 0;
                    const st = storageUsageStatus(pct);
                    return (
                      <tr key={c.companyId} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{c.companyName}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{formatBytes(allocBytes)}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{formatBytes(c.usedBytes)}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{formatBytes(Math.max(0, allocBytes - c.usedBytes))}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{pct.toLocaleString(numLocale(), { maximumFractionDigits: 1 })}{pctSign()}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {data.byCompany.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: THEME.text3 }}>{t("saNoFilesAssigned")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
            <h3 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 12px" }}>{t("saBreakdownByBucket")}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                    <th style={{ textAlign: "start", padding: "6px 8px" }}>Bucket</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColUsedVolume")}</th>
                    <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColFileCount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byBucket.map((b) => (
                    <tr key={b.bucket} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: "8px", fontWeight: 600, direction: "ltr", textAlign: "start" }}>{b.bucket}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{formatBytes(b.bytesUsed)}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{b.objectCount.toLocaleString(numLocale())}</td>
                    </tr>
                  ))}
                  {data.byBucket.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: THEME.text3 }}>{t("saNoBucketsFound")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!data && loading && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>}
    </div>
  );
}

function AttentionCard({ icon: Icon, color, bg, label, value, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, background: bg, border: "none", borderRadius: 10, padding: 14, cursor: "pointer", textAlign: "start", fontFamily: THEME.font }}
    >
      <Icon size={18} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value === null ? "…" : value.toLocaleString(numLocale())}</div>
        <div style={{ fontSize: 11, color, opacity: 0.85 }}>{label}</div>
      </div>
    </button>
  );
}

function QuickLinkCard({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", fontFamily: THEME.font }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: THEME.navy, fontWeight: 600 }}>
        <Icon size={14} color={THEME.teal} /> {label}
      </span>
      <ChevronLeft size={14} color={THEME.text3} />
    </button>
  );
}

function CompaniesPage({
  companies, plans, currentAdmin, usageStats, expandedId, showCreate, newName, newType, newStatus, setNewStatus,
  newStartDate, setNewStartDate, newStartTime, setNewStartTime, newEndDate, setNewEndDate, newEndTime, setNewEndTime,
  setShowCreate, setNewName, setNewType, onCreate, onToggleExpand, onUpdate, onDelete, onSetActive,
  payments, onAddPayment, onPlanChanged,
}) {
  const { t, dir } = useLanguage();
  return (
    <div>
      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0 }}>{t("saCustomerCompanies")}</h3>
          <button type="button" onClick={() => setShowCreate((v) => !v)} style={{ ...btnStyle(), display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} /> {t("saNewCompany")}
          </button>
        </div>

        {showCreate && (
          <div style={{ marginBottom: 14, background: THEME.bg, padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <input style={{ ...inputStyle, flex: 1, minWidth: 160 }} placeholder={t("saCompanyNamePlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} dir={dir} />
              <select style={inputStyle} value={newType} onChange={(e) => setNewType(e.target.value)} dir={dir}>
                {SUBSCRIPTION_TYPES.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </select>
              <select style={inputStyle} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} dir={dir}>
                {SUBSCRIPTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 6px", fontWeight: 600 }}>
              {t("saPeriodDateTimeNote")}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 10.5, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 3 }}>{t("saStartDate")}</label>
                <JalaliDateInput value={newStartDate} onChange={setNewStartDate} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 3 }}>{t("saStartTime")}</label>
                <input type="time" style={inputStyle} value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 3 }}>{t("saEndDate")}</label>
                <JalaliDateInput value={newEndDate} onChange={setNewEndDate} allowEmpty />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 3 }}>{t("saEndTime")}</label>
                <input type="time" style={inputStyle} value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
              </div>
            </div>
            {newStartDate && newEndDate && (
              <p style={{ fontSize: 11.5, color: THEME.navy, fontWeight: 600, margin: "0 0 8px" }}>
                {t("saFromTo", {
                  start: toJalaliDateTime(new Date(`${newStartDate}T${newStartTime || "00:00"}:00`).toISOString()),
                  end: toJalaliDateTime(new Date(`${newEndDate}T${newEndTime || "00:00"}:00`).toISOString()),
                })}
              </p>
            )}
            <button type="button" onClick={onCreate} style={btnStyle()}>{t("saSubmit")}</button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColCompanyName")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColRegisteredDate")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColPlanAndSubStatus")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColLastLogin")}</th>
                <th style={{ padding: "6px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const access = computeSubscriptionAccess(c);
                const planName = plans.find((p) => p.id === c.planId)?.name || t("saNoPlan");
                return (
                  <React.Fragment key={c.id}>
                    <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{toJalaliSafe(c.registeredAt) || "—"}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: access.isLocked ? "#fee2e2" : "#dcfce7", color: access.isLocked ? "#991b1b" : "#166534", fontWeight: 600 }}>
                          {planName} — {access.label}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: THEME.text3 }}>{c.lastLoginAt ? toJalaliSafe(c.lastLoginAt) : t("saNeverLoggedIn")}</td>
                      <td style={{ padding: "8px", textAlign: "left" }}>
                        <button type="button" onClick={() => onToggleExpand(c)} style={{ ...btnStyle(THEME.navyMid), fontSize: 11 }}>
                          {expandedId === c.id ? t("saClose") : t("saManage")}
                        </button>
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <CompanyManagePanel
                            company={c}
                            companies={companies}
                            plans={plans}
                            currentAdmin={currentAdmin}
                            usageStats={usageStats}
                            onUpdate={(patch) => onUpdate(c.id, patch)}
                            onDelete={(confirmName) => onDelete(c.id, confirmName)}
                            onSetActive={(active) => onSetActive(c.id, active)}
                            paymentsPromise={payments[c.id]}
                            onAddPayment={(amount, paymentType, trackingNum, note) => onAddPayment(c.id, amount, paymentType, trackingNum, note)}
                            onPlanChanged={onPlanChanged}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {companies.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: THEME.text3 }}>{t("saNoCompaniesYet")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// پیکربندی سامانه — سه تب: مدیریت ماژول‌ها و مدیریت داشبورد کاملاً واقعی و
// متصل به system_module_config/system_dashboard_config هستند و مستقیم
// روی Sidebar/صفحه‌ی اصلی همه‌ی کاربران اثر می‌گذارند. مدیریت اعلان‌ها و
// تنظیمات ظاهری (لوگو/رنگ/فونت/تم) فاز بعدی این بخش‌اند و عمداً اینجا
// ساخته نشده‌اند — طبق الزام صریح «صرفاً UI نمایشی ایجاد نکن»، ظرفیت
// موجود «ارسال پیام سیستمی» به‌جای حذف، همین‌جا نگه داشته شده.
// تنظیمات ظاهری (لوگو/رنگ/فونت/تم) و مدیریت اعلان‌ها/اطلاعیه‌ها اکنون
// کامل و متصل به دیتابیس‌اند. ظرفیت «ارسال پیام سیستمی» طبق خواسته‌ی
// صریح به «اطلاعیه‌های سامانه» تغییر نام یافت و به یک سیستم مدیریت
// کامل (چند اطلاعیه، اولویت، بازه‌ی زمانی، فعال/غیرفعال) ارتقا یافت —
// روی همان جدول system_announcements موجود، بدون هیچ ساختار موازی.
const SYSTEM_CONFIG_TABS = [
  { key: "modules", labelKey: "saScTabModules", icon: LayoutGrid },
  { key: "dashboard", labelKey: "saScTabDashboard", icon: PanelsTopLeft },
  { key: "notifications", labelKey: "saScTabNotifications", icon: Bell },
  { key: "appearance", labelKey: "saScTabAppearance", icon: Palette },
  { key: "announcements", labelKey: "saScTabAnnouncements", icon: Megaphone },
  { key: "appUpdate", labelKey: "saScTabAppUpdate", icon: Smartphone },
];

function SystemConfigPage({ currentAdmin, companies }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("modules");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, borderBottom: `1.5px solid ${THEME.border}`, marginBottom: 16 }}>
        {SYSTEM_CONFIG_TABS.map((tb) => (
          <button
            key={tb.key} type="button" onClick={() => setTab(tb.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: THEME.font, fontSize: 12.5,
              color: tab === tb.key ? THEME.teal : THEME.text3, fontWeight: tab === tb.key ? 700 : 500,
              borderBottom: tab === tb.key ? `2.5px solid ${THEME.teal}` : "2.5px solid transparent",
            }}
          >
            <tb.icon size={14} /> {t(tb.labelKey)}
          </button>
        ))}
      </div>
      {tab === "modules" && <ModuleManagementTab currentAdmin={currentAdmin} />}
      {tab === "dashboard" && <DashboardManagementTab currentAdmin={currentAdmin} />}
      {tab === "notifications" && <NotificationManagementTab currentAdmin={currentAdmin} />}
      {tab === "appearance" && <AppearanceManagementTab currentAdmin={currentAdmin} />}
      {tab === "announcements" && <AnnouncementManagementTab currentAdmin={currentAdmin} companies={companies} />}
      {tab === "appUpdate" && <AppUpdateManagementTab currentAdmin={currentAdmin} />}
    </div>
  );
}

// ---------- مدیریت آپدیت نرم‌افزار و موبایل ----------
// جدول app_releases + باکت Storage به‌نام app-releases. version_code یک عددِ
// صعودی است که اپ موبایل برای تشخیص «نسخه‌ی جدید» با APP_VERSION_CODE مقایسه
// می‌کند. طبق استاندارد پروژه: فرمِ ثبت فقط local state است و Write واقعی
// فقط با کلیک روی «ثبت و انتشار». دکمه‌های انتشار/لغو انتشار/حذف در تاریخچه
// دستوراتِ اتمیک با confirm خودشان‌اند (نه ویرایشِ فیلد) پس فوری اجرا می‌شوند.
function AppUpdateManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [releases, setReleases] = useState(null);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [apkFile, setApkFile] = useState(null);
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);

  const load = async () => {
    const rows = await loadAppReleases();
    setReleases(rows);
    // پیش‌پرکردنِ شماره‌ی نسخه با patchِ بعدیِ جدیدترین نسخه (یا خودِ بیلد فعلی).
    const base = rows[0]?.version || APP_VERSION;
    setVersion((prev) => prev || nextPatchVersion(base));
  };
  useEffect(() => { load(); }, []);

  const latestPublished = releases?.find((r) => r.isPublished) || null;

  const resetForm = () => { setVersion(""); setReleaseNotes(""); setDownloadUrl(""); setApkFile(null); setPublishNow(true); };

  const handleSubmit = async () => {
    setMessage(""); setSaving(true);
    const result = await createAppRelease({
      version, releaseNotes, downloadUrl, apkFile,
      publish: publishNow, createdBy: currentAdmin?.fullName,
    });
    setSaving(false);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    setMsgErr(false); setMessage(t("arSavedMessage"));
    resetForm();
    await load();
  };

  const [building, setBuilding] = useState(false);
  const handleAutoBuild = async () => {
    if (!window.confirm(t("arAutoBuildConfirm"))) return;
    setMessage(""); setBuilding(true);
    const result = await triggerMobileBuild({ version, releaseNotes });
    setBuilding(false);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    setMsgErr(false); setMessage(result.message || t("arAutoBuildStarted"));
    resetForm();
    await load();
  };

  const handleTogglePublish = async (r) => {
    setBusyId(r.id); setMessage("");
    const result = await setReleasePublished(r.id, !r.isPublished, currentAdmin?.fullName);
    setBusyId(null);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    await load();
  };

  const handleDelete = async (r) => {
    if (!window.confirm(t("arDeleteConfirm", { version: r.version }))) return;
    setBusyId(r.id); setMessage("");
    const result = await deleteAppRelease(r.id);
    setBusyId(null);
    if (result?.__error) { setMsgErr(true); setMessage(result.message); return; }
    await load();
  };

  if (!releases) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>;

  const th = { textAlign: "center", padding: "8px", fontSize: 11, color: THEME.text3, fontWeight: 700 };
  const td = { textAlign: "center", padding: "8px", fontSize: 12 };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>{t("arNote")}</p>

      {/* نسخه فعلی و آخرین نسخه */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 18 }}>
        <div style={{ background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 4 }}>{t("arCurrentBuildVersion")}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: THEME.navy, direction: "ltr" }}>{APP_VERSION} <span style={{ fontSize: 11, color: THEME.text3 }}>(build {APP_VERSION_CODE})</span></div>
        </div>
        <div style={{ background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 4 }}>{t("arLatestPublishedVersion")}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: latestPublished ? THEME.teal : THEME.text3, direction: "ltr" }}>
            {latestPublished ? `${latestPublished.version} (build ${latestPublished.versionCode})` : "—"}
          </div>
        </div>
      </div>

      {/* بیلد و انتشار خودکار (بدون رفتن به GitHub) */}
      <div style={{ border: `1.5px solid ${THEME.teal}`, background: THEME.tealSoft, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.tealDeep, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Smartphone size={14} /> {t("arAutoBuildTitle")}
        </div>
        <p style={{ fontSize: 11, color: THEME.text2, margin: "0 0 10px", lineHeight: 1.8 }}>{t("arAutoBuildHint")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <label style={smallLabelStyle}>{t("arVersionLabel")}</label>
            <input style={{ ...inputStyle, direction: "ltr" }} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" />
          </div>
        </div>
        <label style={{ ...smallLabelStyle, marginTop: 10 }}>{t("arReleaseNotesLabel")}</label>
        <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: THEME.font }} value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} dir={dir} />
        <button type="button" style={{ ...btnStyle(THEME.tealDeep), marginTop: 12, display: "flex", alignItems: "center", gap: 6 }} onClick={handleAutoBuild} disabled={building}>
          <RefreshCw size={14} style={building ? { animation: "sa-spin 1s linear infinite" } : undefined} /> {building ? t("arAutoBuildBuilding") : t("arAutoBuildButton")}
        </button>
        <style>{`@keyframes sa-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* فرم ثبت نسخه‌ی جدید — آپلود دستی APK یا لینک بیرونی */}
      <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.navy, marginBottom: 10 }}>{t("arNewReleaseTitle")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div>
            <label style={smallLabelStyle}>{t("arVersionLabel")}</label>
            <input style={{ ...inputStyle, direction: "ltr" }} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" />
          </div>
          <div>
            <label style={smallLabelStyle}>{t("arExternalDownloadUrl")}</label>
            <input style={{ ...inputStyle, direction: "ltr" }} value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://…/app.apk" />
          </div>
        </div>
        <label style={{ ...smallLabelStyle, marginTop: 10 }}>{t("arReleaseNotesLabel")}</label>
        <textarea style={{ ...inputStyle, minHeight: 90, fontFamily: THEME.font }} value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} dir={dir} />

        <label style={{ ...smallLabelStyle, marginTop: 10 }}>{t("arApkFileLabel")}</label>
        <input type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setApkFile(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
        {apkFile && <div style={{ fontSize: 11, color: THEME.text3, marginTop: 4 }}>{apkFile.name} — {(apkFile.size / (1024 * 1024)).toFixed(1)} MB</div>}
        <p style={{ fontSize: 10.5, color: THEME.text3, margin: "6px 0 0", lineHeight: 1.7 }}>{t("arApkOrLinkHint")}</p>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.text2, marginTop: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          {t("arPublishImmediately")}
        </label>

        {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : "#166534", margin: "10px 0 0" }}>{message}</p>}

        <button type="button" style={{ ...btnStyle(), marginTop: 12, display: "flex", alignItems: "center", gap: 6 }} onClick={handleSubmit} disabled={saving}>
          <UploadCloud size={14} /> {saving ? t("arSavingEllipsis") : t("arSubmitRelease")}
        </button>
      </div>

      {/* تاریخچه‌ی نسخه‌ها */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.navy, marginBottom: 8 }}>{t("arHistoryTitle")}</div>
      {releases.length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 16 }}>{t("arNoReleasesYet")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `1.5px solid ${THEME.border}` }}>
              <th style={th}>{t("arColVersion")}</th>
              <th style={th}>build</th>
              <th style={th}>{t("arColStatus")}</th>
              <th style={th}>{t("arColPublishedAt")}</th>
              <th style={th}>{t("arColDownload")}</th>
              <th style={th}></th>
            </tr></thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ ...td, fontWeight: 700, color: THEME.navy, direction: "ltr" }}>
                    {r.version}
                    {r.releaseNotes && <div style={{ fontSize: 10, color: THEME.text3, fontWeight: 400, direction: dir, maxWidth: 260, margin: "3px auto 0", whiteSpace: "pre-wrap" }}>{r.releaseNotes}</div>}
                  </td>
                  <td style={td}>{r.versionCode}</td>
                  <td style={td}>
                    <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 999, fontWeight: 700, background: r.isPublished ? "#dcfce7" : "#eef1f5", color: r.isPublished ? "#166534" : THEME.text3 }}>
                      {r.isPublished ? t("arStatusPublished") : t("arStatusUnpublished")}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: THEME.text3 }}>{r.publishedAt ? toJalaliSafe(r.publishedAt) : "—"}</td>
                  <td style={td}>
                    {r.effectiveDownloadUrl
                      ? <a href={r.effectiveDownloadUrl} target="_blank" rel="noopener noreferrer" style={{ color: THEME.teal, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11 }}><Download size={12} /> APK</a>
                      : <span style={{ fontSize: 11, color: THEME.text3 }}>—</span>}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => handleTogglePublish(r)} disabled={busyId === r.id}
                        style={{ ...btnStyle(r.isPublished ? THEME.text3 : "#166534"), fontSize: 10.5, padding: "5px 10px" }}>
                        {r.isPublished ? t("arUnpublishAction") : t("arPublishAction")}
                      </button>
                      <button type="button" onClick={() => handleDelete(r)} disabled={busyId === r.id}
                        style={{ ...btnStyle(THEME.danger), fontSize: 10.5, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                        <Trash2 size={11} /> {t("commonDelete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// همان لیست/ترتیب/برچسب پیش‌فرضی که در SQL seed شده — برای «بازگردانی
// ترتیب پیش‌فرض» بدون نیاز به رفت‌وبرگشت اضافه با دیتابیس.
// labelKey = کلیدِ i18n که هم fa و هم en دارد (همان نامی که تا امروز در
// منو/ساید‌بار نشان داده می‌شده). descKey فقط برای placeholderِ ستونِ توضیح.
const DEFAULT_MODULE_CONFIG = [
  { moduleKey: "chat", labelKey: "moduleChat", descKey: "saDmcDescChat" },
  { moduleKey: "archiveManagement", labelKey: "moduleArchive", descKey: "saDmcDescArchive" },
  { moduleKey: "anomalyReport", labelKey: "moduleAnomalyReport", descKey: "saDmcDescAnomaly" },
  { moduleKey: "riskAssessment", labelKey: "moduleRiskAssessment", descKey: "saDmcDescRisk" },
  { moduleKey: "personnelAccess", labelKey: "modulePersonnelAccess", descKey: "saDmcDescPersonnel" },
  { moduleKey: "proactiveIndicators", labelKey: "moduleProactiveIndicators", descKey: "saDmcDescProactive" },
  { moduleKey: "incidentManagement", labelKey: "moduleIncidentManagement", descKey: "saDmcDescIncident" },
  { moduleKey: "machineryManagement", labelKey: "moduleMachinery", descKey: "saDmcDescMachinery" },
  { moduleKey: "scaffoldManagement", labelKey: "moduleScaffold", descKey: "saDmcDescScaffold" },
  { moduleKey: "managementDashboard", labelKey: "moduleManagementDashboard", descKey: "saDmcDescMgmtDash" },
];

// نامِ پیش‌فرضِ فارسی/انگلیسیِ هر ماژول — برای placeholderِ فیلدها و «بازگردانی
// پیش‌فرض». هنگام ساختِ اولیه‌ی ردیف‌ها نام‌ها خالی گذاشته می‌شوند تا اگر ادمین
// چیزی تایپ نکند، همان ترجمه‌ی i18n استفاده شود.
const buildDefaultModuleConfig = () => DEFAULT_MODULE_CONFIG.map((m) => ({ moduleKey: m.moduleKey, displayLabel: "", displayLabelEn: "", description: "" }));
const moduleDefaultNames = (moduleKey) => {
  const d = DEFAULT_MODULE_CONFIG.find((x) => x.moduleKey === moduleKey);
  return d
    ? { fa: translate("fa", d.labelKey), en: translate("en", d.labelKey) }
    : { fa: moduleKey, en: moduleKey };
};

function ModuleManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  // نامِ فارسی (displayLabel) و انگلیسی (displayLabelEn) جداگانه‌اند. هرکدام
  // که خالی نباشد در همان زبان (وب و موبایل) نمایش داده می‌شود؛ خالی =
  // ترجمه‌ی i18n. اینجا مقدارِ واقعیِ دیتابیس نشان داده می‌شود و فیلدِ خالی
  // با placeholderِ نامِ پیش‌فرض همراه است.
  const load = () => loadModuleConfig().then((rows) => {
    setList(rows.length > 0
      ? rows.map((r) => ({ moduleKey: r.moduleKey, displayLabel: r.displayLabel || "", displayLabelEn: r.displayLabelEn || "", description: r.description || "" }))
      : buildDefaultModuleConfig());
  });
  useEffect(() => { load(); }, []);

  if (!list) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>;

  const move = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[idx], next[to]] = [next[to], next[idx]];
    setList(next);
  };

  const handleDrop = (idx) => {
    if (dragIndex === null || dragIndex === idx) return;
    const next = [...list];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    setList(next);
    setDragIndex(null);
  };

  const updateField = (idx, field, value) => {
    const next = [...list];
    next[idx] = { ...next[idx], [field]: value };
    setList(next);
  };

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const result = await saveModuleConfig(list, currentAdmin?.fullName);
    setSaving(false);
    setMsgErr(!!result?.__error);
    setMessage(result?.__error ? result.message : t("saMmSaved"));
    if (!result?.__error) await load();
  };

  // «بازگردانی پیش‌فرض» = ترتیبِ کدِ پیش‌فرض + پُرکردنِ نام‌ها با مقادیرِ
  // پیش‌فرضِ فارسی/انگلیسی (نه خالی‌کردن).
  const handleReset = () => setList(DEFAULT_MODULE_CONFIG.map((d) => {
    const n = moduleDefaultNames(d.moduleKey);
    return { moduleKey: d.moduleKey, displayLabel: n.fa, displayLabelEn: n.en, description: "" };
  }));

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>
        {t("saMmNote")}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 6px", borderBottom: `1.5px solid ${THEME.border}` }}>
        <span style={{ width: 15, flexShrink: 0 }} />
        <span style={{ width: 15, flexShrink: 0 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8, flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 700, color: THEME.text3 }}>
          <span>{t("saMmColFa")}</span>
          <span>{t("saMmColEn")}</span>
          <span>{t("saMmColDesc")}</span>
        </div>
      </div>
      {list.map((m, idx) => {
        const def = moduleDefaultNames(m.moduleKey);
        return (
        <div
          key={m.moduleKey}
          draggable
          onDragStart={() => setDragIndex(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(idx)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderBottom: `1px solid ${THEME.border}`, background: dragIndex === idx ? THEME.bg : "transparent" }}
        >
          <GripVertical size={15} color={THEME.text3} style={{ cursor: "grab", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, padding: 1 }}><ArrowUp size={13} color={THEME.text2} /></button>
            <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} style={{ background: "none", border: "none", cursor: idx === list.length - 1 ? "default" : "pointer", opacity: idx === list.length - 1 ? 0.3 : 1, padding: 1 }}><ArrowDown size={13} color={THEME.text2} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8, flex: 1, minWidth: 0 }}>
            <input style={inputStyle} placeholder={def.fa} value={m.displayLabel} onChange={(e) => updateField(idx, "displayLabel", e.target.value)} dir={dir} />
            <input style={{ ...inputStyle, direction: "ltr" }} placeholder={def.en} value={m.displayLabelEn} onChange={(e) => updateField(idx, "displayLabelEn", e.target.value)} dir="ltr" />
            <input style={inputStyle} placeholder={t("saMmDescPlaceholder")} value={m.description} onChange={(e) => updateField(idx, "description", e.target.value)} dir={dir} />
          </div>
        </div>
        );
      })}
      {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : "#166534", marginTop: 10 }}>{message}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("saSaveChangesPlain")}</button>
        <button type="button" style={{ ...btnStyle(THEME.text3), display: "flex", alignItems: "center", gap: 6 }} onClick={handleReset}>
          <RotateCcw size={13} /> {t("saRestoreDefaultOrder")}
        </button>
      </div>
    </div>
  );
}

// بخش «کارت‌های KPI صفحه‌ی اصلی دسکتاپ» طبق خواسته‌ی صریح حذف شد — دیگر
// هیچ کارت KPI ای در صفحه‌ی اصلی نمایش داده نمی‌شود، پس تنظیماتش هم بی‌مورد
// بود. تب «مدیریت داشبورد» اکنون فقط مدیریت پنل‌های ماژول «داشبورد
// مدیریتی» را نشان می‌دهد.
function DashboardManagementTab({ currentAdmin }) {
  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <DashboardWidgetsSection currentAdmin={currentAdmin} />
    </div>
  );
}

// امضای مقایسه‌ای برای تشخیص «تغییر کرده؟» — ترتیب + وضعیت نمایش.
const widgetSignature = (list) => list.map((w) => `${w.key}:${w.isVisible ? 1 : 0}`).join("|");

function DashboardWidgetsSection({ currentAdmin }) {
  const { t } = useLanguage();
  const [baseline, setBaseline] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);

  const load = () => loadDashboardWidgetConfig().then((rows) => {
    const merged = mergeWidgetConfig(rows);
    setBaseline(merged);
    setDraft(merged.map((w) => ({ ...w })));
  });
  useEffect(() => { load(); }, []);

  if (!draft) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>;

  // استاندارد سراسری ذخیره‌سازی: هر تغییر فقط در draft می‌رود؛ Write واقعی
  // فقط با «ذخیره تغییرات».
  const toggle = (key) => {
    setMessage("");
    setDraft((prev) => prev.map((w) => (w.key === key ? { ...w, isVisible: !w.isVisible } : w)));
  };
  const setAll = (isVisible) => {
    setMessage("");
    setDraft((prev) => prev.map((w) => ({ ...w, isVisible })));
  };
  const resetToDefault = () => {
    setMessage("");
    setDraft(defaultWidgetConfig());
  };
  // جابه‌جایی فقط داخل همان گروه (بالا/پایین‌بردن یک KPI به میان نمودارها بی‌معناست).
  const move = (key, dir) => {
    setMessage("");
    setDraft((prev) => {
      const arr = prev.map((w) => ({ ...w }));
      const i = arr.findIndex((w) => w.key === key);
      if (i < 0) return prev;
      let j = i + dir;
      while (j >= 0 && j < arr.length && arr[j].group !== arr[i].group) j += dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const isDirty = baseline && widgetSignature(baseline) !== widgetSignature(draft);

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const list = draft.map((w, idx) => ({ widgetKey: w.key, isVisible: w.isVisible, sortOrder: idx + 1 }));
    const result = await saveDashboardWidgetsBulk(list, currentAdmin?.fullName);
    setSaving(false);
    setMsgErr(!!result?.__error);
    setMessage(result?.__error ? result.message : t("saDwSaved"));
    if (!result?.__error) await load();
  };

  return (
    <div>
      <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 6px" }}>{t("saDwTitle")}</h4>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 10, lineHeight: 1.8 }}>
        {t("saDwNote")}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" style={{ ...btnStyle(THEME.navyMid), fontSize: 11 }} onClick={() => setAll(true)}>{t("saAllOn")}</button>
        <button type="button" style={{ ...btnStyle(THEME.text3), fontSize: 11 }} onClick={() => setAll(false)}>{t("saAllOff")}</button>
        <button type="button" style={{ ...btnStyle(THEME.text3), fontSize: 11, display: "flex", alignItems: "center", gap: 5 }} onClick={resetToDefault}>
          <RotateCcw size={12} /> {t("saRestoreDefault")}
        </button>
      </div>

      {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : "#166534", marginBottom: 10 }}>{message}</p>}

      {DASHBOARD_WIDGET_GROUPS.map((group) => {
        const rows = draft.filter((w) => w.group === group.key);
        if (rows.length === 0) return null;
        return (
          <div key={group.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.teal, margin: "0 0 4px" }}>{group.labelKey ? t(group.labelKey) : group.label}</div>
            {rows.map((w, gi) => (
              <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderBottom: `1px solid ${THEME.border}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button type="button" onClick={() => move(w.key, -1)} disabled={gi === 0} style={{ background: "none", border: "none", cursor: gi === 0 ? "default" : "pointer", opacity: gi === 0 ? 0.3 : 1, padding: 1 }}><ArrowUp size={13} color={THEME.text2} /></button>
                  <button type="button" onClick={() => move(w.key, 1)} disabled={gi === rows.length - 1} style={{ background: "none", border: "none", cursor: gi === rows.length - 1 ? "default" : "pointer", opacity: gi === rows.length - 1 ? 0.3 : 1, padding: 1 }}><ArrowDown size={13} color={THEME.text2} /></button>
                </div>
                <span style={{ flex: 1, fontSize: 12.5, color: THEME.text, fontWeight: 600 }}>
                  {w.labelKey ? t(w.labelKey) : w.label}
                  {w.employerOnly && <span style={{ fontSize: 10, color: THEME.text3, fontWeight: 400 }}>{t("saEmployerOnlySuffix")}</span>}
                </span>
                <button
                  type="button" onClick={() => toggle(w.key)}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: w.isVisible ? "#dcfce7" : "#eef1f5", color: w.isVisible ? "#166534" : THEME.text3, border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font }}
                >
                  {w.isVisible ? <Eye size={13} /> : <EyeOff size={13} />} {w.isVisible ? t("saVisibleShown") : t("saHidden")}
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {isDirty && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("saSaveChangesPlain")}</button>
          <button type="button" style={{ ...btnStyle(THEME.text3) }} onClick={() => setDraft(baseline.map((w) => ({ ...w })))} disabled={saving}>{t("commonCancel")}</button>
        </div>
      )}
    </div>
  );
}

const ROLE_LABELS = { all: "saRoleAll", employer: "saRoleEmployerOnly", contractor: "saRoleContractorOnly" };
const PRIORITY_META = {
  low: { labelKey: "saPrioLow", color: "#5b6b7d", bg: "#eef1f5" },
  medium: { labelKey: "saPrioMedium", color: "#92400e", bg: "#fef3c7" },
  high: { labelKey: "saPrioHigh", color: "#b91c1c", bg: "#fee2e2" },
};

function NotificationManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState(null);
  const [draftList, setDraftList] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);

  const load = () => loadNotificationTypes().then((rows) => { setList(rows); setDraftList(rows); });
  useEffect(() => { load(); }, []);

  if (!draftList) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>;

  // استاندارد سراسری ذخیره‌سازی: هر تغییر (فعال/غیرفعال، گیرنده، اولویت،
  // مهلت هشدار) فقط در این آرایه‌ی محلی می‌رود؛ Write واقعی فقط با کلیک
  // روی «ذخیره تغییرات» انجام می‌شود
  const updateDraft = (typeKey, patch) => {
    setMessage("");
    setDraftList((prev) => prev.map((nt) => (nt.typeKey === typeKey ? { ...nt, ...patch } : nt)));
  };

  const isDirty = draftList.some((nt, idx) => JSON.stringify(nt) !== JSON.stringify(list[idx]));

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const writes = [];
    draftList.forEach((nt, idx) => {
      const orig = list[idx];
      if (!orig || orig.typeKey !== nt.typeKey) return;
      const patch = {};
      if (orig.isEnabled !== nt.isEnabled) patch.isEnabled = nt.isEnabled;
      if (orig.targetRole !== nt.targetRole) patch.targetRole = nt.targetRole;
      if (orig.priority !== nt.priority) patch.priority = nt.priority;
      if (orig.warningDays !== nt.warningDays) patch.warningDays = nt.warningDays;
      if (Object.keys(patch).length > 0) writes.push(saveNotificationType(nt.typeKey, patch, currentAdmin?.fullName));
    });
    const results = await Promise.all(writes);
    setSaving(false);
    const failed = results.find((r) => r?.__error);
    setMsgErr(!!failed);
    setMessage(failed ? failed.message : t("saNmSaved"));
    if (!failed) await load();
  };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>
        {t("saNmNote")}
      </p>
      {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : "#166534", marginBottom: 10 }}>{message}</p>}
      {draftList.map((nt) => (
        <div key={nt.typeKey} style={{ padding: "12px 8px", borderBottom: `1px solid ${THEME.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>{notificationTypeLabel(nt)}</span>
                <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 999, background: PRIORITY_META[nt.priority].bg, color: PRIORITY_META[nt.priority].color, fontWeight: 600 }}>
                  {t("saPriorityBadge", { label: t(PRIORITY_META[nt.priority].labelKey) })}
                </span>
                <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 999, background: nt.isEnabled ? "#dcfce7" : "#eef1f5", color: nt.isEnabled ? "#166534" : THEME.text3, fontWeight: 600 }}>
                  {nt.isEnabled ? t("commonActive") : t("commonInactive")}
                </span>
              </div>
              {notificationTypeDescription(nt) && <p style={{ fontSize: 11, color: THEME.text3, margin: "4px 0 0" }}>{notificationTypeDescription(nt)}</p>}
            </div>
            <button
              type="button" onClick={() => updateDraft(nt.typeKey, { isEnabled: !nt.isEnabled })}
              style={{ display: "flex", alignItems: "center", gap: 5, background: nt.isEnabled ? "#fee2e2" : "#dcfce7", color: nt.isEnabled ? "#b91c1c" : "#166534", border: "none", borderRadius: 999, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font, flexShrink: 0 }}
            >
              {nt.isEnabled ? <EyeOff size={13} /> : <Eye size={13} />} {nt.isEnabled ? t("saDisableAction") : t("saEnableAction")}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 10.5, color: THEME.text3, display: "block", marginBottom: 3 }}>{t("saRecipient")}</label>
              <select style={{ ...inputStyle, width: 140 }} value={nt.targetRole} onChange={(e) => updateDraft(nt.typeKey, { targetRole: e.target.value })} dir={dir}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: THEME.text3, display: "block", marginBottom: 3 }}>{t("saPriority")}</label>
              <select style={{ ...inputStyle, width: 110 }} value={nt.priority} onChange={(e) => updateDraft(nt.typeKey, { priority: e.target.value })} dir={dir}>
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
              </select>
            </div>
            {nt.warningDays != null && (
              <div>
                <label style={{ fontSize: 10.5, color: THEME.text3, display: "block", marginBottom: 3 }}>{t("saWarnDaysBefore")}</label>
                <input type="number" style={{ ...inputStyle, width: 100 }} value={nt.warningDays} onChange={(e) => updateDraft(nt.typeKey, { warningDays: Number(e.target.value) || 0 })} dir="ltr" />
              </div>
            )}
          </div>
        </div>
      ))}
      {isDirty && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("saSaveChangesPlain")}</button>
          <button type="button" style={btnStyle(THEME.text3)} onClick={() => setDraftList(list)} disabled={saving}>{t("commonCancel")}</button>
        </div>
      )}
    </div>
  );
}

function AppearanceManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgErr, setMsgErr] = useState(false);

  const load = () => loadAppearanceConfig().then(setConfig);
  useEffect(() => { load(); }, []);

  if (!config) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>;

  const update = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const result = await saveAppearanceConfig(config, currentAdmin?.fullName);
    setSaving(false);
    setMsgErr(!!result?.__error);
    setMessage(result?.__error ? result.message : t("saApSaved"));
    if (!result?.__error) await load();
  };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 16, lineHeight: 1.8 }}>
        {t("saApNote")}
      </p>

      <SectionLabel>{t("saApIdentity")}</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApSystemName")}</label>
          <input style={inputStyle} value={config.systemName} onChange={(e) => update("systemName", e.target.value)} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApSystemTitle")}</label>
          <input style={inputStyle} value={config.systemTitle} onChange={(e) => update("systemTitle", e.target.value)} dir={dir} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApLogoUrl")}</label>
          <input style={inputStyle} value={config.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} dir="ltr" placeholder={t("saApLogoUrlPlaceholder")} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApFaviconUrl")}</label>
          <input style={inputStyle} value={config.faviconUrl} onChange={(e) => update("faviconUrl", e.target.value)} dir="ltr" placeholder={t("saApFaviconPlaceholder")} />
        </div>
      </div>
      {config.logoUrl && (
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: THEME.text3 }}>{t("saApLogoPreview")}</span>
          <img src={config.logoUrl} alt={t("saApLogoPreviewAlt")} style={{ width: 48, height: 48, objectFit: "contain", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 4 }} onError={(e) => { e.target.style.display = "none"; }} />
        </div>
      )}

      <SectionLabel>{t("saApBrandColor")}</SectionLabel>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <ColorField label={t("saApColorPrimary")} value={config.colorPrimary} onChange={(v) => update("colorPrimary", v)} />
        <ColorField label={t("saApColorAccent")} value={config.colorAccent} onChange={(v) => update("colorAccent", v)} />
      </div>

      <SectionLabel>{t("saApThemeFont")}</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApTheme")}</label>
          <select style={inputStyle} value={config.themeMode} onChange={(e) => update("themeMode", e.target.value)} dir={dir}>
            <option value="light">{t("saApThemeLight")}</option>
            <option value="dark">{t("saApThemeDark")}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApFontFamily")}</label>
          <input style={inputStyle} value={config.fontFamily} onChange={(e) => update("fontFamily", e.target.value)} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApFontSizeBase")}</label>
          <input type="number" style={inputStyle} value={config.fontSizeBase ?? ""} onChange={(e) => update("fontSizeBase", e.target.value ? Number(e.target.value) : null)} dir="ltr" />
        </div>
      </div>

      <SectionLabel>{t("saApHeaderSidebar")}</SectionLabel>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: THEME.text2, cursor: "pointer" }}>
          <input type="checkbox" checked={config.headerShowCompanyName} onChange={(e) => update("headerShowCompanyName", e.target.checked)} />
          {t("saApShowCompanyName")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: THEME.text2, cursor: "pointer" }}>
          <input type="checkbox" checked={config.sidebarDefaultCollapsed} onChange={(e) => update("sidebarDefaultCollapsed", e.target.checked)} />
          {t("saApSidebarCollapsed")}
        </label>
      </div>

      <SectionLabel>{t("saApApkIcon")}</SectionLabel>
      <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <p style={{ fontSize: 11.5, color: "#7c2d12", margin: "0 0 10px", lineHeight: 1.9 }}>
          {t("saApApkNote")}
        </p>
        <ol style={{ fontSize: 11.5, color: "#7c2d12", margin: "0 0 10px", paddingInlineStart: 18, lineHeight: 2 }}>
          <li>{t("saApApkStep1")}</li>
          <li>{t("saApApkStep2a")}<code>resources/icon.png</code>{t("saApApkStep2b")}</li>
          <li>{t("saApApkStep3a")}<code>Build Android APK</code>{t("saApApkStep3b")}<code>Generate Splash Screen assets</code>{t("saApApkStep3c")}</li>
        </ol>
        <div>
          <label style={{ fontSize: 11, color: "#7c2d12", fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saApApkIconUrl")}</label>
          <input style={inputStyle} value={config.apkIconUrl} onChange={(e) => update("apkIconUrl", e.target.value)} dir="ltr" placeholder={t("saApApkIconUrlPlaceholder")} />
        </div>
        {config.apkIconUrl && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#7c2d12" }}>{t("saPreviewLabel")}</span>
            <img src={config.apkIconUrl} alt={t("saApApkIconAlt")} style={{ width: 48, height: 48, objectFit: "contain", border: "1px solid #fdba74", borderRadius: 8, padding: 4, background: "#fff" }} onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}
      </div>

      {message && <p style={{ fontSize: 11.5, color: msgErr ? THEME.danger : "#166534", marginBottom: 10, lineHeight: 1.8 }}>{message}</p>}
      <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("saApSaveBtn")}</button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <h4 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: "0 0 10px", paddingBottom: 6, borderBottom: `1px solid ${THEME.border}` }}>{children}</h4>;
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 40, height: 34, border: `1.5px solid ${THEME.border}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
        <input style={{ ...inputStyle, width: 100 }} value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" />
      </div>
    </div>
  );
}

const ANNOUNCEMENT_ICONS = {
  megaphone: Megaphone, sparkles: Sparkles, gift: Gift, info: Info, bell: Bell,
};

// آپلودر عکس مشترک — یک نمونه برای عکس کارت صفحه‌ی اصلی (۱۶:۹) و یک
// نمونه‌ی جدا برای پس‌زمینه‌ی صفحه‌ی ورود (نسبت عمودی)، چون این دو زمینه
// ابعاد بصری کاملاً متفاوتی دارند.
function AnnouncementImageUploader({ value, aspectRatio, width, uploading, onUpload, onRemove }) {
  const { t } = useLanguage();
  // مرورگر رویداد change ورودی فایل را وقتی «همان فایل قبلی» دوباره
  // انتخاب شود، شلیک نمی‌کند (چون از دید مرورگر مقدار تغییر نکرده) —
  // این دقیقاً همان علتی است که «جایگزین می‌کنم هیچ اتفاقی نمی‌افته» را
  // توضیح می‌دهد. با پاک‌کردن e.target.value درست قبل از باز شدن دیالوگ
  // انتخاب فایل (نه فقط بعد از آپلود موفق)، این مشکل کامل رفع می‌شود.
  const clearBeforePick = (e) => { e.target.value = ""; };
  return value ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width, aspectRatio, borderRadius: 8, overflow: "hidden", border: `1px solid ${THEME.border}`, flexShrink: 0, background: "#e9eef3" }}>
        <img src={value} alt={t("saPreviewAlt")} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ ...btnStyle(THEME.navyMid), display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", width: "fit-content" }}>
          <ImagePlus size={13} /> {uploading ? t("saUploading") : t("saReplaceImage")}
          <input type="file" accept="image/*" onClick={clearBeforePick} onChange={onUpload} disabled={uploading} style={{ display: "none" }} />
        </label>
        <button type="button" onClick={onRemove} style={{ ...btnStyle(THEME.danger), display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content" }}>
          <X size={13} /> {t("saRemoveImage")}
        </button>
      </div>
    </div>
  ) : (
    <label style={{ ...btnStyle(THEME.navyMid), display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", width: "fit-content" }}>
      <ImagePlus size={13} /> {uploading ? t("saUploading") : t("saUploadImage")}
      <input type="file" accept="image/*" onClick={clearBeforePick} onChange={onUpload} disabled={uploading} style={{ display: "none" }} />
    </label>
  );
}

function AnnouncementManagementTab({ currentAdmin, companies }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAnnouncementForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  function emptyAnnouncementForm() {
    return { companyId: "", title: "", message: "", iconKey: "megaphone", imageUrl: "", loginImageUrl: "", buttonLabel: "", buttonUrl: "", startsAt: "", endsAt: "", priority: 0, isActive: true, displaySeconds: 10, displayLocation: "both" };
  }

  const load = () => loadAllAnnouncements().then(setList);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyAnnouncementForm()); setEditingId(null); setShowForm(true); setMessage(""); };
  const openEdit = (a) => {
    setForm({
      companyId: a.companyId || "", title: a.title, message: a.message, iconKey: a.iconKey, imageUrl: a.imageUrl || "", loginImageUrl: a.loginImageUrl || "",
      buttonLabel: a.buttonLabel, buttonUrl: a.buttonUrl,
      startsAt: a.startsAt ? a.startsAt.slice(0, 16) : "", endsAt: a.endsAt ? a.endsAt.slice(0, 16) : "",
      priority: a.priority, isActive: a.isActive, displaySeconds: a.displaySeconds || 10, displayLocation: a.displayLocation || "both",
    });
    setEditingId(a.id); setShowForm(true); setMessage("");
  };

  // آپلود مستقیم عکس — همان الگوی موجود پروژه (uploadBase64ToStorage)،
  // در باکت اختصاصی announcement-images. طبق درخواست صریح، دو تصویر کاملاً
  // جدا: field='imageUrl' برای کارت صفحه‌ی اصلی (قاب افقی ۱۶:۹) و
  // field='loginImageUrl' برای پس‌زمینه‌ی پنل صفحه‌ی ورود (قاب عمودی/بلند)
  // — چون این دو زمینه ابعاد بصری کاملاً متفاوتی دارند و یک عکس واحد
  // نمی‌تواند بدون افت کیفیت هر دو را درست پوشش دهد.
  const handleImageChange = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    setUploadingImage(field);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const url = await uploadBase64ToStorage("announcement-images", `${field}-${Date.now()}.${ext}`, base64, file.type || "image/jpeg");
      if (form[field]) {
        const old = parseStorageUrl(form[field]);
        if (old) deleteFromStorage(old.bucket, old.path).catch(() => {});
      }
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      const status = err?.status;
      const rawText = (err?.message || "").replace(/^(خطا در آپلود فایل|File upload error):\s*/, "");
      if (status === 401 || status === 403) {
        setMessage(t("saAnUploadErr403", { status, detail: rawText }));
      } else {
        // متن دقیق پاسخ سرور همیشه نشان داده می‌شود — چون پیام‌های حدسی
        // قبلی (فقط بر اساس status code) گمراه‌کننده بودند: حتی بعد از
        // ساخته‌شدن باکت، همان پیام تکراری برمی‌گشت، یعنی علت واقعی چیز
        // دیگری بود (نام دقیق باکت، یا محدودیت نوع/حجم فایل).
        setMessage(t("saAnUploadErrGeneric", { status: status ?? t("saUnknownCode"), detail: rawText || t("saUnknownError") }));
      }
    }
    setUploadingImage(false);
    e.target.value = "";
  };

  const handleRemoveImage = (field) => () => {
    if (form[field]) {
      const old = parseStorageUrl(form[field]);
      if (old) deleteFromStorage(old.bucket, old.path).catch(() => {});
    }
    setForm((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    if (!form.message.trim()) { setMessage(t("saAnMsgRequired")); return; }
    setSaving(true); setMessage("");
    const payload = { ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null, priority: Number(form.priority) || 0 };
    const result = editingId ? await updateAnnouncement(editingId, payload, currentAdmin?.fullName) : await createAnnouncement(payload, currentAdmin?.fullName);
    setSaving(false);
    if (result?.__error) { setMessage(result.message); return; }
    setShowForm(false);
    await load();
  };

  const handleToggleActive = async (a) => {
    const result = await setAnnouncementActive(a.id, !a.isActive, currentAdmin?.fullName);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  const handleDelete = async (a) => {
    if (!confirm(t("saAnDeleteConfirm", { title: a.title || a.message.slice(0, 30) }))) return;
    const result = await deleteAnnouncement(a.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0, lineHeight: 1.8, maxWidth: 560 }}>
          {t("saAnNote")}
        </p>
        <button type="button" style={{ ...btnStyle(), display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={openCreate}>
          <Plus size={13} /> {t("saAnNew")}
        </button>
      </div>

      {showForm && (
        <div style={{ background: THEME.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnTitle")}</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} dir={dir} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnIcon")}</label>
              <select style={inputStyle} value={form.iconKey} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} dir={dir}>
                <option value="megaphone">{t("saAnIconMegaphone")}</option>
                <option value="sparkles">{t("saAnIconSparkles")}</option>
                <option value="gift">{t("saAnIconGift")}</option>
                <option value="info">{t("saAnIconInfo")}</option>
                <option value="bell">{t("saAnIconBell")}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnTargetCompany")}</label>
              <select style={inputStyle} value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} dir={dir}>
                <option value="">{t("saAllCompanies")}</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnPriority")}</label>
              <input type="number" style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnDisplayDuration")}</label>
              <select style={inputStyle} value={form.displaySeconds} onChange={(e) => setForm({ ...form, displaySeconds: Number(e.target.value) })} dir={dir}>
                <option value={5}>{t("saSecondsN", { n: 5 })}</option>
                <option value={10}>{t("saSecondsN", { n: 10 })}</option>
                <option value={15}>{t("saSecondsN", { n: 15 })}</option>
                <option value={30}>{t("saSecondsN", { n: 30 })}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnStartsAt")}</label>
              <input type="datetime-local" style={inputStyle} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnEndsAt")}</label>
              <input type="datetime-local" style={inputStyle} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnButtonLabel")}</label>
              <input style={inputStyle} placeholder={t("saAnButtonLabelPlaceholder")} value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} dir={dir} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnButtonUrl")}</label>
              <input style={inputStyle} placeholder={t("saAnButtonUrlPlaceholder")} value={form.buttonUrl} onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })} dir="ltr" />
            </div>
          </div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saAnMessage")}</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} dir={dir} />

          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4, marginTop: 10 }}>{t("saAnHomeImage")}</label>
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px", lineHeight: 1.7 }}>
            {t("saAnHomeImageNote")}
          </p>
          <AnnouncementImageUploader
            value={form.imageUrl} aspectRatio="16/9" width={160} uploading={uploadingImage === "imageUrl"}
            onUpload={handleImageChange("imageUrl")} onRemove={handleRemoveImage("imageUrl")}
          />

          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4, marginTop: 16 }}>{t("saAnLoginImage")}</label>
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px", lineHeight: 1.7 }}>
            {t("saAnLoginImageNote")}
          </p>
          <AnnouncementImageUploader
            value={form.loginImageUrl} aspectRatio="3/4" width={110} uploading={uploadingImage === "loginImageUrl"}
            onUpload={handleImageChange("loginImageUrl")} onRemove={handleRemoveImage("loginImageUrl")}
          />

          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4, marginTop: 14 }}>{t("saAnDisplayLocation")}</label>
          <select style={inputStyle} value={form.displayLocation} onChange={(e) => setForm({ ...form, displayLocation: e.target.value })} dir={dir}>
            <option value="both">{t("saAnLocBoth")}</option>
            <option value="login">{t("saAnLocLogin")}</option>
            <option value="home">{t("saAnLocHome")}</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.text2, marginTop: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> {t("commonActive")}
          </label>
          {message && <p style={{ fontSize: 11.5, color: THEME.danger, marginTop: 8 }}>{message}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("commonSave")}</button>
            <button type="button" style={{ ...btnStyle(THEME.text3) }} onClick={() => setShowForm(false)}>{t("commonCancel")}</button>
          </div>
        </div>
      )}

      {list === null && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {list !== null && list.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("saAnNoneYet")}</p>}
      {list && list.map((a) => {
        const Icon = ANNOUNCEMENT_ICONS[a.iconKey] || Megaphone;
        return (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "12px 8px", borderBottom: `1px solid ${THEME.border}`, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 220 }}>
              {a.imageUrl ? (
                <img src={a.imageUrl} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <Icon size={16} color={THEME.teal} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.navy }}>{a.title || t("saAnNoTitle")}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: a.isActive ? "#dcfce7" : "#eef1f5", color: a.isActive ? "#166534" : THEME.text3, fontWeight: 600 }}>{a.isActive ? t("commonActive") : t("commonInactive")}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#eef1f5", color: THEME.text3, fontWeight: 600 }}>{t("saPriorityBadge", { label: a.priority })}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#eef1f5", color: THEME.text3, fontWeight: 600 }}>{t("saSecondsN", { n: a.displaySeconds || 10 })}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 600 }}>
                    {{ login: t("saAnLocLoginShort"), home: t("saAnLocHomeShort"), both: t("saAnLocBothShort") }[a.displayLocation || "both"]}
                  </span>
                  <span style={{ fontSize: 10, color: THEME.text3 }}>{a.companyId ? companies.find((c) => c.id === a.companyId)?.name || t("saAnSpecificCompany") : t("saAllCompanies")}</span>
                </div>
                <p style={{ fontSize: 12, color: THEME.text2, margin: "4px 0" }}>{a.message}</p>
                {(a.startsAt || a.endsAt) && (
                  <p style={{ fontSize: 10.5, color: THEME.text3, margin: 0 }}>
                    {t("saAnRange", { from: a.startsAt ? toJalaliSafe(a.startsAt) : t("saAnFromNow"), to: a.endsAt ? toJalaliSafe(a.endsAt) : t("saAnUnlimited") })}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button type="button" style={{ ...btnStyle(THEME.navyMid), fontSize: 11 }} onClick={() => openEdit(a)}>{t("saEdit")}</button>
              <button type="button" style={{ ...btnStyle(a.isActive ? "#92400e" : "#166534"), fontSize: 11 }} onClick={() => handleToggleActive(a)}>{a.isActive ? t("saDisableAction") : t("saEnableAction")}</button>
              <button type="button" style={{ ...btnStyle(THEME.danger), fontSize: 11 }} onClick={() => handleDelete(a)}>{t("saDelete")}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditLogPage({ companies }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState(null);
  useEffect(() => { loadAuditLog(100).then(setRows); }, []);

  const ACTION_LABELS = {
    create_account: t("saActionCreateAccount"), update_account: t("saActionUpdateAccount"), deactivate_account: t("saActionDeactivateAccount"),
    reactivate_account: t("saActionReactivateAccount"), reset_password: t("saActionResetPassword"), change_own_password: t("saActionChangeOwnPassword"),
  };
  const TARGET_LABELS = { admin: "Admin", employer: "Employer", contractor: "Contractor", super_admin: "Super Admin" };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
        <FileClock size={14} color={THEME.teal} /> {t("saAuditLogTitle")}
      </h3>
      <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 12 }}>
        {t("saAuditLogNote")}
      </p>
      {rows === null && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {rows !== null && rows.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("saNoEventsYet")}</p>}
      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColAction")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColAccountType")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTargetUsername")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColPerformedBy")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTime")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{ACTION_LABELS[r.action] || r.action}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{TARGET_LABELS[r.target_type] || r.target_type}</td>
                  <td style={{ padding: "8px", textAlign: "center", direction: "ltr" }}>{r.target_username || "—"}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{r.performed_by} ({TARGET_LABELS[r.performed_by_role] || r.performed_by_role})</td>
                  <td style={{ padding: "8px", textAlign: "center", color: THEME.text3 }}>{toJalaliSafe(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- گزارش‌های خطای کاربران — قابلیت عمومی «گزارش خطا» ----------
// هر کاربر (ادمین/کارفرما/سرپرست HSE/پیمانکار) از هر جای سامانه می‌تواند
// یک خطا را گزارش کند (نگاه کنید به ReportErrorModal در src/shared/) —
// اینجا SuperAdmin همه‌ی گزارش‌های همه‌ی شرکت‌ها را می‌بیند و پیگیری
// (تغییر وضعیت + یادداشت داخلی) می‌کند.
const ERROR_REPORT_STATUS_META = {
  open: { labelKey: "saErStatusOpen", color: "#b45309", bg: "#fef3c7" },
  reviewed: { labelKey: "saErStatusReviewed", color: "#1d4ed8", bg: "#dbeafe" },
  resolved: { labelKey: "saErStatusResolved", color: "#166534", bg: "#dcfce7" },
};
const ERROR_REPORT_ROLE_LABELS = { ADMIN: "saRoleAdmin", EMPLOYER: "saRoleEmployer", HSE_SUPERVISOR: "saRoleHseSupervisor", CONTRACTOR: "saRoleContractor" };

function ErrorReportsPage({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => loadErrorReports(statusFilter).then(setRows);
  useEffect(() => { setRows(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const openRow = (r) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setNoteDraft(r.adminNote || "");
  };

  const handleSetStatus = async (r, status) => {
    setSaving(true);
    const result = await updateErrorReportStatus(r.id, status, noteDraft, currentAdmin?.fullName || currentAdmin?.username);
    setSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setExpandedId(null);
    load();
  };

  const openCount = (rows || []).filter((r) => r.status === "open").length;

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} color="#b45309" /> {t("saErTitle")}
          {openCount > 0 && (
            <span style={{ background: THEME.danger, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, minWidth: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
              {openCount}
            </span>
          )}
        </h3>
        <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} dir={dir}>
          <option value="all">{t("saAllStatuses")}</option>
          <option value="open">{t("saErStatusOpen")}</option>
          <option value="reviewed">{t("saErStatusReviewed")}</option>
          <option value="resolved">{t("saErStatusResolved")}</option>
        </select>
      </div>
      <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 12 }}>
        {t("saErNote")}
      </p>

      {rows === null && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {rows !== null && rows.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("saErNoneFound")}</p>}

      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColCompany")}</th>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saErColReporter")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saErColModulePage")}</th>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saErColDescription")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTime")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("commonStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sm = ERROR_REPORT_STATUS_META[r.status] || ERROR_REPORT_STATUS_META.open;
                return (
                  <React.Fragment key={r.id}>
                    <tr style={{ borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }} onClick={() => openRow(r)}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{r.companyName || "—"}</td>
                      <td style={{ padding: "8px" }}>{r.reportedByName} <span style={{ color: THEME.text3, fontSize: 10.5 }}>({ERROR_REPORT_ROLE_LABELS[r.reportedByRole] ? t(ERROR_REPORT_ROLE_LABELS[r.reportedByRole]) : r.reportedByRole})</span></td>
                      <td style={{ padding: "8px", textAlign: "center", color: THEME.text3 }}>{r.pageLabel || r.moduleKey || "—"}</td>
                      <td style={{ padding: "8px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: THEME.text3, whiteSpace: "nowrap" }}>{toJalaliDateTime(r.createdAt)}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: sm.bg, color: sm.color, fontWeight: 700 }}>{t(sm.labelKey)}</span>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: "10px 12px", background: THEME.bg }}>
                          <p style={{ fontSize: 12.5, color: THEME.text2, margin: "0 0 8px", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{r.description}</p>
                          {(r.technicalMessage || r.technicalStack) && (
                            <pre style={{ whiteSpace: "pre-wrap", fontSize: 10.5, color: "#991b1b", background: "#fee2e2", padding: 10, borderRadius: 8, marginBottom: 8, maxHeight: 160, overflow: "auto", direction: "ltr", textAlign: "left" }}>
                              {r.technicalMessage}{r.technicalStack ? `\n${r.technicalStack}` : ""}
                            </pre>
                          )}
                          {r.userAgent && <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px" }}>{t("saErUserAgent", { ua: r.userAgent })}</p>}
                          <label style={smallLabelStyle}>{t("saErInternalNote")}</label>
                          <textarea style={{ ...inputStyle, minHeight: 60 }} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} dir={dir} />
                          {r.resolvedAt && (
                            <p style={{ fontSize: 10.5, color: THEME.text3, margin: "6px 0" }}>{t("saErResolvedBy", { by: r.resolvedBy || "—", at: toJalaliDateTime(r.resolvedAt) })}</p>
                          )}
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button type="button" style={btnStyle("#1d4ed8")} disabled={saving} onClick={() => handleSetStatus(r, "reviewed")}>{t("saErMarkReviewed")}</button>
                            <button type="button" style={btnStyle("#166534")} disabled={saving} onClick={() => handleSetStatus(r, "resolved")}>{t("saErMarkResolved")}</button>
                            {r.status !== "open" && <button type="button" style={btnStyle(THEME.text3)} disabled={saving} onClick={() => handleSetStatus(r, "open")}>{t("saErReopen")}</button>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- رسیدهای پرداخت کارت‌به‌کارت ----------
// روی همان جدول payments موجود (method='card_transfer') — پرداخت آنلاین
// زرین‌پال جای دیگری (loadOnlinePaymentsForCompany، داخل جزئیات هر
// شرکت) نمایش داده می‌شود و اینجا کاملاً دست‌نخورده می‌ماند.
const CARD_PAYMENT_STATUS_META = {
  awaiting_review: { labelKey: "saCtStatusAwaiting", color: "#b45309", bg: "#fef3c7" },
  paid: { labelKey: "saCtStatusPaid", color: "#166534", bg: "#dcfce7" },
  rejected: { labelKey: "saCtStatusRejected", color: "#b91c1c", bg: "#fee2e2" },
};

function CardTransferSettingsForm({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => loadCardTransferSettings().then(setSettings);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const result = await saveCardTransferSettings(settings, currentAdmin?.fullName || currentAdmin?.username);
    setSaving(false);
    setMessage(result?.__error ? result.message : t("saCtSettingsSaved"));
  };

  if (!settings) return <p style={{ fontSize: 12, color: THEME.text3, padding: 12 }}>{t("commonLoading")}</p>;

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontSize: 13.5, fontWeight: 700, color: THEME.navy, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
        <CreditCard size={14} color={THEME.teal} /> {t("saCtSettingsTitle")}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div>
          <label style={smallLabelStyle}>{t("saCtCardNumber")}</label>
          <input style={{ ...inputStyle, direction: "ltr", textAlign: "left" }} value={settings.cardNumber} onChange={(e) => setSettings({ ...settings, cardNumber: e.target.value })} placeholder="6037-XXXX-XXXX-XXXX" />
        </div>
        <div>
          <label style={smallLabelStyle}>{t("saCtHolderName")}</label>
          <input style={inputStyle} value={settings.holderName} onChange={(e) => setSettings({ ...settings, holderName: e.target.value })} dir={dir} />
        </div>
      </div>
      <label style={smallLabelStyle}>{t("saCtDescription")}</label>
      <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} dir={dir} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button type="button" style={btnStyle()} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("saCtSaveSettings")}</button>
        {message && <span style={{ fontSize: 11.5, color: THEME.text3 }}>{message}</span>}
      </div>
    </div>
  );
}

function CardTransferPaymentsPage({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("awaiting_review");
  const [rows, setRows] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);

  const load = () => loadCardTransferPayments(statusFilter).then(setRows);
  useEffect(() => { setRows(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const handleApprove = async (r) => {
    if (!confirm(t("saCtApproveConfirm", { company: r.companyName }))) return;
    setSaving(true);
    const result = await approveCardTransferPayment(r.id, currentAdmin?.fullName || currentAdmin?.username);
    setSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setExpandedId(null);
    load();
  };

  const handleReject = async (r) => {
    setSaving(true);
    const result = await rejectCardTransferPayment(r.id, currentAdmin?.fullName || currentAdmin?.username, rejectNote);
    setSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setShowRejectFor(null); setRejectNote(""); setExpandedId(null);
    load();
  };

  const awaitingCount = statusFilter === "awaiting_review" ? (rows || []).length : null;

  return (
    <div>
      <CardTransferSettingsForm currentAdmin={currentAdmin} />
      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCard size={14} color={THEME.teal} /> {t("saCtTitle")}
            {awaitingCount > 0 && (
              <span style={{ background: THEME.danger, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, minWidth: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                {awaitingCount}
              </span>
            )}
          </h3>
          <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} dir={dir}>
            <option value="all">{t("saAllStatuses")}</option>
            <option value="awaiting_review">{t("saCtStatusAwaiting")}</option>
            <option value="paid">{t("saCtStatusPaid")}</option>
            <option value="rejected">{t("saCtStatusRejected")}</option>
          </select>
        </div>

        {rows === null && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
        {rows !== null && rows.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("saCtNoneFound")}</p>}

        {rows && rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                  <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColCompany")}</th>
                  <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saCtColPlanPeriod")}</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saCtColAmount")}</th>
                  <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saCtColPayer")}</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTime")}</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("commonStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sm = CARD_PAYMENT_STATUS_META[r.status] || CARD_PAYMENT_STATUS_META.awaiting_review;
                  return (
                    <React.Fragment key={r.id}>
                      <tr style={{ borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{r.companyName || "—"}</td>
                        <td style={{ padding: "8px" }}>{r.planName || "—"} — {r.billingCycle === "monthly" ? t("saBillingMonthly") : t("saBillingYearly")}</td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: THEME.navy }}>{r.amount.toLocaleString(numLocale())}</td>
                        <td style={{ padding: "8px" }}>{r.payerName} <span style={{ color: THEME.text3, fontSize: 10.5, direction: "ltr", display: "inline-block" }}>({r.payerPhone})</span></td>
                        <td style={{ padding: "8px", textAlign: "center", color: THEME.text3, whiteSpace: "nowrap" }}>{toJalaliDateTime(r.createdAt)}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: sm.bg, color: sm.color, fontWeight: 700 }}>{t(sm.labelKey)}</span>
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr>
                          <td colSpan={6} style={{ padding: "10px 12px", background: THEME.bg }}>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
                              <p style={{ fontSize: 12, color: THEME.text2, margin: 0 }}>{t("saCtTrackingNo", { num: r.trackingNumber || "—" })}</p>
                              {r.receiptImage && (
                                <button type="button" style={btnStyle(THEME.navyMid)} onClick={() => setViewerSrc(r.receiptImage)}>{t("saCtViewReceipt")}</button>
                              )}
                            </div>
                            {r.adminNote && <p style={{ fontSize: 11.5, color: "#b91c1c", margin: "0 0 8px" }}>{t("saCtRejectReason", { note: r.adminNote })}</p>}
                            {r.reviewedAt && <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px" }}>{t("saCtReviewedBy", { by: r.reviewedBy || "—", at: toJalaliDateTime(r.reviewedAt) })}</p>}

                            {r.status === "awaiting_review" && (
                              <div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button type="button" style={btnStyle("#166534")} disabled={saving} onClick={() => handleApprove(r)}>{t("saCtApproveActivate")}</button>
                                  <button type="button" style={btnStyle(THEME.danger)} disabled={saving} onClick={() => setShowRejectFor(showRejectFor === r.id ? null : r.id)}>{t("saCtRejectReceipt")}</button>
                                </div>
                                {showRejectFor === r.id && (
                                  <div style={{ marginTop: 8 }}>
                                    <textarea style={{ ...inputStyle, minHeight: 50 }} placeholder={t("saCtRejectReasonPlaceholder")} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} dir={dir} />
                                    <button type="button" style={{ ...btnStyle(THEME.danger), marginTop: 6 }} disabled={saving || !rejectNote.trim()} onClick={() => handleReject(r)}>{t("saCtSubmitReject")}</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}
    </div>
  );
}

// ---------- درخواست‌های ارزیابی و پلن آزمایشی ----------
// از فرم عمومیِ صفحه‌ی ورود (TrialRequestModal.jsx → Edge Function
// submit-trial-request) می‌آید. تأیید اینجا فقط تصمیم + مدت پلن آزمایشی
// انتخابی را ثبت می‌کند؛ ساخت واقعی شرکت/حساب کاربری همچنان از همان
// مسیر موجود «شرکت‌ها» به‌صورت دستی انجام می‌شود (طبق طراحی صریح — نگاه
// کنید به کامنت بالای این توابع در superAdminApi.js).
const TRIAL_REQUEST_STATUS_META = {
  pending: { labelKey: "saTrStatusPending", color: "#b45309", bg: "#fef3c7" },
  approved: { labelKey: "saTrStatusApproved", color: "#166534", bg: "#dcfce7" },
  rejected: { labelKey: "saTrStatusRejected", color: "#b91c1c", bg: "#fee2e2" },
};

function TrialRequestsPage({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rows, setRows] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [trialDaysDraft, setTrialDaysDraft] = useState("14");
  const [noteDraft, setNoteDraft] = useState("");
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => loadTrialRequests(statusFilter).then(setRows);
  useEffect(() => { setRows(null); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const openRow = (r) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    setTrialDaysDraft("14");
    setNoteDraft("");
    setShowRejectFor(null);
  };

  const handleApprove = async (r) => {
    setSaving(true);
    const result = await approveTrialRequest(r.id, trialDaysDraft, currentAdmin?.fullName || currentAdmin?.username, noteDraft);
    setSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setExpandedId(null);
    load();
  };

  const handleReject = async (r) => {
    setSaving(true);
    const result = await rejectTrialRequest(r.id, currentAdmin?.fullName || currentAdmin?.username, noteDraft);
    setSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setShowRejectFor(null); setExpandedId(null);
    load();
  };

  const pendingCount = statusFilter === "pending" ? (rows || []).length : null;

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <ClipboardList size={14} color={THEME.teal} /> {t("saNavTrialRequests")}
          {pendingCount > 0 && (
            <span style={{ background: THEME.danger, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, minWidth: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
              {pendingCount}
            </span>
          )}
        </h3>
        <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} dir={dir}>
          <option value="all">{t("saAllStatuses")}</option>
          <option value="pending">{t("saTrStatusPending")}</option>
          <option value="approved">{t("saTrStatusApproved")}</option>
          <option value="rejected">{t("saTrStatusRejected")}</option>
        </select>
      </div>
      <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 12 }}>
        {t("saTrNote")}
      </p>

      {rows === null && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {rows !== null && rows.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("saTrNoneFound")}</p>}

      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saTrColCompany")}</th>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saTrColApplicant")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saTrColPersonnelCount")}</th>
                <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saTrColProjectCity")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTime")}</th>
                <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("commonStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sm = TRIAL_REQUEST_STATUS_META[r.status] || TRIAL_REQUEST_STATUS_META.pending;
                return (
                  <React.Fragment key={r.id}>
                    <tr style={{ borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }} onClick={() => openRow(r)}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{r.companyName}</td>
                      <td style={{ padding: "8px" }}>
                        {r.fullName}{r.position && <span style={{ color: THEME.text3, fontSize: 10.5 }}> — {r.position}</span>}
                        <div style={{ fontSize: 10.5, color: THEME.text3, direction: "ltr", textAlign: "start" }}>{r.phone}</div>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>{r.personnelCount != null ? r.personnelCount.toLocaleString(numLocale()) : "—"}</td>
                      <td style={{ padding: "8px", color: THEME.text3 }}>{r.projectName || "—"}{r.projectCity && ` — ${r.projectCity}`}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: THEME.text3, whiteSpace: "nowrap" }}>{toJalaliDateTime(r.createdAt)}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: sm.bg, color: sm.color, fontWeight: 700 }}>{t(sm.labelKey)}</span>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: "10px 12px", background: THEME.bg }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6, marginBottom: 10, fontSize: 12, color: THEME.text2 }}>
                            <p style={{ margin: 0 }}>{t("saTrIndustry")}<b>{r.industry || "—"}</b></p>
                            <p style={{ margin: 0 }}>{t("saTrEmailLabel")}<b style={{ direction: "ltr", display: "inline-block" }}>{r.email || "—"}</b></p>
                            <p style={{ margin: 0, gridColumn: "1 / -1" }}>
                              {t("saTrDesiredModules")}<b>{r.desiredModules.length > 0 ? r.desiredModules.map(trialModuleLabel).join(listSep(getCurrentLang())) : "—"}</b>
                            </p>
                          </div>
                          {r.description && <p style={{ fontSize: 12, color: THEME.text2, lineHeight: 1.8, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{t("saTrDescriptionLabel", { desc: r.description })}</p>}
                          {r.adminNote && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 8px" }}>{t("saTrReviewNote", { note: r.adminNote })}</p>}
                          {r.status === "approved" && <p style={{ fontSize: 11.5, color: "#166534", margin: "0 0 8px", fontWeight: 700 }}>{t("saTrApprovedDays", { days: r.approvedTrialDays })}</p>}
                          {r.reviewedAt && <p style={{ fontSize: 10.5, color: THEME.text3, margin: "0 0 8px" }}>{t("saTrReviewedBy", { by: r.reviewedBy || "—", at: toJalaliDateTime(r.reviewedAt) })}</p>}

                          {r.status === "pending" && (
                            <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                                <label style={{ fontSize: 11.5, color: THEME.text2 }}>{t("saTrTrialDays")}</label>
                                <input type="number" min="1" style={{ ...inputStyle, width: 80 }} value={trialDaysDraft} onChange={(e) => setTrialDaysDraft(e.target.value)} />
                              </div>
                              <textarea style={{ ...inputStyle, minHeight: 45, marginBottom: 8 }} placeholder={t("saTrNotePlaceholder")} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} dir={dir} />
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button type="button" style={btnStyle("#166534")} disabled={saving || !trialDaysDraft} onClick={() => handleApprove(r)}>{t("saTrApprove")}</button>
                                <button type="button" style={btnStyle(THEME.danger)} disabled={saving || !noteDraft.trim()} onClick={() => handleReject(r)}>{t("saTrReject")}</button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SuperAdminChangePassword({ onClose }) {
  const { t } = useLanguage();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!oldPassword || !newPassword) { setError(t("saCpBothRequired")); return; }
    if (newPassword.length < 8) { setError(t("errPasswordMin8")); return; }
    if (newPassword !== confirmPassword) { setError(t("saCpMismatch")); return; }
    setSaving(true);
    const result = await changeMyPassword(oldPassword, newPassword, "super_admin");
    setSaving(false);
    if (result?.error) { setError(result.message); return; }
    setDone(true);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setTimeout(() => { setDone(false); onClose(); }, 2000);
  };

  return (
    <div style={{ background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, padding: 16 }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 10px" }}>{t("saChangeMyPasswordTitle")}</h4>
        {done ? (
          <p style={{ color: "#166534", fontSize: 12.5 }}>{t("saPasswordChanged")}</p>
        ) : (
          <>
            <input type="password" style={{ ...inputStyle, marginBottom: 8 }} placeholder={t("saCurrentPassword")} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} dir="ltr" />
            <input type="password" style={{ ...inputStyle, marginBottom: 8 }} placeholder={t("saNewPasswordMin8")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" />
            <input type="password" style={{ ...inputStyle, marginBottom: 8 }} placeholder={t("saConfirmNewPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" />
            {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button type="button" onClick={handleSubmit} disabled={saving} style={btnStyle()}>{saving ? t("saSavingEllipsis") : t("saSubmitNewPassword")}</button>
          </>
        )}
      </div>
    </div>
  );
}

function PlansManager({ plans, companies, currentAdmin, onChanged }) {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState(emptyPlanForm());
  const [saving, setSaving] = useState(false);

  function emptyPlanForm() {
    return { name: "", description: "", priceMonthly: 0, priceYearly: 0, priceTotal: 0, trialDays: "", maxUsers: "", maxPersonnel: "", maxStorageMb: "", features: [] };
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await createPlan({
      name: form.name.trim(), description: form.description.trim(),
      priceMonthly: Number(form.priceMonthly) || 0, priceYearly: Number(form.priceYearly) || 0, priceTotal: Number(form.priceTotal) || 0,
      trialDays: form.trialDays ? Number(form.trialDays) : null,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null, maxPersonnel: form.maxPersonnel ? Number(form.maxPersonnel) : null,
      maxStorageMb: form.maxStorageMb ? Number(form.maxStorageMb) : null, features: form.features,
    });
    await syncNotificationTypesWithPlans((await loadPlans()).map((p) => p.features));
    setSaving(false);
    setForm(emptyPlanForm());
    setShowCreate(false);
    onChanged();
  };

  const openEdit = (p) => {
    setExpandedId(expandedId === p.id ? null : p.id);
    setForm({ name: p.name, description: p.description ?? "", priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, priceTotal: p.priceTotal ?? 0, trialDays: p.trialDays ?? "", maxUsers: p.maxUsers ?? "", maxPersonnel: p.maxPersonnel ?? "", maxStorageMb: p.maxStorageMb ?? "", features: p.features });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    await updatePlan(id, {
      name: form.name.trim(), description: form.description.trim(),
      priceMonthly: Number(form.priceMonthly) || 0, priceYearly: Number(form.priceYearly) || 0, priceTotal: Number(form.priceTotal) || 0,
      trialDays: form.trialDays ? Number(form.trialDays) : null,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null, maxPersonnel: form.maxPersonnel ? Number(form.maxPersonnel) : null,
      maxStorageMb: form.maxStorageMb ? Number(form.maxStorageMb) : null, features: form.features,
    });
    await syncNotificationTypesWithPlans((await loadPlans()).map((p) => p.features));
    setSaving(false);
    setExpandedId(null);
    onChanged();
  };

  const toggleModule = (mod) => {
    setForm((prev) => {
      const subKeys = (mod.sub || []).map((s) => s.key);
      const isOn = prev.features.includes(mod.key);
      if (isOn) {
        // خاموش‌کردن ماژول: خودش و همه‌ی زیرماژول‌هایش حذف می‌شوند
        return { ...prev, features: prev.features.filter((f) => f !== mod.key && !subKeys.includes(f)) };
      }
      // روشن‌کردن ماژول: خودش و همه‌ی زیرماژول‌هایش اضافه می‌شوند
      return { ...prev, features: [...new Set([...prev.features, mod.key, ...subKeys])] };
    });
  };

  const toggleSub = (mod, subKey) => {
    setForm((prev) => {
      const has = prev.features.includes(subKey);
      let features = has ? prev.features.filter((f) => f !== subKey) : [...prev.features, subKey];
      return { ...prev, features };
    });
  };

  return (
    <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={14} color={THEME.teal} /> {t("saSubscriptionPlans")}
        </h3>
        <button type="button" onClick={() => { setShowCreate((v) => !v); setForm(emptyPlanForm()); }} style={{ ...btnStyle(), display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> {t("saNewPlan")}
        </button>
      </div>

      {showCreate && <PlanForm form={form} setForm={setForm} toggleModule={toggleModule} toggleSub={toggleSub} onSave={handleCreate} saving={saving} saveLabel={t("saSubmitPlan")} />}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColOrder")}</th>
              <th style={{ textAlign: "start", padding: "6px 8px" }}>{t("saColPlanName")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColMonthlyPrice")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColYearlyPrice")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColTotalPrice")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColUserCap")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColPersonnelCap")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("saColStorageCapMb")}</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>{t("commonStatus")}</th>
              <th style={{ padding: "6px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {plans.map((p, idx) => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: `1px solid ${THEME.border}`, opacity: p.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => movePlan(plans, p.id, "up").then(onChanged)} disabled={idx === 0} style={{ ...btnStyle(THEME.navyMid), fontSize: 10, padding: "3px 7px", opacity: idx === 0 ? 0.3 : 1, marginInlineEnd: 3 }} title={t("saMoveUp")}>▲</button>
                    <button type="button" onClick={() => movePlan(plans, p.id, "down").then(onChanged)} disabled={idx === plans.length - 1} style={{ ...btnStyle(THEME.navyMid), fontSize: 10, padding: "3px 7px", opacity: idx === plans.length - 1 ? 0.3 : 1 }} title={t("saMoveDown")}>▼</button>
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.priceMonthly.toLocaleString(numLocale())}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.priceYearly.toLocaleString(numLocale())}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.priceTotal ? p.priceTotal.toLocaleString(numLocale()) : "—"}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.maxUsers ?? t("saUnlimited")}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.maxPersonnel ?? t("saUnlimited")}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.maxStorageMb ?? t("saUnlimited")}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: p.isActive ? "#dcfce7" : "#eef1f5", color: p.isActive ? "#166534" : "#5b6b7d", fontWeight: 600 }}>
                      {p.isActive ? t("commonActive") : t("commonInactive")}
                    </span>
                  </td>
                  <td style={{ padding: "8px", textAlign: "left", whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => openEdit(p)} style={{ ...btnStyle(THEME.navyMid), fontSize: 11, marginInlineEnd: 6 }}>
                      {expandedId === p.id ? t("saClose") : t("saEdit")}
                    </button>
                    {p.isActive ? (
                      <button type="button" onClick={() => { if (confirm(t("saDeactivateConfirm", { name: p.name }))) { deactivatePlan(p.id).then(onChanged); } }} style={{ ...btnStyle("#92400e"), fontSize: 11, marginInlineEnd: 6 }}>
                        {t("saDeactivate")}
                      </button>
                    ) : (
                      <button type="button" onClick={() => { activatePlan(p.id).then(onChanged); }} style={{ ...btnStyle("#166534"), fontSize: 11, marginInlineEnd: 6 }}>
                        {t("saActivatePlan")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(t("saDeletePlanConfirm", { name: p.name }))) return;
                        const result = await deletePlan(p.id);
                        if (result?.__error) { alert(result.message); return; }
                        onChanged();
                      }}
                      style={{ ...btnStyle(THEME.danger), fontSize: 11 }}
                    >
                      {t("saDelete")}
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colSpan={10} style={{ padding: "0 8px 8px" }}>
                    <PlanCompanyUsage plan={p} companies={companies} />
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <PlanForm form={form} setForm={setForm} toggleModule={toggleModule} toggleSub={toggleSub} onSave={() => handleSaveEdit(p.id)} saving={saving} saveLabel={t("saSaveChanges")} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: THEME.text3 }}>{t("saNoPlansYet")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanCompanyUsage({ plan, companies }) {
  const { t } = useLanguage();
  const usingCompanies = (companies || []).filter((c) => c.planId === plan.id);
  if (usingCompanies.length === 0) {
    return <p style={{ fontSize: 11, color: THEME.text3, margin: 0 }}>{t("saPcuNone")}</p>;
  }
  return (
    <div style={{ background: THEME.bg, borderRadius: 8, padding: "8px 10px" }}>
      <p style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, margin: "0 0 6px" }}>
        {t("saPcuHeader", { count: usingCompanies.length.toLocaleString(numLocale()) })}
      </p>
      {usingCompanies.map((c) => {
        const isTrial = c.subscriptionType === "trial";
        const now = new Date();
        const relevantEnd = isTrial ? c.trialEnd : c.subscriptionEndDate;
        const isExpired = relevantEnd ? new Date(relevantEnd).getTime() <= now.getTime() : false;
        return (
          <div key={c.id} style={{ fontSize: 11, color: THEME.text2, padding: "4px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: THEME.navy }}>{c.name}</span>
            <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, background: isTrial ? "#ede9fe" : "#dbeafe", color: isTrial ? "#5b21b6" : "#1d4ed8", fontWeight: 600 }}>
              {isTrial ? t("saPcuTrial") : t("saPcuPaid")}
            </span>
            {isTrial && c.trialStart && c.trialEnd ? (
              <span>{t("saFromTo", { start: toJalaliDateTime(c.trialStart), end: toJalaliDateTime(c.trialEnd) })}</span>
            ) : relevantEnd ? (
              <span>{t("saUntilDate", { end: toJalaliDateTime(relevantEnd) })}</span>
            ) : (
              <span style={{ color: THEME.text3 }}>{t("saPcuNoEndDate")}</span>
            )}
            {relevantEnd && (
              <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, background: isExpired ? "#fee2e2" : "#dcfce7", color: isExpired ? "#991b1b" : "#166534", fontWeight: 600 }}>
                {isExpired ? t("saExpiredStatus") : t("commonActive")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlanForm({ form, setForm, toggleModule, toggleSub, onSave, saving, saveLabel }) {
  const { t, dir } = useLanguage();
  return (
    <div style={{ background: THEME.bg, padding: 14, borderRadius: 8, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saPlanName")}</label>
          <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} dir={dir} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saMonthlyPriceToman")}</label>
          <input type="number" style={inputStyle} value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saYearlyPriceToman")}</label>
          <input type="number" style={inputStyle} value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: e.target.value })} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saPfPriceTotal")}</label>
          <input type="number" style={inputStyle} value={form.priceTotal} onChange={(e) => setForm({ ...form, priceTotal: e.target.value })} dir="ltr" placeholder={t("saPfZeroNone")} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saPfTrialDays")}</label>
          <input type="number" style={inputStyle} value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} dir="ltr" placeholder={t("saPfEg7")} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saUserCapEmptyUnlimited")}</label>
          <input type="number" style={inputStyle} value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saPersonnelCapEmptyUnlimited")}</label>
          <input type="number" style={inputStyle} value={form.maxPersonnel} onChange={(e) => setForm({ ...form, maxPersonnel: e.target.value })} dir="ltr" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saStorageCapEmptyUnlimited")}</label>
          <input type="number" style={inputStyle} value={form.maxStorageMb} onChange={(e) => setForm({ ...form, maxStorageMb: e.target.value })} dir="ltr" />
        </div>
      </div>
      <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saPfDescription")}</label>
      <textarea
        style={{ ...inputStyle, minHeight: 60, resize: "vertical", marginBottom: 12 }}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        dir={dir}
        placeholder={t("saPfDescPlaceholder")}
      />
      <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 6 }}>{t("saActiveModulesLabel")}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, background: THEME.surface, borderRadius: 8, padding: 10 }}>
        {PLAN_FEATURES.map((mod) => (
          <div key={mod.key} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: 6, marginBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.navy, fontWeight: 700, cursor: "pointer" }}>
              <input type="checkbox" checked={form.features.includes(mod.key)} onChange={() => toggleModule(mod)} />
              {mod.labelKey ? t(mod.labelKey) : mod.label}
            </label>
            {mod.sub && form.features.includes(mod.key) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, paddingInlineStart: 22 }}>
                {mod.sub.map((s) => (
                  <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: THEME.text2, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.features.includes(s.key)} onChange={() => toggleSub(mod, s.key)} />
                    {s.labelKey ? t(s.labelKey) : s.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={onSave} disabled={saving} style={btnStyle()}>{saving ? t("saSavingEllipsis") : saveLabel}</button>
    </div>
  );
}

function UsageChip({ label, value }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
      <span style={{ color: THEME.text3 }}>{label}: </span>
      <b style={{ color: THEME.navy }}>{value.toLocaleString(numLocale())}</b>
    </div>
  );
}

function SystemInsights({ companies }) {
  const { t } = useLanguage();
  const [recentLogins, setRecentLogins] = useState([]);
  const [recentFailedLogins, setRecentFailedLogins] = useState([]);
  const [inactiveCompanies, setInactiveCompanies] = useState([]);
  const [companyPayments, setCompanyPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (companies.length === 0) return;
    Promise.all([loadRecentLogins(15), loadRecentFailedLogins(15), computeInactiveCompanies(companies, 30)]).then(
      ([logins, failed, inactive]) => {
        setRecentLogins(logins);
        setRecentFailedLogins(failed);
        setInactiveCompanies(inactive);
        setLoading(false);
      }
    );
    // پرداخت‌های همه‌ی شرکت‌ها — برای محاسبه‌ی مانده‌حساب/معوق در «هشدار پرداخت»
    Promise.all(companies.map((c) => loadCompanyPayments(c.id).then((rows) => [c.id, rows]))).then((pairs) => {
      const map = {};
      pairs.forEach(([id, rows]) => { map[id] = rows; });
      setCompanyPayments(map);
      setPaymentsLoading(false);
    });
  }, [companies]);

  const companyName = (id) => companies.find((c) => c.id === id)?.name || "—";

  const subscriptionAlerts = companies
    .map((c) => ({ company: c, tier: computeSubscriptionAlertTier(c.subscriptionEndDate) }))
    .filter((x) => x.tier);

  const paymentAlerts = companies
    .map((c) => {
      const payments = companyPayments[c.id] || [];
      const status = computePaymentStatus(c.finalAmount, payments);
      const overdue = isPaymentOverdue(c, status);
      return { company: c, status, overdue };
    })
    .filter((x) => x.status.remaining > 0);

  // طبق خواسته‌ی صریح: چون مبلغ ماهانه باید مستمر پرداخت شود، اگر برای
  // ماه جاری هنوز پرداخت ماهانه ثبت نشده، همین‌جا آلارم داده شود.
  const monthlyPaymentAlerts = companies
    .map((c) => ({ company: c, alarm: computeMonthlyPaymentAlarm(c, companyPayments[c.id] || []) }))
    .filter((x) => x.alarm && x.alarm.overdue);

  return (
    <>
      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingDown size={14} color={THEME.teal} /> {t("saSmartAnalysis")}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>{t("saSubscriptionAlertTitle")}</p>
            {subscriptionAlerts.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoneFound")}</p>}
            {subscriptionAlerts.map(({ company: c, tier }) => (
              <div key={c.id} style={{ fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between" }}>
                <span>{c.name}{t("saExpiryLabel", { date: toJalaliSafe(c.subscriptionEndDate) })}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: tier.bg, color: tier.color, fontWeight: 600 }}>{tier.labelKey ? t(tier.labelKey) : tier.label}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>{t("saLowActivityCompanies")}</p>
            {loading && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saChecking")}</p>}
            {!loading && inactiveCompanies.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoneFound")}</p>}
            {!loading && inactiveCompanies.map((c) => (
              <div key={c.id} style={{ fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>{c.name}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={14} color={THEME.teal} /> {t("saPaymentAlertTitle")}
        </h3>
        {paymentsLoading && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saChecking")}</p>}
        {!paymentsLoading && paymentAlerts.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoOutstandingCompanies")}</p>}
        {!paymentsLoading && paymentAlerts.map(({ company: c, status, overdue }) => (
          <div key={c.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{c.name}{t("saRemainingLabelToman", { amount: status.remaining.toLocaleString(numLocale()) })}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: status.bg, color: status.color, fontWeight: 600 }}>{status.labelKey ? t(status.labelKey) : status.label}</span>
              {overdue && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>{t("saOverdue")}</span>}
            </span>
          </div>
        ))}
      </div>

      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={14} color={THEME.teal} /> {t("saMonthlyAlarmTitle")}
        </h3>
        <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 10, lineHeight: 1.8 }}>
          {t("saMonthlyAlarmNote")}
        </p>
        {paymentsLoading && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saChecking")}</p>}
        {!paymentsLoading && monthlyPaymentAlerts.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saAllUpToDate")}</p>}
        {!paymentsLoading && monthlyPaymentAlerts.map(({ company: c, alarm }) => (
          <div key={c.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{c.name}</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: alarm.bg, color: alarm.color, fontWeight: 600 }}>{alarm.labelKey ? t(alarm.labelKey) : alarm.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: THEME.surface, borderRadius: 10, border: `1px solid ${THEME.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={14} color={THEME.teal} /> {t("saSystemMonitoring")}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: THEME.text2, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <LogIn size={12} /> {t("saRecentLogins")}
            </p>
            {loading && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("commonLoading")}</p>}
            {!loading && recentLogins.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoRecordsYet")}</p>}
            {recentLogins.map((r) => (
              <div key={r.id} style={{ fontSize: 11.5, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
                {r.full_name || r.username} — {companyName(r.company_id)} — {toJalaliSafe(r.created_at)}
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldX size={12} /> {t("saRecentFailedLogins")}
            </p>
            {loading && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("commonLoading")}</p>}
            {!loading && recentFailedLogins.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoRecordsYet")}</p>}
            {recentFailedLogins.map((r) => (
              <div key={r.id} style={{ fontSize: 11.5, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
                {r.username} — {companyName(r.company_id)} — {toJalaliSafe(r.created_at)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ flex: "1 1 140px", padding: "12px 16px", borderInlineEnd: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || THEME.navy }}>{value}</div>
      <div style={{ fontSize: 11, color: THEME.text3, marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}


function CompanyManagePanel({ company, companies, plans, currentAdmin, usageStats, onUpdate, onDelete, onSetActive, paymentsPromise, onAddPayment, onPlanChanged }) {
  const { t, dir } = useLanguage();
  const [status, setStatus] = useState(company.subscriptionStatus);
  const [quotaInput, setQuotaInput] = useState(company.storageQuotaMb);
  const [paymentsList, setPaymentsList] = useState([]);
  const [onlinePayments, setOnlinePayments] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(company.planId || "");
  const [planNote, setPlanNote] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [assignType, setAssignType] = useState(company.subscriptionType || "monthly");
  const [assignDays, setAssignDays] = useState(company.subscriptionDays || "");
  const [discountInput, setDiscountInput] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const [copyingBowties, setCopyingBowties] = useState(false);
  const [copyingKnowledge, setCopyingKnowledge] = useState(false);
  const [copyResult, setCopyResult] = useState("");
  const [copyErr, setCopyErr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [payType, setPayType] = useState("monthly");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [payNote, setPayNote] = useState("");

  const loadAccounts = () => loadCompanyUserAccounts(company.id).then(setAccounts);
  useEffect(() => { loadAccounts(); }, [company.id]);

  useEffect(() => {
    if (paymentsPromise) paymentsPromise.then(setPaymentsList);
  }, [paymentsPromise]);

  useEffect(() => { loadOnlinePaymentsForCompany(company.id).then(setOnlinePayments); }, [company.id]);

  const currentPlan = plans.find((p) => p.id === company.planId);
  const selectedPlanForAssign = plans.find((p) => p.id === selectedPlanId);
  // پیش‌نمایش زنده‌ی مبلغ قرارداد — قبل از ذخیره، همین که پلن/نوع/روز عوض بشه
  const previewContractAmount = computeContractAmount(selectedPlanForAssign, assignType, assignDays);
  const previewMonthlyRecurring = computeMonthlyRecurringAmount(selectedPlanForAssign, assignType);
  const previewFinalAmount = Math.max(0, previewContractAmount - (Number(discountInput) || 0));

  // وضعیت پرداخت و هشدار پایان اشتراک — کاملاً محاسبه‌شده، مستقل از هم
  const paymentStatus = computePaymentStatus(company.finalAmount, paymentsList);
  const overdue = isPaymentOverdue(company, paymentStatus);
  const liveAccess = computeSubscriptionAccess(company);
  const monthlyAlarm = computeMonthlyPaymentAlarm(company, paymentsList);

  const handleAssignPlan = async () => {
    if (!selectedPlanId) return;
    setPlanSaving(true);
    const result = await assignPlanToCompany(company.id, selectedPlanId, "assigned", currentAdmin?.fullName, planNote.trim(), assignType, assignDays, discountInput);
    setPlanSaving(false);
    if (result?.__error) { alert(result.message); return; }
    setPlanNote("");
    onPlanChanged();
  };

  const toggleHistory = async () => {
    if (!showHistory) setHistory(await loadCompanySubscriptionHistory(company.id));
    setShowHistory((v) => !v);
  };

  const handleCopyBowties = async () => {
    if (!copySourceId) return;
    setCopyingBowties(true);
    setCopyResult("");
    const result = await copyBowtiesToCompany(copySourceId, company.id);
    setCopyingBowties(false);
    if (result?.__error) { setCopyErr(true); setCopyResult(t("saErrorPrefix", { message: result.message })); return; }
    setCopyErr(false);
    setCopyResult(t("saCopyBowtieSuccess", { count: result.count }));
  };

  const handleCopyKnowledge = async () => {
    if (!copySourceId) return;
    setCopyingKnowledge(true);
    setCopyResult("");
    const result = await copyRiskKnowledgeToCompany(copySourceId, company.id);
    setCopyingKnowledge(false);
    if (result?.__error) { setCopyErr(true); setCopyResult(t("saErrorPrefix", { message: result.message })); return; }
    setCopyErr(false);
    setCopyResult(t("saCopyKnowledgeSuccess", { count: result.count }));
  };

  return (
    <div style={{ background: THEME.bg, padding: 16, borderTop: `2px solid ${THEME.teal}` }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <UsageChip label={t("saPersonnelLabel")} value={usageStats?.personnelByCompany?.[company.id] || 0} />
        <UsageChip label={t("saAnomalyLabel")} value={usageStats?.anomalyByCompany?.[company.id] || 0} />
        <UsageChip label={t("saFileAttachmentLabel")} value={usageStats?.attachmentByCompany?.[company.id] || 0} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* غیرفعال‌سازی: برای شرکتی که مثلاً پولشو نداده — کاملاً برگشت‌پذیر,
            هیچ داده‌ای پاک نمی‌شود، فقط ورود مسدود می‌شود */}
        {status !== "disabled" ? (
          <button type="button" style={btnStyle("#92400e")} onClick={() => { onSetActive(false); setStatus("disabled"); }}>
            {t("saDeactivateCompany")}
          </button>
        ) : (
          <button type="button" style={btnStyle("#166534")} onClick={() => { onSetActive(true); setStatus("active"); }}>
            {t("saReactivateCompany")}
          </button>
        )}
        {/* حذف کامل: برای شرکتی که کلاً انصراف داده — برگشت‌ناپذیر، همه‌ی
            داده‌های وابسته (پرسنل، آنومالی، BowTie و...) هم پاک می‌شوند */}
        <button type="button" style={btnStyle(THEME.danger)} onClick={() => { setShowDeleteConfirm((v) => !v); setDeleteConfirmInput(""); }}>
          {t("saDeleteCompanyFull")}
        </button>
      </div>

      {showDeleteConfirm && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#991b1b", fontWeight: 600, marginBottom: 6 }}>
            {t("saDeleteWarning")}
          </p>
          <p style={{ fontSize: 11.5, color: "#7f1d1d", marginBottom: 8 }}>
            {t("saTypeToConfirm")} <b>{company.name}</b>
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...inputStyle, width: 220 }} value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} dir={dir} />
            <button
              type="button" style={{ ...btnStyle(THEME.danger), opacity: deleteConfirmInput === company.name ? 1 : 0.5 }}
              disabled={deleteConfirmInput !== company.name || deleting}
              onClick={async () => { setDeleting(true); await onDelete(deleteConfirmInput); setDeleting(false); setShowDeleteConfirm(false); }}
            >
              {deleting ? t("saDeletingEllipsis") : t("saFinalDelete")}
            </button>
          </div>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginBottom: 16 }}>
        <h4 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={13} /> {t("saCompanyPlanSub")}
        </h4>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 8 }}>
          {t("saCurrentPlanLabel")} <b style={{ color: THEME.navy }}>{currentPlan ? currentPlan.name : t("saNoPlanAssigned")}</b>
          <span style={{
            marginInlineStart: 8, fontSize: 10.5, padding: "2px 9px", borderRadius: 999, fontWeight: 600,
            background: liveAccess.isLocked ? "#fee2e2" : "#dcfce7", color: liveAccess.isLocked ? "#991b1b" : "#166534",
          }}>
            {t("saStatusLabel", { label: liveAccess.labelKey ? t(liveAccess.labelKey) : liveAccess.label })}
          </span>
        </p>
        {(liveAccess.trialStart || liveAccess.subscriptionStartDate) && (
          <p style={{ fontSize: 12, color: THEME.navy, fontWeight: 600, marginBottom: 8, background: THEME.bg, borderRadius: 8, padding: "8px 12px" }}>
            {liveAccess.trialStart ? (
              <>{t("saTrialStartLabel")}<b>{toJalaliDateTime(liveAccess.trialStart)}</b>{t("saEndLabelSep")}<b>{liveAccess.trialEnd ? toJalaliDateTime(liveAccess.trialEnd) : "—"}</b></>
            ) : (
              <>{t("saSubStartLabel")}<b>{liveAccess.subscriptionStartDate ? toJalaliDateTime(liveAccess.subscriptionStartDate) : t("saNotRecorded")}</b>{t("saEndLabelSep")}<b>{liveAccess.subscriptionEndDate ? toJalaliDateTime(liveAccess.subscriptionEndDate) : "—"}</b></>
            )}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 8 }}>
          <select style={inputStyle} value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} dir={dir}>
            <option value="">{t("saSelectPlanPlaceholder")}</option>
            {plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={inputStyle} value={assignType} onChange={(e) => setAssignType(e.target.value)} dir={dir}>
            {SUBSCRIPTION_TYPES.filter((st) => {
              if (!selectedPlanForAssign) return true; // پلنی هنوز انتخاب نشده — همه‌ی گزینه‌ها را نشان بده
              if (st.value === "monthly") return selectedPlanForAssign.priceMonthly > 0;
              if (st.value === "yearly") return selectedPlanForAssign.priceYearly > 0;
              if (st.value === "monthly_and_yearly") return selectedPlanForAssign.priceMonthly > 0 && selectedPlanForAssign.priceYearly > 0;
              return true; // روزانه/آزمایشی/دائمی همیشه در دسترس‌اند
            }).map((st) => <option key={st.value} value={st.value}>{t(st.labelKey)}</option>)}
          </select>
          {assignType === "daily" && (
            <input type="number" style={inputStyle} placeholder={t("saDayCountPlaceholder")} value={assignDays} onChange={(e) => setAssignDays(e.target.value)} dir="ltr" />
          )}
          <input type="number" style={inputStyle} placeholder={t("saDiscountTomanOptional")} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} dir="ltr" />
          <input style={inputStyle} placeholder={t("saNoteOptional")} value={planNote} onChange={(e) => setPlanNote(e.target.value)} dir={dir} />
        </div>

        {selectedPlanForAssign && (
          <div style={{ background: THEME.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 11.5, color: THEME.text2, lineHeight: 1.9 }}>
            <div>{t("saPlanMonthlyYearlyPrice", { monthly: (selectedPlanForAssign.priceMonthly || 0).toLocaleString(numLocale()), yearly: (selectedPlanForAssign.priceYearly || 0).toLocaleString(numLocale()) })}</div>
            {(assignType === "monthly" || assignType === "yearly" || assignType === "daily" || assignType === "monthly_and_yearly") && (
              <div>
                {t("saPreviewBasedOnSelection")}
                {previewContractAmount > 0 && t("saOneTimeContractAmount", { amount: previewContractAmount.toLocaleString(numLocale()) })}
                {previewContractAmount > 0 && Number(discountInput) > 0 && t("saWithDiscount", { amount: previewFinalAmount.toLocaleString(numLocale()) })}
                {previewMonthlyRecurring > 0 && <><br />{t("saMonthlyRecurringAmount", { amount: previewMonthlyRecurring.toLocaleString(numLocale()) })}</>}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: THEME.text2, fontWeight: 600, display: "block", marginBottom: 4 }}>{t("saStorageCapMb")}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" style={{ ...inputStyle, maxWidth: 160 }} value={quotaInput} onChange={(e) => setQuotaInput(e.target.value)} dir="ltr" />
            <button type="button" style={btnStyle(THEME.navyMid)} onClick={() => onUpdate({ storageQuotaMb: Number(quotaInput) })}>{t("saSaveStorageCap")}</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" style={btnStyle()} onClick={handleAssignPlan} disabled={planSaving || !selectedPlanId}>
            {planSaving ? t("saSubmittingEllipsis") : t("saSubmitPlanAndContract")}
          </button>
          <button type="button" onClick={toggleHistory} style={{ ...btnStyle(THEME.navyMid), display: "flex", alignItems: "center", gap: 6 }}>
            <History size={13} /> {showHistory ? t("saHideHistory") : t("saSubscriptionHistory")}
          </button>
        </div>

        {/* وضعیت مالی فعلی — ذخیره‌شده در دیتابیس، نه فقط پیش‌نمایش لحظه‌ای */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 12 }}>
          <MiniStat label={t("saOneTimeContract")} value={t("saTShort", { amount: company.contractAmount.toLocaleString(numLocale()) })} />
          <MiniStat label={t("saDiscount")} value={t("saTShort", { amount: company.discountAmount.toLocaleString(numLocale()) })} />
          <MiniStat label={t("saFinalOneTimeAmount")} value={t("saTShort", { amount: company.finalAmount.toLocaleString(numLocale()) })} />
          {company.monthlyRecurringAmount > 0 && <MiniStat label={t("saMonthlyRecurring")} value={t("saTShort", { amount: company.monthlyRecurringAmount.toLocaleString(numLocale()) })} color="#1d4ed8" />}
          <MiniStat label={t("saTotalPaid")} value={t("saTShort", { amount: paymentStatus.totalPaid.toLocaleString(numLocale()) })} color="#166534" />
          <MiniStat label={t("saRemainingBalance")} value={t("saTShort", { amount: paymentStatus.remaining.toLocaleString(numLocale()) })} color={paymentStatus.remaining > 0 ? "#b91c1c" : "#166534"} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: paymentStatus.bg, color: paymentStatus.color, fontWeight: 600 }}>
            {t("saPaymentStatusLabel", { label: paymentStatus.labelKey ? t(paymentStatus.labelKey) : paymentStatus.label })}
          </span>
          {overdue && (
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>
              {t("saOverdue")}
            </span>
          )}
          {monthlyAlarm && (
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: monthlyAlarm.bg, color: monthlyAlarm.color, fontWeight: 600 }}>
              {monthlyAlarm.labelKey ? t(monthlyAlarm.labelKey) : monthlyAlarm.label}
            </span>
          )}
        </div>

        {showHistory && (
          <div style={{ marginTop: 10, background: THEME.surface, borderRadius: 8, padding: 10 }}>
            {history.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>{t("saNoHistoryYet")}</p>}
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 11, color: THEME.text2, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
                {toJalaliSafe(h.changed_at)} — <b>{h.action}</b> {h.note && `— ${h.note}`} {h.changed_by && <span style={{ color: THEME.text3 }}>{t("saByUser", { name: h.changed_by })}</span>}
                {h.final_amount != null && <span style={{ color: THEME.text3 }}>{t("saFinalAmountLabel", { amount: Number(h.final_amount).toLocaleString(numLocale()) })}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginBottom: 16 }}>
        <h4 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <Copy size={13} /> {t("saCopyReadyContent")}
        </h4>
        <p style={{ fontSize: 11, color: THEME.text3, marginBottom: 8, lineHeight: 1.8 }}>
          {t("saCopyContentNote", { name: company.name })}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select style={{ ...inputStyle, minWidth: 180 }} value={copySourceId} onChange={(e) => setCopySourceId(e.target.value)} dir={dir}>
            <option value="">{t("saSelectSourceCompany")}</option>
            {companies.filter((c) => c.id !== company.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={handleCopyBowties} disabled={!copySourceId || copyingBowties} style={btnStyle(THEME.navyMid)}>
            {copyingBowties ? t("saCopyingEllipsis") : t("saCopyBowtieModels")}
          </button>
          <button type="button" onClick={handleCopyKnowledge} disabled={!copySourceId || copyingKnowledge} style={btnStyle(THEME.navyMid)}>
            {copyingKnowledge ? t("saCopyingEllipsis") : t("saCopyKnowledgeBank")}
          </button>
        </div>
        {copyResult && <p style={{ fontSize: 11.5, color: copyErr ? THEME.danger : "#166534", marginTop: 8 }}>{copyResult}</p>}
      </div>

      {/* شاخص‌های Proactive HSE دیگر اینجا کنترل نمی‌شوند — طبق خواسته‌ی
          صریح، فقط از طریق «ماژول‌ها و زیرماژول‌های فعال» همان پلن تخصیص‌یافته
          کنترل می‌شوند (نگاه کنید به loadActiveIndicators در proactiveIndicatorsApi.js) */}

      <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginBottom: 16 }}>
        <h4 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <UserPlus size={13} /> {t("saCompanyAccountsTitle")}
        </h4>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 8 }}>
          {t("saAccountsNote")}
        </p>
        {accounts.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoAccountsYet")}</p>}
        {accounts.map((a) => (
          <div key={`${a.type}-${a.id}`} style={{ fontSize: 11.5, color: THEME.text2, padding: "4px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{a.name}</span>
            <span style={{ direction: "ltr" }}>({a.username})</span>
            <span style={{ marginInlineStart: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 999, background: a.type === "contractor" ? "#e0e7ff" : "#dcfce7", color: a.type === "contractor" ? "#3730a3" : "#166534" }}>
              {a.type === "contractor" ? t("saRoleContractor") : a.role === "admin" ? t("saRoleAdmin") : a.role === "hse_supervisor" ? t("saRoleHseSupervisorFull") : t("saRoleEmployer")}
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
        <h4 style={{ fontSize: 12.5, color: THEME.navy, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={13} /> {t("saPaymentHistoryTitle")}
        </h4>
        {paymentsList.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("saNoPaymentsYet")}</p>}
        {paymentsList.map((p) => (
          <div key={p.id} style={{ fontSize: 11.5, color: THEME.text2, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
            {toJalaliSafe(p.payment_date)} — <b>{p.amount?.toLocaleString(numLocale())}</b> {t("saTomanUnit")}
            {" "}({(() => { const pt = PAYMENT_TYPES.find((x) => x.value === p.payment_type); return pt ? t(pt.labelKey) : p.payment_type; })()})
            {p.tracking_number && <span style={{ color: THEME.text3 }}>{t("saTracking", { num: p.tracking_number })}</span>}
            {p.note && <span style={{ color: THEME.text3 }}> — {p.note}</span>}
          </div>
        ))}

        {onlinePayments.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px dashed ${THEME.border}` }}>
            <h5 style={{ fontSize: 11.5, color: THEME.navy, fontWeight: 700, margin: "0 0 6px" }}>{t("saOnlinePaymentsZarinpal")}</h5>
            {onlinePayments.map((p) => {
              const st = p.status === "paid" ? { labelKey: "saPaySuccess", bg: "#dcfce7", color: "#166534" }
                : p.status === "failed" ? { labelKey: "saPayFailed", bg: "#fee2e2", color: "#991b1b" }
                : p.status === "cancelled" ? { labelKey: "saPayCancelled", bg: "#eef1f5", color: THEME.text3 }
                : { labelKey: "saPayPending", bg: "#fef3c7", color: "#92400e" };
              return (
                <div key={p.id} style={{ fontSize: 11.5, color: THEME.text2, padding: "5px 0", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{toJalaliSafe(p.createdAt)}</span>
                  <b>{t("saTomanAmount", { amount: p.amount.toLocaleString(numLocale()) })}</b>
                  <span>({p.billingCycle === "monthly" ? t("saBillingMonthly") : t("saBillingYearly")})</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: st.bg, color: st.color, fontWeight: 600 }}>{t(st.labelKey)}</span>
                  {p.refId && <span style={{ color: THEME.text3 }}>{t("saTrackingCode", { ref: p.refId })}</span>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 10 }}>
          <input type="number" style={inputStyle} placeholder={t("saAmountToman")} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} dir="ltr" />
          <select style={inputStyle} value={payType} onChange={(e) => setPayType(e.target.value)} dir={dir}>
            {PAYMENT_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>)}
          </select>
          <input style={inputStyle} placeholder={t("saTrackingNumberOptional")} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} dir="ltr" />
          <input style={inputStyle} placeholder={t("saDescOptional")} value={payNote} onChange={(e) => setPayNote(e.target.value)} dir={dir} />
        </div>
        <button
          type="button" style={{ ...btnStyle(), marginTop: 8 }}
          onClick={() => { onAddPayment(payAmount, payType, trackingNumber, payNote); setPayAmount(""); setTrackingNumber(""); setPayNote(""); }}
          disabled={!payAmount}
        >
          {t("saRecordPayment")}
        </button>
      </div>
    </div>
  );
}
