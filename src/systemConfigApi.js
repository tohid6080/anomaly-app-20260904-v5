import { sb, sbOk, getCurrentCompanyId } from "./shared.js";
import { translate, getCurrentLang } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * پیکربندی سامانه — سراسری (نه به‌ازای شرکت)، چون Super Admin «مالک کل
 * سامانه» است، نه یک شرکت خاص. این لایه هم از داخل SuperAdminPanel (برای
 * نوشتن) و هم از داخل App.jsx (برای خواندن و اعمال روی Sidebar/داشبورد
 * واقعی) استفاده می‌شود.
 */

// ---------- مدیریت ماژول‌ها ----------

export async function loadModuleConfig() {
  const rows = await sb("system_module_config?select=*&order=sort_order.asc");
  return sbOk(rows) ? rows.map((r) => ({
    moduleKey: r.module_key,
    displayLabel: r.display_label || "",        // نامِ فارسی
    displayLabelEn: r.display_label_en || "",   // نامِ انگلیسی
    description: r.description || "",
    sortOrder: r.sort_order,
  })) : [];
}

export async function saveModuleConfig(list, updatedBy) {
  const payload = list.map((m, idx) => ({
    module_key: m.moduleKey,
    display_label: m.displayLabel || "",
    display_label_en: m.displayLabelEn || "",
    description: m.description || null,
    sort_order: idx + 1, updated_at: new Date().toISOString(), updated_by: updatedBy || "",
  }));
  const rows = await sb("system_module_config?on_conflict=module_key", { method: "POST", body: JSON.stringify(payload), prefer: "resolution=merge-duplicates,return=representation" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveModules") };
  return { ok: true };
}

// ---------- مدیریت داشبورد ----------

export async function loadDashboardConfig() {
  const rows = await sb("system_dashboard_config?select=*&order=sort_order.asc");
  return sbOk(rows) ? rows.map((r) => ({ kpiKey: r.kpi_key, sortOrder: r.sort_order, isVisible: r.is_visible !== false })) : [];
}

export async function saveDashboardConfig(list, updatedBy) {
  const payload = list.map((k, idx) => ({
    kpi_key: k.kpiKey, sort_order: idx + 1, is_visible: k.isVisible !== false,
    updated_at: new Date().toISOString(), updated_by: updatedBy || "",
  }));
  const rows = await sb("system_dashboard_config?on_conflict=kpi_key", { method: "POST", body: JSON.stringify(payload), prefer: "resolution=merge-duplicates,return=representation" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveDashboard") };
  return { ok: true };
}

// ---------- ویجت‌های داشبورد مدیریتی (پنل‌های داخل HomeDashboard.jsx) ----------
// مستقل از KPIهای بالا — این‌ها پنل‌های داخل خودِ ماژول «داشبورد مدیریتی» هستند.

export async function loadDashboardWidgetConfig() {
  const rows = await sb("system_dashboard_widgets?select=*&order=sort_order.asc.nullslast");
  return sbOk(rows)
    ? rows.map((r) => ({ widgetKey: r.widget_key, isVisible: r.is_visible !== false, sortOrder: r.sort_order != null ? r.sort_order : null }))
    : [];
}

// ذخیره‌ی دسته‌ایِ نمایش/ترتیبِ پنل‌های داشبورد — یک upsert روی همان جدول.
// list: [{ widgetKey, isVisible, sortOrder }]. فقط ردیف‌های واقعاً
// تغییرکرده باید ارسال شوند (تصمیمِ diff سمت فراخوان است).
export async function saveDashboardWidgetsBulk(list, updatedBy) {
  if (!Array.isArray(list) || list.length === 0) return { ok: true };
  const nowIso = new Date().toISOString();
  const payload = list.map((w) => ({
    widget_key: w.widgetKey,
    is_visible: w.isVisible !== false,
    sort_order: w.sortOrder,
    updated_at: nowIso,
    updated_by: updatedBy || "",
  }));
  const rows = await sb(
    "system_dashboard_widgets?on_conflict=widget_key",
    { method: "POST", body: JSON.stringify(payload), prefer: "resolution=merge-duplicates,return=representation" },
    "super_admin",
  );
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveDashboardWidgets") };
  return { ok: true };
}

// ---------- مدیریت اعلان‌ها ----------
// این رجیستری روی محاسبه‌ی زنده‌ی موجود اعلان‌ها (نه یک سیستم اعلان
// موازی) فیلتر می‌زند — نگاه کنید به classifyNotificationKey/
// filterSmartItemsByConfig در App.jsx.

// برچسب/توضیحِ نمایشیِ هر نوع اعلان از دیتابیس می‌آید (فارسی، seed‌شده). برای
// دوزبانه‌شدن، نوع‌های شناخته‌شده از روی type_key به کلید ترجمه نگاشت می‌شوند؛
// نوع‌های آینده که اینجا نیستند خودکار به همان مقدار دیتابیس برمی‌گردند.
const NOTIFICATION_TYPE_LABEL_KEYS = {
  anomaly_open: { label: "saNtAnomalyOpenLabel", desc: "saNtAnomalyOpenDesc" },
  personnel_health_visit: { label: "saNtHealthVisitLabel", desc: "saNtHealthVisitDesc" },
  personnel_health_result: { label: "saNtHealthResultLabel", desc: "saNtHealthResultDesc" },
  machinery_expiring: { label: "saNtMachineryExpiringLabel", desc: "saNtMachineryExpiringDesc" },
  machinery_needs_correction: { label: "saNtMachineryNeedsCorrectionLabel", desc: "saNtMachineryNeedsCorrectionDesc" },
  machinery_pending_review: { label: "saNtMachineryPendingReviewLabel", desc: "saNtMachineryPendingReviewDesc" },
  barrier_effectiveness: { label: "saNtBarrierEffectivenessLabel", desc: "saNtBarrierEffectivenessDesc" },
};

export function notificationTypeLabel(nt) {
  const k = NOTIFICATION_TYPE_LABEL_KEYS[nt?.typeKey]?.label;
  return k ? tr(k) : (nt?.label || nt?.typeKey || "");
}

export function notificationTypeDescription(nt) {
  const k = NOTIFICATION_TYPE_LABEL_KEYS[nt?.typeKey]?.desc;
  return k ? tr(k) : (nt?.description || "");
}

export async function loadNotificationTypes() {
  const rows = await sb("system_notification_types?select=*&order=type_key.asc");
  return sbOk(rows) ? rows.map((r) => ({
    typeKey: r.type_key, label: r.label, description: r.description || "",
    isEnabled: r.is_enabled !== false, targetRole: r.target_role || "all",
    priority: r.priority || "medium", warningDays: r.warning_days, ownerModuleKey: r.owner_module_key || null,
  })) : [];
}

export async function saveNotificationType(typeKey, patch, updatedBy) {
  const payload = { updated_at: new Date().toISOString(), updated_by: updatedBy || "" };
  if ("isEnabled" in patch) payload.is_enabled = patch.isEnabled;
  if ("targetRole" in patch) payload.target_role = patch.targetRole;
  if ("priority" in patch) payload.priority = patch.priority;
  if ("warningDays" in patch) payload.warning_days = patch.warningDays;
  const rows = await sb(`system_notification_types?type_key=eq.${typeKey}`, { method: "PATCH", body: JSON.stringify(payload) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveNotification") };
  return { ok: true };
}

// طبق خواسته‌ی صریح: «هر ماژولی که در پلن سوپرادمین غیرفعال می‌شود،
// اعلان‌های همان ماژول نیز خودکار غیرفعال شوند». چون یک ماژول می‌تواند
// در یک پلن فعال و در پلن دیگری غیرفعال باشد، معیار این است: اگر هیچ
// پلنی (از میان همه‌ی پلن‌های فعال سامانه) دیگر این ماژول را در features
// نداشته باشد، آن نوع اعلان خاموش می‌شود. این تابع بعد از هر ذخیره‌ی
// پلن (ایجاد/ویرایش) صدا زده می‌شود — نه یک قانون دائمی-قفل‌شده: اگر
// دوباره حداقل یک پلن آن ماژول را روشن کند، در دفعه‌ی بعدی ذخیره‌ی پلن،
// اعلان مربوطه دوباره قابل‌فعال‌سازی می‌شود (ولی خودکار روشن نمی‌شود —
// چون ممکن است سوپرادمین عمداً آن را دستی خاموش کرده باشد).
export async function syncNotificationTypesWithPlans(allPlansFeatures) {
  const activeModuleKeys = new Set(allPlansFeatures.flat());
  const notifTypes = await sb("system_notification_types?select=type_key,owner_module_key,is_enabled");
  if (!sbOk(notifTypes)) return;
  const toDisable = notifTypes.filter((t) => t.owner_module_key && t.is_enabled && !activeModuleKeys.has(t.owner_module_key));
  if (toDisable.length === 0) return;
  await Promise.all(toDisable.map((t) =>
    sb(`system_notification_types?type_key=eq.${t.type_key}`, { method: "PATCH", body: JSON.stringify({ is_enabled: false, updated_at: new Date().toISOString(), updated_by: "auto-sync (ماژول در هیچ پلنی فعال نیست)" }) }, "super_admin")
  ));
}

// ---------- تنظیمات ظاهری ----------
// طبق الزام «از ساختارهای موجود استفاده کن»: هیچ جدول جدیدی ساخته
// نمی‌شود — از همان system_settings موجود (key-value، ساخته‌شده برای
// ظرفیت Storage) با پیشوند کلیدهای appearance_* استفاده می‌شود.

const APPEARANCE_KEYS = [
  "appearance_system_name", "appearance_system_title", "appearance_logo_url", "appearance_favicon_url", "appearance_apk_icon_url",
  "appearance_color_primary", "appearance_color_accent", "appearance_theme_mode", "appearance_font_family",
  "appearance_font_size_base", "appearance_sidebar_default_collapsed", "appearance_header_show_company_name",
];

export async function loadAppearanceConfig() {
  const rows = await sb(`system_settings?key=in.(${APPEARANCE_KEYS.map((k) => `"${k}"`).join(",")})&select=key,value_text,value_numeric`);
  const map = {};
  if (sbOk(rows)) rows.forEach((r) => { map[r.key] = r.value_numeric != null ? r.value_numeric : r.value_text; });
  return {
    systemName: map.appearance_system_name || "IHMS",
    systemTitle: map.appearance_system_title || tr("defaultSystemTitle"),
    logoUrl: map.appearance_logo_url || "",
    faviconUrl: map.appearance_favicon_url || "",
    apkIconUrl: map.appearance_apk_icon_url || "",
    colorPrimary: map.appearance_color_primary || "#0a1620",
    colorAccent: map.appearance_color_accent || "#14b8a6",
    themeMode: map.appearance_theme_mode || "dark",
    fontFamily: map.appearance_font_family || "'Vazirmatn', 'Inter', Tahoma, Arial, sans-serif",
    fontSizeBase: map.appearance_font_size_base != null ? Number(map.appearance_font_size_base) : null,
    sidebarDefaultCollapsed: map.appearance_sidebar_default_collapsed === "true" || map.appearance_sidebar_default_collapsed === true,
    headerShowCompanyName: map.appearance_header_show_company_name !== "false" && map.appearance_header_show_company_name !== false,
  };
}

export async function saveAppearanceConfig(config, updatedBy) {
  const entries = [
    ["appearance_system_name", config.systemName, "text"],
    ["appearance_system_title", config.systemTitle, "text"],
    ["appearance_logo_url", config.logoUrl, "text"],
    ["appearance_favicon_url", config.faviconUrl, "text"],
    ["appearance_apk_icon_url", config.apkIconUrl, "text"],
    ["appearance_color_primary", config.colorPrimary, "text"],
    ["appearance_color_accent", config.colorAccent, "text"],
    ["appearance_theme_mode", config.themeMode, "text"],
    ["appearance_font_family", config.fontFamily, "text"],
    ["appearance_font_size_base", config.fontSizeBase, "numeric"],
    ["appearance_sidebar_default_collapsed", String(!!config.sidebarDefaultCollapsed), "text"],
    ["appearance_header_show_company_name", String(config.headerShowCompanyName !== false), "text"],
  ];
  const payload = entries.map(([key, value, kind]) => ({
    key,
    value_text: kind === "text" ? (value || null) : null,
    value_numeric: kind === "numeric" ? (value || null) : null,
    updated_at: new Date().toISOString(), updated_by: updatedBy || "",
  }));
  const rows = await sb("system_settings?on_conflict=key", { method: "POST", body: JSON.stringify(payload), prefer: "resolution=merge-duplicates,return=representation" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveAppearance") };
  return { ok: true };
}

// پالت کامل حالت تیره — چون سایه‌روشن یک تم واقعی به تغییر هم‌زمان
// پس‌زمینه/متن/حاشیه نیاز دارد، نه فقط دو رنگ اصلی؛ رنگ‌های سازمانی
// (primary/accent) کاربر همچنان از تنظیمات خودش می‌آید، نه از این پالت.
// تمِ تیرهٔ نئونی = نمونهٔ طراحی (پیش‌فرضِ سامانه)
const DARK_PALETTE = {
  navy: "#0a1620", navyDeep: "#07121a", navyMid: "#123a49",
  tealDeep: "#0f9488", tealSoft: "#0f2e2b",
  bg: "#0b1a24", surface: "#0f2a3a", surface2: "#123240",
  border: "#1e3d4d", borderSoft: "#17303c", borderStrong: "#274a5c",
  text: "#e8eef2", text2: "#9fb4c0", text3: "#6a8290",
  danger: "#ef4444", dangerBg: "#3a1e1e", warn: "#f59e0b", warnBg: "#3a2c14", ok: "#22c55e", okBg: "#173021",
};
const LIGHT_PALETTE = {
  navy: "#0e2c3f", navyDeep: "#0a2331", navyMid: "#123f59",
  tealDeep: "#0c5b54", tealSoft: "#e0f0ee",
  bg: "#eef1f4", surface: "#ffffff", surface2: "#f6f8fa",
  border: "#d9e0e6", borderSoft: "#e7ecf0", borderStrong: "#cbd5e1",
  text: "#15222e", text2: "#556571", text3: "#8695a1",
  danger: "#cf4a3f", dangerBg: "#fbe7e4", warn: "#c47f28", warnBg: "#f8eddb", ok: "#2f8f57", okBg: "#e2f1e8",
};

// اعمال زنده‌ی تنظیمات ظاهری روی DOM — از طریق CSS Custom Properties، نه
// دستکاری مستقیم ماژول shared.js. با این روش، هیچ‌کدام از ~۹۸۵ ارجاع
// موجود به THEME.xxx در کل پروژه نیازی به تغییر ندارند: خودِ THEME در
// shared.js به‌جای رشته‌ی هگز ثابت، رشته‌ی var(--ihms-xxx, مقدار-پیش‌فرض)
// برمی‌گرداند؛ این تابع فقط مقدار واقعی آن متغیرهای CSS را ست می‌کند.
// اگر تنظیمی هنوز بارگذاری نشده/در دسترس نباشد، مقدار fallback داخل خودِ
// var() همان ظاهر فعلی و آشنای سامانه را حفظ می‌کند — بدون رگرسیون بصری.
export function applyAppearanceToDom(config) {
  if (typeof document === "undefined" || !config) return;
  const root = document.documentElement.style;
  const light = config.themeMode === "light";
  const palette = light ? LIGHT_PALETTE : DARK_PALETTE;

  // navy/teal: انتخابِ سفارشیِ شرکت اگر بود، وگرنه پالتِ همان تم
  root.setProperty("--ihms-navy", config.colorPrimary || palette.navy);
  root.setProperty("--ihms-teal", config.colorAccent || (light ? "#127c72" : "#14b8a6"));
  root.setProperty("--ihms-navy-deep", palette.navyDeep);
  root.setProperty("--ihms-navy-mid", palette.navyMid);
  root.setProperty("--ihms-teal-deep", palette.tealDeep);
  root.setProperty("--ihms-teal-soft", palette.tealSoft);
  root.setProperty("--ihms-bg", palette.bg);
  root.setProperty("--ihms-surface", palette.surface);
  root.setProperty("--ihms-surface-2", palette.surface2);
  root.setProperty("--ihms-border", palette.border);
  root.setProperty("--ihms-border-soft", palette.borderSoft);
  root.setProperty("--ihms-border-strong", palette.borderStrong);
  root.setProperty("--ihms-text", palette.text);
  root.setProperty("--ihms-text2", palette.text2);
  root.setProperty("--ihms-text3", palette.text3);
  root.setProperty("--ihms-danger", palette.danger);
  root.setProperty("--ihms-danger-bg", palette.dangerBg);
  root.setProperty("--ihms-warn", palette.warn);
  root.setProperty("--ihms-warn-bg", palette.warnBg);
  root.setProperty("--ihms-ok", palette.ok);
  root.setProperty("--ihms-ok-bg", palette.okBg);
  try { document.documentElement.style.colorScheme = light ? "light" : "dark"; } catch { /* بی‌اهمیت */ }
  if (config.fontFamily) root.setProperty("--ihms-font", config.fontFamily);
  if (config.fontSizeBase) root.setProperty("--ihms-font-size-base", `${config.fontSizeBase}px`);

  if (config.systemTitle) document.title = config.systemTitle;
  if (config.faviconUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = config.faviconUrl;
  }
}

// ---------- اطلاعیه‌های سامانه ----------
// گسترش همان جدول موجود system_announcements (که تا امروز فقط از طریق
// «ارسال پیام سیستمی» نوشته می‌شد، بدون هیچ نمایشی) — نه یک جدول جدید.

function announcementFromRow(r) {
  return {
    id: r.id, companyId: r.company_id, title: r.title || "", message: r.message || "",
    iconKey: r.icon_key || "megaphone", imageUrl: r.image_url || "",
    // اطلاعیه‌های قبلی فقط image_url داشتند و همچنان باید در صفحه‌ی ورود
    // هم عکس نشان بدهند (طبق الزام صریح «اطلاعیه‌های قبلی حذف نشوند و
    // با ساختار جدید کار کنند») — پس اگر login_image_url جداگانه تنظیم
    // نشده باشد، به همان image_url قدیمی بازمی‌گردد.
    loginImageUrl: r.login_image_url || r.image_url || "",
    buttonLabel: r.button_label || "", buttonUrl: r.button_url || "",
    startsAt: r.starts_at, endsAt: r.ends_at, priority: r.priority || 0, displaySeconds: r.display_seconds || 10,
    displayLocation: r.display_location || "both", isActive: r.is_active !== false, createdAt: r.created_at,
  };
}

// طرف مشتری — همه‌ی اطلاعیه‌های فعال، در بازه‌ی زمانی جاری، برای همین
// شرکت یا سراسری (company_id=null)، مرتب‌شده بر اساس اولویت (بالا→پایین)
// سپس تازگی. پارامتر locationFilter ('login' | 'home') فقط اطلاعیه‌هایی
// را برمی‌گرداند که برای همان محل تنظیم شده‌اند (یا 'both' هستند) —
// طبق الزام صریح، اطلاعیه‌های قبلی (که همیشه display_location='both'
// دارند، چون این مقدار پیش‌فرض ستون است) در هر دو محل بدون تغییر رفتار قبلی نمایش داده می‌شوند.
export async function loadActiveAnnouncements(locationFilter) {
  const companyId = getCurrentCompanyId();
  const nowIso = new Date().toISOString();
  const filter = companyId ? `&or=(company_id.is.null,company_id.eq.${companyId})` : "&company_id=is.null";
  const rows = await sb(`system_announcements?is_active=eq.true&select=*${filter}&order=priority.desc,created_at.desc`);
  if (!sbOk(rows)) return [];
  const eligible = rows.filter((r) => {
    if (r.starts_at && new Date(r.starts_at) > new Date(nowIso)) return false;
    if (r.ends_at && new Date(r.ends_at) < new Date(nowIso)) return false;
    if (locationFilter) {
      const loc = r.display_location || "both";
      if (loc !== "both" && loc !== locationFilter) return false;
    }
    return true;
  });
  return eligible.map(announcementFromRow);
}

export async function loadActiveAnnouncement() {
  const companyId = getCurrentCompanyId();
  const nowIso = new Date().toISOString();
  const filter = companyId ? `&or=(company_id.is.null,company_id.eq.${companyId})` : "&company_id=is.null";
  const rows = await sb(`system_announcements?is_active=eq.true&select=*${filter}&order=priority.desc,created_at.desc`);
  if (!sbOk(rows)) return null;
  const eligible = rows.filter((r) => {
    if (r.starts_at && new Date(r.starts_at) > new Date(nowIso)) return false;
    if (r.ends_at && new Date(r.ends_at) < new Date(nowIso)) return false;
    return true;
  });
  return eligible.length > 0 ? announcementFromRow(eligible[0]) : null;
}

// طرف سوپرادمین — مدیریت کامل
export async function loadAllAnnouncements() {
  const rows = await sb("system_announcements?select=*&order=priority.desc,created_at.desc", {}, "super_admin");
  return sbOk(rows) ? rows.map(announcementFromRow) : [];
}

export async function createAnnouncement(rec, createdBy) {
  const payload = {
    company_id: rec.companyId || null, title: rec.title || null, message: rec.message,
    icon_key: rec.iconKey || "megaphone", image_url: rec.imageUrl || null, login_image_url: rec.loginImageUrl || null,
    button_label: rec.buttonLabel || null, button_url: rec.buttonUrl || null,
    starts_at: rec.startsAt || null, ends_at: rec.endsAt || null, priority: rec.priority || 0, display_seconds: rec.displaySeconds || 10,
    display_location: rec.displayLocation || "both", is_active: rec.isActive !== false, updated_by: createdBy || "",
  };
  const rows = await sb("system_announcements", { method: "POST", body: JSON.stringify([payload]) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrCreateAnnouncement") };
  return { ok: true };
}

export async function updateAnnouncement(id, rec, updatedBy) {
  const payload = {
    company_id: rec.companyId || null, title: rec.title || null, message: rec.message,
    icon_key: rec.iconKey || "megaphone", image_url: rec.imageUrl || null, login_image_url: rec.loginImageUrl || null,
    button_label: rec.buttonLabel || null, button_url: rec.buttonUrl || null,
    starts_at: rec.startsAt || null, ends_at: rec.endsAt || null, priority: rec.priority || 0, display_seconds: rec.displaySeconds || 10,
    display_location: rec.displayLocation || "both", is_active: rec.isActive !== false, updated_at: new Date().toISOString(), updated_by: updatedBy || "",
  };
  const rows = await sb(`system_announcements?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrSaveAnnouncement") };
  return { ok: true };
}

export async function setAnnouncementActive(id, isActive, updatedBy) {
  const rows = await sb(`system_announcements?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ is_active: isActive, updated_at: new Date().toISOString(), updated_by: updatedBy || "" }) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrChangeStatus") };
  return { ok: true };
}

export async function deleteAnnouncement(id) {
  const rows = await sb(`system_announcements?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("scErrDeleteAnnouncement") };
  return { ok: true };
}
