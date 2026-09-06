import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, X, ChevronRight, ChevronLeft, ChevronDown, ChevronsRight, ChevronsLeft, LogOut, CheckCircle2, Clock, Camera, ImagePlus, Trash2, FileSpreadsheet, FileText, User, Users, ShieldCheck, LayoutGrid, BarChart3, Briefcase, Settings, Archive, Truck, Tag, MessageCircle, GraduationCap, ShieldOff, ShieldAlert, Database, Fingerprint, Info, Sliders, TrendingUp, Search, Home, Megaphone, Sparkles, Gift, Bell, ArrowUpRight, ClipboardList } from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import BowTieDashboard from "./bowtie/BowTieDashboard.jsx";
import HcmsDashboard from "./hcms/HcmsDashboard.jsx";
import HcmsMatrixManager from "./hcms/HcmsMatrixManager.jsx";
import RiskKnowledgeManager from "./riskknowledge/RiskKnowledgeManager.jsx";
import AnomalyCategoryManager from "./anomalycategories/AnomalyCategoryManager.jsx";
import { loadActiveAnomalyCategories } from "./anomalycategories/anomalyCategoriesApi.js";
import { getOrCreateHcmsForAnomaly, createSuggestedHcmsFromAnomaly } from "./hcms/hcmsApi.js";
import { loadBowtiesForLinking, loadBarriersForBowtie, linkAnomalyToBarriers, loadBarrierLinksForAnomaly } from "./bowtie/anomalyBarrierLinksApi.js";
import { recalculateForLinkedBarriers, loadDegradedBarrierAlerts } from "./bowtie/effectivenessApi.js";
import PersonnelForm from "./personnel/PersonnelForm.jsx";
import PersonnelDashboard from "./personnel/PersonnelDashboard.jsx";
import ProactiveIndicatorsDashboard from "./proactiveIndicators/ProactiveIndicatorsDashboard.jsx";
import IncidentsListPage from "./incidents/IncidentsListPage.jsx";
import { loadHomeKpiSummary } from "./dashboard/homeKpiApi.js";
import { loadModuleConfig, loadDashboardConfig, loadNotificationTypes, loadAppearanceConfig, applyAppearanceToDom, loadActiveAnnouncements } from "./systemConfigApi.js";
import { submitToGate, loadPendingGateItems, loadAssignedGateItems, loadAssignedReviewItemsForModule, deleteGateItemsForRecord, loadCompanyStaffOptions, assignForReview, submitReview, approveGateItem, rejectGateItem, GATE_STATUS_LABELS, gateStatusLabel } from "./hseGateApi.js";
import SubscriptionGate from "./subscription/SubscriptionGate.jsx";
import { checkMyAccountActive } from "./subscriptionApi.js";
import { AppearanceProvider, useAppearance } from "./shared/AppearanceContext.jsx";
import PublicHseClimateSurvey from "./proactiveIndicators/PublicHseClimateSurvey.jsx";
import HomeDashboard from "./dashboard/HomeDashboard.jsx";
import PermissionManager from "./permissions/PermissionManager.jsx";
import { loadPermissionsMap, isModuleVisible, getAccessLevel, initializeNoAccess } from "./permissions/permissionsApi.js";
import JobPositionManager from "./jobpositions/JobPositionManager.jsx";
import { loadActiveJobPositions, loadJobPositionTitle } from "./jobpositions/jobPositionsApi.js";
import NotificationPanel from "./personnel/NotificationPanel.jsx";
import { loadNotifications, loadPersonnelList, checkAndUpdateDeadlines, markNotificationRead } from "./personnel/personnelApi.js";
import OnlineIndicator from "./offline/OnlineIndicator.jsx";
import { isOnline, subscribeNetworkStatus } from "./offline/networkStatus.js";
import { offlineWrite, offlineWriteFile } from "./offline/offlineWrite.js";
import DbSizeWarningBanner from "./offline/DbSizeWarningBanner.jsx";
import { checkUploadAllowed } from "./offline/dbSizeMonitor.js";
import ArchiveManager from "./offline/ArchiveManager.jsx";
import CorrectiveActionsDashboard from "./correctiveActions/CorrectiveActionsDashboard.jsx";
import EffectivenessThresholdsManager from "./bowtie/EffectivenessThresholdsManager.jsx";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext.jsx";
import { translate, getCurrentLang } from "./i18n/translations.js";

// برای کدِ سطحِ ماژول (خارج از کامپوننت) که به Hook دسترسی ندارد
const tr = (key, params) => translate(getCurrentLang(), key, params);
import {
  isBiometricAvailable, isBiometricEnabledFor, getBiometricEnabledUsername,
  enableBiometricLogin, disableBiometricLogin,
  verifyBiometricAndGetCredentials,
} from "./biometricAuth.js";
import { checkLoginLockout, recordLoginAttempt, validatePasswordLength, MIN_PASSWORD_LENGTH } from "./loginSecurity.js";
import { useAndroidBackButton } from "./backButtonHandler.js";
import { issueSessionToken, clearSessionToken, changeMyPassword } from "./sessionToken.js";
import AdminAnalytics from "./admin/AdminAnalytics.jsx";
import ChatDashboard from "./chat/ChatDashboard.jsx";
import TrainingManager from "./training/TrainingManager.jsx";
import ChatAccessManager from "./chat/ChatAccessManager.jsx";
import { loadUnreadTotal } from "./chat/chatApi.js";
import ChatThread from "./chat/ChatThread.jsx";
import { findOrCreateLinkedConversation, resolveContractorUsername } from "./chat/chatApi.js";
import { trackLogin, trackLogout, trackPageView, trackFailedLogin } from "./admin/activityApi.js";
import SuperAdminLogin from "./superadmin/SuperAdminLogin.jsx";
import SuperAdminPanel from "./superadmin/SuperAdminPanel.jsx";
import DataView, { StatusPill } from "./shared/DataView.jsx";
import ReportErrorModal from "./shared/ReportErrorModal.jsx";
import TrialRequestModal from "./TrialRequestModal.jsx";
import MachineryDashboard from "./machinery/MachineryDashboard.jsx";
import { loadMachineryListOfflineFirst } from "./machinery/machineryApi.js";
import ScaffoldDashboard from "./scaffold/ScaffoldDashboard.jsx";
import ScaffoldTagCodeManager from "./scaffold/ScaffoldTagCodeManager.jsx";
import { syncOfflineCacheCompanyScope } from "./offline/offlineDb.js";
import { getRecordsByModule, putRecord, getQueue } from "./offline/offlineDb.js";
import SyncStatusBadge from "./offline/SyncStatusBadge.jsx";
import { retryItemNow } from "./offline/syncEngine.js";
import { exportWorkbookNativeAware, exportHtmlReportNativeAware } from "./offline/nativeFile.js";
import { saveBlobNativeAware } from "./offline/archiveZip.js";
import { toJalaliDateTime, toJalaliSafe } from "./personnel/jalaliDate.jsx";
import { APP_NAME, sb, sbOk, sbErrMsg, uid, todayISO, THEME, styles, usePersistedState, setCurrentCompanyId, getCurrentCompanyId, loadCurrentCompanyPlanFeatures, isModuleInPlan, resizeImageFile } from "./shared.js";

/**
 * اپلیکیشن کارفرما / پیمانکار / ادمین + ماژول ثبت و پیگیری آنومالی HSE
 * داده‌ها روی دیتابیس واقعی Supabase (Postgres) ذخیره می‌شوند تا مستقل از artifact و پایدار بمانند.
 */

// ---------- نوع نقش‌ها ----------
// Role: "ADMIN" | "EMPLOYER" | "CONTRACTOR"

const SEED_USERS = [
  { id: "admin-1", username: "admin", password: "Admin@123", role: "ADMIN" },
  { id: "emp-1", username: "karfarma", password: "1234", role: "EMPLOYER" },
];

const RISK_LEVELS = [
  { value: "High", labelKey: "riskLevelHigh", color: "#c92a2a", bg: "#fee2e2" },
  { value: "Med", labelKey: "riskLevelMed", color: "#d97706", bg: "#fef3c7" },
  { value: "Low", labelKey: "riskLevelLow", color: "#16a34a", bg: "#dcfce7" },
];

const ANOMALY_FORMATS = [
  { value: "بازرسی", labelKey: "anomFormatInspection" },
  { value: "مدیریت تغییر", labelKey: "anomFormatMoc" },
  { value: "عوامل زیان‌آور محیط کار", labelKey: "anomFormatOccHazards" },
  { value: "ممیزی", labelKey: "anomFormatAudit" },
  { value: "معاینات ادواری", labelKey: "anomFormatPeriodicExam" },
  { value: "گزارش روزانه", labelKey: "anomFormatDailyReport" },
  { value: "سایر", labelKey: "anomFormatOther" },
];


// ترتیب ماژول‌های سامانه IHMS طبق نقشه‌ی راه پروژه.
// فقط "مدیریت عدم انطباق‌ها (Anomaly Report)" و "ایجاد حساب کاربری" فعلاً پیاده‌سازی شده‌اند؛
// بقیه به‌عنوان جای‌نگه‌دار (Placeholder) نمایش داده می‌شوند تا در فازهای بعدی توسعه یابند.
const HSE_MODULES = [
  { key: "chat", label: "چت", labelKey: "moduleChat" },
  { key: "archiveManagement", label: "آرشیو فایل‌ها", labelKey: "moduleArchive" },
  {
    key: "anomalyReport",
    label: "مدیریت عدم انطباق‌ها",
    labelKey: "moduleAnomalyReport",
    icon: true,
    sub: [
      { key: "anomalyForm", label: "ثبت آنومالی", labelKey: "subAnomalyForm", employerOnly: true },
      { key: "anomalyList", label: "لیست آنومالی‌ها", labelKey: "subAnomalyList" },
      { key: "correctiveActionsList", label: "لیست اقدامات اصلاحی", labelKey: "subCorrectiveActionsList" },
    ],
  },
  {
    key: "riskAssessment",
    label: "مدیریت ارزیابی ریسک",
    labelKey: "moduleRiskAssessment",
    icon: true,
    sub: [
      { key: "bowtieDashboard", label: "BowTie Risk Analysis", labelKey: "subBowtie" },
      { key: "hcmsDashboard", label: "HCMS - سیستم مدیریت و کنترل خطرات", labelKey: "subHcms" },
      { key: "riskKnowledgeManagement", label: "بانک اطلاعاتی ارزیابی ریسک", labelKey: "subRiskKnowledge", employerOnly: true },
    ],
  },
  {
    key: "personnelAccess",
    label: "مدیریت ورود و تردد پرسنل",
    labelKey: "modulePersonnelAccess",
    icon: true,
    sub: [
      { key: "personnelDashboard", label: "لیست پرسنل", labelKey: "subPersonnelList" },
      { key: "personnelForm", label: "ثبت پرسنل جدید", labelKey: "subPersonnelForm" },
    ],
  },
  {
    key: "proactiveIndicators",
    label: "اندازه‌گیری شاخص‌های Proactive HSE",
    labelKey: "moduleProactiveIndicators",
    icon: true,
  },
  {
    key: "incidentManagement",
    label: "مدیریت حوادث",
    labelKey: "moduleIncidentManagement",
    icon: true,
    sub: [
      { key: "incidentsList", label: "فهرست حوادث", labelKey: "subIncidentsList" },
    ],
  },
  {
    key: "machineryManagement",
    label: "مدیریت ماشین‌آلات",
    labelKey: "moduleMachinery",
    icon: true,
    sub: [
      { key: "machineryDashboard", label: "لیست ماشین‌آلات", labelKey: "subMachineryList" },
    ],
  },
  {
    key: "scaffoldManagement",
    label: "مدیریت داربست",
    labelKey: "moduleScaffold",
    icon: true,
    sub: [
      { key: "scaffoldDashboard", label: "لیست تگ داربست", labelKey: "subScaffoldList" },
    ],
  },
  {
    key: "managementDashboard",
    label: "داشبورد مدیریتی و گزارش‌های تحلیلی",
    labelKey: "moduleManagementDashboard",
    icon: true,
  },
];

// ---------- لایه ذخیره‌سازی (Supabase REST API) ----------
// sb / sbOk / sbErrMsg اکنون در shared.js تعریف شده‌اند تا هم App.jsx و هم
// ماژول‌های فرعی (مثل bowtie/) بدون وابستگی حلقوی به آن‌ها دسترسی داشته باشند.

// حساب‌های ادمین و کارفرما ثابت هستند و مستقل از دیتابیس بررسی می‌شوند
// تا در صورت هر مشکلی در اتصال، ورود این دو نقش همیشه کار کند.
// دیتابیس فقط حساب‌های پیمانکار (که توسط ادمین/کارفرما ساخته می‌شوند) را نگه می‌دارد.
function contractorFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    contactPersonName: r.contact_person_name || "",
    startDate: r.start_date || "",
    contractDetails: r.contract_details || "",
    username: r.username || "",
    password: r.password || "",
    jobPositionId: r.job_position_id || "",
    jobPositionTitle: r.job_positions?.title || "",
    role: "CONTRACTOR",
    companyId: r.company_id || "",
    phone: r.phone || "",
    email: r.email || "",
    preferredLanguage: r.preferred_language || "fa",
    createdAt: r.created_at || "",
  };
}

// ---------- به‌روزرسانی خودسرویس پروفایل (فقط موبایل/ایمیل) ----------
// عمداً یک تابع کاملاً جدا از updateEmployerAccountDB/updateContractorDB —
// تا حتی در آینده هم هیچ مسیری از خودِ کاربر به فیلدهای دیگر (نام، سمت،
// نقش) که فقط ادمین باید تغییرشان بدهد، باز نماند.
async function updateMyProfile(role, id, patch) {
  const table = role === "CONTRACTOR" ? "contractors" : "employer_accounts";
  const dbPatch = {};
  if ("phone" in patch) dbPatch.phone = patch.phone;
  if ("email" in patch) dbPatch.email = patch.email;
  if ("preferredLanguage" in patch) dbPatch.preferred_language = patch.preferredLanguage;
  const rows = await sb(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dbPatch) });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return rows[0];
}

async function loadMyLastLogin(username) {
  if (!username) return null;
  const rows = await sb(`user_activity?username=eq.${encodeURIComponent(username)}&event_type=eq.login&select=created_at&order=created_at.desc&limit=2`);
  // ردیف اول همین ورودِ فعلیه؛ دومی رو می‌خوایم («آخرین ورود» یعنی نشست قبلی)
  if (!sbOk(rows) || rows.length < 2) return null;
  return rows[1].created_at;
}

async function loadMyCompanyName(companyId) {
  if (!companyId) return "";
  const rows = await sb(`companies?id=eq.${companyId}&select=name`);
  return sbOk(rows) && rows.length > 0 ? rows[0].name : "";
}

async function loadContractors() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`contractors?select=*,job_positions(title)&order=name.asc${filter}`);
  return (sbOk(rows) ? rows : []).map(contractorFromRow);
}
async function insertContractor(rec) {
  const rows = await sb("contractors", {
    method: "POST",
    body: JSON.stringify([{ name: rec.name, contact_person_name: rec.contactPersonName || "", start_date: rec.startDate || null, contract_details: rec.contractDetails, username: rec.username, password: rec.password, job_position_id: rec.jobPositionId || null, company_id: getCurrentCompanyId() }]),
  });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return contractorFromRow(rows[0]);
}
async function updateContractorDB(id, patch) {
  const dbPatch = {};
  if ("name" in patch) dbPatch.name = patch.name;
  if ("contactPersonName" in patch) dbPatch.contact_person_name = patch.contactPersonName;
  if ("startDate" in patch) dbPatch.start_date = patch.startDate || null;
  if ("contractDetails" in patch) dbPatch.contract_details = patch.contractDetails;
  if ("username" in patch) dbPatch.username = patch.username;
  if ("password" in patch) dbPatch.password = patch.password;
  if ("jobPositionId" in patch) dbPatch.job_position_id = patch.jobPositionId || null;
  const rows = await sb(`contractors?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dbPatch) });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return contractorFromRow(rows[0]);
}
async function deleteContractorDB(id) {
  await sb(`contractors?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

// ---------- حساب‌های کارفرما/همکاران (ایجادشده توسط ادمین، با سطح دسترسی قابل‌تنظیم) ----------
function employerAccountFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    companyName: r.company_name || "",
    username: r.username,
    password: r.password,
    canEdit: r.can_edit !== false,
    jobPositionId: r.job_position_id || "",
    jobPositionTitle: r.job_positions?.title || "",
    role: r.role === "admin" ? "ADMIN" : "EMPLOYER",
    companyId: r.company_id || "",
    phone: r.phone || "",
    email: r.email || "",
    preferredLanguage: r.preferred_language || "fa",
    createdAt: r.created_at || "",
  };
}

async function loadEmployerAccounts() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`employer_accounts?select=*,job_positions(title)&order=name.asc${filter}`);
  return (sbOk(rows) ? rows : []).map(employerAccountFromRow);
}
async function insertEmployerAccount(rec) {
  const rows = await sb("employer_accounts", {
    method: "POST",
    body: JSON.stringify([{ name: rec.name, company_name: rec.companyName || "", username: rec.username, password: rec.password, can_edit: rec.canEdit, job_position_id: rec.jobPositionId || null, company_id: getCurrentCompanyId(), role: "employer" }]),
  });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return employerAccountFromRow(rows[0]);
}
async function updateEmployerAccountDB(id, patch) {
  const dbPatch = {};
  if ("name" in patch) dbPatch.name = patch.name;
  if ("companyName" in patch) dbPatch.company_name = patch.companyName;
  if ("username" in patch) dbPatch.username = patch.username;
  if ("password" in patch) dbPatch.password = patch.password;
  if ("canEdit" in patch) dbPatch.can_edit = patch.canEdit;
  if ("jobPositionId" in patch) dbPatch.job_position_id = patch.jobPositionId || null;
  const rows = await sb(`employer_accounts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dbPatch) });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return employerAccountFromRow(rows[0]);
}
async function deleteEmployerAccountDB(id) {
  await sb(`employer_accounts?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function anomalyFromRow(r) {
  return {
    id: r.id,
    trackingNumber: r.tracking_number || "",
    project: r.project || "",
    contractor: r.contractor || "",
    subContractor: r.sub_contractor || "",
    area: r.area || "",
    date: r.date || "",
    time: r.time || "",
    riskLevel: r.risk_level || "Med",
    category: r.category || "",
    format: r.format || "",
    description: r.description || "",
    correctiveAction: r.corrective_action || "",
    obstacles: r.obstacles || "",
    follower: r.follower || "",
    sender: r.sender || "",
    status: r.status || "open",
    closeDate: r.close_date || "",
    effectiveness: r.effectiveness || "",
    photoCount: r.photo_count || 0,
    contractorAction: r.contractor_action || "",
    reviewNote: r.review_note || "",
    createdAt: r.created_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

// نگاشت رکورد اپ به شکل ردیف دیتابیس (برای insert)
function anomalyRecordToDb(record) {
  return {
    id: record.id,
    tracking_number: record.trackingNumber,
    project: record.project,
    contractor: record.contractor,
    sub_contractor: record.subContractor,
    area: record.area,
    date: record.date || null,
    time: record.time,
    risk_level: record.riskLevel,
    category: record.category,
    format: record.format,
    description: record.description,
    corrective_action: record.correctiveAction,
    obstacles: record.obstacles,
    follower: record.follower,
    sender: record.sender,
    status: record.status,
    close_date: record.closeDate || null,
    effectiveness: record.effectiveness,
    photo_count: record.photoCount,
    company_id: getCurrentCompanyId(),
  };
}

// نگاشت patch اپ به شکل patch دیتابیس (برای update)
function anomalyPatchToDb(patch) {
  const dbPatch = {};
  if ("correctiveAction" in patch) dbPatch.corrective_action = patch.correctiveAction;
  if ("obstacles" in patch) dbPatch.obstacles = patch.obstacles;
  if ("follower" in patch) dbPatch.follower = patch.follower;
  if ("status" in patch) dbPatch.status = patch.status;
  if ("closeDate" in patch) dbPatch.close_date = patch.closeDate || null;
  if ("effectiveness" in patch) dbPatch.effectiveness = patch.effectiveness;
  if ("photoCount" in patch) dbPatch.photo_count = patch.photoCount;
  if ("contractorAction" in patch) dbPatch.contractor_action = patch.contractorAction;
  if ("reviewNote" in patch) dbPatch.review_note = patch.reviewNote;
  return dbPatch;
}

async function loadAnomalies() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`anomalies?select=*&order=created_at.desc${filter}`);
  return (sbOk(rows) ? rows : []).map(anomalyFromRow);
}

/**
 * Offline-first loader: online → fetch from Supabase, refresh the local
 * cache for next time we're offline, and merge in anything created locally
 * that hasn't synced yet. Offline → read purely from the local cache.
 */
async function loadAnomaliesOfflineFirst() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  if (isOnline()) {
    const rows = await sb(`anomalies?select=*&order=created_at.desc${filter}`);
    if (sbOk(rows)) {
      // نوشتن/خواندن کش محلی (IndexedDB) نباید کل بارگذاری را خراب کند —
      // اگر به هر دلیلی (Private Browsing، پر شدن Quota) خطا بدهد، دست‌کم
      // داده‌ی تازه‌ی سرور نمایش داده شود، نه اینکه صفحه برای همیشه روی
      // «در حال بارگذاری» بماند (چون load() بالادست این تابع را await
      // می‌کند و بدون catch، خطا یعنی setLoading(false) هرگز اجرا نشود).
      try {
        for (const r of rows) await putRecord("anomalies", r.id, r, "synced");
        const cached = await getRecordsByModule("anomalies");
        const serverIds = new Set(rows.map((r) => r.id));
        const localOnly = cached.filter((c) => c.syncStatus !== "synced" && !serverIds.has(c.id) && !c.data?.deleted);
        return [
          ...localOnly.map((c) => anomalyFromRow({ ...c.data, __syncStatus: c.syncStatus })),
          ...rows.map((r) => anomalyFromRow({ ...r, __syncStatus: "synced" })),
        ];
      } catch (e) {
        console.error("همگام‌سازی کش محلی آنومالی‌ها ناموفق بود", e);
        return rows.map((r) => anomalyFromRow({ ...r, __syncStatus: "synced" }));
      }
    }
  }
  // آفلاین یا خطای شبکه → فقط از حافظه‌ی محلی بخوان
  const cached = await getRecordsByModule("anomalies");
  return cached.filter((c) => !c.data?.deleted).map((c) => anomalyFromRow({ ...c.data, __syncStatus: c.syncStatus }));
}



/**
 * Smart, live-computed notifications — NOT stored anywhere, recalculated
 * fresh every time from current personnel/anomaly data. Unlike the SLA
 * deadline notifications above (discrete events that need explicit
 * dismissal), these are just current counts: as soon as the underlying
 * condition changes (an anomaly gets closed, a document gets uploaded),
 * the number changes or the line disappears on its own — nothing to mark
 * read, nothing to clean up.
 *
 * `scopeContractorName`: pass the contractor's own name for a
 * contractor-scoped summary (3 items max). Omit it for the employer view,
 * which gets one line per (contractor, category) — matching how a real
 * manager wants to see it broken down.
 */
function computeSmartNotifications(personnelList, anomaliesList, scopeContractorName) {
  const norm = (s) => (s || "").trim().toLowerCase();
  const displayName = (s) => (s || "").trim(); // برای نمایش، بدون lowercase (فارسی رو تغییر نمی‌ده، ولی برای وضوح جداست)
  const scopeNorm = scopeContractorName ? norm(scopeContractorName) : null;

  const contractorNames = scopeContractorName
    ? [{ norm: scopeNorm, display: displayName(scopeContractorName) }]
    : Object.values(
        [...anomaliesList.map((a) => a.contractor), ...personnelList.map((p) => p.contractorName)]
          .filter(Boolean)
          .reduce((acc, raw) => {
            const key = norm(raw);
            if (key && !acc[key]) acc[key] = { norm: key, display: displayName(raw) };
            return acc;
          }, {})
      ).sort((a, b) => a.display.localeCompare(b.display, "fa"));

  const items = [];
  for (const { norm: name, display } of contractorNames) {
    const openAnomalies = anomaliesList.filter((a) => norm(a.contractor) === name && a.status !== "Closed").length;
    const contractorPersonnel = personnelList.filter((p) => norm(p.contractorName) === name);
    const needVisit = contractorPersonnel.filter((p) => p.status === "pending_health_visit").length;
    const needResult = contractorPersonnel.filter((p) => p.status === "pending_health_result").length;
    // فیلتر پرسنل بر اساس contractorId واقعیه، نه اسم — شناسه رو از یکی از
    // رکوردهای همین پیمانکار برمی‌داریم (هر رکوردی که داشته باشد کافی است).
    const contractorId = contractorPersonnel.find((p) => p.contractorId)?.contractorId || null;

    if (openAnomalies > 0) {
      items.push({
        key: `smart-${name}-anomaly`,
        label: scopeContractorName ? tr("smartAnomOpenSelf", { count: openAnomalies }) : tr("smartAnomOpenCompany", { name: display, count: openAnomalies }),
        target: { module: "anomaly", statusFilter: "not_closed", contractorFilter: display },
      });
    }
    if (needVisit > 0) {
      items.push({
        key: `smart-${name}-visit`,
        label: scopeContractorName ? tr("smartVisitSelf", { count: needVisit }) : tr("smartVisitCompany", { name: display, count: needVisit }),
        target: { module: "personnel", statusFilter: "pending_health_visit", contractorFilter: contractorId || "all" },
      });
    }
    if (needResult > 0) {
      items.push({
        key: `smart-${name}-result`,
        label: scopeContractorName ? tr("smartResultSelf", { count: needResult }) : tr("smartResultCompany", { name: display, count: needResult }),
        target: { module: "personnel", statusFilter: "pending_health_result", contractorFilter: contractorId || "all" },
      });
    }
  }
  return items;
}

/**
 * Same live-computed philosophy for the Machinery module — no stored
 * events, just current counts recalculated fresh every time. For the
 * employer, "pending review" and "expiring documents" are the two things
 * that actually need attention; for the contractor, expiring documents and
 * anything sent back (rejected/needs_correction) matter.
 */
function computeMachinerySmartItems(machineryList, scopeContractorName, warningDays = MACHINERY_EXPIRY_WARNING_DAYS) {
  const norm = (s) => (s || "").trim().toLowerCase();
  const displayName = (s) => (s || "").trim();

  const contractorNames = scopeContractorName
    ? [{ norm: norm(scopeContractorName), display: displayName(scopeContractorName) }]
    : Object.values(
        machineryList.map((m) => m.contractorName).filter(Boolean).reduce((acc, raw) => {
          const key = norm(raw);
          if (key && !acc[key]) acc[key] = { norm: key, display: displayName(raw) };
          return acc;
        }, {})
      ).sort((a, b) => a.display.localeCompare(b.display, "fa"));

  const items = [];
  for (const { norm: name, display } of contractorNames) {
    const mine = machineryList.filter((m) => norm(m.contractorName) === name);
    const contractorId = mine.find((m) => m.contractorId)?.contractorId || null;

    const pendingReview = mine.filter((m) => m.approvalStatus === "pending").length;
    const needsAttention = mine.filter((m) => m.approvalStatus === "rejected" || m.approvalStatus === "needs_correction").length;
    const expiring = mine.filter((m) => {
      const insD = daysUntilIso(m.insuranceExpiry);
      const inspD = daysUntilIso(m.inspectionExpiry);
      return (insD !== null && insD <= warningDays) || (inspD !== null && inspD <= warningDays);
    }).length;

    if (scopeContractorName) {
      if (expiring > 0) {
        items.push({
          key: `machine-${name}-expiring`,
          label: tr("smartMachExpiringSelf", { count: expiring }),
          target: { module: "machinery", approvalFilter: "all" },
        });
      }
      if (needsAttention > 0) {
        items.push({
          key: `machine-${name}-attention`,
          label: tr("smartMachAttentionSelf", { count: needsAttention }),
          target: { module: "machinery", approvalFilter: "needs_correction" },
        });
      }
    } else {
      if (pendingReview > 0) {
        items.push({
          key: `machine-${name}-pending`,
          label: tr("smartMachPendingCompany", { name: display, count: pendingReview }),
          target: { module: "machinery", approvalFilter: "pending", contractorFilter: contractorId || "all" },
        });
      }
      if (expiring > 0) {
        items.push({
          key: `machine-${name}-expiring`,
          label: tr("smartMachExpiringCompany", { name: display, count: expiring }),
          target: { module: "machinery", approvalFilter: "all", contractorFilter: contractorId || "all" },
        });
      }
    }
  }
  return items;
}

function daysUntilIso(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (isNaN(target.getTime())) return null;
  const today = new Date(todayISO());
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}
const MACHINERY_EXPIRY_WARNING_DAYS = 30;

// طبقه‌بندی هر آیتم زنده‌محاسبه‌شده‌ی اعلان به یکی از انواع رجیستری
// system_notification_types — فقط بر اساس pattern کلید، بدون هیچ تغییری
// در خودِ منطق محاسبه (computeSmartNotifications و بقیه). کلید ناشناخته
// یعنی این تابع/فاز هنوز نوعش را نمی‌شناسد؛ چنین آیتمی همیشه نمایش داده
// می‌شود (fail-open) تا هیچ اعلان واقعی به‌اشتباه پنهان نشود.
function classifyNotificationKey(key) {
  if (key.endsWith("-anomaly")) return "anomaly_open";
  if (key.endsWith("-visit")) return "personnel_health_visit";
  if (key.endsWith("-result")) return "personnel_health_result";
  if (key.endsWith("-expiring")) return "machinery_expiring";
  if (key.endsWith("-attention")) return "machinery_needs_correction";
  if (key.endsWith("-pending")) return "machinery_pending_review";
  if (key.startsWith("barrier-eff-")) return "barrier_effectiveness";
  return null;
}

// اعمال پیکربندی سامانه (فعال/غیرفعال، گیرنده) روی لیست خام اعلان‌ها، و
// مرتب‌سازی بر اساس اولویت پیکربندی‌شده (بالا -> پایین) — بدون هیچ
// تغییری در خودِ NotificationPanel.jsx (که با موبایل مشترک است؛ طبق
// الزام «Mobile خراب نشود»، هیچ‌جای آن کامپوننت لمس نشد).
// notifTypes===null یا خالی یعنی هنوز بارگذاری نشده — fail-open، چیزی حذف/جابه‌جا نمی‌شود.
function filterSmartItemsByConfig(items, notifTypes, role) {
  if (!notifTypes || notifTypes.length === 0) return items;
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  return items
    .filter((item) => {
      const type = classifyNotificationKey(item.key);
      if (!type) return true;
      const cfg = notifTypes.find((t) => t.typeKey === type);
      if (!cfg) return true;
      if (!cfg.isEnabled) return false;
      if (cfg.targetRole !== "all" && cfg.targetRole !== role) return false;
      return true;
    })
    .sort((a, b) => {
      const pa = notifTypes.find((t) => t.typeKey === classifyNotificationKey(a.key))?.priority || "medium";
      const pb = notifTypes.find((t) => t.typeKey === classifyNotificationKey(b.key))?.priority || "medium";
      return (PRIORITY_RANK[pa] ?? 1) - (PRIORITY_RANK[pb] ?? 1);
    });
}

async function insertAnomaly(record) {
  const body = [{
    id: record.id,
    tracking_number: record.trackingNumber,
    project: record.project,
    contractor: record.contractor,
    sub_contractor: record.subContractor,
    area: record.area,
    date: record.date || null,
    time: record.time,
    risk_level: record.riskLevel,
    category: record.category,
    format: record.format,
    description: record.description,
    corrective_action: record.correctiveAction,
    obstacles: record.obstacles,
    follower: record.follower,
    sender: record.sender,
    status: record.status,
    close_date: record.closeDate || null,
    effectiveness: record.effectiveness,
    photo_count: record.photoCount,
    company_id: getCurrentCompanyId(),
  }];
  const rows = await sb("anomalies", { method: "POST", body: JSON.stringify(body) });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return rows[0];
}

async function updateAnomalyDB(id, patch) {
  const dbPatch = {};
  if ("correctiveAction" in patch) dbPatch.corrective_action = patch.correctiveAction;
  if ("obstacles" in patch) dbPatch.obstacles = patch.obstacles;
  if ("follower" in patch) dbPatch.follower = patch.follower;
  if ("status" in patch) dbPatch.status = patch.status;
  if ("closeDate" in patch) dbPatch.close_date = patch.closeDate || null;
  if ("effectiveness" in patch) dbPatch.effectiveness = patch.effectiveness;
  if ("photoCount" in patch) dbPatch.photo_count = patch.photoCount;
  if ("contractorAction" in patch) dbPatch.contractor_action = patch.contractorAction;
  if ("reviewNote" in patch) dbPatch.review_note = patch.reviewNote;
  await sb(`anomalies?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dbPatch), prefer: "return=minimal" });
}

async function deleteAnomalyDB(id) {
  await sb(`anomalies?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

async function loadAnomalyPhotos(anomalyId) {
  const rows = await sb(`anomaly_photos?anomaly_id=eq.${anomalyId}&select=id,photo,stage&order=created_at.asc`);
  return sbOk(rows) ? rows : [];
}
async function insertAnomalyPhotos(anomalyId, photosArray, stage = "report") {
  if (!photosArray.length) return;
  const body = photosArray.map((p) => ({ anomaly_id: anomalyId, photo: p, stage, company_id: getCurrentCompanyId() }));
  await sb("anomaly_photos", { method: "POST", body: JSON.stringify(body), prefer: "return=minimal" });
}
async function deleteAnomalyPhotoDB(photoId) {
  await sb(`anomaly_photos?id=eq.${photoId}`, { method: "DELETE", prefer: "return=minimal" });
}

// uid / todayISO اکنون در shared.js تعریف شده‌اند.

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---------- تبدیل تاریخ میلادی <-> شمسی (بدون نیاز به کتابخانه خارجی) ----------
function isLeapJalaliYear(jy) {
  return (((jy - (jy > 0 ? 474 : 473)) % 2820 + 474 + 38) * 682) % 2816 < 682;
}

function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

function gregorianToJalali(gy, gm, gd) {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  const gy2 = gy <= 1600 ? gy - 621 : gy - 1600;
  const gy3 = gm > 2 ? gy2 + 1 : gy2;
  let days = 365 * gy2 + Math.floor((gy3 + 3) / 4) - Math.floor((gy3 + 99) / 100) + Math.floor((gy3 + 399) / 400) - 80 + gd + gDaysInMonth[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  const jy2 = jy <= 979 ? jy : jy - 979;
  let days = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor((days - 1) / 36524);
    days = (days - 1) % 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const gd = days + 1;
  const isGLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const gMonthLen = [0, 31, isGLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  let rem = gd;
  while (gm <= 12 && rem > gMonthLen[gm]) {
    rem -= gMonthLen[gm];
    gm++;
  }
  return [gy, gm, rem];
}

function todayJalaliParts() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isoToJalali(iso) {
  if (!iso) return null;
  const [gy, gm, gd] = iso.split("-").map(Number);
  if (!gy) return null;
  return gregorianToJalali(gy, gm, gd);
}

function isoToJalaliDisplay(iso) {
  const p = isoToJalali(iso);
  if (!p) return "";
  return `${p[0]}/${String(p[1]).padStart(2, "0")}/${String(p[2]).padStart(2, "0")}`;
}

const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

// انتخاب‌گر تاریخ شمسی (سه select: سال/ماه/روز) — مقدار ورودی/خروجی ISO میلادی (yyyy-mm-dd) برای سازگاری با دیتابیس
function JalaliDateInput({ value, onChange }) {
  const { lang } = useLanguage();
  const todayParts = todayJalaliParts();
  const parsed = isoToJalali(value);
  const jy = parsed ? parsed[0] : todayParts[0];
  const jm = parsed ? parsed[1] : todayParts[1];
  const jd = parsed ? parsed[2] : todayParts[2];

  useEffect(() => {
    if (!value) {
      const [gy, gm, gd] = jalaliToGregorian(todayParts[0], todayParts[1], todayParts[2]);
      onChange(`${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = [];
  for (let y = todayParts[0] - 6; y <= todayParts[0] + 2; y++) years.push(y);
  const dayCount = jalaliMonthLength(jy, jm);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const emit = (ny, nm, nd) => {
    const maxD = jalaliMonthLength(ny, nm);
    const safeD = Math.min(nd, maxD);
    const [gy, gm, gd] = jalaliToGregorian(ny, nm, safeD);
    onChange(`${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`);
  };

  // نسخه‌ی انگلیسی: یک date input استاندارد میلادی (قرارداد مقدار همان
  // "YYYY-MM-DD" باقی می‌ماند — فقط UI انتخاب تاریخ عوض می‌شود). دقیقاً
  // همان رفتار نسخه‌ی جداگانه‌ی JalaliDateInput در personnel/jalaliDate.jsx.
  if (lang === "en") {
    return (
      <input
        type="date"
        style={styles.input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
      />
    );
  }

  return (
    <div style={{ display: "flex", gap: 6 }} dir="rtl">
      <select style={{ ...styles.input, flex: 1.2 }} value={jy} onChange={(e) => emit(Number(e.target.value), jm, jd)}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select style={{ ...styles.input, flex: 1.4 }} value={jm} onChange={(e) => emit(jy, Number(e.target.value), jd)}>
        {JALALI_MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
      </select>
      <select style={{ ...styles.input, flex: 1 }} value={jd} onChange={(e) => emit(jy, jm, Number(e.target.value))}>
        {days.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}

// ---------- خروجی گزارش (Excel / PDF) ----------
function statusLabelFa(status) {
  if (status === "Closed") return tr("anomStatusClosed");
  if (status === "pending_review") return tr("anomStatusPendingReview");
  return tr("anomStatusOpen");
}

function anomalyExportRows(list) {
  return list.map((a, idx) => ({
    row: idx + 1,
    trackingNumber: a.trackingNumber,
    date: isoToJalaliDisplay(a.date),
    area: a.area,
    contractor: a.contractor,
    category: a.category,
    riskLevel: a.riskLevel,
    status: statusLabelFa(a.status),
    description: a.description,
    contractorAction: a.contractorAction || "",
    closeDate: a.closeDate ? isoToJalaliDisplay(a.closeDate) : "",
  }));
}

async function exportAnomaliesExcel(list, title, companyId) {
  let companyName = "";
  if (companyId) companyName = await loadMyCompanyName(companyId);

  // عکس‌های مرتبط با همین رکوردها را می‌خوانیم تا لینک واقعی زده شود
  // (بدون بسته‌بندی zip — این یک خروجی سریع از همین لیست است، نه فرآیند
  // رسمی «آرشیو و حذف» که در ماژول آرشیو فایل‌ها با پیوست‌های محلی کار می‌کند)
  const ids = list.map((a) => a.id);
  let photosByAnomaly = {};
  if (ids.length > 0) {
    const idList = ids.map((id) => `"${id}"`).join(",");
    const photoRows = await sb(`anomaly_photos?anomaly_id=in.(${idList})&select=anomaly_id,photo,stage`);
    if (sbOk(photoRows)) {
      photoRows.forEach((p) => {
        if (!photosByAnomaly[p.anomaly_id]) photosByAnomaly[p.anomaly_id] = { report: [], fix: [] };
        const isUrl = typeof p.photo === "string" && p.photo.startsWith("http");
        if (isUrl) photosByAnomaly[p.anomaly_id][p.stage === "report" ? "report" : "fix"].push(p.photo);
      });
    }
  }

  const headers = [
    tr("expRow"), tr("expTrackingNumber"), tr("expXlsProject"), tr("expContractor"), tr("expXlsLocationArea"), tr("expDate"), tr("expXlsTime"),
    tr("expRiskLevel"), tr("expCategory"), tr("expXlsFormat"), tr("expXlsFullDesc"), tr("expXlsCorrectiveAction"),
    tr("expXlsFollower"), tr("expXlsSubmitter"), tr("expStatus"), tr("expCloseDate"), tr("expXlsEffectiveness"), tr("expXlsReviewNote"), tr("expXlsCreatedAt"),
    tr("expXlsReportPhoto1"), tr("expXlsReportPhoto2"), tr("expXlsActionPhoto1"), tr("expXlsActionPhoto2"),
  ];
  const colWidths = [9.86, 25, 21.71, 15.29, 19, 15.71, 21.71, 14.29, 18.71, 16.86, 41.71, 15.71, 19.43, 10, 27.71, 20.43, 19.86, 27.57, 23.14, 25.14, 14.86, 18, 18];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(tr("expXlsSheetName"), { views: [{ rightToLeft: getCurrentLang() !== "en", state: "frozen", xSplit: 3, ySplit: 2 }] });
  ws.columns = colWidths.map((w) => ({ width: w }));

  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = tr("expXlsTitle", { company: companyName || "........" });
  titleCell.font = { name: "B Mitra", bold: true, size: 22 };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
  ws.getRow(1).height = 55;

  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "B Nazanin", bold: true, size: 12 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4B183" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  headerRow.height = 32;

  list.forEach((a, idx) => {
    const rowIdx = idx + 3;
    const ph = photosByAnomaly[a.id] || { report: [], fix: [] };
    const values = [
      idx + 1, a.trackingNumber, a.project, a.contractor, a.area, isoToJalaliDisplay(a.date) || "—", a.time,
      a.riskLevel, a.category, a.format, a.description, a.correctiveAction,
      a.follower, a.sender, statusLabelFa(a.status), a.closeDate ? isoToJalaliDisplay(a.closeDate) : "—",
      a.effectiveness || "—", a.reviewNote || "—", toJalaliDateTime(a.createdAt) || "—",
    ];
    const row = ws.getRow(rowIdx);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v ?? "—";
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });

    const photoUrls = [ph.report[0], ph.report[1], ph.fix[0], ph.fix[1]];
    photoUrls.forEach((url, i) => {
      const cell = row.getCell(20 + i);
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (url) {
        cell.value = { text: tr("expXlsViewPhoto"), hyperlink: url };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      } else {
        cell.value = "—";
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  await saveBlobNativeAware(blob, `${title}.xlsx`);
}

function escapeHtml(s) {
  return String(s || "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

async function exportAnomaliesPdf(list, title) {
  const headers = [tr("expRow"), tr("expTrackingNumber"), tr("expDate"), tr("expArea"), tr("expContractor"), tr("expCategory"), tr("expRiskLevel"), tr("expStatus"), tr("expDescription"), tr("expContractorAction"), tr("expCloseDate")];
  const bodyRows = anomalyExportRows(list)
    .map((r) => `<tr>${Object.values(r).map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!doctype html><html lang="${getCurrentLang()}" dir="${getCurrentLang() === "en" ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; color: #111; }
    h2 { text-align: center; margin-bottom: 4px; }
    p.meta { text-align: center; color: #666; font-size: 12px; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 16px; }
    th, td { border: 1px solid #e3e8ee; padding: 5px; text-align: right; vertical-align: top; }
    th { background: #f1f5f9; }
    @media print { @page { size: landscape; margin: 12mm; } }
  </style></head>
  <body>
    <h2>${escapeHtml(title)}</h2>
    <p class="meta">${APP_NAME} — ${escapeHtml(tr("expItemCount", { count: list.length }))}</p>
    <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${bodyRows}</tbody></table>
  </body></html>`;

  if (await exportHtmlReportNativeAware(html, title)) return;

  const win = window.open("", "_blank");
  if (!win) { alert(tr("errPopupBlocked")); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}



// ---------- صفحه ورود ----------
// ---------- لوگوی سامانه (بارگذاری از public/logo.png) ----------
function IhmsLogo({ size = 96, src }) {
  return (
    <img
      src={src || `${import.meta.env.BASE_URL}logo.png`}
      alt="IHMS Logo"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

// منطق واقعی تطبیق اعتبارنامه — عیناً از داخل LoginScreen بیرون کشیده شده
// تا هم فرم ورود عادی، هم گیت ورود بیومتریک (که باید همان اعتبارسنجی
// واقعی را دوباره اجرا کند، نه صرفاً به یک نشست ذخیره‌شده اعتماد کند) از
// یک منبع واحد استفاده کنند. هیچ رفتاری نسبت به قبل تغییر نکرده است.
// نسخه‌ی قبلی این تابع با loadEmployerAccounts()/loadContractors() تمام
// حساب‌های شرکت (شامل رمز عبور متنی خام همه‌شان) را با کلید anon می‌خواند
// و سمت مرورگر مقایسه می‌کرد — یعنی هر کسی، حتی قبل از ورود موفق، فقط با
// باز کردن Network tab می‌توانست رمز عبور همه‌ی کاربران شرکت را ببیند.
// حالا تأیید کاملاً سمت سرور (Edge Function، pgcrypto) انجام می‌شود؛ هیچ
// رمزی — نه خام، نه هش‌شده — هرگز به مرورگر برنمی‌گردد.
async function attemptCredentialLogin(username, password) {
  const result = await issueSessionToken(username, password, "customer");
  if (result?.user) return { user: result.user };

  // fallback ایمنی — فقط برای زمانی که SQL مهاجرت فاز ۲ هنوز اجرا نشده و
  // حساب واقعی admin/karfarma هنوز در دیتابیس ساخته نشده باشد. این حساب‌ها
  // از قبل هم فقط رمز هاردکد در همین کد بودند، پس نگه‌داشتن این fallback
  // نشتی جدیدی اضافه نمی‌کند.
  const seedMatch = SEED_USERS.find((u) => u.username === username.trim() && u.password === password);
  if (seedMatch) {
    console.warn("ورود از طریق حساب موقت SEED_USERS — لطفاً SQL مهاجرت فاز ۲ را اجرا کنید.");
    const seedUser = { ...seedMatch, canEdit: true, name: seedMatch.role === "EMPLOYER" ? tr("panelEmployer") : seedMatch.username };
    return { user: seedUser };
  }

  return { error: true };
}

function LoginScreen({ onLogin }) {
  const { lang, setLang, t, dir } = useLanguage();
  const appearance = useAppearance();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioChecking, setBioChecking] = useState(false);
  const [showTrialRequest, setShowTrialRequest] = useState(false);
  const isDesktop = useIsDesktop();
  // اطلاعیه‌ی صفحه‌ی ورود همین‌جا (نه داخل خودِ پنل) بارگذاری می‌شود تا
  // بخش «ورود» و «اطلاعیه» یکجا و همزمان رندر شوند — نه اینکه اطلاعیه
  // چند لحظه بعد از فرم، جداگانه بپرد داخل صفحه. undefined = هنوز مشخص
  // نیست، [] = اطلاعیه‌ای نیست.
  const [loginAnnouncements, setLoginAnnouncements] = useState(undefined);
  useEffect(() => {
    let done = false;
    const settle = (v) => { if (!done) { done = true; setLoginAnnouncements(v); } };
    loadActiveAnnouncements("login").then(settle).catch(() => settle([]));
    // اگر شبکه کند/قطع بود، فرم ورود نباید بیش از این پشت اطلاعیه منتظر بماند.
    const fallback = setTimeout(() => settle([]), 2500);
    return () => { done = true; clearTimeout(fallback); };
  }, []);

  // دکمه‌ی «ورود سریع با اثر انگشت» فقط وقتی نشون داده می‌شه که هم روی
  // این دستگاه از قبل برای یکی فعال شده، هم واقعاً سخت‌افزارش پشتیبانی
  // بشه — این باعث می‌شه بعد از زدن «خروج» هم (نه فقط با باز کردن دوباره‌ی
  // اپ)، بشه با اثر انگشت وارد شد.
  useEffect(() => {
    if (getBiometricEnabledUsername()) {
      isBiometricAvailable().then((r) => setBioAvailable(!!r.available));
    }
  }, []);

  const finishLogin = async (matchedUsername, user, matchedPassword) => {
    const record = await recordLoginAttempt(matchedUsername, !!user);
    if (user) {
      setError("");
      setWarning("");
      setCurrentCompanyId(user.companyId);
      await syncOfflineCacheCompanyScope(user.companyId);
      trackLogin(user);
      if (user.preferredLanguage) setLang(user.preferredLanguage);
      // توکن نشست از قبل، داخل خودِ attemptCredentialLogin (از طریق
      // issueSessionToken) گرفته و ذخیره شده — اینجا دیگر نیازی به تکرارش نیست.
      onLogin(user);
      return true;
    }
    trackFailedLogin(matchedUsername);
    if (record?.locked) {
      setError(t("accountTemporarilyLocked"));
      setWarning("");
    } else {
      setError(t("invalidCredentials"));
      setWarning(t("failedAttemptWarning"));
    }
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setWarning("");

    // اول: آیا این نام‌کاربری به‌خاطر تلاش‌های ناموفق اخیر قفل است؟ این
    // بررسی واقعاً سمت سرور انجام می‌شود (نه یک شمارنده‌ی قابل‌پاک‌شدن در
    // مرورگر خودِ کاربر).
    const lockStatus = await checkLoginLockout(username);
    if (lockStatus?.locked) {
      setLoading(false);
      setError(t("accountTemporarilyLocked"));
      return;
    }

    const { user } = await attemptCredentialLogin(username, password);
    await finishLogin(username, user, password);
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    setBioChecking(true);
    setError("");
    setWarning("");
    const bioResult = await verifyBiometricAndGetCredentials();
    if (bioResult?.__error) {
      setBioChecking(false);
      if (!bioResult.cancelled) setError(bioResult.message || "");
      return;
    }
    const lockStatus = await checkLoginLockout(bioResult.username);
    if (lockStatus?.locked) {
      setBioChecking(false);
      setError(t("accountTemporarilyLocked"));
      return;
    }
    const { user } = await attemptCredentialLogin(bioResult.username, bioResult.password);
    if (!user) {
      setBioChecking(false);
      await finishLogin(bioResult.username, null, bioResult.password);
      setError(t("biometricStaleCredentials"));
      return;
    }
    await finishLogin(bioResult.username, user, bioResult.password);
    setBioChecking(false);
  };

  // در دسکتاپ تا وضعیت اطلاعیه مشخص نشده، صفحه به‌صورت دوتکه رندر نمی‌شود
  // تا «ورود» و «اطلاعیه» با هم ظاهر شوند. در موبایل پنل اطلاعیه اصلاً
  // رندر نمی‌شود، پس نیازی به این انتظار نیست و فرم فوراً می‌آید.
  if (isDesktop && loginAnnouncements === undefined) {
    return (
      <div style={styles.centerScreen}>
        <IhmsLogo size={140} src={appearance?.logoUrl} />
      </div>
    );
  }

  return (
    <div style={{ ...styles.centerScreen, alignItems: "stretch", padding: 0 }}>
      <div style={{ display: "flex", width: "100%", minHeight: "100vh", flexWrap: "wrap" }}>
        {/* پنل اطلاعیه — سمت چپ در دسکتاپ (طبق مرجع)؛ در موبایل کاملاً حذف می‌شود، نه فقط پنهان، تا هیچ فضایی از فرم ورود نگیرد */}
        <LoginAnnouncementPanel announcements={loginAnnouncements || []} />

        {/* پنل ورود — سمت راست */}
        <div style={{ flex: "1 1 380px", minWidth: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: THEME.surface }}>
          <div style={{ width: 340, maxWidth: "100%", direction: dir }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <LanguageToggle lang={lang} setLang={setLang} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <IhmsLogo size={200} src={appearance?.logoUrl} />
            </div>
            <h2 style={{ textAlign: "center", marginBottom: 2, fontSize: 18, direction: "ltr", color: THEME.navy, fontWeight: 700, letterSpacing: "-0.01em" }}>{appearance?.systemName || APP_NAME}</h2>
            <p style={{ textAlign: "center", color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 22, fontWeight: 500 }}>
              {t("loginTagline")}
            </p>

            <label style={{ ...styles.label, textAlign: dir === "rtl" ? "right" : "left" }}>{t("username")}</label>
            <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} dir={dir} />

            <label style={{ ...styles.label, textAlign: dir === "rtl" ? "right" : "left" }}>{t("password")}</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              dir={dir}
            />

            {error && <p style={styles.error}>{error}</p>}
            {!error && warning && <p style={{ fontSize: 11, color: "#b45309", marginTop: -6, marginBottom: 10, lineHeight: 1.7 }}>{warning}</p>}

            <button type="button" style={{ ...styles.button, opacity: loading ? 0.75 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? t("loggingIn") : t("loginButton")}
            </button>

            {bioAvailable && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={bioChecking}
                style={{ ...styles.button, background: THEME.tealDeep, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: bioChecking ? 0.75 : 1 }}
              >
                <Fingerprint size={16} /> {bioChecking ? t("biometricGateChecking") : t("biometricQuickLogin")}
              </button>
            )}

            {/* درخواست ارزیابی و پلن آزمایشی — طبق خواسته‌ی صریح، در همین
                صفحه‌ی اصلی (ورود) قابل‌دسترسی، بدون نیاز به حساب کاربری */}
            <button
              type="button"
              onClick={() => setShowTrialRequest(true)}
              style={{
                width: "100%", marginTop: 10, padding: "11px", borderRadius: 9, cursor: "pointer", fontFamily: THEME.font,
                fontSize: 13, fontWeight: 600, background: "transparent", border: `1.5px solid ${THEME.teal}`, color: THEME.tealDeep,
              }}
            >
              {t("loginTrialRequestBtn")}
            </button>

            <p style={styles.hint}>{t("designedBy")}</p>
          </div>
        </div>
      </div>
      {showTrialRequest && <TrialRequestModal onClose={() => setShowTrialRequest(false)} />}
    </div>
  );
}

// پنل اطلاعیه‌ی صفحه‌ی ورود — فقط اطلاعیه‌های سراسری (company_id=null)
// را نشان می‌دهد، چون قبل از ورود هنوز مشخص نیست کاربر متعلق به کدام
// شرکت است. عکس/عنوان/متن دقیقاً همان قاب ثابت اسلایدر صفحه‌ی اصلی را
// دارند (بخش ۲) تا با تغییر طول متن یا عکس، ظاهر صفحه به‌هم نریزد. اگر
// هیچ اطلاعیه‌ی فعالی نبود، این پنل به‌طور کامل مخفی می‌شود (نه یک قاب
// خالی) و فرم ورود در تمام عرض صفحه قرار می‌گیرد.
function LoginAnnouncementPanel({ announcements = [] }) {
  const isDesktop = useIsDesktop();
  const [index, setIndex] = useState(0);

  const isSlider = announcements && announcements.length > 1;
  useEffect(() => {
    if (!isSlider) return;
    const current = announcements[index];
    const ms = (current.displaySeconds || 10) * 1000;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % announcements.length), ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isSlider, announcements]);

  // در موبایل، این پنل به‌طور کامل رندر نمی‌شود (نه فقط با CSS پنهان) —
  // طبق الزام صریح: نباید هیچ فضایی از فرم ورود بگیرد.
  if (!isDesktop) return null;
  if (!announcements || announcements.length === 0) return null;
  const current = announcements[Math.min(index, announcements.length - 1)];
  const Icon = ANNOUNCEMENT_ICONS[current.iconKey] || Megaphone;

  return (
    <div
      style={{
        flex: "1 1 420px", minWidth: 320, position: "relative", overflow: "hidden",
        background: current.loginImageUrl ? "#0e2a3f" : `linear-gradient(160deg, ${THEME.navy}, ${THEME.tealDeep})`,
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "40px 44px",
      }}
    >
      {/* عکس واقعی با contain — کل تصویر همیشه کامل و بدون برش دیده می‌شود؛
          فضای خالی احتمالی اطراف آن با همان پس‌زمینه‌ی navy پر می‌شود. */}
      {current.loginImageUrl && (
        <img src={current.loginImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,42,63,0.15) 0%, rgba(14,42,63,0.82) 78%)" }} />
      {isSlider && (
        <div style={{ position: "absolute", top: 24, insetInlineEnd: 24, display: "flex", alignItems: "center", gap: 6, zIndex: 1 }}>
          <button type="button" onClick={() => setIndex((i) => (i - 1 + announcements.length) % announcements.length)} style={loginSliderNavBtnStyle}><ChevronRight size={14} color="#fff" /></button>
          <button type="button" onClick={() => setIndex((i) => (i + 1) % announcements.length)} style={loginSliderNavBtnStyle}><ChevronLeft size={14} color="#fff" /></button>
        </div>
      )}
      {!current.loginImageUrl && (
        <div style={{ position: "absolute", top: 44, insetInlineStart: 44, zIndex: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={26} color="#fff" />
          </div>
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 440 }}>
        <h3 style={{
          fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 10px", minHeight: 26,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3,
        }}>
          {current.title || "\u00A0"}
        </h3>
        <p style={{
          fontSize: 13.5, color: "rgba(255,255,255,0.88)", lineHeight: 1.9, margin: 0, minHeight: "calc(1.9em * 3)",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {current.message}
        </p>
        {isSlider && (
          <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
            {announcements.map((a, i) => (
              <button
                key={a.id} type="button" onClick={() => setIndex(i)}
                style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === index ? "#fff" : "rgba(255,255,255,0.4)", transition: "width .2s, background .2s" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
const loginSliderNavBtnStyle = { width: 30, height: 30, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// گیت ورود بیومتریک — وقتی نشستی از قبل ذخیره شده (currentUser در
// localStorage) و کاربر قبلاً ورود با اثر انگشت را فعال کرده، این صفحه
// جای رفتن مستقیم به داشبورد می‌آید. بدون این گیت، هرکسی که گوشیِ
// بازشده را در دست بگیرد، بدون هیچ احراز هویتی مستقیم وارد سامانه
// می‌شد — این دقیقاً همان لایه‌ی امنیتی‌ست که این قابلیت اضافه می‌کند.
function BiometricGateScreen({ currentUser, onUnlocked, onFallbackToPassword }) {
  const { t, dir } = useLanguage();
  const appearance = useAppearance();
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const attempt = async () => {
    setChecking(true);
    setErrorMsg("");
    const bioResult = await verifyBiometricAndGetCredentials();
    if (bioResult?.__error) {
      setChecking(false);
      setErrorMsg(bioResult.message || "");
      return;
    }
    const lockStatus = await checkLoginLockout(bioResult.username);
    if (lockStatus?.locked) {
      setChecking(false);
      setErrorMsg(t("accountTemporarilyLocked"));
      return;
    }
    // بیومتریک تأیید شد؛ حالا همان اعتبارسنجی واقعی ورود دوباره اجرا
    // می‌شود — اگر مثلاً ادمین رمز را عوض کرده یا حساب را غیرفعال کرده
    // باشد، ورود بیومتریک هم دیگر کار نمی‌کند، دقیقاً مثل ورود عادی.
    const { user } = await attemptCredentialLogin(bioResult.username, bioResult.password);
    recordLoginAttempt(bioResult.username, !!user);
    setChecking(false);
    if (user) {
      setCurrentCompanyId(user.companyId);
      await syncOfflineCacheCompanyScope(user.companyId);
      trackLogin(user);
      onUnlocked(user);
    } else {
      trackFailedLogin(bioResult.username);
      setErrorMsg(t("biometricStaleCredentials"));
    }
  };

  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ ...styles.centerScreen, direction: dir }}>
      <div style={{ ...styles.card, width: 340, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <IhmsLogo size={80} />
        </div>
        <h3 style={{ marginBottom: 4, color: THEME.navy }}>{currentUser?.name || "—"}</h3>
        <p style={{ color: errorMsg ? THEME.danger : THEME.text3, fontSize: 12.5, marginBottom: 20, minHeight: 32 }}>
          {checking ? t("biometricGateChecking") : errorMsg || t("biometricGateWaiting")}
        </p>
        {!checking && errorMsg && (
          <>
            <button type="button" style={{ ...styles.button, marginBottom: 10 }} onClick={attempt}>{t("biometricRetry")}</button>
            <button type="button" style={{ ...styles.button, background: THEME.text3 }} onClick={onFallbackToPassword}>{t("biometricUsePassword")}</button>
          </>
        )}
      </div>
    </div>
  );
}

// صفحه‌ی مسدودکننده وقتی حساب کاربر توسط مدیر سامانه غیرفعال (یا حذف)
// شده و نشست باز او باید فوراً بسته شود. تصمیمِ «غیرفعال است» سمت سرور
// گرفته شده (Edge Function check-account-active)؛ اینجا فقط پیام واضح و
// راه خروج نمایش داده می‌شود. توکن نشست پیش از رندر این صفحه پاک می‌شود،
// پس هیچ درخواست داده‌ای دیگری با اعتبار قبلی انجام نمی‌شود.
function AccountDeactivatedScreen({ onExit }) {
  const { t } = useLanguage();
  return (
    <div style={{ ...styles.centerScreen, direction: "rtl" }}>
      <div style={{ ...styles.card, width: 360, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: THEME.dangerBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldOff size={30} color={THEME.danger} />
          </div>
        </div>
        <h3 style={{ margin: "0 0 8px", color: THEME.navy, fontSize: 16 }}>{t("appDeactivatedTitle")}</h3>
        <p style={{ color: THEME.text2, fontSize: 13.5, lineHeight: 1.9, marginBottom: 20 }}>
          {t("appDeactivatedBody")}
        </p>
        <button type="button" style={styles.button} onClick={onExit}>{t("appBackToLogin")}</button>
      </div>
    </div>
  );
}

// تعویض فارسی/English — روی صفحه‌ی ورود و توی تنظیمات پروفایل استفاده می‌شود
function LanguageToggle({ lang, setLang, compact }) {
  const btn = (value, label) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      style={{
        padding: compact ? "6px 12px" : "5px 11px", borderRadius: 7, fontSize: compact ? 12.5 : 11.5, fontWeight: 600, cursor: "pointer",
        border: `1.5px solid ${lang === value ? THEME.teal : THEME.border}`,
        background: lang === value ? THEME.teal : "#fff", color: lang === value ? "#fff" : THEME.text2,
        fontFamily: THEME.font,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {btn("fa", "فارسی")}
      {btn("en", "English")}
    </div>
  );
}

// ---------- پروفایل کاربر ----------
// ---------- آواتار (حروف اول نام) ----------
function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function Avatar({ name, size = 40, bg }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: bg || THEME.teal,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        color: "#fff", fontWeight: 700, fontSize: size * 0.4, fontFamily: THEME.font,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function ChangePasswordSection() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!oldPassword || !newPassword) { setError(t("saCpBothRequired")); return; }
    if (!validatePasswordLength(newPassword)) { setError(t("appPasswordMinChars", { n: MIN_PASSWORD_LENGTH })); return; }
    if (newPassword !== confirmPassword) { setError(t("saCpMismatch")); return; }
    setSaving(true);
    const result = await changeMyPassword(oldPassword, newPassword);
    setSaving(false);
    if (result?.error) { setError(result.message); return; }
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setShowForm(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, margin: 0 }}>{t("appChangePasswordLabel")}</p>
        <button type="button" onClick={() => { setShowForm((v) => !v); setError(""); }} style={{ ...styles.smallButton, background: THEME.navyMid, fontSize: 11 }}>
          {showForm ? t("saClose") : t("appChangePasswordBtn")}
        </button>
      </div>
      {done && <p style={{ color: "#166534", fontSize: 12.5, marginTop: 8 }}>{t("saPasswordChanged")}</p>}
      {showForm && (
        <div style={{ marginTop: 10 }}>
          <label style={styles.label}>{t("saCurrentPassword")}</label>
          <input type="password" style={styles.input} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} dir="ltr" />
          <label style={styles.label}>{t("appNewPasswordMinChars", { n: MIN_PASSWORD_LENGTH })}</label>
          <input type="password" style={styles.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" />
          <label style={styles.label}>{t("saConfirmNewPassword")}</label>
          <input type="password" style={styles.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" />
          {error && <p style={styles.error}>{error}</p>}
          <button type="button" style={{ ...styles.button, marginTop: 6 }} onClick={handleSubmit} disabled={saving}>
            {saving ? t("saSavingEllipsis") : t("saSubmitNewPassword")}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileView({ onBack, currentUser, roleLabel }) {
  const { lang, setLang, t, dir } = useLanguage();
  const [companyName, setCompanyName] = useState("");
  const [lastLogin, setLastLogin] = useState(null);
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioSupported, setBioSupported] = useState(true);
  const [bioAskingPassword, setBioAskingPassword] = useState(false);
  const [bioPasswordInput, setBioPasswordInput] = useState("");

  useEffect(() => {
    if (currentUser?.role === "CONTRACTOR") {
      setCompanyName(currentUser?.name || "");
    } else {
      loadMyCompanyName(currentUser?.companyId).then(setCompanyName);
    }
    loadMyLastLogin(currentUser?.username).then(setLastLogin);
    setBioEnabled(isBiometricEnabledFor(currentUser?.username));
    isBiometricAvailable().then((r) => setBioSupported(!!r.available));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    const result = await updateMyProfile(currentUser?.role, currentUser?.id, { phone: phone.trim(), email: email.trim() });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // انتخاب زبان بلافاصله روی هدر/این صفحه اعمال می‌شود (setLang)، و همزمان
  // به‌عنوان ترجیح دائمی همین کاربر در دیتابیس ذخیره می‌شود — دفعه‌ی بعد که
  // از هر دستگاهی وارد شود، همین زبان روی هدرش اعمال خواهد شد.
  const handleLanguageChange = async (value) => {
    setLang(value);
    if (currentUser?.role && currentUser?.id) {
      await updateMyProfile(currentUser.role, currentUser.id, { preferredLanguage: value });
    }
  };

  const handleToggleBiometric = async () => {
    setBioError("");
    if (bioEnabled) {
      setBioBusy(true);
      await disableBiometricLogin();
      setBioEnabled(false);
      setBioBusy(false);
      return;
    }
    // برای فعال‌سازی، رمز عبور فعلی لازم است (تا در Keystore امن دستگاه
    // ذخیره شود) — چون currentUser هیچ‌وقت رمز عبور را حمل نمی‌کند (به‌درستی،
    // برای امنیت)، اینجا از کاربر دوباره خواسته می‌شود، دقیقاً مثل بیشتر
    // اپ‌های واقعی («برای فعال‌سازی Face ID رمز را دوباره وارد کنید»).
    setBioAskingPassword(true);
    setBioPasswordInput("");
  };

  const handleConfirmBiometricPassword = async () => {
    if (!bioPasswordInput) return;
    setBioError("");
    setBioBusy(true);
    // رمز واردشده از همان مسیر واقعی ورود تأیید می‌شود — نه یک بررسی موازی
    // و جدا — تا مطمئن شویم دقیقاً همان چیزی که در Keystore ذخیره می‌شود،
    // برای ورود واقعی هم کار می‌کند.
    const verify = await attemptCredentialLogin(currentUser?.username, bioPasswordInput);
    if (!verify?.user) {
      setBioBusy(false);
      setBioError(t("appBioPasswordWrong"));
      return;
    }
    const result = await enableBiometricLogin(currentUser?.username, bioPasswordInput);
    setBioBusy(false);
    setBioAskingPassword(false);
    setBioPasswordInput("");
    if (result?.__error) { setBioError(result.message); return; }
    setBioEnabled(true);
  };

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: THEME.text3, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: THEME.text }}>{value || "—"}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("backToMenu")}</div>}
      <div style={{ ...styles.card, width: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Avatar name={currentUser?.name} size={64} />
        </div>
        <h3 style={{ textAlign: "center", marginBottom: 2 }}>{currentUser?.name || "—"}</h3>
        <p style={{ textAlign: "center", color: THEME.text3, fontSize: 12.5, marginTop: 0, marginBottom: 20 }}>{roleLabel}</p>

        <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 14, marginBottom: 6 }}>
          <p style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 10 }}>{t("orgInfoTitle")}</p>
          <div style={styles.formGrid}>
            <Field label={t("fullName")} value={currentUser?.name} />
            <Field label={currentUser?.role === "CONTRACTOR" ? t("contractorLabel") : t("companyLabel")} value={companyName} />
          </div>
          <div style={styles.formGrid}>
            <Field label={t("jobTitle")} value={currentUser?.jobPositionTitle} />
            <Field label={t("userRole")} value={roleLabel} />
          </div>
          <div style={styles.formGrid}>
            <Field label={t("joinDate")} value={isoToJalaliDisplay(currentUser?.createdAt)} />
            <Field label={t("lastLogin")} value={lastLogin ? isoToJalaliDisplay(lastLogin) : t("firstLogin")} />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 14, marginTop: 8 }}>
          <p style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 10 }}>{t("systemLanguage")}</p>
          <LanguageToggle lang={lang} setLang={handleLanguageChange} compact />
        </div>

        <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 14, marginTop: 14 }}>
          <p style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 10 }}>{t("securitySectionTitle")}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{t("biometricToggleLabel")}</div>
              <div style={{ fontSize: 11, color: bioError ? THEME.danger : THEME.text3, marginTop: 2 }}>
                {!bioSupported
                  ? t("biometricNativeOnly")
                  : bioBusy
                  ? (bioEnabled ? t("biometricDisabling") : t("biometricEnabling"))
                  : bioError || (bioEnabled ? t("biometricEnabledHint") : t("biometricDisabledHint"))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={bioBusy || !bioSupported}
              style={{
                width: 46, height: 26, borderRadius: 13, border: "none", cursor: (bioBusy || !bioSupported) ? "default" : "pointer",
                background: bioEnabled ? THEME.teal : "#d5dbe1", position: "relative", flexShrink: 0, opacity: (bioBusy || !bioSupported) ? 0.5 : 1,
                transition: "background 0.15s",
              }}
            >
              <span style={{
                position: "absolute", top: 3, insetInlineStart: bioEnabled ? 23 : 3, width: 20, height: 20, borderRadius: "50%",
                background: "#fff", transition: "inset-inline-start 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }} />
            </button>
          </div>
          {bioAskingPassword && (
            <div style={{ marginTop: 12, background: THEME.bg, borderRadius: 9, padding: 12 }}>
              <label style={styles.label}>{t("appBioReenterPassword")}</label>
              <input
                type="password" style={styles.input} value={bioPasswordInput}
                onChange={(e) => setBioPasswordInput(e.target.value)} dir="ltr" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleConfirmBiometricPassword(); }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={styles.smallButton} onClick={handleConfirmBiometricPassword} disabled={bioBusy || !bioPasswordInput}>
                  {bioBusy ? t("appBioVerifying") : t("appBioConfirmEnable")}
                </button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => { setBioAskingPassword(false); setBioPasswordInput(""); setBioError(""); }}>
                  {t("commonCancel")}
                </button>
              </div>
            </div>
          )}
        </div>

        {currentUser?.role === "ADMIN" && <ChangePasswordSection />}

        <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 14, marginTop: 14 }}>
          <p style={{ fontSize: 11, color: THEME.text3, fontWeight: 700, marginBottom: 10 }}>{t("contactInfoTitle")}</p>
          <label style={styles.label}>{t("mobileNumber")}</label>
          <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09xxxxxxxxx" />
          <label style={styles.label}>{t("orgEmail")}</label>
          <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@company.com" type="email" />

          {error && <p style={styles.error}>{error}</p>}
          {saved && <p style={{ color: "#166534", fontSize: 12.5, marginTop: 6 }}>{t("savedConfirm")}</p>}
          <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#aaa", fontSize: 11, marginTop: 20, direction: "ltr" }}>{APP_NAME}</p>
      </div>
    </div>
  );
}

// ---------- درباره‌ی IHMS ----------
function AboutIhms({ onBack }) {
  const { t, dir, lang } = useLanguage();
  const appearance = useAppearance();

  const todayDisplay = lang === "en"
    ? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : isoToJalaliDisplay(new Date().toISOString().slice(0, 10));

  const buildDisplay = typeof __BUILD_TIME__ !== "undefined"
    ? (lang === "en"
        ? new Date(__BUILD_TIME__).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : `${isoToJalaliDisplay(__BUILD_TIME__.slice(0, 10))} - ${new Date(__BUILD_TIME__).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`)
    : "—";

  const Row = ({ label, value, ltr }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${THEME.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: THEME.text3, fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: THEME.text, fontWeight: 600, direction: ltr ? "ltr" : dir, textAlign: dir === "rtl" ? "left" : "right" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("backToMenu")}</div>}
      <div style={{ ...styles.card, width: "auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <IhmsLogo size={88} src={appearance?.logoUrl} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, direction: "ltr", color: THEME.navy, fontWeight: 700, letterSpacing: "-0.01em" }}>{appearance?.systemName || APP_NAME}</h2>
        <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 22, fontWeight: 500 }}>{t("aboutFullTitleValue")}</p>

        <div style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
          <Row label={t("aboutVersion")} value="v1.0.0" ltr />
          <Row label={t("aboutLastUpdate")} value={todayDisplay} />
          <Row label={t("aboutBuild")} value={buildDisplay} />
          <Row label={t("aboutDeveloper")} value="Tohid Mirasadi" ltr />
          <Row
            label={t("aboutStatus")}
            value={<span style={{ background: "#dcfce7", color: "#166534", padding: "3px 10px", borderRadius: 999, fontSize: 11.5 }}>{t("aboutStatusValue")}</span>}
          />
          <Row label={t("aboutLanguageLabel")} value={t("aboutLanguageValue")} />
        </div>

        <p style={{ textAlign: "center", color: "#aaa", fontSize: 11, marginTop: 20 }}>{t("aboutCopyright")}</p>
      </div>
    </div>
  );
}

// ---------- مدیریت یکپارچه پیمانکاران (اطلاعات شرکت + حساب کاربری ورود) ----------
function ContractorManager({ onBack }) {
  const { t } = useLanguage();
  const [contractors, setContractors] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [contractDetails, setContractDetails] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jobPositionId, setJobPositionId] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    (async () => {
      const [c, jp] = await Promise.all([loadContractors(), loadActiveJobPositions()]);
      setContractors(c);
      setJobPositions(jp);
      setLoading(false);
    })();
  }, []);

  const usernameTaken = (uname, excludeId) =>
    SEED_USERS.some((u) => u.username === uname) || contractors.some((c) => c.username === uname && c.id !== excludeId);

  const handleAdd = async () => {
    const uname = username.trim();
    if (!name.trim() || !uname || !password || !jobPositionId) { setFormError(t("cmErrContractorRequired")); return; }
    if (!validatePasswordLength(password)) { setFormError(t("appPasswordMinCharsShort", { n: MIN_PASSWORD_LENGTH })); return; }
    if (usernameTaken(uname, null)) { setFormError(t("cmErrUsernameTaken")); return; }
    const inserted = await insertContractor({ name: name.trim(), contactPersonName: contactPersonName.trim(), startDate, contractDetails: contractDetails.trim(), username: uname, password, jobPositionId });
    if (!inserted || inserted.__error) { setFormError(t("cmErrSaveDetail", { detail: inserted?.message || t("cmUnknown") })); return; }
    await initializeNoAccess("contractor", inserted.id);
    setContractors([...contractors, inserted]);
    setName(""); setContactPersonName(""); setStartDate(""); setContractDetails(""); setUsername(""); setPassword(""); setJobPositionId(""); setFormError(""); setShowForm(false);
    alert(t("cmContractorCreatedInfo"));
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditData({ name: c.name, contactPersonName: c.contactPersonName, startDate: c.startDate, contractDetails: c.contractDetails, username: c.username, password: c.password, jobPositionId: c.jobPositionId });
  };
  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (id) => {
    const uname = (editData.username || "").trim();
    if (!editData.name?.trim() || !uname || !editData.password || !editData.jobPositionId) { alert(t("cmErrContractorFieldsEmpty")); return; }
    if (!validatePasswordLength(editData.password)) { alert(t("appPasswordMinCharsShort", { n: MIN_PASSWORD_LENGTH })); return; }
    if (usernameTaken(uname, id)) { alert(t("cmErrUsernameTakenOther")); return; }
    const updated = await updateContractorDB(id, { ...editData, name: editData.name.trim(), username: uname });
    if (!updated || updated.__error) { alert(t("cmErrSaveDetail", { detail: updated?.message || t("cmUnknown") })); return; }
    setContractors(contractors.map((c) => (c.id === id ? updated : c)));
    cancelEdit();
  };

  const handleDelete = async (id, name) => {
    if (confirm(t("cmDeleteContractorConfirm", { name }))) {
      await deleteContractorDB(id);
      setContractors(contractors.filter((c) => c.id !== id));
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#93a1b0" }}>{t("cmLoading")}</div>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("cmBackToMenu")}</div>}

      <div style={{ ...styles.menuCard, background: "#0d8f8a", color: "#fff", textAlign: "center" }} onClick={() => setShowForm((v) => !v)}>
        {showForm ? t("cmCloseForm") : t("cmAddContractor")}
      </div>

      {showForm && (
        <div style={styles.card}>
          <label style={styles.label}>{t("cmContractorName")}</label>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} dir="rtl" placeholder={t("cmContractorNamePlaceholder")} />
          <label style={styles.label}>{t("cmContactPerson")}</label>
          <input style={styles.input} value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("cmJobTitle")}</label>
          <select style={styles.input} value={jobPositionId} onChange={(e) => setJobPositionId(e.target.value)} dir="rtl">
            <option value="">{t("cmSelectPlaceholder")}</option>
            {jobPositions.map((jp) => <option key={jp.id} value={jp.id}>{jp.title}</option>)}
          </select>
          <label style={styles.label}>{t("cmStartDate")}</label>
          <JalaliDateInput value={startDate} onChange={setStartDate} />
          <label style={styles.label}>{t("cmContractDetails")}</label>
          <textarea style={{ ...styles.input, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} value={contractDetails} onChange={(e) => setContractDetails(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("cmUsernameForLogin")}</label>
          <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("cmPassword")}</label>
          <input style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} dir="rtl" />
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "-8px 0 8px" }}>{t("appMinCharsHint", { n: MIN_PASSWORD_LENGTH })}</p>
          {formError && <p style={styles.error}>{formError}</p>}
          <button type="button" style={styles.button} onClick={handleAdd}>{t("cmAddContractorBtn")}</button>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>{t("cmRegisteredContractors", { count: contractors.length })}</h3>
      {contractors.length === 0 && <p style={{ color: "#93a1b0" }}>{t("cmNoContractorsYet")}</p>}

      {contractors.map((c) =>
        editingId === c.id ? (
          <div key={c.id} style={styles.card}>
            <label style={styles.label}>{t("cmContractorName")}</label>
            <input style={styles.input} value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmContactPerson")}</label>
            <input style={styles.input} value={editData.contactPersonName || ""} onChange={(e) => setEditData({ ...editData, contactPersonName: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmJobTitle")}</label>
            <select style={styles.input} value={editData.jobPositionId || ""} onChange={(e) => setEditData({ ...editData, jobPositionId: e.target.value })} dir="rtl">
              <option value="">{t("cmSelectPlaceholder")}</option>
              {jobPositions.map((jp) => <option key={jp.id} value={jp.id}>{jp.title}</option>)}
            </select>
            <label style={styles.label}>{t("cmStartDate")}</label>
            <JalaliDateInput value={editData.startDate} onChange={(v) => setEditData({ ...editData, startDate: v })} />
            <label style={styles.label}>{t("cmContractDetails")}</label>
            <textarea style={{ ...styles.input, minHeight: 70, fontFamily: "inherit" }} value={editData.contractDetails} onChange={(e) => setEditData({ ...editData, contractDetails: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmUsername")}</label>
            <input style={styles.input} value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmPassword")}</label>
            <input style={styles.input} value={editData.password} onChange={(e) => setEditData({ ...editData, password: e.target.value })} dir="rtl" />
            <p style={{ fontSize: 10.5, color: THEME.text3, margin: "-8px 0 8px" }}>{t("appMinCharsHint", { n: MIN_PASSWORD_LENGTH })}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" style={styles.button} onClick={() => saveEdit(c.id)}>{t("commonSave")}</button>
              <button type="button" style={{ ...styles.button, background: "#5b6b7d" }} onClick={cancelEdit}>{t("commonCancel")}</button>
            </div>
          </div>
        ) : (
          <div key={c.id} style={{ ...styles.card, width: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{c.name}</div>
                {c.contactPersonName && <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{t("cmRepresentativeLabel", { name: c.contactPersonName })}</div>}
                {c.jobPositionTitle && <div style={{ fontSize: 12.5, color: "#0d8f8a", marginTop: 3, fontWeight: 600 }}>{c.jobPositionTitle}</div>}
                {c.startDate && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{t("cmStartLabel", { date: isoToJalaliDisplay(c.startDate) })}</div>}
                {c.contractDetails && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{t("cmContractLabel", { details: c.contractDetails })}</div>}
                <div style={{ fontSize: 13, color: "#0d8f8a", marginTop: 4, direction: "ltr", textAlign: "right" }}>{t("cmUserLabel", { username: c.username })}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.smallButton} onClick={() => startEdit(c)}>{t("cmEdit")}</button>
                <button type="button" style={{ ...styles.smallButton, background: "#c92a2a" }} onClick={() => handleDelete(c.id, c.name)}>{t("cmDelete")}</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ---------- مدیریت حساب‌های کارفرما/همکاران (فقط ادمین) ----------
function EmployerAccountManager({ onBack }) {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [jobPositionId, setJobPositionId] = useState("");
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    (async () => {
      const [a, jp] = await Promise.all([loadEmployerAccounts(), loadActiveJobPositions()]);
      setAccounts(a);
      setJobPositions(jp);
      setLoading(false);
    })();
  }, []);

  const usernameTaken = (uname, excludeId) =>
    SEED_USERS.some((u) => u.username === uname) || accounts.some((a) => a.username === uname && a.id !== excludeId);

  const handleAdd = async () => {
    const uname = username.trim();
    if (!name.trim() || !uname || !password || !jobPositionId) { setFormError(t("eamErrRequired")); return; }
    if (!validatePasswordLength(password)) { setFormError(t("appPasswordMinCharsShort", { n: MIN_PASSWORD_LENGTH })); return; }
    if (usernameTaken(uname, null)) { setFormError(t("cmErrUsernameTaken")); return; }
    const inserted = await insertEmployerAccount({ name: name.trim(), companyName: companyName.trim(), username: uname, password, canEdit, jobPositionId });
    if (!inserted || inserted.__error) { setFormError(t("cmErrSaveDetail", { detail: inserted?.message || t("cmUnknown") })); return; }
    await initializeNoAccess("employer", inserted.id);
    setAccounts([...accounts, inserted]);
    setName(""); setCompanyName(""); setUsername(""); setPassword(""); setCanEdit(true); setJobPositionId(""); setFormError(""); setShowForm(false);
    alert(t("eamAccountCreatedInfo"));
  };

  const startEdit = (a) => { setEditingId(a.id); setEditData({ name: a.name, companyName: a.companyName, username: a.username, password: a.password, canEdit: a.canEdit, jobPositionId: a.jobPositionId }); };
  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (id) => {
    const uname = (editData.username || "").trim();
    if (!editData.name?.trim() || !uname || !editData.password || !editData.jobPositionId) { alert(t("eamErrFieldsEmpty")); return; }
    if (!validatePasswordLength(editData.password)) { alert(t("appPasswordMinCharsShort", { n: MIN_PASSWORD_LENGTH })); return; }
    if (usernameTaken(uname, id)) { alert(t("eamErrUsernameTakenOther")); return; }
    const updated = await updateEmployerAccountDB(id, { ...editData, name: editData.name.trim(), username: uname });
    if (!updated || updated.__error) { alert(t("cmErrSaveDetail", { detail: updated?.message || t("cmUnknown") })); return; }
    setAccounts(accounts.map((a) => (a.id === id ? updated : a)));
    cancelEdit();
  };

  const handleDelete = async (id, name) => {
    if (confirm(t("eamDeleteAccountConfirm", { name }))) {
      await deleteEmployerAccountDB(id);
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#93a1b0" }}>{t("cmLoading")}</div>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("cmBackToMenu")}</div>}
      <p style={{ color: "#93a1b0", fontSize: 13 }}>{t("eamIntro")}</p>

      <div style={{ ...styles.menuCard, background: "#0d8f8a", color: "#fff", textAlign: "center" }} onClick={() => setShowForm((v) => !v)}>
        {showForm ? t("cmCloseForm") : t("eamAddAccount")}
      </div>

      {showForm && (
        <div style={styles.card}>
          <label style={styles.label}>{t("eamFullName")}</label>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("eamCompanyName")}</label>
          <input style={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("cmJobTitle")}</label>
          <select style={styles.input} value={jobPositionId} onChange={(e) => setJobPositionId(e.target.value)} dir="rtl">
            <option value="">{t("cmSelectPlaceholder")}</option>
            {jobPositions.map((jp) => <option key={jp.id} value={jp.id}>{jp.title}</option>)}
          </select>
          <label style={styles.label}>{t("cmUsername")}</label>
          <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} dir="rtl" />
          <label style={styles.label}>{t("cmPassword")}</label>
          <input style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} dir="rtl" />
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "-8px 0 8px" }}>{t("appMinCharsHint", { n: MIN_PASSWORD_LENGTH })}</p>
          <label style={styles.label}>{t("eamAccessLevel")}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setCanEdit(true)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: canEdit ? "2px solid #0d8f8a" : "1px solid #e3e8ee", background: canEdit ? "#e3f5f4" : "#fff", color: "#0d8f8a", fontSize: 13, cursor: "pointer", fontWeight: canEdit ? "bold" : "normal" }}>{t("eamFullAccess")}</button>
            <button type="button" onClick={() => setCanEdit(false)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: !canEdit ? "2px solid #123a54" : "1px solid #e3e8ee", background: !canEdit ? "#f1f5f9" : "#fff", color: "#334155", fontSize: 13, cursor: "pointer", fontWeight: !canEdit ? "bold" : "normal" }}>{t("eamViewOnly")}</button>
          </div>
          {formError && <p style={styles.error}>{formError}</p>}
          <button type="button" style={styles.button} onClick={handleAdd}>{t("eamAddAccountBtn")}</button>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>{t("eamRegisteredAccounts", { count: accounts.length })}</h3>
      {accounts.length === 0 && <p style={{ color: "#93a1b0" }}>{t("eamNoAccountsYet")}</p>}

      {accounts.map((a) =>
        editingId === a.id ? (
          <div key={a.id} style={styles.card}>
            <label style={styles.label}>{t("eamFullName")}</label>
            <input style={styles.input} value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("eamCompanyName")}</label>
            <input style={styles.input} value={editData.companyName || ""} onChange={(e) => setEditData({ ...editData, companyName: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmJobTitle")}</label>
            <select style={styles.input} value={editData.jobPositionId || ""} onChange={(e) => setEditData({ ...editData, jobPositionId: e.target.value })} dir="rtl">
              <option value="">{t("cmSelectPlaceholder")}</option>
              {jobPositions.map((jp) => <option key={jp.id} value={jp.id}>{jp.title}</option>)}
            </select>
            <label style={styles.label}>{t("cmUsername")}</label>
            <input style={styles.input} value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} dir="rtl" />
            <label style={styles.label}>{t("cmPassword")}</label>
            <input style={styles.input} value={editData.password} onChange={(e) => setEditData({ ...editData, password: e.target.value })} dir="rtl" />
            <p style={{ fontSize: 10.5, color: THEME.text3, margin: "-8px 0 8px" }}>{t("appMinCharsHint", { n: MIN_PASSWORD_LENGTH })}</p>
            <label style={styles.label}>{t("eamAccessLevel")}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => setEditData({ ...editData, canEdit: true })} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: editData.canEdit ? "2px solid #0d8f8a" : "1px solid #e3e8ee", background: editData.canEdit ? "#e3f5f4" : "#fff", color: "#0d8f8a", fontSize: 13, cursor: "pointer" }}>{t("eamFullAccessShort")}</button>
              <button type="button" onClick={() => setEditData({ ...editData, canEdit: false })} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: !editData.canEdit ? "2px solid #123a54" : "1px solid #e3e8ee", background: !editData.canEdit ? "#f1f5f9" : "#fff", color: "#334155", fontSize: 13, cursor: "pointer" }}>{t("eamViewOnly")}</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" style={styles.button} onClick={() => saveEdit(a.id)}>{t("commonSave")}</button>
              <button type="button" style={{ ...styles.button, background: "#5b6b7d" }} onClick={cancelEdit}>{t("commonCancel")}</button>
            </div>
          </div>
        ) : (
          <div key={a.id} style={{ ...styles.card, width: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{a.name}</div>
                {a.companyName && <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{t("eamCompanyLabel", { name: a.companyName })}</div>}
                {a.jobPositionTitle && <div style={{ fontSize: 12.5, color: "#0d8f8a", marginTop: 3, fontWeight: 600 }}>{a.jobPositionTitle}</div>}
                <div style={{ fontSize: 13, color: "#0d8f8a", marginTop: 4, direction: "ltr", textAlign: "right" }}>{t("cmUserLabel", { username: a.username })}</div>
                <span style={{ ...styles.badge, marginTop: 6, display: "inline-block", color: a.canEdit ? "#166534" : "#92400e", background: a.canEdit ? "#dcfce7" : "#fef3c7" }}>
                  {a.canEdit ? t("eamFullAccessShort") : t("eamViewOnly")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.smallButton} onClick={() => startEdit(a)}>{t("cmEdit")}</button>
                <button type="button" style={{ ...styles.smallButton, background: "#c92a2a" }} onClick={() => handleDelete(a.id, a.name)}>{t("cmDelete")}</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ---------- ثبت آنومالی جدید (بر اساس «فرم آنومالی») ----------
function AnomalyForm({ onBack, currentUser, onSaved }) {
  const { t } = useLanguage();
  const [contractorNames, setContractorNames] = useState([]);
  const [project, setProject] = useState("");
  const [contractor, setContractor] = useState("");
  const [subContractor, setSubContractor] = useState("");
  const [area, setArea] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHM());
  const [riskLevel, setRiskLevel] = useState("Med");
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [format, setFormat] = useState(ANOMALY_FORMATS[0].value);
  const [description, setDescription] = useState("");
  const [follower, setFollower] = useState("");
  const [needsRiskAssessment, setNeedsRiskAssessment] = useState(false);
  const [identifiedHazard, setIdentifiedHazard] = useState("");
  const [affectsBarrier, setAffectsBarrier] = useState(false);
  const [bowtieOptions, setBowtieOptions] = useState([]);
  const [selectedBowtieId, setSelectedBowtieId] = useState("");
  const [barrierOptions, setBarrierOptions] = useState([]);
  const [selectedBarrierIds, setSelectedBarrierIds] = useState([]);
  const [loadingBarriers, setLoadingBarriers] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const handlePickFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 2 - photos.length);
    if (files.length === 0) return;
    setPhotoBusy(true);
    try {
      const results = await Promise.all(files.map((f) => resizeImageFile(f)));
      setPhotos((prev) => [...prev, ...results]);
    } catch {
      setError(t("afErrPhotoLoad"));
    }
    setPhotoBusy(false);
  };

  const removePhoto = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  useEffect(() => {
    (async () => {
      const records = await loadContractors();
      setContractorNames(records.map((r) => r.name));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const cats = await loadActiveAnomalyCategories();
      setCategoryOptions(cats.map((c) => c.name));
      if (cats.length > 0) setCategory((prev) => prev || cats[0].name);
    })();
  }, []);

  useEffect(() => {
    if (!affectsBarrier || bowtieOptions.length > 0) return;
    loadBowtiesForLinking().then(setBowtieOptions);
  }, [affectsBarrier]);

  useEffect(() => {
    if (!selectedBowtieId) { setBarrierOptions([]); return; }
    setLoadingBarriers(true);
    setSelectedBarrierIds([]);
    loadBarriersForBowtie(selectedBowtieId).then((rows) => {
      setBarrierOptions(rows);
      setLoadingBarriers(false);
    });
  }, [selectedBowtieId]);

  const handleSubmit = async () => {
    if (!area.trim() || !description.trim()) {
      setError(t("afErrAreaDescRequired"));
      return;
    }
    if (needsRiskAssessment && !identifiedHazard.trim()) {
      setError(t("afErrHazardRequired"));
      return;
    }
    if (photos.length > 0 && isOnline()) {
      const { allowed, storageMb } = await checkUploadAllowed();
      if (!allowed) {
        setError(t("afErrStorageFull", { mb: storageMb }));
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const existing = await loadAnomaliesOfflineFirst();
    const record = {
      id: uid("anomaly"),
      trackingNumber: trackingNumber.trim() || `A-${String(existing.length + 1).padStart(4, "0")}`,
      project: project.trim(),
      contractor: contractor.trim(),
      subContractor: subContractor.trim(),
      area: area.trim(),
      date,
      time,
      riskLevel,
      category,
      format,
      description: description.trim(),
      correctiveAction: "",
      obstacles: "",
      follower: follower.trim(),
      sender: currentUser?.name || "",
      status: "open",
      closeDate: "",
      effectiveness: "",
      photoCount: photos.length,
    };
    const result = await offlineWrite({
      module: "anomalies", table: "anomalies", action: "insert",
      id: record.id, payload: anomalyRecordToDb(record),
    });
    if (!result.ok) {
      setError(t("afErrSaveDetail", { detail: result?.message || t("afUnknown") }));
      return;
    }
    if (affectsBarrier && selectedBarrierIds.length > 0) {
      const selections = selectedBarrierIds.map((barrierId) => {
        const b = barrierOptions.find((x) => x.id === barrierId);
        const bt = bowtieOptions.find((x) => x.id === selectedBowtieId);
        return { bowtieId: selectedBowtieId, bowtieTitle: bt?.title || "", barrierId, barrierLabel: b?.label || "" };
      });
      const linkResult = await linkAnomalyToBarriers(record.id, selections, currentUser?.name);
      if (linkResult?.__error) {
        // آنومالی با موفقیت ثبت شده؛ فقط ثبت ارتباط با Barrier ناموفق بوده —
        // نباید کل ثبت آنومالی را از دید کاربر ناموفق نشان بدهد
        alert(t("afBarrierLinkFailed", { message: linkResult.message }));
      } else {
        // اثربخشی همان بریرهایی که همین الان بهشان شاهد جدید اضافه شد، فوراً
        // بازمحاسبه می‌شود — منتظر نمی‌مانیم چون این عملیات نباید ثبت آنومالی
        // را کند کند؛ اگر ناموفق باشد هم بی‌سروصدا نادیده گرفته می‌شود
        recalculateForLinkedBarriers(selectedBarrierIds).catch(() => {});
      }
    }
    if (photos.length > 0) {
      for (const p of photos) {
        await offlineWriteFile({
          module: "anomalyPhotos", table: "anomaly_photos", bucket: "anomaly-photos",
          id: uid("photo"), includeIdInPayload: false,
          base64Data: p, contentType: "image/jpeg", fileFieldName: "photo",
          extraFields: { anomaly_id: record.id, stage: "report" },
        });
      }
    }
    if (needsRiskAssessment) {
      const hcmsResult = await createSuggestedHcmsFromAnomaly(record, identifiedHazard.trim(), currentUser?.name);
      if (hcmsResult?.__error) {
        // آنومالی با موفقیت ثبت شده؛ فقط ارزیابی ریسک پیشنهادی ساخته نشد — این
        // نباید کل ثبت آنومالی را از دید کاربر ناموفق نشان بدهد، ولی باید مطلع شود
        alert(t("afHcmsCreateFailed", { message: hcmsResult.message }));
      }
    }
    // ورود به گیت تأیید سرپرست/مدیر HSE — طبق طرح تأییدشده، فقط وقتی
    // ثبت‌کننده نقش Employer معمولی دارد (نه ادمین یا سرپرست/مدیر HSE
    // که خودشان صاحب اختیار تأیید هستند، پس نیازی به تأیید خودشان نیست).
    // مثل ثبت ارتباط Barrier بالا، این یک عملیات ثانویه‌ی best-effort
    // است — ناموفق‌بودنش، ثبت اصلی آنومالی را ناموفق نشان نمی‌دهد.
    if (currentUser?.role === "EMPLOYER") {
      submitToGate({
        moduleKey: "anomalyReport", recordId: record.id,
        recordLabel: `${record.trackingNumber} — ${record.area}`, direction: "employer_to_contractor",
      }, currentUser?.name).catch(() => {});
    }
    onSaved ? onSaved() : onBack && onBack();
    } catch (e) {
      // رفع باگ واقعی گزارش‌شده: قبلاً اگه هر خطای غیرمنتظره‌ای اینجا رخ
      // می‌داد، دکمه برای همیشه روی «در حال ثبت...» می‌موند، بدون هیچ
      // پیامی — چون setSaving(false) هیچ‌وقت اجرا نمی‌شد. الان حداقل پیام
      // واقعی خطا نشون داده می‌شه تا اگه دوباره رخ بده، دقیق مشخص بشه چرا.
      console.error("خطای غیرمنتظره در ثبت آنومالی:", e);
      setError(t("afErrUnexpected", { detail: e?.message || t("afUnknown") }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("cmBackToMenu")}</div>}

      <div style={{ ...styles.card, width: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <AlertTriangle size={20} color="#c92a2a" />
          <h3 style={{ margin: 0 }}>{t("afFormTitle")}</h3>
        </div>
        <p style={{ color: "#93a1b0", fontSize: 13, marginTop: 4 }}>{t("afFilledByEmployer")}</p>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("afProject")}</label>
            <input style={styles.input} value={project} onChange={(e) => setProject(e.target.value)} dir="rtl" />
          </div>
          <div>
            <label style={styles.label}>{t("afTrackingNumber")}</label>
            <input style={styles.input} placeholder={t("afTrackingAuto")} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} dir="rtl" />
          </div>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("afContractor")}</label>
            <select style={styles.input} value={contractor} onChange={(e) => setContractor(e.target.value)} dir="rtl">
              <option value="">{t("cmSelectPlaceholder")}</option>
              {contractorNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>{t("afSubContractor")}</label>
            <input style={styles.input} value={subContractor} onChange={(e) => setSubContractor(e.target.value)} dir="rtl" />
          </div>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("afAreaLocation")}</label>
            <input style={styles.input} value={area} onChange={(e) => setArea(e.target.value)} dir="rtl" placeholder={t("afAreaPlaceholder")} />
          </div>
          <div>
            <label style={styles.label}>{t("afDate")}</label>
            <JalaliDateInput value={date} onChange={setDate} />
          </div>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("afTime")}</label>
            <input style={styles.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>{t("afRiskLevel")}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {RISK_LEVELS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRiskLevel(r.value)}
                  style={{
                    flex: 1, padding: "8px 6px", borderRadius: 8, border: riskLevel === r.value ? `2px solid ${r.color}` : "1px solid #e3e8ee",
                    background: riskLevel === r.value ? r.bg : "#fff", color: r.color, fontSize: 13, cursor: "pointer", fontWeight: riskLevel === r.value ? "bold" : "normal",
                  }}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>{t("afCategory")}</label>
            <select style={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} dir="rtl">
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>{t("afFormat")}</label>
            <select style={styles.input} value={format} onChange={(e) => setFormat(e.target.value)} dir="rtl">
              {ANOMALY_FORMATS.map((f) => <option key={f.value} value={f.value}>{t(f.labelKey)}</option>)}
            </select>
          </div>
        </div>

        <label style={styles.label}>{t("afDescription")}</label>
        <textarea style={{ ...styles.input, minHeight: 100, resize: "vertical", fontFamily: "inherit" }} value={description} onChange={(e) => setDescription(e.target.value)} dir="rtl" />

        <label style={styles.label}>{t("afFollower")}</label>
        <input style={styles.input} value={follower} onChange={(e) => setFollower(e.target.value)} dir="rtl" />

        <label style={styles.label}>{t("afNeedsRiskAssessment")}</label>
        <div style={{ display: "flex", gap: 8, marginBottom: needsRiskAssessment ? 10 : 0 }}>
          <button type="button" onClick={() => setNeedsRiskAssessment(true)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: needsRiskAssessment ? "2px solid #0d8f8a" : "1px solid #e3e8ee", background: needsRiskAssessment ? "#e3f5f4" : "#fff", color: "#0d8f8a", fontSize: 13, cursor: "pointer" }}>{t("commonYes")}</button>
          <button type="button" onClick={() => setNeedsRiskAssessment(false)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: !needsRiskAssessment ? "2px solid #123a54" : "1px solid #e3e8ee", background: !needsRiskAssessment ? "#f1f5f9" : "#fff", color: "#334155", fontSize: 13, cursor: "pointer" }}>{t("commonNo")}</button>
        </div>
        {needsRiskAssessment && (
          <>
            <label style={styles.label}>{t("afIdentifiedHazard")}</label>
            <textarea style={{ ...styles.input, minHeight: 70, fontFamily: "inherit" }} value={identifiedHazard} onChange={(e) => setIdentifiedHazard(e.target.value)} dir="rtl" placeholder={t("afIdentifiedHazardPlaceholder")} />
          </>
        )}

        <label style={styles.label}>{t("afAffectsBarrier")}</label>
        <div style={{ display: "flex", gap: 8, marginBottom: affectsBarrier ? 10 : 0 }}>
          <button type="button" onClick={() => setAffectsBarrier(true)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: affectsBarrier ? "2px solid #0d8f8a" : "1px solid #e3e8ee", background: affectsBarrier ? "#e3f5f4" : "#fff", color: "#0d8f8a", fontSize: 13, cursor: "pointer" }}>{t("commonYes")}</button>
          <button type="button" onClick={() => { setAffectsBarrier(false); setSelectedBowtieId(""); setSelectedBarrierIds([]); }} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: !affectsBarrier ? "2px solid #123a54" : "1px solid #e3e8ee", background: !affectsBarrier ? "#f1f5f9" : "#fff", color: "#334155", fontSize: 13, cursor: "pointer" }}>{t("commonNo")}</button>
        </div>
        {affectsBarrier && (
          <div style={{ background: "#f7f9fa", border: "1px solid #e3e8ee", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: "#93a1b0", margin: "0 0 10px", lineHeight: 1.8 }}>
              {t("afBarrierEvidenceNote")}
            </p>
            <label style={styles.label}>BowTie</label>
            <select style={styles.input} value={selectedBowtieId} onChange={(e) => setSelectedBowtieId(e.target.value)} dir="rtl">
              <option value="">{t("cmSelectPlaceholder")}</option>
              {bowtieOptions.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>

            {selectedBowtieId && (
              <>
                <label style={styles.label}>{t("afBarrierMultiSelect")}</label>
                {loadingBarriers && <p style={{ fontSize: 11.5, color: "#93a1b0" }}>{t("commonLoading")}</p>}
                {!loadingBarriers && barrierOptions.length === 0 && <p style={{ fontSize: 11.5, color: "#93a1b0" }}>{t("afBowtieNoBarriers")}</p>}
                {!loadingBarriers && barrierOptions.map((b) => {
                  const checked = selectedBarrierIds.includes(b.id);
                  return (
                    <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 4px", fontSize: 12.5, color: "#152535", cursor: "pointer", borderBottom: "1px solid #eef1f5" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedBarrierIds((prev) => checked ? prev.filter((id) => id !== b.id) : [...prev, b.id])}
                      />
                      {b.label}
                      <span style={{ fontSize: 9.5, color: "#93a1b0", marginInlineStart: "auto" }}>{b.side === "preventive" ? t("afSidePreventive") : t("afSideRecovery")}</span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        )}

        <label style={styles.label}>{t("afAttachedPhotos", { count: photos.length })}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <label
            style={{
              ...styles.smallButton, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", position: "relative", overflow: "hidden",
              opacity: photoBusy || photos.length >= 2 ? 0.5 : 1, pointerEvents: photoBusy || photos.length >= 2 ? "none" : "auto",
            }}
          >
            <Camera size={16} /> {t("afTakePhoto")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
              onChange={(e) => { handlePickFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
          <label
            style={{
              ...styles.smallButton, flex: 1, background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", position: "relative", overflow: "hidden",
              opacity: photoBusy || photos.length >= 2 ? 0.5 : 1, pointerEvents: photoBusy || photos.length >= 2 ? "none" : "auto",
            }}
          >
            <ImagePlus size={16} /> {t("afAddFromGallery")}
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
              onChange={(e) => { handlePickFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>
        {photoBusy && <p style={{ fontSize: 12, color: "#93a1b0", marginTop: 8 }}>{t("afProcessingPhoto")}</p>}


        {photos.length > 0 && (
          <div style={styles.photoGrid}>
            {photos.map((src, idx) => (
              <div key={idx} style={styles.photoThumbWrap}>
                <img src={src} alt={t("afAttachmentAlt", { n: idx + 1 })} style={styles.photoThumb} />
                <button type="button" style={styles.photoRemoveBtn} onClick={() => removePhoto(idx)}>
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button type="button" style={styles.button} onClick={handleSubmit} disabled={saving}>
          {saving ? t("afSubmitting") : t("afSubmit")}
        </button>
      </div>
    </div>
  );
}

// ---------- لیست و پیگیری آنومالی‌ها ----------
function AnomalyList({ onBack, role, currentUser, readOnly, initialStatusFilter, initialRiskFilter, initialContractorFilter, initialExpandedAnomalyId }) {
  const { t } = useLanguage();
  const isAdmin = role === "ADMIN";
  // طبق تصمیم تأییدشده: تأیید نهایی آنومالی (بستن بعد از اقدام اصلاحی
  // پیمانکار) فقط برای سرپرست/مدیر HSE و ادمین مجاز است، نه هر
  // کارفرمایی معمولی. role (prop) همیشه "EMPLOYER" است (حتی برای حساب
  // سرپرست HSE — هر دو در EmployerDashboard میزبانی می‌شوند)، پس
  // مستقیم currentUser?.role چک می‌شود.
  const isReviewer = (currentUser?.role === "HSE_SUPERVISOR" || isAdmin) && !readOnly;
  const isReadOnlyReviewer = (currentUser?.role === "HSE_SUPERVISOR" || isAdmin) && !!readOnly;
  const isContractor = role === "CONTRACTOR";
  // ادمین علاوه بر تأیید/رد، می‌تواند مثل پیمانکار هم اقدام اصلاحی ثبت و ارسال کند
  const canActAsContractor = (isContractor || isAdmin) && !readOnly;
  const myContractorName = (currentUser?.name || "").trim().toLowerCase();

  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all");
  const [riskFilter, setRiskFilter] = useState(initialRiskFilter || "all");
  const [contractorFilter, setContractorFilter] = useState(initialContractorFilter || "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [linkedChatId, setLinkedChatId] = useState(null);
  const [linkedChatBusy, setLinkedChatBusy] = useState(false);
  const [linkedHcmsId, setLinkedHcmsId] = useState(null);
  const [linkedHcmsBusy, setLinkedHcmsBusy] = useState(false);
  const openLinkedHcms = async (a) => {
    setLinkedHcmsBusy(true);
    const rec = await getOrCreateHcmsForAnomaly(a, currentUser?.name);
    setLinkedHcmsBusy(false);
    if (rec?.__error) { alert(rec.message); return; }
    setLinkedHcmsId(a.id);
  };
  const openLinkedChat = async (a) => {
    setLinkedChatBusy(true);
    let initialParticipants = [];
    if (a.contractor) {
      const uname = await resolveContractorUsername(a.contractor);
      if (uname) initialParticipants = [{ username: uname, fullName: a.contractor, role: "CONTRACTOR" }];
    }
    const convId = await findOrCreateLinkedConversation(currentUser, "anomaly", a.id, t("anomalyConvTitle", { num: a.trackingNumber }), initialParticipants);
    setLinkedChatBusy(false);
    if (convId?.__error) { alert(convId.message); return; }
    setLinkedChatId(convId);
  };
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState({});
  const [photosMap, setPhotosMap] = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [actionText, setActionText] = useState("");
  const [actionPhotos, setActionPhotos] = useState([]);
  const [actionPhotoBusy, setActionPhotoBusy] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = async () => {
    // طبق گزارش صریح: اگر بارگذاری با خطا مواجه شود، صفحه نباید برای
    // همیشه روی «در حال بارگذاری» بماند — finally تضمین می‌کند
    // setLoading(false) در هر حالتی (موفق یا ناموفق) اجرا شود.
    try {
      setAnomalies(await loadAnomaliesOfflineFirst());
    } catch (e) {
      console.error("بارگذاری لیست آنومالی‌ها ناموفق بود", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // طبق گزارش صریح: کلیک روی «مشاهده» از کارت «کارهای در دست اقدام من»
  // باید همان آنومالی را مستقیم باز کند، نه فقط لیست را نشان بدهد و
  // کاربر مجبور شود پایین لیست بگردد دنبالش. دقیقاً همان الگوی
  // initialSelectedPersonnelId موجود در PersonnelDashboard.
  useEffect(() => {
    if (!initialExpandedAnomalyId || anomalies.length === 0) return;
    const found = anomalies.find((a) => a.id === initialExpandedAnomalyId);
    if (found) startExpand(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExpandedAnomalyId, anomalies.length]);

  // طبق طرح تأییدشده‌ی گیت HSE: تا سرپرست/مدیر HSE تأیید نکند، هیچ
  // آنومالی‌ای که هنوز pending_approval است نباید سمت پیمانکار دیده
  // شود. فقط برای isContractor بارگذاری می‌شود — کارفرما/ادمین همیشه
  // همه‌چیز (از جمله وضعیت در انتظار تأیید) را می‌بینند.
  const [pendingGateRecordIds, setPendingGateRecordIds] = useState(null);
  useEffect(() => {
    if (!isContractor) { setPendingGateRecordIds(new Set()); return; }
    loadPendingGateItems("anomalyReport").then((items) => {
      setPendingGateRecordIds(new Set(items.map((it) => it.recordId)));
    }).catch(() => setPendingGateRecordIds(new Set()));
  }, [isContractor]);

  useEffect(() => { loadGateData(); }, [isContractor, isReviewer, currentUser?.username]);

  const scoped = (isContractor && myContractorName
    ? anomalies.filter((a) => (a.contractor || "").trim().toLowerCase() === myContractorName)
    : anomalies
  ).filter((a) => !isContractor || !pendingGateRecordIds || !pendingGateRecordIds.has(a.id));

  // برای پرکردن dropdown فیلتر پیمانکار (فقط ادمین/کارفرما می‌بینند) — از
  // کل لیست بارگذاری‌شده مشتق می‌شود، نه از نتیجه‌ی فیلترشده، تا با انتخاب
  // یک فیلتر دیگر، گزینه‌های این dropdown خودش کوچک نشود
  const contractorNamesInList = [...new Set(anomalies.map((a) => (a.contractor || "").trim()).filter(Boolean))].sort();

  const filtered = scoped.filter((a) => {
    if (statusFilter === "not_closed" && a.status === "Closed") return false;
    else if (statusFilter !== "all" && statusFilter !== "not_closed" && a.status !== statusFilter) return false;
    if (riskFilter !== "all" && a.riskLevel !== riskFilter) return false;
    if (!isContractor && contractorFilter !== "all" && (a.contractor || "").trim().toLowerCase() !== contractorFilter.trim().toLowerCase()) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${a.trackingNumber} ${a.contractor} ${a.area} ${a.description} ${a.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    total: scoped.length,
    open: scoped.filter((a) => a.status === "open").length,
    review: scoped.filter((a) => a.status === "pending_review").length,
    closed: scoped.filter((a) => a.status === "Closed").length,
    high: scoped.filter((a) => a.riskLevel === "High" && a.status !== "Closed").length,
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "risk") {
      const order = { High: 0, Med: 1, Low: 2 };
      return (order[a.riskLevel] ?? 1) - (order[b.riskLevel] ?? 1);
    }
    // طبق خواسته‌ی صریح: رکورد تازه‌ثبت‌شده باید بالای لیست بیاید — یعنی
    // ترتیب باید بر اساس زمان واقعیِ ثبت (createdAt) باشد، نه تاریخ وقوع
    // (a.date) که کاربر دستی وارد می‌کند. قبلاً a.date اولویت داشت، پس یک
    // آنومالیِ تازه‌ثبت‌شده ولی با تاریخ وقوعِ قدیمی‌تر (مثلاً گزارش دیرهنگام)
    // در وسط/پایین لیست گم می‌شد. این دقیقاً همان الگویی است که در
    // Personnel/Machinery/Scaffold از قبل درست پیاده‌سازی شده بود.
    const at = a.createdAt || a.date || "", bt = b.createdAt || b.date || "";
    return sort === "oldest" ? at.localeCompare(bt) : bt.localeCompare(at);
  });

  const handleBulkDelete = async (ids) => {
    if (readOnly) { alert(t("errNoDeletePermission")); return; }
    if (!confirm(t("confirmDeleteCount", { count: ids.length }))) return;
    for (const id of ids) {
      await offlineWrite({ module: "anomalies", table: "anomalies", action: "delete", id, payload: {} });
      // طبق گزارش صریح: بعد از حذف خودِ رکورد، رکورد گیت (در انتظار
      // تأیید/ارجاع‌شده) مربوطه هم پاک شود — وگرنه یتیم می‌ماند و برای
      // همیشه در «کارهای در دست اقدام من» باقی می‌ماند.
      deleteGateItemsForRecord("anomalyReport", id).catch(() => {});
    }
    setAnomalies(anomalies.filter((a) => !ids.includes(a.id)));
  };

  const resetActionState = () => {
    setShowManualEdit(false);
    setActionText("");
    setActionPhotos([]);
    setShowRejectBox(false);
    setRejectNote("");
    setAssigningGateId(null);
    setAssignGateTo("");
    setReviewingGateId(null);
    setReviewComment("");
    setGateMessage("");
  };

  const startExpand = async (a) => {
    if (expandedId === a.id) { setExpandedId(null); resetActionState(); return; }
    setExpandedId(a.id);
    resetActionState();
    setDraft({
      correctiveAction: a.correctiveAction || "",
      obstacles: a.obstacles || "",
      follower: a.follower || "",
      status: a.status || "open",
      closeDate: a.closeDate || "",
      effectiveness: a.effectiveness || "",
    });
    if (a.photoCount > 0 && !photosMap[a.id]) {
      setPhotosLoading(true);
      const photos = await loadAnomalyPhotos(a.id);
      setPhotosMap((prev) => ({ ...prev, [a.id]: photos }));
      setPhotosLoading(false);
    }
  };

  const removeExistingPhoto = async (anomalyId, photoId) => {
    const current = photosMap[anomalyId] || [];
    const updated = current.filter((p) => p.id !== photoId);
    setPhotosMap((prev) => ({ ...prev, [anomalyId]: updated }));
    await offlineWrite({ module: "anomalyPhotos", table: "anomaly_photos", action: "delete", id: photoId, payload: {} });
    await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: anomalyId, payload: { photo_count: updated.length } });
    setAnomalies(anomalies.map((a) => (a.id === anomalyId ? { ...a, photoCount: updated.length, syncStatus: "pending" } : a)));
  };

  const saveDraft = async (id) => {
    const patch = {
      ...draft,
      closeDate: draft.status === "Closed" ? (draft.closeDate || todayISO()) : "",
    };
    await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id, payload: anomalyPatchToDb(patch) });
    setAnomalies(anomalies.map((a) => (a.id === id ? { ...a, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : a)));
    setExpandedId(null);
  };

  const handleDelete = async (id, trackingNumber) => {
    if (readOnly) { alert(t("errNoDeletePermission")); return; }
    if (confirm(t("confirmDeleteAnomaly", { num: trackingNumber }))) {
      await offlineWrite({ module: "anomalies", table: "anomalies", action: "delete", id, payload: {} });
      // طبق گزارش صریح: بعد از حذف خودِ رکورد، رکورد گیت مربوطه هم پاک
      // شود — وگرنه یتیم می‌ماند و برای همیشه در «کارهای در دست اقدام
      // من» باقی می‌ماند (دقیقاً همان گزارش کمپکتور حذف‌شده).
      deleteGateItemsForRecord("anomalyReport", id).catch(() => {});
      setAnomalies(anomalies.filter((a) => a.id !== id));
    }
  };

  const handleActionPickFiles = async (fileList) => {
    if (!canActAsContractor) { alert(t("errNoCorrectiveActionPermission")); return; }
    const files = Array.from(fileList || []).slice(0, 2 - actionPhotos.length);
    if (files.length === 0) return;
    setActionPhotoBusy(true);
    try {
      const results = await Promise.all(files.map((f) => resizeImageFile(f)));
      setActionPhotos((prev) => [...prev, ...results]);
    } catch {
      // نادیده گرفته می‌شود؛ کاربر می‌تواند دوباره تلاش کند
    }
    setActionPhotoBusy(false);
  };
  const removeActionPhoto = (idx) => setActionPhotos((prev) => prev.filter((_, i) => i !== idx));

  const submitForReview = async (a) => {
    if (!canActAsContractor) { alert(t("errNoCorrectiveActionPermission")); return; }
    if (!actionText.trim()) return;
    if (actionPhotos.length > 0 && isOnline()) {
      const { allowed, storageMb } = await checkUploadAllowed();
      if (!allowed) {
        alert(t("errStorageFullNoPhoto", { mb: storageMb }));
        return;
      }
    }
    setActionSaving(true);
    if (actionPhotos.length > 0) {
      for (const p of actionPhotos) {
        await offlineWriteFile({
          module: "anomalyPhotos", table: "anomaly_photos", bucket: "anomaly-photos",
          id: uid("photo"), includeIdInPayload: false,
          base64Data: p, contentType: "image/jpeg", fileFieldName: "photo",
          extraFields: { anomaly_id: a.id, stage: "fix" },
        });
      }
    }
    const newPhotoCount = a.photoCount + actionPhotos.length;
    const patch = { status: "pending_review", contractorAction: actionText.trim(), photoCount: newPhotoCount };
    await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: a.id, payload: anomalyPatchToDb(patch) });
    setAnomalies(anomalies.map((x) => (x.id === a.id ? { ...x, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : x)));
    // ورود به گیت دوم — بازبینی داخلی کارفرما قبل از تأیید نهایی. طبق
    // خواسته‌ی صریح، سرپرست/مدیر HSE الان می‌تواند این مورد را به یک
    // کارشناس ارجاع بدهد یا خودش مستقیم تأیید کند؛ چون رابط کاربری گیت
    // کاملاً عمومی ساخته شده (بدون فرض جهت خاص)، همان دکمه‌های موجود
    // ارجاع/بررسی/تأیید خودکار برای این مورد هم کار می‌کنند.
    submitToGate({
      moduleKey: "anomalyReport", recordId: a.id,
      recordLabel: `${a.trackingNumber} — ${a.area}`, direction: "contractor_to_employer",
    }, currentUser?.name).then((res) => {
      if (res?.__error) console.error("ورود به گیت دوم (بازبینی کارفرما) شکست خورد:", res.message);
    }).catch((err) => console.error("ورود به گیت دوم (بازبینی کارفرما) شکست خورد:", err));
    await loadGateData();
    setPhotosMap((prev) => ({ ...prev, [a.id]: undefined }));
    setActionSaving(false);
    setExpandedId(null);
    resetActionState();
  };

  const approveAnomaly = async (a) => {
    if (!isReviewer) { alert(t("errNoApprovePermission")); return; }
    setReviewSaving(true);
    const patch = { status: "Closed", closeDate: todayISO() };
    await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: a.id, payload: anomalyPatchToDb(patch) });
    setAnomalies(anomalies.map((x) => (x.id === a.id ? { ...x, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : x)));
    // تأیید مستقیم بدون عبور از گیت هم مجاز است (طبق خواسته‌ی صریح) — ولی
    // اگر یک رکورد گیت باز برای همین مورد وجود دارد، همان‌جا هم بسته
    // می‌شود تا تاریخچه‌ی گیت با وضعیت واقعی آنومالی ناهماهنگ نماند.
    if (gateMap[a.id]) approveGateItem(gateMap[a.id].id, currentUser?.name).catch(() => {});
    setReviewSaving(false);
    setExpandedId(null);
    resetActionState();
    await loadGateData();
  };

  const rejectAnomaly = async (a) => {
    if (!isReviewer) { alert(t("errNoRejectPermission")); return; }
    setReviewSaving(true);
    const patch = { status: "open", reviewNote: rejectNote.trim() };
    await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: a.id, payload: anomalyPatchToDb(patch) });
    setAnomalies(anomalies.map((x) => (x.id === a.id ? { ...x, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : x)));
    if (gateMap[a.id]) rejectGateItem(gateMap[a.id].id, currentUser?.name, rejectNote.trim() || t("alRejectReturnDefaultNote")).catch(() => {});
    setReviewSaving(false);
    setExpandedId(null);
    resetActionState();
    await loadGateData();
  };

  const riskMeta = (level) => RISK_LEVELS.find((r) => r.value === level) || RISK_LEVELS[1];
  const statusMeta = (status) => {
    if (status === "Closed") return { label: t("anomStatusClosed"), color: "#166534", bg: "#dcfce7", Icon: CheckCircle2 };
    if (status === "pending_review") return { label: t("anomStatusPendingReview"), color: "#1d4ed8", bg: "#dbeafe", Icon: Clock };
    return { label: t("anomStatusOpen"), color: "#92400e", bg: "#fef3c7", Icon: Clock };
  };

  // ---------- گیت تأیید سرپرست/مدیر HSE (گردش‌کار سه‌مرحله‌ای) ----------
  // نگاشت anomaly.id → آخرین رکورد گیت آن (اگر وجود داشته باشد). فقط
  // برای isReviewer یا کارشناسانی که ممکن است چیزی به آن‌ها ارجاع شده
  // باشد بارگذاری می‌شود — نه پیمانکار (که این گیت اصلاً برایش معنا ندارد).
  const [gateMap, setGateMap] = useState({});
  const [gateStaff, setGateStaff] = useState([]);
  const [assigningGateId, setAssigningGateId] = useState(null); // anomaly.id در حال ارجاع
  const [assignGateTo, setAssignGateTo] = useState("");
  const [reviewingGateId, setReviewingGateId] = useState(null); // anomaly.id در حال ارسال نتیجه‌ی بررسی
  const [reviewComment, setReviewComment] = useState("");
  const [gateBusy, setGateBusy] = useState(null);
  const [gateMessage, setGateMessage] = useState("");

  const loadGateData = async () => {
    if (isContractor) return; // این گیت فقط سمت کارفرما معناداراست
    // نمایش وضعیت ارجاع (نام کارشناس + برچسب «ارجاع‌شده برای بررسی») باید
    // برای هر کاربر غیرپیمانکار دیده شود — هم برای سرپرست HSE‌ای که خودش
    // ارجاع داده، هم برای کارشناس کارفرمایی که ارجاع به او انجام شده (حتی
    // اگر خودش isReviewer نباشد) — نه فقط کسی که مجاز به اقدام است؛ پس
    // pending و gateStaff دیگر مشروط به isReviewer نیستند (فقط دکمه‌های
    // اقدام پایین‌تر همچنان محدودند). دقیقاً همان رفعِ MachineryDashboard.
    // طبق گزارش صریح: بعد از اینکه سرپرست موردی را به کارشناسی ارجاع
    // می‌دهد، آن مورد دیگر نه در pending (چون از pending_approval خارج
    // شده) و نه در mine خودِ سرپرست (چون به شخص دیگری واگذار شده) نیست —
    // یعنی از دید ارجاع‌دهنده کاملاً ناپدید می‌شود. assignedReviewAll این
    // شکاف را می‌بندد: همه‌ی موارد «ارجاع‌شده» شرکت را می‌آورد، صرف‌نظر از
    // اینکه چه کسی ارجاع داده یا به چه کسی ارجاع شده.
    const [pending, mine, staff, assignedReviewAll] = await Promise.all([
      loadPendingGateItems("anomalyReport"),
      loadAssignedGateItems(currentUser?.username).then((rows) => rows.filter((r) => r.moduleKey === "anomalyReport")),
      loadCompanyStaffOptions(),
      loadAssignedReviewItemsForModule("anomalyReport"),
    ]);
    const map = {};
    [...pending, ...assignedReviewAll, ...mine].forEach((it) => { map[it.recordId] = it; });
    setGateMap(map);
    setGateStaff(staff);
  };

  const handleAssignForReview = async (a) => {
    const gateItem = gateMap[a.id];
    if (!gateItem || !assignGateTo) return;
    setGateBusy(a.id); setGateMessage("");
    const result = await assignForReview(gateItem.id, assignGateTo, currentUser?.name);
    setGateBusy(null);
    if (result?.__error) { setGateMessage(result.message); return; }
    setAssigningGateId(null); setAssignGateTo("");
    await loadGateData();
  };

  const handleSubmitReview = async (a) => {
    const gateItem = gateMap[a.id];
    if (!gateItem) return;
    setGateBusy(a.id); setGateMessage("");
    const result = await submitReview(gateItem.id, currentUser?.username, reviewComment);
    setGateBusy(null);
    if (result?.__error) { setGateMessage(result.message); return; }
    setReviewingGateId(null); setReviewComment("");
    await loadGateData();
  };

  const handleApproveGate = async (a) => {
    const gateItem = gateMap[a.id];
    if (!gateItem) return;
    setGateBusy(a.id); setGateMessage("");
    const result = await approveGateItem(gateItem.id, currentUser?.name);
    if (result?.__error) { setGateBusy(null); setGateMessage(result.message); return; }
    // گیت دوم (اقدام اصلاحی پیمانکار → بازبینی کارفرما): «تأیید نهایی»
    // یعنی خودِ آنومالی هم واقعاً بسته شود — برخلاف گیت اول که فقط دید
    // پیمانکار را آزاد می‌کند و به تغییر وضعیت آنومالی نیازی ندارد.
    if (gateItem.direction === "contractor_to_employer") {
      const patch = { status: "Closed", closeDate: todayISO() };
      await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: a.id, payload: anomalyPatchToDb(patch) });
      setAnomalies(anomalies.map((x) => (x.id === a.id ? { ...x, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : x)));
    }
    setGateBusy(null);
    await loadGateData();
  };

  const handleRejectGate = async (a, note) => {
    const gateItem = gateMap[a.id];
    if (!gateItem) return;
    setGateBusy(a.id); setGateMessage("");
    const result = await rejectGateItem(gateItem.id, currentUser?.name, note);
    if (result?.__error) { setGateBusy(null); setGateMessage(result.message); return; }
    // گیت دوم: رد یعنی آنومالی به «باز» برمی‌گردد تا پیمانکار دوباره
    // اقدام اصلاحی ثبت کند — دقیقاً همان رفتار rejectAnomaly.
    if (gateItem.direction === "contractor_to_employer") {
      const patch = { status: "open", reviewNote: note || "" };
      await offlineWrite({ module: "anomalies", table: "anomalies", action: "update", id: a.id, payload: anomalyPatchToDb(patch) });
      setAnomalies(anomalies.map((x) => (x.id === a.id ? { ...x, ...patch, syncStatus: isOnline() ? "synced" : "pending" } : x)));
    }
    setGateBusy(null);
    await loadGateData();
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#93a1b0" }}>{t("commonLoading")}</div>;

  if (linkedChatId) {
    return <ChatThread conversationId={linkedChatId} currentUser={currentUser} onBack={() => setLinkedChatId(null)} />;
  }
  if (linkedHcmsId) {
    return <HcmsDashboard focusAnomalyId={linkedHcmsId} currentUser={currentUser} onBack={() => setLinkedHcmsId(null)} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("cmBackToMenu")}</div>}

      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statNum}>{counts.total}</div>
          <div style={styles.statLabel}>{t("statTotalItems")}</div>
        </div>
        <div style={{ ...styles.statBox, background: "#fef3c7" }}>
          <div style={{ ...styles.statNum, color: "#92400e" }}>{counts.open}</div>
          <div style={styles.statLabel}>{t("anomStatusOpen")}</div>
        </div>
        <div style={{ ...styles.statBox, background: "#dbeafe" }}>
          <div style={{ ...styles.statNum, color: "#1d4ed8" }}>{counts.review}</div>
          <div style={styles.statLabel}>{t("anomStatusPendingReview")}</div>
        </div>
        <div style={{ ...styles.statBox, background: "#dcfce7" }}>
          <div style={{ ...styles.statNum, color: "#166534" }}>{counts.closed}</div>
          <div style={styles.statLabel}>{t("anomStatusClosed")}</div>
        </div>
        <div style={{ ...styles.statBox, background: "#fee2e2" }}>
          <div style={{ ...styles.statNum, color: "#991b1b" }}>{counts.high}</div>
          <div style={styles.statLabel}>{t("statHighRiskOpen")}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          style={{ ...styles.smallButton, flex: 1, background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => exportAnomaliesExcel(sorted, isContractor ? t("expAnomaliesTitleContractor", { name: currentUser?.name || t("expDefaultContractorName") }) : t("expAnomaliesTitleAll"), currentUser?.companyId)}
          disabled={sorted.length === 0}
        >
          <FileSpreadsheet size={15} /> {t("exportExcelButton")}
        </button>
        <button
          type="button"
          style={{ ...styles.smallButton, flex: 1, background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => exportAnomaliesPdf(sorted, isContractor ? t("expAnomaliesTitleContractor", { name: currentUser?.name || t("expDefaultContractorName") }) : t("expAnomaliesTitleAll"))}
          disabled={sorted.length === 0}
        >
          <FileText size={15} /> {t("exportPdfButton")}
        </button>
      </div>

      <h3 style={{ marginTop: 22, fontSize: 15.5, color: THEME.navy, fontWeight: 700 }}>{t("registeredItemsCount", { count: sorted.length })}</h3>

      <DataView
        items={sorted}
        getId={(a) => a.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("anomalySearchPlaceholder")}
        sortOptions={[{ value: "newest", label: t("sortNewest") }, { value: "oldest", label: t("sortOldest") }, { value: "risk", label: t("sortRisk") }]}
        sortValue={sort}
        onSortChange={setSort}
        filterSlot={
          <>
            <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} dir="rtl">
              <option value="all">{t("filterAllStatuses")}</option>
              <option value="not_closed">{t("filterNotClosed")}</option>
              <option value="open">{t("anomStatusOpen")}</option>
              <option value="pending_review">{t("anomStatusPendingReview")}</option>
              <option value="Closed">{t("anomStatusClosed")}</option>
            </select>
            <select style={styles.filterSelect} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} dir="rtl">
              <option value="all">{t("filterAllRiskLevels")}</option>
              {RISK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.value}</option>)}
            </select>
            {!isContractor && (
              <select style={styles.filterSelect} value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} dir="rtl">
                <option value="all">{t("filterAllContractors")}</option>
                {contractorNamesInList.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            )}
          </>
        }
        bulkActions={isReviewer && !readOnly ? [{ label: t("bulkDelete"), danger: true, onClick: handleBulkDelete }] : null}
        emptyMessage={t("noItemsFound")}
        columns={[
          {
            key: "tracking", label: t("colTrackingRisk"),
            render: (a) => (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: THEME.navy }}>{a.trackingNumber}</span>
                <StatusPill label={a.riskLevel} color={riskMeta(a.riskLevel).color} bg={riskMeta(a.riskLevel).bg} />
                {a.syncStatus && a.syncStatus !== "synced" && (
                  <SyncStatusBadge
                    status={a.syncStatus}
                    onRetry={async (e) => {
                      e.stopPropagation();
                      const queue = await getQueue();
                      const item = queue.find((q) => q.module === "anomalies" && q.recordId === a.id);
                      if (item) { await retryItemNow(item.queueId); load(); }
                      else load();
                    }}
                  />
                )}
              </div>
            ),
          },
          { key: "desc", label: t("colDescription"), render: (a) => <span style={{ display: "block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</span> },
          {
            key: "meta", label: t("colAreaContractor"),
            render: (a) => <span style={{ fontSize: 11.5, color: THEME.text3 }}>{a.area} {a.contractor && `· ${a.contractor}`} {a.date && `· ${isoToJalaliDisplay(a.date)}`}</span>,
          },
          {
            key: "status", label: t("colStatus"),
            render: (a) => {
              const sm = statusMeta(a.status);
              const gi = gateMap[a.id];
              const assignedExpertName = gi?.status === "assigned_review" ? (gateStaff.find((s) => s.username === gi.assignedTo)?.name || gi.assignedTo) : null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <StatusPill label={sm.label} color={sm.color} bg={sm.bg} />
                  {assignedExpertName && (
                    <span style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 600 }}>{t("alAssignedToExpertPrefix")} {assignedExpertName}</span>
                  )}
                </div>
              );
            },
          },
        ]}
        renderRowActions={(a) => (
          <button type="button" style={styles.smallButton} onClick={() => startExpand(a)}>
            {expandedId === a.id ? t("commonClose") : t("viewAction")}
          </button>
        )}
        renderCard={(a) => {
          const rm = riskMeta(a.riskLevel);
          const sm = statusMeta(a.status);
          const isOpenCard = expandedId === a.id;
          const giCard = gateMap[a.id];
          const assignedExpertNameCard = giCard?.status === "assigned_review" ? (gateStaff.find((s) => s.username === giCard.assignedTo)?.name || giCard.assignedTo) : null;
          return (
            <div style={{ ...styles.card, width: "auto", margin: 0, borderInlineStart: `4px solid ${rm.color}`, padding: "18px 20px", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => startExpand(a)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: THEME.navy, fontSize: 14.5 }}>{a.trackingNumber}</span>
                    <StatusPill label={a.riskLevel} color={rm.color} bg={rm.bg} />
                    <span style={{ ...styles.badge, color: sm.color, background: sm.bg }}>
                      <sm.Icon size={12} style={{ display: "inline", marginLeft: 3 }} />{sm.label}
                    </span>
                    {a.category && <span style={styles.badge}>{a.category}</span>}
                    {a.syncStatus && a.syncStatus !== "synced" && (
                      <SyncStatusBadge
                        status={a.syncStatus}
                        onRetry={async (e) => {
                          e.stopPropagation();
                          const queue = await getQueue();
                          const item = queue.find((q) => q.module === "anomalies" && q.recordId === a.id);
                          if (item) { await retryItemNow(item.queueId); load(); }
                          else load();
                        }}
                      />
                    )}
                  </div>
                  {assignedExpertNameCard && (
                    <div style={{ fontSize: 10.5, color: "#1d4ed8", fontWeight: 600, marginTop: 4 }}>{t("alAssignedToExpertPrefix")} {assignedExpertNameCard}</div>
                  )}
                  <div style={{ fontSize: 14, marginTop: 9, color: THEME.text }}>{a.description}</div>
                  <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 7, fontWeight: 500 }}>
                    {a.area} {a.contractor && `· ${a.contractor}`} {a.date && `· ${isoToJalaliDisplay(a.date)}`} {a.sender && `· ${t("submittedByLabel", { name: a.sender })}`}
                  </div>
                </div>
                <ChevronRight size={18} color={THEME.text3} style={{ transform: isOpenCard ? "rotate(-90deg)" : "none", transition: "transform .15s", flexShrink: 0, marginRight: 6 }} />
              </div>
            </div>
          );
        }}
        expandedId={expandedId}
        renderExpanded={(a) => {
          const photos = photosMap[a.id] || [];
          const reportPhotos = photos.filter((p) => p.stage !== "fix");
          const fixPhotos = photos.filter((p) => p.stage === "fix");
          return (
          <div style={{ ...styles.card, width: "auto", margin: 0, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 14.5, color: THEME.navy, fontWeight: 700 }}>{a.trackingNumber}</h3>
                <p style={{ margin: 0, fontSize: 13, color: THEME.text, lineHeight: 1.8 }}>{a.description}</p>
              </div>
              <button type="button" style={{ ...styles.smallButton, background: THEME.teal, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={() => openLinkedChat(a)} disabled={linkedChatBusy}>
                <MessageCircle size={13} /> {linkedChatBusy ? "..." : t("chatAboutThis")}
              </button>
              <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={() => openLinkedHcms(a)} disabled={linkedHcmsBusy}>
                <ShieldAlert size={13} /> {linkedHcmsBusy ? "..." : t("hcmsRiskAssessment")}
              </button>
            </div>

            {a.reviewNote && a.status === "open" && (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                <b>{t("returnedByEmployer")}</b> {a.reviewNote}
              </div>
            )}

            {a.photoCount > 0 && (
              <div style={{ marginBottom: 16 }}>
                {photosLoading && !photosMap[a.id] ? (
                  <p style={{ fontSize: 12, color: "#93a1b0" }}>{t("loadingPhotos")}</p>
                ) : (
                  <>
                    {reportPhotos.length > 0 && (
                      <>
                        <label style={styles.label}>{t("initialReportPhotos")}</label>
                        <div style={styles.photoGrid}>
                          {reportPhotos.map((p, idx) => (
                            <div key={p.id} style={styles.photoThumbWrap}>
                              <img src={p.photo} alt={t("reportPhotoAlt", { n: idx + 1 })} style={styles.photoThumb} onClick={() => setViewerSrc(p.photo)} />
                              {isReviewer && (
                                <button type="button" style={styles.photoRemoveBtn} onClick={() => removeExistingPhoto(a.id, p.id)}>
                                  <Trash2 size={12} color="#fff" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {fixPhotos.length > 0 && (
                      <>
                        <label style={styles.label}>{t("correctiveActionPhotos")}</label>
                        <div style={styles.photoGrid}>
                          {fixPhotos.map((p, idx) => (
                            <div key={p.id} style={styles.photoThumbWrap}>
                              <img src={p.photo} alt={t("actionPhotoAlt", { n: idx + 1 })} style={styles.photoThumb} onClick={() => setViewerSrc(p.photo)} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ---- پیمانکار / ادمین: ثبت اقدام اصلاحی ---- */}
            {canActAsContractor && a.status === "open" && (
              <div>
                <label style={styles.label}>{t("correctiveActionDescLabel")}</label>
                <textarea style={{ ...styles.input, minHeight: 70, fontFamily: "inherit" }} value={actionText} onChange={(e) => setActionText(e.target.value)} dir="rtl" placeholder={t("correctiveActionPlaceholder")} />

                <label style={styles.label}>{t("correctiveActionPhotoCount", { count: actionPhotos.length })}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ ...styles.smallButton, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", position: "relative", overflow: "hidden", opacity: actionPhotoBusy || actionPhotos.length >= 2 ? 0.5 : 1, pointerEvents: actionPhotoBusy || actionPhotos.length >= 2 ? "none" : "auto" }}>
                    <Camera size={16} /> {t("afTakePhoto")}
                    <input type="file" accept="image/*" capture="environment" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} onChange={(e) => { handleActionPickFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                  <label style={{ ...styles.smallButton, flex: 1, background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", position: "relative", overflow: "hidden", opacity: actionPhotoBusy || actionPhotos.length >= 2 ? 0.5 : 1, pointerEvents: actionPhotoBusy || actionPhotos.length >= 2 ? "none" : "auto" }}>
                    <ImagePlus size={16} /> {t("afAddFromGallery")}
                    <input type="file" accept="image/*" multiple style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} onChange={(e) => { handleActionPickFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
                {actionPhotoBusy && <p style={{ fontSize: 12, color: "#93a1b0", marginTop: 8 }}>{t("afProcessingPhoto")}</p>}
                {actionPhotos.length > 0 && (
                  <div style={styles.photoGrid}>
                    {actionPhotos.map((src, idx) => (
                      <div key={idx} style={styles.photoThumbWrap}>
                        <img src={src} alt={t("actionPhotoAlt", { n: idx + 1 })} style={styles.photoThumb} />
                        <button type="button" style={styles.photoRemoveBtn} onClick={() => removeActionPhoto(idx)}>
                          <X size={12} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" style={styles.button} onClick={() => submitForReview(a)} disabled={actionSaving || !actionText.trim()}>
                  {actionSaving ? t("sendingEllipsis") : isAdmin ? t("submitActionAndSendForApproval") : t("sendForEmployerApproval")}
                </button>
              </div>
            )}
            {isContractor && a.status === "pending_review" && (
              <div style={{ fontSize: 13, color: "#1d4ed8", background: "#dbeafe", padding: 10, borderRadius: 8 }}>
                {t("actionSubmittedAwaitingReview")}
                {a.contractorAction && <div style={{ marginTop: 6, color: "#333" }}><b>{t("yourActionDescLabel")}</b> {a.contractorAction}</div>}
              </div>
            )}
            {isContractor && a.status === "Closed" && (
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.9 }}>
                {a.contractorAction && <div><b>{t("yourCorrectiveActionLabel")}</b> {a.contractorAction}</div>}
                <div><b>{t("statusColonLabel")}</b> {t("approvedClosedByEmployer")}</div>
                {a.closeDate && <div><b>{t("closeDateColonLabel")}</b> {isoToJalaliDisplay(a.closeDate)}</div>}
              </div>
            )}

            {/* ---- کارفرما/ادمین: بررسی و تأیید ---- */}
            {isReviewer && a.status === "pending_review" && (
              <div>
                {a.contractorAction && (
                  <div style={{ fontSize: 13, background: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <b>{t("contractorActionDescLabel")}</b> {a.contractorAction}
                  </div>
                )}
                {!gateMap[a.id] && (
                  !showRejectBox ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" style={styles.button} onClick={() => approveAnomaly(a)} disabled={reviewSaving}>
                        {reviewSaving ? t("savingEllipsisShort") : t("approveAndClose")}
                      </button>
                      <button type="button" style={{ ...styles.smallButton, background: "#c92a2a" }} onClick={() => setShowRejectBox(true)}>
                        {t("rejectAndReturn")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <label style={styles.label}>{t("rejectReasonLabel")}</label>
                      <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} dir="rtl" />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button type="button" style={{ ...styles.button, background: "#c92a2a" }} onClick={() => rejectAnomaly(a)} disabled={reviewSaving}>
                          {reviewSaving ? t("savingEllipsisShort") : t("confirmReturn")}
                        </button>
                        <button type="button" style={{ ...styles.smallButton, background: "#5b6b7d" }} onClick={() => setShowRejectBox(false)}>{t("commonCancel")}</button>
                      </div>
                    </>
                  )
                )}
              </div>
            )}
            {isReviewer && a.status === "Closed" && (
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.9 }}>
                {a.contractorAction && <div><b>{t("contractorActionLabel")}</b> {a.contractorAction}</div>}
                {a.closeDate && <div><b>{t("closeDateColonLabel")}</b> {isoToJalaliDisplay(a.closeDate)}</div>}
                {a.effectiveness && <div><b>{t("effectivenessLabel")}</b> {a.effectiveness}</div>}
              </div>
            )}
            {gateMap[a.id] && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: 12, marginTop: 10, marginBottom: 10 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "#1d4ed8", margin: "0 0 8px" }}>
                  {t("gateAppGateHeading", { status: gateStatusLabel(gateMap[a.id].status) })}
                </p>
                {gateMap[a.id].status === "assigned_review" && (
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: "#1d4ed8", margin: "0 0 8px" }}>
                    {t("alAssignedToExpertPrefix")} {gateStaff.find((s) => s.username === gateMap[a.id].assignedTo)?.name || gateMap[a.id].assignedTo}
                  </p>
                )}
                {gateMap[a.id].reviewerComment && (
                  <p style={{ fontSize: 11.5, color: "#374151", margin: "0 0 8px", lineHeight: 1.8 }}>
                    <b>{t("alExpertOpinionLabel")}</b> {gateMap[a.id].reviewerComment}
                  </p>
                )}
                {gateMessage && <p style={styles.error}>{gateMessage}</p>}

                {/* سمت سرپرست/مدیر HSE — هم روی pending_approval هم روی reviewed در دسترس است */}
                {isReviewer && (gateMap[a.id].status === "pending_approval" || gateMap[a.id].status === "reviewed") && (
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <button type="button" style={{ ...styles.smallButton, background: "#166534" }} onClick={() => handleApproveGate(a)} disabled={gateBusy === a.id}>
                        {gateMap[a.id].direction === "contractor_to_employer" ? t("alGateApproveCloseAnomaly") : t("alGateApproveSendContractor")}
                      </button>
                      {gateMap[a.id].status === "pending_approval" && (
                        <button type="button" style={styles.smallButton} onClick={() => { setAssigningGateId(a.id); setAssignGateTo(""); }} disabled={gateBusy === a.id}>
                          {t("alGateAssignExpert")}
                        </button>
                      )}
                      <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => setShowRejectBox(true)} disabled={gateBusy === a.id}>
                        {t("alGateReject")}
                      </button>
                    </div>
                    {assigningGateId === a.id && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <select style={{ ...styles.input, marginTop: 0, maxWidth: 220 }} value={assignGateTo} onChange={(e) => setAssignGateTo(e.target.value)} dir="rtl">
                          <option value="">{t("alSelectExpert")}</option>
                          {gateStaff.filter((s) => s.username !== currentUser?.username).map((s) => <option key={s.username} value={s.username}>{s.name}</option>)}
                        </select>
                        <button type="button" style={styles.smallButton} onClick={() => handleAssignForReview(a)} disabled={gateBusy === a.id || !assignGateTo}>{t("alSubmitAssignment")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setAssigningGateId(null)}>{t("commonCancel")}</button>
                      </div>
                    )}
                  </div>
                )}

                {/* سمت کارشناسی که این مورد به او ارجاع شده */}
                {gateMap[a.id].status === "assigned_review" && gateMap[a.id].assignedTo === currentUser?.username && (
                  <div>
                    {reviewingGateId !== a.id ? (
                      <button type="button" style={styles.smallButton} onClick={() => { setReviewingGateId(a.id); setReviewComment(""); }} disabled={gateBusy === a.id}>
                        {t("alSendReviewToSupervisor")}
                      </button>
                    ) : (
                      <div>
                        <label style={styles.label}>{t("alReviewCommentOptional")}</label>
                        <textarea style={{ ...styles.input, minHeight: 50 }} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} dir="rtl" />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button type="button" style={styles.smallButton} onClick={() => handleSubmitReview(a)} disabled={gateBusy === a.id}>{t("alSend")}</button>
                          <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setReviewingGateId(null)}>{t("commonCancel")}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isReviewer && showRejectBox && (
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>{t("alRejectReasonOptional")}</label>
                    <textarea style={{ ...styles.input, minHeight: 50 }} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} dir="rtl" />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => { handleRejectGate(a, rejectNote); setShowRejectBox(false); setRejectNote(""); }} disabled={gateBusy === a.id}>{t("alSubmitReject")}</button>
                      <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setShowRejectBox(false)}>{t("commonCancel")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isReviewer && a.status === "open" && (
              <div>
                <div style={styles.backLink} onClick={() => setShowManualEdit((v) => !v)}>
                  {showManualEdit ? t("closeManualEdit") : t("manualEditOptional")}
                </div>
                {showManualEdit && (
                  <>
                    <label style={styles.label}>{t("fieldCorrectiveAction")}</label>
                    <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={draft.correctiveAction} onChange={(e) => setDraft({ ...draft, correctiveAction: e.target.value })} dir="rtl" />

                    <label style={styles.label}>{t("fieldObstacles")}</label>
                    <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={draft.obstacles} onChange={(e) => setDraft({ ...draft, obstacles: e.target.value })} dir="rtl" />

                    <div style={styles.formGrid}>
                      <div>
                        <label style={styles.label}>{t("fieldFollowerPerson")}</label>
                        <input style={styles.input} value={draft.follower} onChange={(e) => setDraft({ ...draft, follower: e.target.value })} dir="rtl" />
                      </div>
                      <div>
                        <label style={styles.label}>{t("colStatus")}</label>
                        <select style={styles.input} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} dir="rtl">
                          <option value="open">{t("anomStatusOpen")}</option>
                          <option value="pending_review">{t("anomStatusPendingReview")}</option>
                          <option value="Closed">{t("statusClosedParenthetical")}</option>
                        </select>
                      </div>
                    </div>

                    {draft.status === "Closed" && (
                      <div style={styles.formGrid}>
                        <div>
                          <label style={styles.label}>{t("fieldCloseDate")}</label>
                          <JalaliDateInput value={draft.closeDate} onChange={(v) => setDraft({ ...draft, closeDate: v })} />
                        </div>
                        <div>
                          <label style={styles.label}>{t("fieldEffectiveness")}</label>
                          <input style={styles.input} value={draft.effectiveness} onChange={(e) => setDraft({ ...draft, effectiveness: e.target.value })} dir="rtl" />
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button type="button" style={styles.button} onClick={() => saveDraft(a.id)}>{t("saveChangesBtn")}</button>
                    </div>
                  </>
                )}
              </div>
            )}
            {isReviewer && a.status !== "pending_review" && (
              <div style={{ marginTop: 16 }}>
                <button type="button" style={{ ...styles.smallButton, background: "#c92a2a" }} onClick={() => handleDelete(a.id, a.trackingNumber)}>{t("deleteAnomalyBtn")}</button>
              </div>
            )}
            {isReadOnlyReviewer && (
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.9 }}>
                <div style={{ background: "#f1f5f9", color: "#334155", padding: "4px 10px", borderRadius: 999, display: "inline-block", fontSize: 11, marginBottom: 8 }}>{t("viewOnlyAccess")}</div>
                {a.correctiveAction && <div><b>{t("correctiveActionLabel")}</b> {a.correctiveAction}</div>}
                {a.contractorAction && <div><b>{t("contractorActionLabel")}</b> {a.contractorAction}</div>}
                {a.obstacles && <div><b>{t("obstaclesLabel")}</b> {a.obstacles}</div>}
                {a.follower && <div><b>{t("followerPersonLabel")}</b> {a.follower}</div>}
                {a.reviewNote && <div><b>{t("returnNoteLabel")}</b> {a.reviewNote}</div>}
                {a.status === "Closed" && a.closeDate && <div><b>{t("closeDateColonLabel")}</b> {isoToJalaliDisplay(a.closeDate)}</div>}
                {a.effectiveness && <div><b>{t("effectivenessLabel")}</b> {a.effectiveness}</div>}
              </div>
            )}
          </div>
          );
        }}
      />

      {viewerSrc && (
        <div style={styles.photoViewerOverlay} onClick={() => setViewerSrc(null)}>
          <button type="button" style={styles.photoViewerClose} onClick={() => setViewerSrc(null)}>
            <X size={20} color="#fff" />
          </button>
          <img src={viewerSrc} alt={t("largeViewAlt")} style={styles.photoViewerImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ---------- پنل ادمین ----------
const MODULE_ICON = { profile: User, chat: MessageCircle, anomalyReport: AlertTriangle, personnelAccess: Users, managementDashboard: BarChart3, proactiveIndicators: TrendingUp, incidentManagement: ShieldAlert };

// اعمال «پیکربندی سامانه» (ترتیب + برچسب نمایشی، از پنل Super Admin) روی
// لیست ماژول‌های از‌قبل فیلترشده‌ی هر داشبورد. آیکون/badge/muted/sub که از
// منطق مجوز/پلن می‌آیند دست‌نخورده می‌مانند — فقط ترتیب و متن override
// می‌شوند. اگر هنوز تنظیمی بارگذاری نشده (config===null) یا خالی باشد،
// همان ترتیب/برچسب پیش‌فرض کد حفظ می‌شود (fail-safe).
function applyModuleConfig(modules, config) {
  if (!config || config.length === 0) return modules;
  const orderMap = new Map(config.map((c, idx) => [c.moduleKey, idx]));
  // فقط ترتیب (sort_order) از «پیکربندی سامانه» اعمال می‌شود؛ برچسب نمایشی
  // قبلاً توسط caller از طریق mt() (ترجمه‌ی i18n) در m.label قرار گرفته و نباید
  // با رشته‌ی تک‌زبانه‌ی display_label بازنویسی شود.
  return [...modules].sort((a, b) => {
    const ao = orderMap.has(a.key) ? orderMap.get(a.key) : 999;
    const bo = orderMap.has(b.key) ? orderMap.get(b.key) : 999;
    return ao - bo;
  });
}

// ---------- ردیف منوی استاندارد (آیکون + عنوان + شورون) ----------
// ---------- هدر مشترک داشبورد (آواتار + نام + عنوان شغلی + اعلان/تنظیمات/خروج) ----------
const headerIconBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 9, cursor: "pointer",
};

function DashboardHeader({ panelLabelKey, currentUser, onLogout, onOpenSettings, smartItems, onNavigate, currentModuleKey }) {
  const { t, dir } = useLanguage();
  const appearance = useAppearance();
  // قابلیت عمومی «گزارش خطا» — طبق خواسته‌ی صریح، از هر جای سامانه (نه
  // فقط وقتی اپ کرش می‌کند) هر کاربر باید بتواند مشکلی که می‌بیند را
  // مستقیم به مدیر سامانه گزارش کند.
  const [showReportError, setShowReportError] = useState(false);

  // هویت هدر (طبق خواستهٔ صریح):
  //   خط اول → «[عنوان پنل]: [نام شرکت]»
  //   خط دوم → «[نام و نام خانوادگی] - [سمت/شغل]»
  // نام شرکت و سمت/شغل ممکن است در توکن نشست نیامده باشند (حساب‌هایی که
  // از پنل SuperAdmin ساخته شده‌اند فقط company_id / job_position_id
  // دارند، نه company_name / job_position_title). پس اینجا در صورت نبود،
  // از روی همان id از دیتابیس خوانده و کامل می‌شوند — بدون نیاز به ورود
  // دوباره یا مهاجرت دیتابیس.
  const isContractorUser = currentUser?.role === "CONTRACTOR";
  const personName = isContractorUser
    ? (currentUser?.contactPersonName || currentUser?.name || "")
    : (currentUser?.name || "");
  const [companyName, setCompanyName] = useState(
    isContractorUser ? (currentUser?.companyName || currentUser?.name || "") : (currentUser?.companyName || "")
  );
  const [jobTitle, setJobTitle] = useState(currentUser?.jobPositionTitle || "");
  useEffect(() => {
    if (!currentUser) return;
    if (isContractorUser) {
      setCompanyName(currentUser.companyName || currentUser.name || "");
    } else if (currentUser.companyName) {
      setCompanyName(currentUser.companyName);
    } else if (currentUser.companyId) {
      loadMyCompanyName(currentUser.companyId).then((n) => setCompanyName(n || "")).catch(() => {});
    }
    if (currentUser.jobPositionTitle) {
      setJobTitle(currentUser.jobPositionTitle);
    } else if (currentUser.jobPositionId) {
      loadJobPositionTitle(currentUser.jobPositionId).then((tt) => setJobTitle(tt || "")).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);
  const showCompany = companyName && appearance?.headerShowCompanyName !== false;

  return (
    <div style={{ ...styles.topBar, direction: dir }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 auto" }}>
        <Avatar name={personName || currentUser?.name} size={38} bg="rgba(255,255,255,0.18)" />
        <div style={{ minWidth: 0, lineHeight: 1.35 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60vw" }}>
              {t(panelLabelKey)}{showCompany ? ":" : ""}
            </span>
            {showCompany && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.92)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45vw" }}>{companyName}</span>
            )}
          </div>
          {personName && (
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60vw" }}>
              {personName}
              {jobTitle && <span style={{ color: "rgba(255,255,255,0.45)" }}> - {jobTitle}</span>}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <OnlineIndicator />
        {smartItems && <NotificationPanel smartItems={smartItems} onNavigate={onNavigate} />}
        <button type="button" onClick={() => setShowReportError(true)} style={headerIconBtnStyle} title={t("erpTitle")}>
          <AlertTriangle size={16} color="#fff" />
        </button>
        {showReportError && (
          <ReportErrorModal
            currentUser={currentUser}
            moduleKey={currentModuleKey || ""}
            pageLabel={t(panelLabelKey)}
            onClose={() => setShowReportError(false)}
          />
        )}
        <button type="button" onClick={onOpenSettings} style={headerIconBtnStyle} title={t("settingsTooltip")}>
          <Settings size={16} color="#fff" />
        </button>
        <button
          style={{ ...styles.logoutButton, padding: "8px clamp(10px, 3vw, 16px)" }}
          onClick={() => { if (window.confirm(t("saLogoutConfirm"))) onLogout(); }}
        >
          <LogOut size={14} style={{ marginLeft: 6 }} />{t("logout")}
        </button>
      </div>
    </div>
  );
}

function MenuRow({ icon: IconEl, label, onClick, accent, muted, sub, badge }) {
  return (
    <div
      style={{
        ...styles.menuCard,
        ...(accent ? styles.anomalyMenuCard : {}),
        ...(muted ? { opacity: 0.55 } : {}),
        justifyContent: "space-between",
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: accent ? "rgba(13,143,138,0.14)" : "#eef1f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconEl size={17} color={accent ? THEME.tealDeep : THEME.navyMid} />
        </div>
        <span>{label}</span>
        {badge > 0 && (
          <span style={{ background: THEME.danger, color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, minWidth: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
            {badge}
          </span>
        )}
      </div>
      {sub ? (
        <ChevronRight size={16} color={THEME.text3} style={{ transform: "rotate(180deg)" }} />
      ) : (
        <ChevronRight size={16} color={THEME.text3} style={{ transform: "rotate(180deg)", opacity: 0.4 }} />
      )}
    </div>
  );
}

// ============================================================
// Navigation دسکتاپ — Sidebar سمت راست به سبک Enterprise Dashboard
// ============================================================
// این بخش کاملاً مستقل و افزوده است: هیچ state/منطق/مسیر موجودی را عوض
// نمی‌کند، فقط همان setView() موجود هر داشبورد را از یک رابط بصری جدید
// صدا می‌زند. در موبایل هیچ‌چیزی از این بخش استفاده/رندر نمی‌شود — شرط
// useIsDesktop به‌طور کامل موبایل را از این مسیر جدا نگه می‌دارد.

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler));
  }, []);
  return isDesktop;
}

function SidebarItem({ mod, view, setView, collapsed, openKey, setOpenKey }) {
  const isLeaf = !mod.sub || mod.sub.length === 0;
  const isActiveLeaf = view === mod.key;
  const isActiveParent = !isLeaf && mod.sub.some((s) => s.key === view);
  const isOpen = openKey === mod.key;

  const handleClick = () => {
    if (mod.muted) return;
    if (isLeaf) { setView(mod.key); return; }
    // در حالت جمع‌شده، زیرمنو اصلاً رندر نمی‌شود (چون فضایی برایش نیست)؛
    // پس کلیک روی آیکون باید مستقیم محتوا را باز کند — دقیقاً مثل رفتار
    // ماژول‌های بدون زیرمنو (مثل شاخص‌های Proactive HSE).
    if (collapsed) { setView(mod.sub[0].key); return; }
    setOpenKey(isOpen ? null : mod.key); // آکاردئون: باز/بسته، بدون تغییر view
  };

  return (
    <div>
      <div
        onClick={handleClick}
        title={collapsed ? mod.label : undefined}
        onMouseEnter={(e) => { if (!isActiveLeaf && !mod.muted) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={(e) => { if (!isActiveLeaf && !(isActiveParent || isOpen)) e.currentTarget.style.background = "transparent"; else if (!isActiveLeaf) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "11px 0" : "10px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 9, cursor: mod.muted ? "not-allowed" : "pointer", opacity: mod.muted ? 0.45 : 1,
          background: isActiveLeaf ? "rgba(13,143,138,0.16)" : isActiveParent || isOpen ? "rgba(255,255,255,0.06)" : "transparent",
          color: isActiveLeaf ? "#5eead4" : "#e2e8f0",
          borderInlineStart: isActiveLeaf ? `3px solid ${THEME.teal}` : "3px solid transparent",
          transition: "background .12s, opacity .12s",
          fontSize: 13.5, fontWeight: isActiveLeaf || isActiveParent ? 700 : 500,
        }}
      >
        <mod.icon size={17} style={{ flexShrink: 0 }} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.label}</span>
            {mod.badge > 0 && (
              <span style={{ background: THEME.danger, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                {mod.badge}
              </span>
            )}
            {!isLeaf && (isOpen ? <ChevronDown size={15} style={{ flexShrink: 0, opacity: 0.7 }} /> : <ChevronRight size={15} style={{ flexShrink: 0, opacity: 0.7, transform: "rotate(180deg)" }} />)}
          </>
        )}
      </div>
      {!collapsed && !isLeaf && isOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingInlineStart: 30, marginTop: 2, marginBottom: 4 }}>
          {mod.sub.map((s) => (
            <div
              key={s.key}
              onClick={() => !s.muted && setView(s.key)}
              style={{
                padding: "8px 12px", borderRadius: 7, cursor: s.muted ? "not-allowed" : "pointer", opacity: s.muted ? 0.45 : 1,
                fontSize: 12.5, fontWeight: view === s.key ? 700 : 500,
                background: view === s.key ? "rgba(13,143,138,0.16)" : "transparent",
                color: view === s.key ? "#5eead4" : "#cbd5e1",
                borderInlineStart: view === s.key ? `2px solid ${THEME.teal}` : "2px solid transparent",
              }}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ modules, view, setView, collapsed, onToggleCollapse }) {
  const { t } = useLanguage();
  // آکاردئون: اگر view فعلی زیرمجموعه‌ی یک ماژول است، همان ماژول را از
  // ابتدا باز نگه دار تا کاربر جهت‌یابی خودش را از دست ندهد.
  const [openKey, setOpenKey] = useState(() => {
    const parent = modules.find((m) => m.sub && m.sub.some((s) => s.key === view));
    return parent ? parent.key : null;
  });
  const [search, setSearch] = useState("");

  // فیلتر جست‌وجو — کاملاً سمت کلاینت، فقط نمایش را محدود می‌کند؛ خودِ
  // لیست ماژول‌ها و مجوزها دست‌نخورده می‌ماند. اگر واژه‌ی جست‌وجو فقط با
  // یک زیرماژول تطابق داشته باشد، همان ماژول والد خودکار باز می‌شود.
  const q = search.trim().toLowerCase();
  const filteredModules = q
    ? modules.filter((m) => m.label.toLowerCase().includes(q) || (m.sub || []).some((s) => s.label.toLowerCase().includes(q)))
    : modules;
  const effectiveOpenKey = q
    ? filteredModules.find((m) => !m.label.toLowerCase().includes(q) && (m.sub || []).some((s) => s.label.toLowerCase().includes(q)))?.key ?? openKey
    : openKey;

  return (
    <aside
      style={{
        width: collapsed ? 68 : 254, flexShrink: 0, background: `linear-gradient(180deg, ${THEME.navy}, ${THEME.navyDeep})`,
        display: "flex", flexDirection: "column", transition: "width .18s ease", overflow: "hidden",
        borderInlineStart: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: collapsed ? "12px 8px" : "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          type="button" onClick={onToggleCollapse} title={collapsed ? t("sidebarExpandMenu") : t("sidebarCollapseMenu")}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          {collapsed ? <ChevronsLeft size={15} color="#fff" /> : <ChevronsRight size={15} color="#fff" />}
        </button>
        {!collapsed && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 10px", minWidth: 0 }}>
            <Search size={13} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("sidebarSearchModules")} dir="rtl"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 12, fontFamily: THEME.font }}
            />
          </div>
        )}
      </div>
      <div style={{ padding: collapsed ? "8px 8px 0" : "8px 10px 0" }}>
        <div
          onClick={() => setView("menu")}
          title={collapsed ? t("sidebarHome") : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "11px 0" : "10px 14px",
            justifyContent: collapsed ? "center" : "flex-start", borderRadius: 9, cursor: "pointer",
            background: view === "menu" ? "rgba(13,143,138,0.16)" : "transparent",
            color: view === "menu" ? "#5eead4" : "#e2e8f0",
            borderInlineStart: view === "menu" ? `3px solid ${THEME.teal}` : "3px solid transparent",
            fontSize: 13.5, fontWeight: view === "menu" ? 700 : 500, transition: "background .12s",
          }}
          onMouseEnter={(e) => { if (view !== "menu") e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { if (view !== "menu") e.currentTarget.style.background = "transparent"; }}
        >
          <Home size={17} style={{ flexShrink: 0 }} />
          {!collapsed && <span>{t("sidebarHome")}</span>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "10px 8px" : "10px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        {filteredModules.map((mod) => (
          <SidebarItem key={mod.key} mod={mod} view={view} setView={setView} collapsed={collapsed} openKey={q ? effectiveOpenKey : openKey} setOpenKey={setOpenKey} />
        ))}
        {q && filteredModules.length === 0 && (
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", textAlign: "center", padding: "14px 6px" }}>{t("sidebarNoResults")}</p>
        )}
      </div>
    </aside>
  );
}

// Shell ریسپانسیو: در موبایل دقیقاً همان چیدمان امروزی (بدون هیچ تغییری)؛
// در دسکتاپ، Sidebar سمت راست (چون RTL، اولین فرزند flex باید Sidebar
// باشد تا در سمت راست بنشیند) + فضای اصلی محتوا سمت چپ با بیشترین عرض.
function ResponsiveDashboardShell({ panelLabelKey, currentUser, onLogout, onOpenSettings, smartItems, onNavigate, view, setView, sidebarModules, children }) {
  const { t, dir } = useLanguage();
  const isDesktop = useIsDesktop();
  const appearance = useAppearance();
  // مقدار پیش‌فرض جمع‌شدگی Sidebar از پیکربندی سامانه می‌آید، ولی فقط به
  // عنوان بذر اولیه‌ی usePersistedState — همین که کاربر یک‌بار دستی
  // تغییرش بدهد، همان انتخاب شخصی‌اش در localStorage ذخیره و همیشه در
  // اولویت است (این تنظیم فقط برای کاربرانی که هنوز هیچ انتخابی نکرده‌اند معنا دارد).
  const [collapsed, setCollapsed] = usePersistedState("ihms_sidebar_collapsed", appearance?.sidebarDefaultCollapsed || false);

  if (!isDesktop) {
    // موبایل — عیناً همان ساختار قبلی، بدون کوچک‌ترین تغییر
    return (
      <div style={{ ...styles.dashboardWrapper, direction: dir }}>
        <DashboardHeader panelLabelKey={panelLabelKey} currentUser={currentUser} onLogout={onLogout} onOpenSettings={onOpenSettings} smartItems={smartItems} onNavigate={onNavigate} currentModuleKey={view} />
        {children}
      </div>
    );
  }

  // در دسکتاپ، لیست ماژول‌های صفحه‌ی «منو» دیگر در فضای اصلی نمایش داده
  // نمی‌شود (چون همان لیست دقیقاً در Sidebar سمت راست هست) — به‌جایش یک
  // پیام خوش‌آمدگویی با نام واقعی کاربر واردشده نشان داده می‌شود.
  const mainContent = view === "menu" ? <WelcomeScreen currentUser={currentUser} setView={setView} onNavigate={onNavigate} sidebarModules={sidebarModules} /> : children;

  return (
    <div style={{ direction: dir, fontFamily: THEME.font, minHeight: "100vh", background: THEME.bg, display: "flex", flexDirection: "column" }}>
      <DashboardHeader panelLabelKey={panelLabelKey} currentUser={currentUser} onLogout={onLogout} onOpenSettings={onOpenSettings} smartItems={smartItems} onNavigate={onNavigate} currentModuleKey={view} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar modules={sidebarModules} view={view} setView={setView} collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "28px clamp(20px, 3vw, 40px)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>{mainContent}</div>
        </main>
      </div>
    </div>
  );
}

// صفحه‌ی اصلی دسکتاپ — کارت خوش‌آمدگویی مینیمال + خلاصه‌ی KPI واقعی
// (هیچ عدد ثابت/نمایشی‌ای در کار نیست؛ همه از همان لایه‌های داده‌ی
// موجود anomalies/personnel/corrective_actions/incidents می‌آید).
// نگاشت module_key (که در hse_gate_items ذخیره می‌شود) به هدف ناوبری
// واقعی — دقیقاً همان الگوی handleHomeNavigate/navFilter که برای اعلان‌های
// هوشمند داشبورد از قبل استفاده می‌شود، تا مسیر یکسان و آشنا بماند.
const GATE_MODULE_TO_NAV_TARGET = {
  anomalyReport: { module: "anomaly" },
  personnelAccess: { module: "personnel" },
  machineryManagement: { module: "machinery" },
  scaffoldManagement: { module: "scaffold" },
  riskAssessment: { module: "bowtie" },
};
const GATE_MODULE_LABEL_KEYS = {
  anomalyReport: "gateModAnomaly",
  personnelAccess: "gateModPersonnel",
  machineryManagement: "gateModMachinery",
  scaffoldManagement: "gateModScaffold",
  riskAssessment: "gateModRiskAssessment",
};

function WelcomeScreen({ currentUser, setView, onNavigate, sidebarModules }) {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState(null);
  const [announcements, setAnnouncements] = useState(undefined); // undefined=در حال بارگذاری، []=هیچ اطلاعیه‌ی واجدشرایطی نیست
  useEffect(() => {
    loadActiveAnnouncements("home").then(setAnnouncements).catch(() => setAnnouncements([]));
    // پیمانکار نه گیرنده‌ی واگذاری است، نه گیت‌کیپر — این کارت برایش خالی می‌ماند
    if (currentUser?.role === "CONTRACTOR") { setTasks([]); return; }

    const isGatekeeper = currentUser?.role === "HSE_SUPERVISOR" || currentUser?.role === "ADMIN";
    Promise.all([
      loadAssignedGateItems(currentUser?.username).catch(() => []),
      isGatekeeper ? loadPendingGateItems().catch(() => []) : Promise.resolve([]),
    ]).then(([assigned, pending]) => {
      // یک مورد می‌تواند هم واگذارشده به من باشد هم در انتظار تأیید من
      // باشد (در دو مسیر متفاوت) — بر اساس id یکتا از تکرار جلوگیری می‌شود.
      const merged = [...assigned.map((it) => ({ ...it, kind: "assigned" })), ...pending.map((it) => ({ ...it, kind: "pending_approval" }))];
      const seen = new Set();
      const deduped = merged.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
      setTasks(deduped);
    });
  }, [currentUser?.username, currentUser?.role]);

  const handleTaskClick = (task) => {
    const target = GATE_MODULE_TO_NAV_TARGET[task.moduleKey];
    if (target && onNavigate) onNavigate({ ...target, recordId: task.recordId });
  };

  return (
    <div>
      {/* ردیف اول — طبق خواسته‌ی دقیق: خوش‌آمدگویی سمت راست (اولین فرزند
          در RTL)، کارهای در دست اقدام روبه‌رویش سمت چپ. بنر Hero و بخش
          دسترسی سریع طبق درخواست کاملاً حذف شدند. */}
      <div style={{ display: "flex", gap: 14, alignItems: "stretch", marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 40%", minWidth: 280, display: "flex" }}>
          <WelcomeCard currentUser={currentUser} />
        </div>
        <div style={{ flex: "1 1 55%", minWidth: 300 }}>
          <TasksCard tasks={tasks} onTaskClick={handleTaskClick} />
        </div>
      </div>

      {/* ردیف دوم — اطلاعیه‌ها، همان عرض قبلی (تمام‌عرض)، فقط ارتفاع کارت بیشتر */}
      {announcements && announcements.length > 0 && (
        <AnnouncementSlider announcements={announcements} setView={setView} />
      )}
    </div>
  );
}

// بنر اصلی — پیام کلی سامانه + ۴ نکته‌ی برجسته (متن ثابت محصول، نه داده‌ی
// پویا؛ صرفاً معرفی IHMS مثل نمونه‌ی مرجع). ارتفاع با کارت خوش‌آمدگویی هم‌تراز است.
function WelcomeCard({ currentUser }) {
  const { t } = useLanguage();
  const now = new Date();
  return (
    <div style={{
      background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "20px 24px",
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", width: "100%", minHeight: 200,
    }}>
      <span style={{ fontSize: 30, marginBottom: 10 }}>👋</span>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.navy, margin: "0 0 8px" }}>
        {t("welcomeGreetingLine", { name: currentUser?.name || "" })}
      </h2>
      <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9, margin: "0 0 16px", maxWidth: 220 }}>
        {t("welcomeIntroText")}
      </p>
      <div style={{ fontSize: 11, color: THEME.text3, display: "flex", alignItems: "center", gap: 5 }}>
        <Clock size={12} /> {t("welcomeLastLoginLabel")} {toJalaliSafe(now.toISOString())}
      </div>
    </div>
  );
}

function TasksCard({ tasks, onTaskClick }) {
  const { t } = useLanguage();
  // طبق گزارش صریح: اندازه‌ی این باکس باید ثابت بماند (هم‌تراز با کارت
  // خوش‌آمدگویی کنارش) و با زیاد شدن آیتم‌ها، خودِ باکس بزرگ نشود — فقط
  // ناحیه‌ی داخلی‌اش اسکرول بخورد. برای همین کل کارت یک ارتفاعِ ثابت
  // می‌گیرد (نه height:100% که به ارتفاعِ محتوا وابسته بود)، هدر با
  // flexShrink:0 ثابت می‌ماند، و فقط ناحیه‌ی لیست (flex:1, minHeight:0)
  // در صورت نیاز اسکرول داخلی پیدا می‌کند.
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 16, height: 280, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tasks && tasks.length > 0 ? 12 : 0, flexShrink: 0 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 700, color: THEME.navy, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <ClipboardList size={15} color={THEME.teal} /> {t("tasksCardTitle")}
        </h3>
        {tasks && tasks.length > 0 && (
          <span style={{ fontSize: 11, color: THEME.text3, fontWeight: 600 }}>{tasks.length.toLocaleString(getCurrentLang() === "en" ? "en-US" : "fa-IR")}</span>
        )}
      </div>
      {tasks === null && <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("commonLoading")}</p>}
      {tasks && tasks.length === 0 && (
        <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("tasksNoneRightNow")}</p>
      )}
      {tasks && tasks.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {tasks.map((it) => (
            <div
              key={`${it.kind}-${it.id}`}
              onClick={() => onTaskClick(it)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 2px", borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.recordLabel || it.recordId}
                  </span>
                  <span style={{
                    fontSize: 9.5, padding: "1px 7px", borderRadius: 999, flexShrink: 0, fontWeight: 700,
                    background: it.kind === "pending_approval" ? "#fef3c7" : THEME.tealSoft,
                    color: it.kind === "pending_approval" ? "#b45309" : THEME.tealDeep,
                  }}>
                    {it.kind === "pending_approval" ? t("anomStatusPendingReview") : t("taskBadgeAssigned")}
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: THEME.text3 }}>
                  {GATE_MODULE_LABEL_KEYS[it.moduleKey] ? t(GATE_MODULE_LABEL_KEYS[it.moduleKey]) : it.moduleKey} — {toJalaliSafe(it.reviewedAt || it.createdAt)}
                </span>
              </div>
              <ChevronRight size={13} color={THEME.text3} style={{ transform: "rotate(180deg)", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ANNOUNCEMENT_ICONS = { megaphone: Megaphone, sparkles: Sparkles, gift: Gift, info: Info, bell: Bell };

function announcementActionUrl(announcement, setView) {
  return () => {
    if (!announcement.buttonUrl) return;
    const url = announcement.buttonUrl.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (setView) {
      setView(url); // مقصد داخلی — نام یک view/ماژول موجود
    }
  };
}

// اسلایدر اطلاعیه/تبلیغات — طبق درخواست بازطراحی: تمام‌عرض، تصویر بزرگ‌تر
// سمت راست (در RTL)، متن سمت چپ، ارتفاع کاملاً ثابت (بدون aspect-ratio
// مشتق‌شده) تا هیچ لرزشی بین اطلاعیه‌های مختلف ایجاد نشود. با ≤۱ اطلاعیه،
// دکمه‌های ناوبری/نقاط پایینی مخفی می‌مانند (بدون تغییر رفتار قبلی).
function AnnouncementSlider({ announcements, setView }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const isSlider = announcements.length > 1;
  const current = announcements[Math.min(index, announcements.length - 1)];

  useEffect(() => {
    if (!isSlider) return;
    const ms = (current.displaySeconds || 10) * 1000;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % announcements.length), ms);
    return () => clearTimeout(timer);
  }, [index, isSlider, current, announcements.length]);

  const Icon = ANNOUNCEMENT_ICONS[current.iconKey] || Megaphone;
  const handleAction = announcementActionUrl(current, setView);

  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {/* ناحیه‌ی تصویر — عرض واکنش‌گرا، ارتفاع کاملاً ثابت به پیکسل */}
        <div style={{ flex: "1 1 340px", minWidth: 260, height: 340, background: current.imageUrl ? "#e9eef3" : THEME.tealSoft, position: "relative", overflow: "hidden" }}>
          {current.imageUrl ? (
            <img src={current.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={48} color={THEME.tealDeep} />
            </div>
          )}
          {isSlider && (
            <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" onClick={() => setIndex((i) => (i - 1 + announcements.length) % announcements.length)} title={t("announcementPrev")} style={sliderNavBtnStyle}>
                <ChevronRight size={13} color={THEME.navy} />
              </button>
              <button type="button" onClick={() => setIndex((i) => (i + 1) % announcements.length)} title={t("announcementNext")} style={sliderNavBtnStyle}>
                <ChevronLeft size={13} color={THEME.navy} />
              </button>
            </div>
          )}
        </div>

        {/* ناحیه‌ی متن — عرض واکنش‌گرا، ارتفاع با تعداد خط محدود ثابت می‌ماند */}
        <div style={{ flex: "1 1 300px", minWidth: 260, height: 340, padding: "28px 30px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Megaphone size={14} color={THEME.teal} />
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.teal }}>{t("announcementsLabel")}</span>
          </div>
          <h3 style={{
            fontSize: 19, fontWeight: 800, color: THEME.navy, margin: "0 0 10px", minHeight: 25,
            display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {current.title || "\u00A0"}
          </h3>
          <p style={{
            fontSize: 13.5, color: THEME.text2, lineHeight: 1.9, margin: 0, minHeight: "calc(1.9em * 4)",
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {current.message}
          </p>
          {current.buttonLabel && current.buttonUrl && (
            <button
              type="button" onClick={handleAction}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 12,
                background: THEME.teal, color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font,
              }}
            >
              {current.buttonLabel} <ArrowUpRight size={13} />
            </button>
          )}
          {isSlider && (
            <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 12 }}>
              {announcements.map((a, i) => (
                <button
                  key={a.id} type="button" onClick={() => setIndex(i)} title={t("announcementNumbered", { n: i + 1 })}
                  style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === index ? THEME.teal : THEME.border, transition: "width .2s, background .2s" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const sliderNavBtnStyle = { width: 26, height: 26, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" };

// اطلاعیه‌هایی که کاربر روی همین دستگاه با × بسته است — بر اساس id، تا
// اطلاعیه‌ی بسته‌شده دوباره ظاهر نشود ولی اطلاعیه‌های جدید (id تازه)
// همچنان نمایش داده شوند.
const DISMISSED_ANNC_KEY = "ihms_dismissed_announcements";
function getDismissedAnnouncementIds() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_ANNC_KEY) || "[]"); } catch { return []; }
}
function persistDismissedAnnouncementId(id) {
  try {
    const ids = getDismissedAnnouncementIds();
    if (!ids.includes(id)) localStorage.setItem(DISMISSED_ANNC_KEY, JSON.stringify([...ids, id]));
  } catch { /* بی‌اهمیت اگر localStorage در دسترس نبود */ }
}

// نسخه‌ی جمع‌وجور مخصوص موبایل — طبق خواسته‌ی صریح: ابتدا کوچک (یک نوار
// تک‌خطی)، با لمس بزرگ می‌شود و در حالت باز یک × برای بستن دارد.
function MobileAnnouncementBanner({ setView }) {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState(undefined);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(getDismissedAnnouncementIds);
  useEffect(() => { loadActiveAnnouncements("home").then(setAnnouncements).catch(() => setAnnouncements([])); }, []);

  const visible = (announcements || []).filter((a) => !dismissed.includes(a.id));
  const isSlider = expanded && visible.length > 1;
  useEffect(() => {
    if (!isSlider) return;
    const current = visible[index % visible.length];
    const ms = (current.displaySeconds || 10) * 1000;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % visible.length), ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isSlider, visible.length]);

  if (!announcements || visible.length === 0) return null;
  const current = visible[Math.min(index, visible.length - 1)];
  const Icon = ANNOUNCEMENT_ICONS[current.iconKey] || Megaphone;
  const handleAction = announcementActionUrl(current, setView);

  const handleDismiss = () => {
    persistDismissedAnnouncementId(current.id);
    setDismissed((d) => [...d, current.id]);
    setIndex(0);
  };

  // حالت جمع‌شده — کوچک‌ترین شکل ممکن؛ کل نوار با لمس باز می‌شود.
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, textAlign: "start",
          background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12,
          padding: "8px 10px", marginBottom: 10, cursor: "pointer", fontFamily: THEME.font,
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={THEME.tealDeep} />
        </div>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current.title || current.message}
        </span>
        {visible.length > 1 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: THEME.teal, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0 }}>
            {visible.length.toLocaleString(getCurrentLang() === "en" ? "en-US" : "fa-IR")}
          </span>
        )}
        <ChevronDown size={15} color={THEME.text3} style={{ flexShrink: 0 }} />
      </button>
    );
  }

  // حالت باز — محتوای کامل + دکمه‌ی × برای بستنِ همین اطلاعیه.
  return (
    <div style={{ position: "relative", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <button
        type="button" onClick={handleDismiss} title={t("announcementDismiss")}
        style={{ position: "absolute", top: 6, insetInlineEnd: 6, width: 26, height: 26, borderRadius: 8, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <X size={15} color={THEME.text3} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingInlineEnd: 26 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: current.imageUrl ? "#e9eef3" : THEME.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {current.imageUrl ? <img src={current.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon size={20} color={THEME.tealDeep} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: THEME.navy, minHeight: 17,
            display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {current.title || "\u00A0"}
          </div>
          <div style={{
            fontSize: 11.5, color: THEME.text2, lineHeight: 1.7, minHeight: "calc(1.7em * 2)",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {current.message}
          </div>
        </div>
      </div>
      {current.buttonLabel && current.buttonUrl && (
        <button type="button" onClick={handleAction} style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: THEME.teal, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font }}>
          {current.buttonLabel} <ArrowUpRight size={12} />
        </button>
      )}
      {isSlider && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
          {visible.map((a, i) => (
            <button
              key={a.id} type="button" onClick={() => setIndex(i)}
              style={{ width: i === index ? 16 : 5, height: 5, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === index ? THEME.teal : THEME.border, transition: "width .2s, background .2s" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ onLogout, currentUser }) {
  const { t, dir } = useLanguage();
  // برچسب ماژول از یک منبع مشترک خوانده می‌شود تا تغییرِ نامِ ماژول در
  // «پیکربندی سامانه»ی SuperAdmin (جدولِ system_module_config، مشترک بین
  // دسکتاپ و موبایل) در همه‌ی نماها یکسان اعمال شود: اول override پنل
  // SuperAdmin، بعد ترجمه‌ی i18n، بعد برچسبِ ثابتِ کد. moduleConfig کمی
  // پایین‌تر تعریف می‌شود ولی این تابع فقط هنگام رندر صدا زده می‌شود (پس
  // تا آن لحظه مقداردهی شده). زیرماژول‌ها کلیدشان در این جدول نیست و
  // خودکار به رفتار قبلی برمی‌گردند.
  const mt = (m) => {
    const cfg = Array.isArray(moduleConfig) ? moduleConfig.find((c) => c.moduleKey === m?.key) : null;
    // ترجمه‌ی i18n همیشه اولویت دارد؛ display_labelِ جدول system_module_config
    // یک رشته‌ی تک‌زبانه (فارسی) است و در حالت دوزبانه نمی‌تواند مبنا باشد — فقط
    // وقتی استفاده می‌شود که هیچ کلید ترجمه‌ای برای این ماژول وجود نداشته باشد.
    if (m?.labelKey) return t(m.labelKey);
    return cfg?.displayLabel || m?.label;
  };
  const [view, setView] = usePersistedState("ihms_view_admin", "menu");
  useEffect(() => { trackPageView(currentUser, view); }, [view]);
  // دکمهٔ برگشت گوشی مثل برگشت داخلی سامانه: اگر داخل یک ماژول هستیم به
  // منو برمی‌گردیم؛ روی خودِ منو رویداد را مصرف نمی‌کنیم تا (طبق الزام)
  // اپ بسته نشود، بلکه فقط به پس‌زمینه برود.
  useAndroidBackButton(() => { if (view !== "menu") { setView("menu"); return true; } return false; });
  const [navFilter, setNavFilter] = useState(null);
  const [assessmentContext, setAssessmentContext] = useState(null);
  const [planFeatures, setPlanFeatures] = useState(null);
  useEffect(() => { loadCurrentCompanyPlanFeatures().then(setPlanFeatures); }, []);
  const [moduleConfig, setModuleConfig] = useState(null);
  useEffect(() => { loadModuleConfig().then(setModuleConfig); }, []);
  const [chatUnread, setChatUnread] = useState(0);
  useEffect(() => {
    const load = () => loadUnreadTotal(currentUser?.username).then(setChatUnread);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [currentUser?.username]);
  const anomalyMod = HSE_MODULES.find((m) => m.key === "anomalyReport");
  const riskMod = HSE_MODULES.find((m) => m.key === "riskAssessment");
  const personnelMod = HSE_MODULES.find((m) => m.key === "personnelAccess");
  const machineryMod = HSE_MODULES.find((m) => m.key === "machineryManagement");
  const scaffoldMod = HSE_MODULES.find((m) => m.key === "scaffoldManagement");
  const managementMod = HSE_MODULES.find((m) => m.key === "managementDashboard");
  const proactiveMod = HSE_MODULES.find((m) => m.key === "proactiveIndicators");
  const incidentMod = HSE_MODULES.find((m) => m.key === "incidentManagement");

  useEffect(() => {
    loadPersonnelList().then(checkAndUpdateDeadlines); // فقط برای انتقال خودکار به «منقضی»
  }, []);

  const handleHomeNavigate = (target) => {
    setNavFilter(target);
    if (target.module === "personnel") setView("personnelDashboard");
    else if (target.module === "anomaly") setView("anomalyList");
    else if (target.module === "machinery") setView("machineryDashboard");
    else if (target.module === "scaffold") setView("scaffoldDashboard");
    else if (target.module === "bowtie") setView("bowtieDashboard");
  };

  const sidebarModules = applyModuleConfig([
    isModuleInPlan(planFeatures, "anomalyReport") && { key: "anomalyReport", icon: AlertTriangle, label: mt(anomalyMod), sub: anomalyMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "riskAssessment") && { key: "riskAssessment", icon: ShieldCheck, label: mt(riskMod), sub: riskMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "personnelAccess") && { key: "personnelAccess", icon: Users, label: mt(personnelMod), sub: personnelMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "machineryManagement") && { key: "machineryManagement", icon: Truck, label: mt(machineryMod), sub: machineryMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "scaffoldManagement") && { key: "scaffoldManagement", icon: Tag, label: mt(scaffoldMod), sub: scaffoldMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "managementDashboard") && { key: "managementDashboard", icon: BarChart3, label: mt(managementMod) },
    isModuleInPlan(planFeatures, "proactiveIndicators") && { key: "proactiveIndicators", icon: TrendingUp, label: mt(proactiveMod) },
    isModuleInPlan(planFeatures, "incidentManagement") && { key: "incidentManagement", icon: ShieldAlert, label: mt(incidentMod), sub: incidentMod.sub.map((s) => ({ key: s.key, label: mt(s) })) },
    isModuleInPlan(planFeatures, "adminAnalytics") && { key: "adminAnalytics", icon: BarChart3, label: t("moduleAdminAnalytics") },
    isModuleInPlan(planFeatures, "systemManagement") && {
      key: "systemManagement", icon: Settings, label: t("moduleSystemManagement"),
      sub: [
        isModuleInPlan(planFeatures, "permissionManagement") && { key: "permissionManagement", label: t("subPermissions") },
        isModuleInPlan(planFeatures, "jobPositionManagement") && { key: "jobPositionManagement", label: t("subJobPositions") },
        isModuleInPlan(planFeatures, "archiveManagement") && { key: "archiveManagement", label: t("moduleArchive") },
        isModuleInPlan(planFeatures, "scaffoldCodeManagement") && { key: "scaffoldCodeManagement", label: t("subScaffoldCodes") },
        isModuleInPlan(planFeatures, "trainingManagement") && { key: "trainingManagement", label: t("subTraining") },
        isModuleInPlan(planFeatures, "chatAccessManagement") && { key: "chatAccessManagement", label: t("subChatAccess") },
        isModuleInPlan(planFeatures, "hcmsMatrixManagement") && { key: "hcmsMatrixManagement", label: t("subHcmsMatrix") },
        isModuleInPlan(planFeatures, "effectivenessThresholds") && { key: "effectivenessThresholds", label: t("subEffectivenessThresholds") },
        isModuleInPlan(planFeatures, "riskKnowledgeManagement") && { key: "riskKnowledgeManagement", label: t("subRiskKnowledge") },
        isModuleInPlan(planFeatures, "anomalyCategoryManagement") && { key: "anomalyCategoryManagement", label: t("subAnomalyCategories") },
        { key: "aboutIhms", label: t("aboutMenuLabel") },
      ].filter(Boolean),
    },
  ].filter(Boolean), moduleConfig);

  return (
    <ResponsiveDashboardShell panelLabelKey="panelAdmin" currentUser={currentUser} onLogout={onLogout} onOpenSettings={() => setView("profile")} view={view} setView={setView} sidebarModules={sidebarModules}>
      {view === "menu" && (
        <div style={styles.menuList}>
          <MobileAnnouncementBanner setView={setView} />
          <DbSizeWarningBanner />
          {isModuleInPlan(planFeatures, "chat") && <MenuRow icon={MessageCircle} label={t("moduleChat")} onClick={() => setView("chat")} badge={chatUnread} />}
          {isModuleInPlan(planFeatures, "anomalyReport") && <MenuRow icon={AlertTriangle} label={mt(anomalyMod)} onClick={() => setView("anomalyReport")} accent sub />}
          {isModuleInPlan(planFeatures, "riskAssessment") && <MenuRow icon={ShieldCheck} label={mt(riskMod)} onClick={() => setView("riskAssessment")} accent sub />}
          {isModuleInPlan(planFeatures, "personnelAccess") && <MenuRow icon={Users} label={mt(personnelMod)} onClick={() => setView("personnelAccess")} accent sub />}
          {isModuleInPlan(planFeatures, "machineryManagement") && <MenuRow icon={Truck} label={mt(machineryMod)} onClick={() => setView("machineryManagement")} accent sub />}
          {isModuleInPlan(planFeatures, "scaffoldManagement") && <MenuRow icon={Tag} label={mt(scaffoldMod)} onClick={() => setView("scaffoldManagement")} accent sub />}
          {isModuleInPlan(planFeatures, "managementDashboard") && <MenuRow icon={BarChart3} label={mt(managementMod)} onClick={() => setView("managementDashboard")} accent />}
          {isModuleInPlan(planFeatures, "proactiveIndicators") && <MenuRow icon={TrendingUp} label={mt(proactiveMod)} onClick={() => setView("proactiveIndicators")} accent />}
          {isModuleInPlan(planFeatures, "adminAnalytics") && <MenuRow icon={BarChart3} label={t("moduleAdminAnalytics")} onClick={() => setView("adminAnalytics")} />}
          {/* مدیریت سیستم: طبق خواسته‌ی صریح، «اگه تو پلن‌ها فعال شد فقط
              برای ادمین شرکت‌ها فعال میشه» — نقش Admin از قبل تضمین‌شده
              (این منو فقط داخل AdminDashboard رندر می‌شود)، پس اینجا فقط
              کافی است فعال‌بودنش در پلن را هم چک کنیم. */}
          {isModuleInPlan(planFeatures, "systemManagement") && <MenuRow icon={Settings} label={t("moduleSystemManagement")} onClick={() => setView("systemManagement")} accent sub />}
        </div>
      )}

      {view === "systemManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{t("moduleSystemManagement")}</h3>
          {/* مدیریت حساب کارفرما/پیمانکار عمداً از اینجا حذف شد — طبق سیاست
              امنیتی سازمانی، ایجاد/ویرایش این حساب‌ها فقط از پنل Super Admin
              مجاز است، هم در UI هم در Backend (Edge Function manage-account
              درخواست هر کاربری غیر از Super Admin را رد می‌کند). */}
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#92400e", lineHeight: 1.8 }}>
            {t("adminAccountsMovedNotice")}
          </div>
          <div style={styles.menuList2}>
            {isModuleInPlan(planFeatures, "permissionManagement") && <MenuRow icon={ShieldCheck} label={t("subPermissions")} onClick={() => setView("permissionManagement")} />}
            {isModuleInPlan(planFeatures, "jobPositionManagement") && <MenuRow icon={Briefcase} label={t("subJobPositions")} onClick={() => setView("jobPositionManagement")} />}
            {isModuleInPlan(planFeatures, "archiveManagement") && <MenuRow icon={Archive} label={t("moduleArchive")} onClick={() => setView("archiveManagement")} />}
            {isModuleInPlan(planFeatures, "scaffoldCodeManagement") && <MenuRow icon={Tag} label={t("subScaffoldCodes")} onClick={() => setView("scaffoldCodeManagement")} />}
            {isModuleInPlan(planFeatures, "trainingManagement") && <MenuRow icon={GraduationCap} label={t("subTraining")} onClick={() => setView("trainingManagement")} />}
            {isModuleInPlan(planFeatures, "chatAccessManagement") && <MenuRow icon={ShieldOff} label={t("subChatAccess")} onClick={() => setView("chatAccessManagement")} />}
            {isModuleInPlan(planFeatures, "hcmsMatrixManagement") && <MenuRow icon={ShieldAlert} label={t("subHcmsMatrix")} onClick={() => setView("hcmsMatrixManagement")} />}
            {isModuleInPlan(planFeatures, "effectivenessThresholds") && <MenuRow icon={Sliders} label={t("subEffectivenessThresholds")} onClick={() => setView("effectivenessThresholds")} />}
            {isModuleInPlan(planFeatures, "riskKnowledgeManagement") && <MenuRow icon={Database} label={t("subRiskKnowledge")} onClick={() => setView("riskKnowledgeManagement")} />}
            {isModuleInPlan(planFeatures, "anomalyCategoryManagement") && <MenuRow icon={Tag} label={t("subAnomalyCategories")} onClick={() => setView("anomalyCategoryManagement")} />}
            <MenuRow icon={Info} label={t("aboutMenuLabel")} onClick={() => setView("aboutIhms")} />
          </div>
        </div>
      )}

      {view === "trainingManagement" && <TrainingManager onBack={() => setView("systemManagement")} />}
      {view === "chatAccessManagement" && <ChatAccessManager onBack={() => setView("systemManagement")} />}
      {view === "hcmsMatrixManagement" && <HcmsMatrixManager onBack={() => setView("systemManagement")} />}
      {view === "effectivenessThresholds" && <EffectivenessThresholdsManager onBack={() => setView("systemManagement")} currentUser={currentUser} />}
      {view === "riskKnowledgeManagement" && <RiskKnowledgeManager onBack={() => setView("systemManagement")} currentUser={currentUser} />}
      {view === "anomalyCategoryManagement" && <AnomalyCategoryManager onBack={() => setView("systemManagement")} />}
      {view === "aboutIhms" && <AboutIhms onBack={() => setView("systemManagement")} />}

      {view === "anomalyReport" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(anomalyMod)}</h3>
          <div style={styles.menuList2}>
            {anomalyMod.sub.map((s) => (
              <MenuRow key={s.key} icon={AlertTriangle} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "riskAssessment" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(riskMod)}</h3>
          <div style={styles.menuList2}>
            {riskMod.sub.map((s) => (
              <MenuRow key={s.key} icon={ShieldCheck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "personnelAccess" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(personnelMod)}</h3>
          <div style={styles.menuList2}>
            {personnelMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Users} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "machineryManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(machineryMod)}</h3>
          <div style={styles.menuList2}>
            {machineryMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Truck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "scaffoldManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(scaffoldMod)}</h3>
          <div style={styles.menuList2}>
            {scaffoldMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Tag} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "profile" && <ProfileView onBack={() => setView("menu")} currentUser={currentUser} roleLabel={t("roleLabelAdmin")} />}
      {view === "chat" && <ChatDashboard onBack={() => setView("menu")} currentUser={currentUser} />}
      {/* مدیریت حساب کارفرما/پیمانکار: عمداً دیگر اینجا رندر نمی‌شود — به پنل Super Admin منتقل شد */}
      {view === "anomalyForm" && <AnomalyForm onBack={() => setView("anomalyReport")} currentUser={currentUser} onSaved={() => setView("anomalyList")} />}
      {view === "anomalyList" && <AnomalyList onBack={() => setView("anomalyReport")} role="ADMIN" currentUser={currentUser} initialStatusFilter={navFilter?.module === "anomaly" ? navFilter.statusFilter : undefined} initialRiskFilter={navFilter?.module === "anomaly" ? navFilter.riskFilter : undefined} initialContractorFilter={navFilter?.module === "anomaly" ? navFilter.contractorFilter : undefined} initialExpandedAnomalyId={navFilter?.module === "anomaly" ? navFilter.recordId : undefined} />}
      {view === "correctiveActionsList" && <CorrectiveActionsDashboard onBack={() => setView("anomalyReport")} currentUser={currentUser} />}
      {view === "bowtieDashboard" && <BowTieDashboard role="ADMIN" onBack={() => setView("riskAssessment")} currentUser={currentUser} readOnly={false} />}
      {view === "hcmsDashboard" && <HcmsDashboard onBack={() => setView("riskAssessment")} currentUser={currentUser} />}
      {view === "personnelForm" && <PersonnelForm onBack={() => setView("personnelAccess")} currentUser={currentUser} onSaved={() => setView("personnelAccess")} />}
      {view === "personnelDashboard" && <PersonnelDashboard onBack={() => setView("personnelAccess")} currentUser={currentUser} role="ADMIN" initialStatusFilter={navFilter?.module === "personnel" ? navFilter.statusFilter : undefined} initialContractorFilter={navFilter?.module === "personnel" ? navFilter.contractorFilter : undefined} onNavigateToAssessment={(ctx) => { setAssessmentContext(ctx); setView("proactiveIndicators"); }} initialSelectedPersonnelId={assessmentContext?.personnelId} />}
      {view === "proactiveIndicators" && (
        <ProactiveIndicatorsDashboard
          role="ADMIN"
          onBack={() => { setAssessmentContext(null); setView(assessmentContext ? "personnelDashboard" : "menu"); }}
          currentUser={currentUser}
          focusPersonnelId={assessmentContext?.personnelId}
          focusJobTitle={assessmentContext?.jobTitle}
          focusPersonnelName={assessmentContext?.personnelName}
        />
      )}
      {view === "incidentsList" && <IncidentsListPage currentUser={currentUser} role="ADMIN" readOnly={false} />}
      {view === "machineryDashboard" && <MachineryDashboard onBack={() => setView("machineryManagement")} currentUser={currentUser} role="ADMIN" initialApprovalFilter={navFilter?.module === "machinery" ? navFilter.approvalFilter : undefined} initialContractorFilter={navFilter?.module === "machinery" ? navFilter.contractorFilter : undefined} />}
      {view === "scaffoldDashboard" && <ScaffoldDashboard onBack={() => setView("scaffoldManagement")} currentUser={currentUser} role="ADMIN" initialStatusFilter={navFilter?.module === "scaffold" ? navFilter.statusFilter : undefined} initialContractorFilter={navFilter?.module === "scaffold" ? navFilter.contractorFilter : undefined} />}
      {view === "scaffoldCodeManagement" && <ScaffoldTagCodeManager onBack={() => setView("systemManagement")} />}
      {view === "managementDashboard" && <HomeDashboard role="ADMIN" currentUser={currentUser} onNavigate={handleHomeNavigate} onBack={() => setView("menu")} />}
      {view === "permissionManagement" && <PermissionManager onBack={() => setView("systemManagement")} />}
      {view === "jobPositionManagement" && <JobPositionManager onBack={() => setView("systemManagement")} />}
      {view === "adminAnalytics" && <AdminAnalytics onBack={() => setView("menu")} currentUser={currentUser} />}
      {view === "archiveManagement" && <ArchiveManager onBack={() => setView("systemManagement")} currentUser={currentUser} />}
    </ResponsiveDashboardShell>
  );
}

// ---------- پنل کارفرما ----------
function EmployerDashboard({ onLogout, currentUser }) {
  const { t, dir } = useLanguage();
  // برچسب ماژول از یک منبع مشترک خوانده می‌شود تا تغییرِ نامِ ماژول در
  // «پیکربندی سامانه»ی SuperAdmin (جدولِ system_module_config، مشترک بین
  // دسکتاپ و موبایل) در همه‌ی نماها یکسان اعمال شود: اول override پنل
  // SuperAdmin، بعد ترجمه‌ی i18n، بعد برچسبِ ثابتِ کد. moduleConfig کمی
  // پایین‌تر تعریف می‌شود ولی این تابع فقط هنگام رندر صدا زده می‌شود (پس
  // تا آن لحظه مقداردهی شده). زیرماژول‌ها کلیدشان در این جدول نیست و
  // خودکار به رفتار قبلی برمی‌گردند.
  const mt = (m) => {
    const cfg = Array.isArray(moduleConfig) ? moduleConfig.find((c) => c.moduleKey === m?.key) : null;
    // ترجمه‌ی i18n همیشه اولویت دارد؛ display_labelِ جدول system_module_config
    // یک رشته‌ی تک‌زبانه (فارسی) است و در حالت دوزبانه نمی‌تواند مبنا باشد — فقط
    // وقتی استفاده می‌شود که هیچ کلید ترجمه‌ای برای این ماژول وجود نداشته باشد.
    if (m?.labelKey) return t(m.labelKey);
    return cfg?.displayLabel || m?.label;
  };
  const [view, setView] = usePersistedState("ihms_view_employer", "menu");
  useEffect(() => { trackPageView(currentUser, view); }, [view]);
  // دکمهٔ برگشت گوشی مثل برگشت داخلی سامانه (بدون خروج از نرم‌افزار).
  useAndroidBackButton(() => { if (view !== "menu") { setView("menu"); return true; } return false; });
  const [navFilter, setNavFilter] = useState(null);
  const [assessmentContext, setAssessmentContext] = useState(null);
  const [planFeatures, setPlanFeatures] = useState(null);
  useEffect(() => { loadCurrentCompanyPlanFeatures().then(setPlanFeatures); }, []);
  const [moduleConfig, setModuleConfig] = useState(null);
  useEffect(() => { loadModuleConfig().then(setModuleConfig); }, []);
  const [permMap, setPermMap] = useState({});
  const [smartItems, setSmartItems] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  useEffect(() => {
    const load = () => loadUnreadTotal(currentUser?.username).then(setChatUnread);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [currentUser?.username]);
  const canEdit = currentUser?.canEdit !== false;

  useEffect(() => {
    loadPermissionsMap("employer", currentUser?.id).then(setPermMap);
  }, [currentUser?.id]);

  const loadNotifs = async () => {
    const [allPersonnel, allAnomalies, allMachinery, notifTypes] = await Promise.all([loadPersonnelList(), loadAnomaliesOfflineFirst(), loadMachineryListOfflineFirst(), loadNotificationTypes().catch(() => null)]);
    await checkAndUpdateDeadlines(allPersonnel); // فقط برای انتقال خودکار به «منقضی» — دیگر اعلان ثبت نمی‌کند
    const barrierAlerts = await loadDegradedBarrierAlerts().catch(() => []);
    const rawItems = [
      ...computeSmartNotifications(allPersonnel, allAnomalies), // بدون scopeContractorName → تجمیعی به‌ازای هر پیمانکار
      ...computeMachinerySmartItems(allMachinery, undefined, notifTypes?.find((t) => t.typeKey === "machinery_expiring")?.warningDays),
      ...barrierAlerts, // فاز ۴: هشدار کاهش اثربخشی Barrier — برای کارفرما/HSE بدون محدودیت پیمانکار
      // داربست عمداً اینجا نیست — طبق خواسته‌ی کاربر، این ماژول توی زنگوله اعلان نمی‌شود
    ];
    setSmartItems(filterSmartItemsByConfig(rawItems, notifTypes, "employer"));
  };
  // اعلان‌ها «زنده» هستند و باید مثل chatUnread خودشان را تازه کنند — نه
  // فقط یک‌بار در mount. علتِ باگِ «اول ۳ مورد، بعد از رفرش ۱۰ مورد»:
  // loadNotifs فقط یک‌بار اجرا می‌شد و اگر آن لحظه کشِ آفلاین تازه
  // پاک‌سازی شده بود یا probeِ شبکه هنوز ننشسته بود، عددِ ناقص برای همیشه
  // منجمد می‌ماند. حالا در mount، هر ۲۰ ثانیه، با برگشتِ focus/دیدنِ تب،
  // و به‌محضِ آنلاین‌شدنِ واقعی دوباره محاسبه می‌شود.
  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) loadNotifs(); };
    run();
    const timer = setInterval(run, 20000);
    const onFocus = () => run();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const unsub = subscribeNetworkStatus((s) => { if (s.online) run(); });
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const openModule = (mod) => {
    if (mod.key === "profile") { setView("profile"); return; }
    if (mod.key === "chat") { setView("chat"); return; }
    if (mod.key === "archiveManagement") { setView("archiveManagement"); return; }
    if (!isModuleVisible(permMap, mod.key)) { alert(t("errNoModulePermission")); return; }
    if (mod.employerOnly && !canEdit) { alert(t("errEditAccessOnly")); return; }
    if (mod.key === "managementDashboard") { setView("managementDashboard"); return; }
    if (mod.key === "proactiveIndicators") { setView("proactiveIndicators"); return; }
    if (mod.sub) { setView(mod.key); return; }
    alert(t("moduleComingSoon", { name: mt(mod) }));
  };

  const handleHomeNavigate = (target) => {
    setNavFilter(target);
    if (target.module === "personnel") setView("personnelDashboard");
    else if (target.module === "anomaly") setView("anomalyList");
    else if (target.module === "machinery") setView("machineryDashboard");
    else if (target.module === "scaffold") setView("scaffoldDashboard");
    else if (target.module === "bowtie") setView("bowtieDashboard");
  };

  const anomalyMod = HSE_MODULES.find((m) => m.key === "anomalyReport");
  const anomalyCanEdit = canEdit && getAccessLevel(permMap, "anomalyReport") !== "view";
  const anomalySub = anomalyMod.sub.filter((s) => anomalyCanEdit || !s.employerOnly);
  const riskMod = HSE_MODULES.find((m) => m.key === "riskAssessment");
  const personnelMod = HSE_MODULES.find((m) => m.key === "personnelAccess");
  const machineryMod = HSE_MODULES.find((m) => m.key === "machineryManagement");
  const scaffoldMod = HSE_MODULES.find((m) => m.key === "scaffoldManagement");

  // دقیقاً همان فیلتر مجوز+پلن که منوی موبایل استفاده می‌کند — فقط این‌بار
  // به‌شکل داده برای Sidebar، بدون تکرار منطق فیلترکردن.
  const sidebarModules = applyModuleConfig(HSE_MODULES.filter((mod) => isModuleVisible(permMap, mod.key) && isModuleInPlan(planFeatures, mod.key)).map((mod) => ({
    key: mod.key,
    icon: MODULE_ICON[mod.key] || LayoutGrid,
    label: mt(mod),
    badge: mod.key === "chat" ? chatUnread : undefined,
    muted: mod.employerOnly && !canEdit,
    sub: mod.sub ? mod.sub.filter((s) => canEdit || !s.employerOnly).map((s) => ({ key: s.key, label: mt(s) })) : undefined,
  })), moduleConfig);

  return (
    <ResponsiveDashboardShell
      panelLabelKey={canEdit ? "panelEmployer" : "panelEmployerViewOnly"}
      currentUser={currentUser}
      onLogout={onLogout}
      onOpenSettings={() => setView("profile")}
      smartItems={smartItems}
      onNavigate={handleHomeNavigate}
      view={view}
      setView={setView}
      sidebarModules={sidebarModules}
    >
      {view === "menu" && (
        <div style={styles.menuList}>
          <MobileAnnouncementBanner setView={setView} />
          {HSE_MODULES.filter((mod) => isModuleVisible(permMap, mod.key) && isModuleInPlan(planFeatures, mod.key)).map((mod) => (
            <MenuRow
              key={mod.key}
              icon={MODULE_ICON[mod.key] || LayoutGrid}
              label={mt(mod)}
              onClick={() => openModule(mod)}
              accent={!!mod.icon}
              muted={mod.employerOnly && !canEdit}
              sub={!!mod.sub}
              badge={mod.key === "chat" ? chatUnread : undefined}
            />
          ))}
        </div>
      )}

      {view === "anomalyReport" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(anomalyMod)}</h3>
          <div style={styles.menuList2}>
            {anomalySub.map((s) => (
              <MenuRow key={s.key} icon={AlertTriangle} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "riskAssessment" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(riskMod)}</h3>
          <div style={styles.menuList2}>
            {riskMod.sub.map((s) => (
              <MenuRow key={s.key} icon={ShieldCheck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "personnelAccess" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(personnelMod)}</h3>
          <div style={styles.menuList2}>
            {personnelMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Users} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "machineryManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(machineryMod)}</h3>
          <div style={styles.menuList2}>
            {machineryMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Truck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "scaffoldManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(scaffoldMod)}</h3>
          <div style={styles.menuList2}>
            {scaffoldMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Tag} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "profile" && <ProfileView onBack={() => setView("menu")} currentUser={currentUser} roleLabel={canEdit ? t("roleLabelEmployer") : t("roleLabelEmployerViewOnly")} />}
      {view === "chat" && <ChatDashboard onBack={() => setView("menu")} currentUser={currentUser} />}
      {view === "riskKnowledgeManagement" && <RiskKnowledgeManager onBack={() => setView("riskAssessment")} currentUser={currentUser} />}
      {view === "anomalyForm" && anomalyCanEdit && <AnomalyForm onBack={() => setView("anomalyReport")} currentUser={currentUser} onSaved={() => setView("anomalyList")} />}
      {view === "anomalyList" && <AnomalyList onBack={() => setView("anomalyReport")} role="EMPLOYER" currentUser={currentUser} readOnly={!canEdit || getAccessLevel(permMap, "anomalyReport") === "view"} initialStatusFilter={navFilter?.module === "anomaly" ? navFilter.statusFilter : undefined} initialRiskFilter={navFilter?.module === "anomaly" ? navFilter.riskFilter : undefined} initialContractorFilter={navFilter?.module === "anomaly" ? navFilter.contractorFilter : undefined} initialExpandedAnomalyId={navFilter?.module === "anomaly" ? navFilter.recordId : undefined} />}
      {view === "correctiveActionsList" && <CorrectiveActionsDashboard onBack={() => setView("anomalyReport")} currentUser={currentUser} />}
      {view === "bowtieDashboard" && <BowTieDashboard role="EMPLOYER" onBack={() => setView("riskAssessment")} currentUser={currentUser} readOnly={!canEdit || getAccessLevel(permMap, "riskAssessment") === "view"} />}
      {view === "hcmsDashboard" && <HcmsDashboard onBack={() => setView("riskAssessment")} currentUser={currentUser} />}
      {view === "archiveManagement" && <ArchiveManager onBack={() => setView("menu")} currentUser={currentUser} />}
      {view === "personnelForm" && <PersonnelForm onBack={() => setView("personnelAccess")} currentUser={currentUser} onSaved={() => setView("personnelAccess")} />}
      {view === "personnelDashboard" && <PersonnelDashboard onBack={() => setView("personnelAccess")} currentUser={currentUser} role="EMPLOYER" readOnly={!canEdit || getAccessLevel(permMap, "personnelAccess") === "view"} initialStatusFilter={navFilter?.module === "personnel" ? navFilter.statusFilter : undefined} initialContractorFilter={navFilter?.module === "personnel" ? navFilter.contractorFilter : undefined} onNavigateToAssessment={(ctx) => { setAssessmentContext(ctx); setView("proactiveIndicators"); }} initialSelectedPersonnelId={assessmentContext?.personnelId} />}
      {view === "proactiveIndicators" && (
        <ProactiveIndicatorsDashboard
          role="EMPLOYER"
          onBack={() => { setAssessmentContext(null); setView(assessmentContext ? "personnelDashboard" : "menu"); }}
          currentUser={currentUser}
          focusPersonnelId={assessmentContext?.personnelId}
          focusJobTitle={assessmentContext?.jobTitle}
          focusPersonnelName={assessmentContext?.personnelName}
        />
      )}
      {view === "incidentsList" && <IncidentsListPage currentUser={currentUser} role="EMPLOYER" readOnly={!canEdit} />}
      {view === "machineryDashboard" && <MachineryDashboard onBack={() => setView("machineryManagement")} currentUser={currentUser} role="EMPLOYER" readOnly={!canEdit || getAccessLevel(permMap, "machineryManagement") === "view"} initialApprovalFilter={navFilter?.module === "machinery" ? navFilter.approvalFilter : undefined} initialContractorFilter={navFilter?.module === "machinery" ? navFilter.contractorFilter : undefined} />}
      {view === "scaffoldDashboard" && <ScaffoldDashboard onBack={() => setView("scaffoldManagement")} currentUser={currentUser} role="EMPLOYER" readOnly={!canEdit || getAccessLevel(permMap, "scaffoldManagement") === "view"} initialStatusFilter={navFilter?.module === "scaffold" ? navFilter.statusFilter : undefined} initialContractorFilter={navFilter?.module === "scaffold" ? navFilter.contractorFilter : undefined} />}
      {view === "managementDashboard" && <HomeDashboard role="EMPLOYER" currentUser={currentUser} onNavigate={handleHomeNavigate} onBack={() => setView("menu")} />}
    </ResponsiveDashboardShell>
  );
}

// ---------- پنل پیمانکار ----------
function ContractorDashboard({ onLogout, currentUser }) {
  const { t, dir } = useLanguage();
  // برچسب ماژول از یک منبع مشترک خوانده می‌شود تا تغییرِ نامِ ماژول در
  // «پیکربندی سامانه»ی SuperAdmin (جدولِ system_module_config، مشترک بین
  // دسکتاپ و موبایل) در همه‌ی نماها یکسان اعمال شود: اول override پنل
  // SuperAdmin، بعد ترجمه‌ی i18n، بعد برچسبِ ثابتِ کد. moduleConfig کمی
  // پایین‌تر تعریف می‌شود ولی این تابع فقط هنگام رندر صدا زده می‌شود (پس
  // تا آن لحظه مقداردهی شده). زیرماژول‌ها کلیدشان در این جدول نیست و
  // خودکار به رفتار قبلی برمی‌گردند.
  const mt = (m) => {
    const cfg = Array.isArray(moduleConfig) ? moduleConfig.find((c) => c.moduleKey === m?.key) : null;
    // ترجمه‌ی i18n همیشه اولویت دارد؛ display_labelِ جدول system_module_config
    // یک رشته‌ی تک‌زبانه (فارسی) است و در حالت دوزبانه نمی‌تواند مبنا باشد — فقط
    // وقتی استفاده می‌شود که هیچ کلید ترجمه‌ای برای این ماژول وجود نداشته باشد.
    if (m?.labelKey) return t(m.labelKey);
    return cfg?.displayLabel || m?.label;
  };
  const [view, setView] = usePersistedState("ihms_view_contractor", "menu");
  useEffect(() => { trackPageView(currentUser, view); }, [view]);
  // دکمهٔ برگشت گوشی مثل برگشت داخلی سامانه (بدون خروج از نرم‌افزار).
  useAndroidBackButton(() => { if (view !== "menu") { setView("menu"); return true; } return false; });
  const [navFilter, setNavFilter] = useState(null);
  const [assessmentContext, setAssessmentContext] = useState(null);
  const [planFeatures, setPlanFeatures] = useState(null);
  useEffect(() => { loadCurrentCompanyPlanFeatures().then(setPlanFeatures); }, []);
  const [moduleConfig, setModuleConfig] = useState(null);
  useEffect(() => { loadModuleConfig().then(setModuleConfig); }, []);
  const [permMap, setPermMap] = useState({});
  const [smartItems, setSmartItems] = useState([]);
  const riskMod = HSE_MODULES.find((m) => m.key === "riskAssessment");
  const [chatUnread, setChatUnread] = useState(0);
  useEffect(() => {
    const load = () => loadUnreadTotal(currentUser?.username).then(setChatUnread);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [currentUser?.username]);

  useEffect(() => {
    loadPermissionsMap("contractor", currentUser?.id).then(setPermMap);
  }, [currentUser?.id]);

  const loadNotifs = async () => {
    const [personnelList, allAnomalies, allMachinery, notifTypes] = await Promise.all([loadPersonnelList(), loadAnomaliesOfflineFirst(), loadMachineryListOfflineFirst(), loadNotificationTypes().catch(() => null)]);
    await checkAndUpdateDeadlines(personnelList); // فقط برای انتقال خودکار به «منقضی» — دیگر اعلان ثبت نمی‌کند
    const barrierAlerts = await loadDegradedBarrierAlerts(currentUser?.name).catch(() => []);
    const rawItems = [
      ...computeSmartNotifications(personnelList, allAnomalies, currentUser?.name),
      ...computeMachinerySmartItems(allMachinery, currentUser?.name, notifTypes?.find((t) => t.typeKey === "machinery_expiring")?.warningDays),
      ...barrierAlerts, // فاز ۴: فقط بریرهایی که «این پیمانکار» در شواهدشان نقش دارد («پیمانکار مرتبط»)
      // داربست عمداً اینجا نیست — طبق خواسته‌ی کاربر، این ماژول توی زنگوله اعلان نمی‌شود
    ];
    setSmartItems(filterSmartItemsByConfig(rawItems, notifTypes, "contractor"));
  };
  // اعلان‌ها «زنده» هستند و باید مثل chatUnread خودشان را تازه کنند — نه
  // فقط یک‌بار در mount. علتِ باگِ «اول ۳ مورد، بعد از رفرش ۱۰ مورد»:
  // loadNotifs فقط یک‌بار اجرا می‌شد و اگر آن لحظه کشِ آفلاین تازه
  // پاک‌سازی شده بود یا probeِ شبکه هنوز ننشسته بود، عددِ ناقص برای همیشه
  // منجمد می‌ماند. حالا در mount، هر ۲۰ ثانیه، با برگشتِ focus/دیدنِ تب،
  // و به‌محضِ آنلاین‌شدنِ واقعی دوباره محاسبه می‌شود.
  useEffect(() => {
    let alive = true;
    const run = () => { if (alive) loadNotifs(); };
    run();
    const timer = setInterval(run, 20000);
    const onFocus = () => run();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const unsub = subscribeNetworkStatus((s) => { if (s.online) run(); });
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const openModule = (mod) => {
    if (mod.key === "profile") { setView("profile"); return; }
    if (mod.key === "chat") { setView("chat"); return; }
    if (mod.key === "archiveManagement") { setView("archiveManagement"); return; }
    if (!isModuleVisible(permMap, mod.key)) { alert(t("errNoModulePermission")); return; }
    if (mod.employerOnly) { alert(t("errEmployerAdminOnly")); return; }
    if (mod.key === "managementDashboard") { setView("managementDashboard"); return; }
    if (mod.key === "proactiveIndicators") { setView("proactiveIndicators"); return; }
    if (mod.sub) { setView(mod.key); return; }
    alert(t("moduleComingSoon", { name: mt(mod) }));
  };

  const handleHomeNavigate = (target) => {
    setNavFilter(target);
    if (target.module === "personnel") setView("personnelDashboard");
    else if (target.module === "anomaly") setView("anomalyList");
    else if (target.module === "machinery") setView("machineryDashboard");
    else if (target.module === "scaffold") setView("scaffoldDashboard");
    else if (target.module === "bowtie") setView("bowtieDashboard");
  };

  const anomalyMod = HSE_MODULES.find((m) => m.key === "anomalyReport");
  const anomalySub = anomalyMod.sub.filter((s) => !s.employerOnly);
  const personnelMod = HSE_MODULES.find((m) => m.key === "personnelAccess");
  const machineryMod = HSE_MODULES.find((m) => m.key === "machineryManagement");
  const scaffoldMod = HSE_MODULES.find((m) => m.key === "scaffoldManagement");

  const sidebarModules = applyModuleConfig(HSE_MODULES.filter((mod) => isModuleVisible(permMap, mod.key) && isModuleInPlan(planFeatures, mod.key)).map((mod) => ({
    key: mod.key,
    icon: MODULE_ICON[mod.key] || LayoutGrid,
    label: mt(mod),
    badge: mod.key === "chat" ? chatUnread : undefined,
    muted: !!mod.employerOnly,
    sub: mod.sub ? mod.sub.filter((s) => !s.employerOnly).map((s) => ({ key: s.key, label: mt(s) })) : undefined,
  })), moduleConfig);

  return (
    <ResponsiveDashboardShell
      panelLabelKey="panelContractor"
      currentUser={currentUser}
      onLogout={onLogout}
      onOpenSettings={() => setView("profile")}
      smartItems={smartItems}
      onNavigate={handleHomeNavigate}
      view={view}
      setView={setView}
      sidebarModules={sidebarModules}
    >
      {view === "menu" && (
        <div style={styles.menuList}>
          <MobileAnnouncementBanner setView={setView} />
          {HSE_MODULES.filter((mod) => isModuleVisible(permMap, mod.key) && isModuleInPlan(planFeatures, mod.key)).map((mod) => (
            <MenuRow
              key={mod.key}
              icon={MODULE_ICON[mod.key] || LayoutGrid}
              label={mt(mod)}
              onClick={() => openModule(mod)}
              accent={!!mod.icon}
              muted={!!mod.employerOnly}
              sub={!!mod.sub}
              badge={mod.key === "chat" ? chatUnread : undefined}
            />
          ))}
        </div>
      )}

      {view === "anomalyReport" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(anomalyMod)}</h3>
          <div style={styles.menuList2}>
            {anomalySub.map((s) => (
              <MenuRow key={s.key} icon={AlertTriangle} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "personnelAccess" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(personnelMod)}</h3>
          <div style={styles.menuList2}>
            {personnelMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Users} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "machineryManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(machineryMod)}</h3>
          <div style={styles.menuList2}>
            {machineryMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Truck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "scaffoldManagement" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(scaffoldMod)}</h3>
          <div style={styles.menuList2}>
            {scaffoldMod.sub.map((s) => (
              <MenuRow key={s.key} icon={Tag} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "riskAssessment" && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <div style={styles.backLink} onClick={() => setView("menu")}>{t("backToMenu")}</div>
          <h3 style={{ marginBottom: 12, color: THEME.navy }}>{mt(riskMod)}</h3>
          <div style={styles.menuList2}>
            {riskMod.sub.filter((s) => !s.employerOnly).map((s) => (
              <MenuRow key={s.key} icon={ShieldCheck} label={mt(s)} onClick={() => setView(s.key)} accent />
            ))}
          </div>
        </div>
      )}

      {view === "profile" && <ProfileView onBack={() => setView("menu")} currentUser={currentUser} roleLabel={t("roleLabelContractor")} />}
      {view === "chat" && <ChatDashboard onBack={() => setView("menu")} currentUser={currentUser} />}
      {view === "hcmsDashboard" && <HcmsDashboard onBack={() => setView("riskAssessment")} currentUser={currentUser} />}
      {view === "bowtieDashboard" && <BowTieDashboard role="CONTRACTOR" onBack={() => setView("riskAssessment")} currentUser={currentUser} readOnly={getAccessLevel(permMap, "riskAssessment") === "view"} />}
      {view === "archiveManagement" && <ArchiveManager onBack={() => setView("menu")} currentUser={currentUser} />}
      {view === "anomalyList" && <AnomalyList onBack={() => setView("anomalyReport")} role="CONTRACTOR" currentUser={currentUser} readOnly={getAccessLevel(permMap, "anomalyReport") === "view"} initialStatusFilter={navFilter?.module === "anomaly" ? navFilter.statusFilter : undefined} initialRiskFilter={navFilter?.module === "anomaly" ? navFilter.riskFilter : undefined} />}
      {view === "correctiveActionsList" && <CorrectiveActionsDashboard onBack={() => setView("anomalyReport")} currentUser={currentUser} />}
      {view === "personnelForm" && getAccessLevel(permMap, "personnelAccess") !== "view" && <PersonnelForm onBack={() => setView("personnelAccess")} currentUser={currentUser} onSaved={() => setView("personnelAccess")} />}
      {view === "personnelDashboard" && <PersonnelDashboard onBack={() => setView("personnelAccess")} currentUser={currentUser} role="CONTRACTOR" readOnly={getAccessLevel(permMap, "personnelAccess") === "view"} initialStatusFilter={navFilter?.module === "personnel" ? navFilter.statusFilter : undefined} onNavigateToAssessment={(ctx) => { setAssessmentContext(ctx); setView("proactiveIndicators"); }} initialSelectedPersonnelId={assessmentContext?.personnelId} />}
      {view === "proactiveIndicators" && (
        <ProactiveIndicatorsDashboard
          role="CONTRACTOR"
          onBack={() => { setAssessmentContext(null); setView(assessmentContext ? "personnelDashboard" : "menu"); }}
          currentUser={currentUser}
          focusPersonnelId={assessmentContext?.personnelId}
          focusJobTitle={assessmentContext?.jobTitle}
          focusPersonnelName={assessmentContext?.personnelName}
        />
      )}
      {view === "incidentsList" && <IncidentsListPage currentUser={currentUser} role="CONTRACTOR" readOnly={false} />}
      {view === "machineryDashboard" && <MachineryDashboard onBack={() => setView("machineryManagement")} currentUser={currentUser} role="CONTRACTOR" readOnly={getAccessLevel(permMap, "machineryManagement") === "view"} initialApprovalFilter={navFilter?.module === "machinery" ? navFilter.approvalFilter : undefined} />}
      {view === "scaffoldDashboard" && <ScaffoldDashboard onBack={() => setView("scaffoldManagement")} currentUser={currentUser} role="CONTRACTOR" readOnly={getAccessLevel(permMap, "scaffoldManagement") === "view"} initialStatusFilter={navFilter?.module === "scaffold" ? navFilter.statusFilter : undefined} />}
      {view === "managementDashboard" && <HomeDashboard role="CONTRACTOR" currentUser={currentUser} onNavigate={handleHomeNavigate} onBack={() => setView("menu")} />}
    </ResponsiveDashboardShell>
  );
}

// ---------- گرفتن خطاهای زمان اجرا و نمایش پیام به‌جای صفحه سفید ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showReport: false };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App error:", error, info);
    this.setState({ info });
  }
  // ErrorBoundary یک کامپوننت کلاسی بیرون از درخت AppInner است، پس به
  // currentUser از طریق props/context دسترسی ندارد — مستقیم همان کلید
  // localStorage که usePersistedState برای «کاربر واردشده» استفاده می‌کند
  // خوانده می‌شود تا گزارش خطا بتواند کاربر را شناسایی کند.
  getCurrentUserForReport() {
    try {
      const raw = localStorage.getItem("ihms_current_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  render() {
    if (this.state.error) {
      const currentUser = this.getCurrentUserForReport();
      return (
        <div style={{ padding: 24, fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl", maxWidth: 560, margin: "40px auto" }}>
          <h3 style={{ color: "#c92a2a" }}>{tr("errBoundaryTitle")}</h3>
          <p style={{ fontSize: 13, color: "#555" }}>{tr("errBoundaryDesc")}</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#991b1b", background: "#fee2e2", padding: 12, borderRadius: 8 }}>
            {String((this.state.error && this.state.error.message) || this.state.error)}
          </pre>
          {currentUser && (
            <button
              type="button"
              onClick={() => this.setState({ showReport: true })}
              style={{ marginTop: 8, padding: "9px 16px", borderRadius: 8, border: "none", background: "#c92a2a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}
            >
              {tr("errBoundaryReportBtn")}
            </button>
          )}
          {this.state.showReport && currentUser && (
            <ReportErrorModal
              currentUser={currentUser}
              moduleKey="app_crash"
              pageLabel={tr("errBoundaryPageLabel")}
              technicalMessage={String((this.state.error && this.state.error.message) || this.state.error)}
              technicalStack={String((this.state.error && this.state.error.stack) || "") + "\n" + String((this.state.info && this.state.info.componentStack) || "")}
              onClose={() => this.setState({ showReport: false })}
            />
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- کامپوننت اصلی ----------
function AppInner() {
  const [currentUser, setCurrentUser] = usePersistedState("ihms_current_user", null);
  // آیا در همین اجرای برنامه (از باز شدن اپ تا الان)، اگر بیومتریک برای
  // این کاربر فعال بود، قبلاً با موفقیت تأیید شده؟ با هر بار setCurrentUser
  // (ورود جدید یا خروج) دوباره false می‌شود، پس هر نشست تازه دوباره از
  // گیت بیومتریک رد می‌شود.
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  // وقتی Super Admin حساب این کاربر را غیرفعال/حذف کند، این پرچم true
  // می‌شود و به‌جای داشبورد، صفحه‌ی «دسترسی قطع شد» نمایش داده می‌شود.
  const [accountDeactivated, setAccountDeactivated] = useState(false);

  // «شرکت فعلی» باید قبل از رندرشدن هر فرزندی (مثل SubscriptionGate که
  // بلافاصله در اولین افکتش این مقدار را می‌خواند) درست باشد — برای
  // همین اینجا مستقیم در بدنه‌ی رندر صدا زده می‌شود، نه داخل useEffect
  // (که در React بعد از افکت‌های فرزندان اجرا می‌شود و همان race
  // condition ای بود که باعث می‌شد بعد از رفرش صفحه، حتی یک Trial کاملاً
  // معتبر هم به‌اشتباه به صفحه‌ی خرید پلن فرستاده شود).
  {
    const companyId = currentUser ? currentUser.companyId || null : null;
    if (getCurrentCompanyId() !== companyId) setCurrentCompanyId(companyId);
  }

  // کش محلی دستگاه هم با شرکت هماهنگ می‌شود — این بخش همچنان می‌تواند
  // داخل useEffect بماند چون خودش async است و فقط پاک‌سازی کش قدیمی
  // احتمالی را انجام می‌دهد، نه تشخیص وضعیت اشتراک را.
  useEffect(() => {
    const companyId = currentUser ? currentUser.companyId || null : null;
    syncOfflineCacheCompanyScope(companyId).catch(() => {});
  }, [currentUser]);

  // ---------- خروج اجباری وقتی حساب توسط مدیر سامانه غیرفعال شود ----------
  // تصمیمِ «هنوز فعال است؟» سمت سرور گرفته می‌شود (Edge Function
  // check-account-active که امضای توکن را بررسی و is_active را با
  // service_role می‌خواند) — نه صرفاً یک بررسیِ قابل‌دورزدن در Frontend.
  // هر ~۲۰ ثانیه و همچنین با برگشتن تمرکز به پنجره بررسی می‌شود؛ به‌محضِ
  // منفی‌شدن نتیجه، توکن نشست فوراً پاک می‌شود تا هیچ درخواست داده‌ای
  // دیگری با اعتبار قبلی نرود، و صفحه‌ی مسدودکننده نمایش داده می‌شود.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const runCheck = async () => {
      const result = await checkMyAccountActive();
      if (cancelled) return;
      // فقط سیگنال‌های صریحِ سمت‌سرورِ «این حساب دیگر معتبر نیست» صفحه‌ی
      // مسدودکننده را نشان می‌دهند — نه یک توکنِ منقضی/خطای گذرا (که مسیر
      // عادیِ نشستِ تمام‌شده را دارند و پیامشان فرق می‌کند).
      if (!result.active && (result.reason === "deactivated" || result.reason === "not_found")) {
        clearSessionToken();
        setAccountDeactivated(true);
        return;
      }
      // reason === "no_token": در همین مرورگر دیگر هیچ توکن نشستِ معتبری
      // نیست (یا همین حالا به‌خاطر غیرفعال‌سازی پاک شد، یا منقضی شده).
      // currentUser در localStorage (usePersistedState) ماندگار است، پس
      // بدون این شرط، رفرشِ صفحه دوباره کاربر را — حتی بعد از اخراج توسط
      // مدیر سامانه — با کلید anon مستقیم به داشبورد برمی‌گرداند. اینجا
      // مسیرِ «نشستِ تمام‌شده» است: کاربر ذخیره‌شده پاک و به صفحه‌ی ورود
      // برگردانده می‌شود (بدون پیام «حساب غیرفعال شد»، چون ممکن است صرفاً
      // منقضی‌شدن عادی باشد، نه لزوماً غیرفعال‌سازی).
      if (!result.active && result.reason === "no_token") {
        setCurrentUser(null);
      }
    };
    runCheck();
    const timer = setInterval(runCheck, 20000);
    const onFocus = () => runCheck();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentUser]);

  // ورود تازه و صریح با رمز عبور، خودش یک احراز هویت کامل است — نیازی
  // نیست بلافاصله بعدش دوباره گیت بیومتریک هم نشان داده شود. گیت
  // بیومتریک فقط برای زمانی است که نشست، بدون تایپ دوباره‌ی رمز، از
  // localStorage با باز شدن اپ بازیابی می‌شود (همان‌جا که biometricUnlocked
  // با مقدار اولیه‌ی false شروع می‌شود).
  const handleLogin = (user) => {
    setBiometricUnlocked(true);
    setAccountDeactivated(false);
    setCurrentUser(user);
    // طبق خواسته‌ی صریح: با هر ورود تازه (نه رفرش صفحه)، کاربر باید از
    // صفحه‌ی اصلی شروع کند — نه جایی که کاربر قبلی (با همان نقش) رهایش
    // کرده بود. این سه کلید بر اساس نقش ذخیره می‌شوند نه کاربر، پس اینجا
    // (لحظه‌ی ورود واقعی، نه بازیابی نشست از localStorage) پاک می‌شوند.
    try {
      localStorage.removeItem("ihms_view_admin");
      localStorage.removeItem("ihms_view_employer");
      localStorage.removeItem("ihms_view_contractor");
    } catch { /* بی‌اهمیت اگر localStorage در دسترس نبود */ }
  };

  // خروج کامل: طبق الزام صریح، باید اعتبار ورود بیومتریک را هم باطل کند
  // (نه فقط نشست جاری را پاک کند) — یعنی بعد از خروج، حتی با اثر انگشت
  // هم دیگر بدون وارد کردن دوباره‌ی رمز عبور نمی‌شود وارد شد.
  // خروج معمولی («خروج» در هدر) فقط همین نشست را می‌بندد — بیومتریک را
  // باطل نمی‌کند، وگرنه کاربر باید بعد از هر بار خروج دوباره فعالش کند و
  // کل قابلیت عملاً بی‌فایده می‌شد (دقیقاً مثل اپ‌های بانکی: خروج معمولی
  // چیزی به Face ID/اثر انگشت کاری ندارد). ابطال بیومتریک، یک اقدام
  // صریح و جداست: فقط با خاموش‌کردن کلید در «پروفایل → امنیت» اتفاق می‌افتد.
  const handleLogout = () => {
    trackLogout(currentUser);
    setBiometricUnlocked(false);
    setAccountDeactivated(false);
    clearSessionToken();
    setCurrentUser(null);
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  // حساب توسط مدیر سامانه غیرفعال/حذف شده — نشست باز فوراً بسته می‌شود و
  // پیش از هر داشبورد یا گیتی، صفحه‌ی مسدودکننده نمایش داده می‌شود.
  if (accountDeactivated) {
    return <AccountDeactivatedScreen onExit={handleLogout} />;
  }

  // نشستِ ذخیره‌شده وجود دارد؛ اگر برای همین کاربر بیومتریک فعال است و
  // هنوز در این اجرای برنامه تأیید نشده، به‌جای رفتن مستقیم به داشبورد،
  // اول باید اثر انگشت/چهره تأیید شود.
  if (isBiometricEnabledFor(currentUser.username) && !biometricUnlocked) {
    return (
      <BiometricGateScreen
        currentUser={currentUser}
        onUnlocked={(user) => { setCurrentUser(user); setBiometricUnlocked(true); }}
        onFallbackToPassword={() => setCurrentUser(null)}
      />
    );
  }

  return (
    <SubscriptionGate currentUser={currentUser} onLogout={handleLogout}>
      {currentUser.role === "ADMIN" && <AdminDashboard onLogout={handleLogout} currentUser={currentUser} />}
      {(currentUser.role === "EMPLOYER" || currentUser.role === "HSE_SUPERVISOR") && <EmployerDashboard onLogout={handleLogout} currentUser={currentUser} />}
      {currentUser.role === "CONTRACTOR" && <ContractorDashboard onLogout={handleLogout} currentUser={currentUser} />}
    </SubscriptionGate>
  );
}

// مسیر Super Admin کاملاً جدا از درخت بالاست — هیچ حساب کارفرما/پیمانکار/ادمین
// معمولی هرگز این کامپوننت‌ها را نمی‌بیند، چون فقط با آدرس مخفی #super-admin
// (نه از طریق هیچ دکمه یا لینکی در رابط کاربری عادی) قابل‌دسترسیه، و کلید
// نشست‌ش هم جدا از ihms_current_user است.
function SuperAdminRoot() {
  const [admin, setAdmin] = usePersistedState("ihms_super_admin", null);
  if (!admin) return <SuperAdminLogin onLogin={setAdmin} />;
  return <SuperAdminPanel currentAdmin={admin} onLogout={() => { clearSessionToken("super_admin"); setAdmin(null); }} />;
}

// بارگذاری تنظیمات ظاهری (لوگو، نام سامانه، رنگ سازمانی، تم روشن/تیره،
// فونت) یک‌بار در بالاترین سطح اپ اصلی مشتری — مستقل از ورود/خروج، چون
// این تنظیمات سراسری سامانه‌اند نه مخصوص یک کاربر. با این‌جا‌بودن (نه
// داخل خودِ AppInner)، همه‌ی نقاط return آن تابع (صفحه‌ی ورود، گیت
// بیومتریک، هر سه داشبورد) بدون تکرار کد پوشش داده می‌شوند.
function AppInnerWithAppearance() {
  const [appearance, setAppearance] = useState(null);
  useEffect(() => {
    loadAppearanceConfig().then((cfg) => { setAppearance(cfg); applyAppearanceToDom(cfg); });
  }, []);
  return (
    <AppearanceProvider config={appearance}>
      <AppInner />
    </AppearanceProvider>
  );
}

export default function App() {
  const isSuperAdminRoute = typeof window !== "undefined" && window.location.hash === "#super-admin";
  // مسیر پرسشنامه‌ی عمومی HSE Climate — دقیقاً مثل super-admin، کاملاً جدا
  // از درخت اصلی و بدون هیچ نیازی به ورود؛ فقط با لینک/QR واقعی قابل‌دسترسی است.
  const hseClimateSurveyMatch = typeof window !== "undefined" ? window.location.hash.match(/^#hse-climate-survey\/(.+)$/) : null;
  // پنل Super Admin زبانِ کاملاً جداگانه‌ای دارد (کلید localStorage:
  // "ihms_lang_superadmin") تا انتخابِ زبانِ سوپرادمین هیچ اثری روی
  // کاربران عادیِ سامانه نگذارد و برعکس.
  if (isSuperAdminRoute) {
    return (
      <ErrorBoundary>
        <LanguageProvider storageKey="ihms_lang_superadmin">
          <SuperAdminRoot />
        </LanguageProvider>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <LanguageProvider>
        {hseClimateSurveyMatch ? (
          <PublicHseClimateSurvey publicToken={hseClimateSurveyMatch[1]} />
        ) : (
          <AppInnerWithAppearance />
        )}
      </LanguageProvider>
    </ErrorBoundary>
  );
}


