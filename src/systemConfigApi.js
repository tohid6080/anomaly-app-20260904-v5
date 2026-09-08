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
  // پالت کاملِ سطوح/متن/وضعیت — هر کدام خالی بماند، مقدارِ همان تمِ
  // پایه (تیره/روشن) استفاده می‌شود؛ پس تنظیمِ نکردنشان = رفتارِ فعلی.
  "appearance_color_bg", "appearance_color_surface", "appearance_color_surface_2", "appearance_color_border",
  "appearance_color_text", "appearance_color_text2", "appearance_color_text3",
  "appearance_color_ok", "appearance_color_warn", "appearance_color_danger",
  // سیستمِ توکنِ حرفه‌ای (فاز ۲): حالتِ بصری، مقیاسِ کلیِ UI، وزنِ پایه‌ی
  // فونت، سایز/وزنِ فونت به تفکیکِ نقش، هندسه/فاصله/آیکون و رنگِ ناحیه‌ها.
  // همه اختیاری‌اند — خالی/تهی = پیش‌فرضِ تمِ پایه، بدونِ رگرسیون.
  "appearance_visual_mode", "appearance_ui_scale", "appearance_font_weight_base",
  "appearance_fs_header", "appearance_fs_menu", "appearance_fs_title", "appearance_fs_body",
  "appearance_fs_card", "appearance_fs_kpi", "appearance_fs_table",
  "appearance_fw_header", "appearance_fw_menu", "appearance_fw_title", "appearance_fw_body",
  "appearance_fw_card", "appearance_fw_kpi", "appearance_fw_table",
  "appearance_radius_card", "appearance_radius_btn", "appearance_pad", "appearance_gap",
  "appearance_icon_size", "appearance_icon_stroke",
  "appearance_region_header_bg", "appearance_region_header_border",
  "appearance_region_sidebar_bg", "appearance_region_sidebar_border",
  "appearance_region_card_bg", "appearance_region_card_border",
  "appearance_region_widget_bg", "appearance_region_widget_border",
];

// تفکیکِ ظاهرِ وب / موبایل / سوپرادمین (فاز ۳): همان کلیدهای بالا «لایهٔ
// وب (پایه)» هستند؛ برای هر فیلدِ «ظاهری» (نه هویت) دو کلیدِ override هم
// داریم — appearance_mob_<x> و appearance_sa_<x>. خالی = ارث‌بری از وب،
// پس نبودشان = رفتارِ امروز، بدونِ رگرسیون و بدونِ ردیفِ اضافه.
// هر ردیف: [فیلدِ config، پسوندِ کلید، نوع].
const APPEARANCE_SCOPED_FIELDS = [
  ["themeMode", "theme_mode", "text"], ["visualMode", "visual_mode", "text"], ["uiScale", "ui_scale", "text"],
  ["fontFamily", "font_family", "text"], ["fontWeightBase", "font_weight_base", "numeric"],
  ["colorPrimary", "color_primary", "text"], ["colorAccent", "color_accent", "text"],
  ["colorBg", "color_bg", "text"], ["colorSurface", "color_surface", "text"], ["colorSurface2", "color_surface_2", "text"],
  ["colorBorder", "color_border", "text"], ["colorText", "color_text", "text"], ["colorText2", "color_text2", "text"],
  ["colorText3", "color_text3", "text"], ["colorOk", "color_ok", "text"], ["colorWarn", "color_warn", "text"], ["colorDanger", "color_danger", "text"],
  ["fsHeader", "fs_header", "numeric"], ["fsMenu", "fs_menu", "numeric"], ["fsTitle", "fs_title", "numeric"],
  ["fsBody", "fs_body", "numeric"], ["fsCard", "fs_card", "numeric"], ["fsKpi", "fs_kpi", "numeric"], ["fsTable", "fs_table", "numeric"],
  ["fwHeader", "fw_header", "numeric"], ["fwMenu", "fw_menu", "numeric"], ["fwTitle", "fw_title", "numeric"],
  ["fwBody", "fw_body", "numeric"], ["fwCard", "fw_card", "numeric"], ["fwKpi", "fw_kpi", "numeric"], ["fwTable", "fw_table", "numeric"],
  ["radiusCard", "radius_card", "numeric"], ["radiusBtn", "radius_btn", "numeric"],
  ["pad", "pad", "numeric"], ["gap", "gap", "numeric"], ["iconSize", "icon_size", "numeric"], ["iconStroke", "icon_stroke", "numeric"],
  ["regionHeaderBg", "region_header_bg", "text"], ["regionHeaderBorder", "region_header_border", "text"],
  ["regionSidebarBg", "region_sidebar_bg", "text"], ["regionSidebarBorder", "region_sidebar_border", "text"],
  ["regionCardBg", "region_card_bg", "text"], ["regionCardBorder", "region_card_border", "text"],
  ["regionWidgetBg", "region_widget_bg", "text"], ["regionWidgetBorder", "region_widget_border", "text"],
];
APPEARANCE_SCOPED_FIELDS.forEach(([, suffix]) => {
  APPEARANCE_KEYS.push(`appearance_mob_${suffix}`, `appearance_sa_${suffix}`);
});

function readScopeOverrides(map, prefix) {
  const o = {};
  APPEARANCE_SCOPED_FIELDS.forEach(([field, suffix, kind]) => {
    const raw = map[`appearance_${prefix}_${suffix}`];
    o[field] = kind === "numeric" ? num(raw) : (raw || "");
  });
  return o;
}

const scopeFieldHasValue = (v) => (typeof v === "number" ? !Number.isNaN(v) : !!(v && String(v).trim()));

// config مؤثرِ یک scope: web = خودِ config؛ mobile/superadmin = config با
// روی‌هم‌گذاریِ فقط فیلدهای override که واقعاً مقدار دارند.
export function effectiveAppearance(config, scope) {
  if (!config || (scope !== "mobile" && scope !== "superadmin")) return config;
  const ov = scope === "mobile" ? config.mobileOverrides : config.superadminOverrides;
  if (!ov) return config;
  const merged = { ...config };
  APPEARANCE_SCOPED_FIELDS.forEach(([field]) => {
    if (scopeFieldHasValue(ov[field])) merged[field] = ov[field];
  });
  return merged;
}

// پیش‌فرضِ توکن‌های تایپوگرافی/هندسه — دقیقاً همان اعدادی که امروز در
// کد hardcode شده‌اند، تا وقتی چیزی تنظیم نشده، ظاهر بی‌تغییر بماند.
const TOKEN_DEFAULTS = {
  fsHeader: 13, fsMenu: 14.5, fsTitle: 17, fsBody: 13, fsCard: 12, fsKpi: 26, fsTable: 12.5,
  fwHeader: 700, fwMenu: 600, fwTitle: 800, fwBody: 400, fwCard: 700, fwKpi: 800, fwTable: 600,
  radiusCard: 12, radiusBtn: 9, pad: 14, gap: 10, iconSize: 16, iconStroke: 2,
};
const UI_SCALES = { compact: 0.92, comfortable: 1, large: 1.12 };
// سایه‌ها فقط CSS box-shadow نرم‌اند — بدون WebGL، بدون افتِ کارایی.
// «تهی» = حالت انتخاب‌نشده = همان سایه‌های ملایمِ امروزِ سامانه.
const VISUAL_MODE_ELEV = {
  "": [
    "0 1px 2px rgba(15,42,63,0.04), 0 4px 14px -8px rgba(15,42,63,0.12)",
    "0 1px 2px rgba(15,42,63,0.04), 0 12px 32px -12px rgba(15,42,63,0.14)",
    "0 2px 6px rgba(15,42,63,0.06), 0 20px 44px -16px rgba(15,42,63,0.22)",
  ],
  flat: ["none", "none", "none"],
  soft2_5d: [
    "0 1px 2px rgba(0,0,0,0.05), 0 6px 18px -10px rgba(0,0,0,0.30)",
    "0 2px 4px rgba(0,0,0,0.06), 0 14px 34px -14px rgba(0,0,0,0.38)",
    "0 3px 8px rgba(0,0,0,0.08), 0 26px 56px -18px rgba(0,0,0,0.48)",
  ],
  premium3d: [
    "0 1px 2px rgba(0,0,0,0.06), 0 10px 24px -10px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)",
    "0 3px 8px rgba(0,0,0,0.10), 0 22px 48px -16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.05)",
    "0 6px 16px rgba(0,0,0,0.14), 0 40px 80px -22px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)",
  ],
};

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
    colorBg: map.appearance_color_bg || "",
    colorSurface: map.appearance_color_surface || "",
    colorSurface2: map.appearance_color_surface_2 || "",
    colorBorder: map.appearance_color_border || "",
    colorText: map.appearance_color_text || "",
    colorText2: map.appearance_color_text2 || "",
    colorText3: map.appearance_color_text3 || "",
    colorOk: map.appearance_color_ok || "",
    colorWarn: map.appearance_color_warn || "",
    colorDanger: map.appearance_color_danger || "",
    themeMode: map.appearance_theme_mode || "dark",
    fontFamily: map.appearance_font_family || "'Vazirmatn', 'Inter', Tahoma, Arial, sans-serif",
    fontSizeBase: map.appearance_font_size_base != null ? Number(map.appearance_font_size_base) : null,
    sidebarDefaultCollapsed: map.appearance_sidebar_default_collapsed === "true" || map.appearance_sidebar_default_collapsed === true,
    headerShowCompanyName: map.appearance_header_show_company_name !== "false" && map.appearance_header_show_company_name !== false,
    // --- سیستمِ توکنِ حرفه‌ای ---
    visualMode: map.appearance_visual_mode || "",       // "" | flat | soft2_5d | premium3d
    uiScale: map.appearance_ui_scale || "",             // "" | compact | comfortable | large
    fontWeightBase: num(map.appearance_font_weight_base),
    fsHeader: num(map.appearance_fs_header), fsMenu: num(map.appearance_fs_menu), fsTitle: num(map.appearance_fs_title),
    fsBody: num(map.appearance_fs_body), fsCard: num(map.appearance_fs_card), fsKpi: num(map.appearance_fs_kpi), fsTable: num(map.appearance_fs_table),
    fwHeader: num(map.appearance_fw_header), fwMenu: num(map.appearance_fw_menu), fwTitle: num(map.appearance_fw_title),
    fwBody: num(map.appearance_fw_body), fwCard: num(map.appearance_fw_card), fwKpi: num(map.appearance_fw_kpi), fwTable: num(map.appearance_fw_table),
    radiusCard: num(map.appearance_radius_card), radiusBtn: num(map.appearance_radius_btn),
    pad: num(map.appearance_pad), gap: num(map.appearance_gap),
    iconSize: num(map.appearance_icon_size), iconStroke: num(map.appearance_icon_stroke),
    regionHeaderBg: map.appearance_region_header_bg || "", regionHeaderBorder: map.appearance_region_header_border || "",
    regionSidebarBg: map.appearance_region_sidebar_bg || "", regionSidebarBorder: map.appearance_region_sidebar_border || "",
    regionCardBg: map.appearance_region_card_bg || "", regionCardBorder: map.appearance_region_card_border || "",
    regionWidgetBg: map.appearance_region_widget_bg || "", regionWidgetBorder: map.appearance_region_widget_border || "",
    // لایه‌های override برای موبایل و سوپرادمین (فقط مقادیرِ خام؛ خالی = ارث از وب)
    mobileOverrides: readScopeOverrides(map, "mob"),
    superadminOverrides: readScopeOverrides(map, "sa"),
  };
}
function num(v) { return v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null; }

export async function saveAppearanceConfig(config, updatedBy) {
  const entries = [
    ["appearance_system_name", config.systemName, "text"],
    ["appearance_system_title", config.systemTitle, "text"],
    ["appearance_logo_url", config.logoUrl, "text"],
    ["appearance_favicon_url", config.faviconUrl, "text"],
    ["appearance_apk_icon_url", config.apkIconUrl, "text"],
    ["appearance_color_primary", config.colorPrimary, "text"],
    ["appearance_color_accent", config.colorAccent, "text"],
    ["appearance_color_bg", config.colorBg, "text"],
    ["appearance_color_surface", config.colorSurface, "text"],
    ["appearance_color_surface_2", config.colorSurface2, "text"],
    ["appearance_color_border", config.colorBorder, "text"],
    ["appearance_color_text", config.colorText, "text"],
    ["appearance_color_text2", config.colorText2, "text"],
    ["appearance_color_text3", config.colorText3, "text"],
    ["appearance_color_ok", config.colorOk, "text"],
    ["appearance_color_warn", config.colorWarn, "text"],
    ["appearance_color_danger", config.colorDanger, "text"],
    ["appearance_theme_mode", config.themeMode, "text"],
    ["appearance_font_family", config.fontFamily, "text"],
    ["appearance_font_size_base", config.fontSizeBase, "numeric"],
    ["appearance_sidebar_default_collapsed", String(!!config.sidebarDefaultCollapsed), "text"],
    ["appearance_header_show_company_name", String(config.headerShowCompanyName !== false), "text"],
    ["appearance_visual_mode", config.visualMode, "text"],
    ["appearance_ui_scale", config.uiScale, "text"],
    ["appearance_font_weight_base", config.fontWeightBase, "numeric"],
    ["appearance_fs_header", config.fsHeader, "numeric"], ["appearance_fs_menu", config.fsMenu, "numeric"],
    ["appearance_fs_title", config.fsTitle, "numeric"], ["appearance_fs_body", config.fsBody, "numeric"],
    ["appearance_fs_card", config.fsCard, "numeric"], ["appearance_fs_kpi", config.fsKpi, "numeric"],
    ["appearance_fs_table", config.fsTable, "numeric"],
    ["appearance_fw_header", config.fwHeader, "numeric"], ["appearance_fw_menu", config.fwMenu, "numeric"],
    ["appearance_fw_title", config.fwTitle, "numeric"], ["appearance_fw_body", config.fwBody, "numeric"],
    ["appearance_fw_card", config.fwCard, "numeric"], ["appearance_fw_kpi", config.fwKpi, "numeric"],
    ["appearance_fw_table", config.fwTable, "numeric"],
    ["appearance_radius_card", config.radiusCard, "numeric"], ["appearance_radius_btn", config.radiusBtn, "numeric"],
    ["appearance_pad", config.pad, "numeric"], ["appearance_gap", config.gap, "numeric"],
    ["appearance_icon_size", config.iconSize, "numeric"], ["appearance_icon_stroke", config.iconStroke, "numeric"],
    ["appearance_region_header_bg", config.regionHeaderBg, "text"], ["appearance_region_header_border", config.regionHeaderBorder, "text"],
    ["appearance_region_sidebar_bg", config.regionSidebarBg, "text"], ["appearance_region_sidebar_border", config.regionSidebarBorder, "text"],
    ["appearance_region_card_bg", config.regionCardBg, "text"], ["appearance_region_card_border", config.regionCardBorder, "text"],
    ["appearance_region_widget_bg", config.regionWidgetBg, "text"], ["appearance_region_widget_border", config.regionWidgetBorder, "text"],
  ];
  // لایه‌های override — هر فیلدِ خالی به NULL می‌رود (مثلِ فیلدهای پایه)
  [["mob", config.mobileOverrides], ["sa", config.superadminOverrides]].forEach(([prefix, ov]) => {
    if (!ov) return;
    APPEARANCE_SCOPED_FIELDS.forEach(([field, suffix, kind]) => {
      entries.push([`appearance_${prefix}_${suffix}`, ov[field], kind]);
    });
  });
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
  text: "#e8eef2", text2: "#9fb4c0", text3: "#6a8290", heading: "#eef4f7",
  danger: "#ef4444", dangerBg: "#3a1e1e", warn: "#f59e0b", warnBg: "#3a2c14", ok: "#22c55e", okBg: "#173021",
};
const LIGHT_PALETTE = {
  navy: "#0e2c3f", navyDeep: "#0a2331", navyMid: "#123f59",
  tealDeep: "#0c5b54", tealSoft: "#e0f0ee",
  bg: "#eef1f4", surface: "#ffffff", surface2: "#f6f8fa",
  border: "#d9e0e6", borderSoft: "#e7ecf0", borderStrong: "#cbd5e1",
  text: "#15222e", text2: "#556571", text3: "#8695a1", heading: "#0e2c3f",
  danger: "#cf4a3f", dangerBg: "#fbe7e4", warn: "#c47f28", warnBg: "#f8eddb", ok: "#2f8f57", okBg: "#e2f1e8",
};

// حلِ نهاییِ توکن‌های ظاهری از روی config: برای هر توکنِ در معرضِ
// شخصی‌سازی، مقدارِ سفارشیِ سوپرادمین (اگر ست شده) وگرنه مقدارِ همان تمِ
// پایه (تیره/روشن). توکن‌های مشتق (border-soft، navy-deep، *-bg و…) فقط
// از پالتِ تم می‌آیند و در پنل نمایش داده نمی‌شوند. هم applyAppearanceToDom
// و هم پیش‌نمایشِ زندهٔ پنلِ سوپرادمین از همین تابع استفاده می‌کنند تا
// دو جا از هم جدا نیفتند.
export function resolveAppearanceTokens(config) {
  const light = config.themeMode === "light";
  const palette = light ? LIGHT_PALETTE : DARK_PALETTE;
  const pick = (custom, fallback) => (custom && String(custom).trim() ? custom : fallback);

  // مقیاسِ کلیِ UI — ضریبی که روی همه‌ی سایزهای فونت/فاصله/آیکون اعمال
  // می‌شود. تنظیم‌نشده = ۱ (بدون تغییر).
  const scale = UI_SCALES[config.uiScale] || 1;
  const D = TOKEN_DEFAULTS;
  const px = (custom, dflt) => `${Math.round((num(custom) ?? dflt) * scale * 100) / 100}px`;
  const w = (custom, dflt) => String(num(custom) ?? num(config.fontWeightBase) ?? dflt);
  const elev = VISUAL_MODE_ELEV[config.visualMode] || VISUAL_MODE_ELEV[""];
  const surface = pick(config.colorSurface, palette.surface);
  const border = pick(config.colorBorder, palette.border);
  const navy = pick(config.colorPrimary, palette.navy);

  return {
    // ---- رنگ‌های پایه ----
    "--ihms-navy": navy,
    "--ihms-teal": pick(config.colorAccent, light ? "#127c72" : "#14b8a6"),
    "--ihms-navy-deep": palette.navyDeep,
    "--ihms-navy-mid": palette.navyMid,
    "--ihms-teal-deep": palette.tealDeep,
    "--ihms-teal-soft": palette.tealSoft,
    "--ihms-bg": pick(config.colorBg, palette.bg),
    "--ihms-surface": surface,
    "--ihms-surface-2": pick(config.colorSurface2, palette.surface2),
    "--ihms-border": border,
    "--ihms-border-soft": palette.borderSoft,
    "--ihms-border-strong": palette.borderStrong,
    "--ihms-text": pick(config.colorText, palette.text),
    "--ihms-text2": pick(config.colorText2, palette.text2),
    "--ihms-text3": pick(config.colorText3, palette.text3),
    "--ihms-heading": palette.heading,
    "--ihms-danger": pick(config.colorDanger, palette.danger),
    "--ihms-danger-bg": palette.dangerBg,
    "--ihms-warn": pick(config.colorWarn, palette.warn),
    "--ihms-warn-bg": palette.warnBg,
    "--ihms-ok": pick(config.colorOk, palette.ok),
    "--ihms-ok-bg": palette.okBg,

    // ---- رنگِ ناحیه‌ها (تنظیم‌نشده = رنگِ پایه‌ی متناظر) ----
    "--ihms-header-bg": pick(config.regionHeaderBg, navy),
    "--ihms-header-border": pick(config.regionHeaderBorder, palette.navyDeep),
    "--ihms-sidebar-bg": pick(config.regionSidebarBg, navy),
    "--ihms-sidebar-border": pick(config.regionSidebarBorder, border),
    "--ihms-card-bg": pick(config.regionCardBg, surface),
    "--ihms-card-border": pick(config.regionCardBorder, border),
    "--ihms-widget-bg": pick(config.regionWidgetBg, surface),
    "--ihms-widget-border": pick(config.regionWidgetBorder, border),

    // ---- تایپوگرافی به تفکیکِ نقش ----
    "--ihms-fw": String(num(config.fontWeightBase) ?? 400),
    "--ihms-fw-heading": String(num(config.fontWeightBase) ? Math.min(900, num(config.fontWeightBase) + 300) : 700),
    "--ihms-fs-header": px(config.fsHeader, D.fsHeader), "--ihms-fw-header": w(config.fwHeader, D.fwHeader),
    "--ihms-fs-menu": px(config.fsMenu, D.fsMenu), "--ihms-fw-menu": w(config.fwMenu, D.fwMenu),
    "--ihms-fs-title": px(config.fsTitle, D.fsTitle), "--ihms-fw-title": w(config.fwTitle, D.fwTitle),
    "--ihms-fs-body": px(config.fsBody, D.fsBody), "--ihms-fw-body": w(config.fwBody, D.fwBody),
    "--ihms-fs-card": px(config.fsCard, D.fsCard), "--ihms-fw-card": w(config.fwCard, D.fwCard),
    "--ihms-fs-kpi": px(config.fsKpi, D.fsKpi), "--ihms-fw-kpi": w(config.fwKpi, D.fwKpi),
    "--ihms-fs-table": px(config.fsTable, D.fsTable), "--ihms-fw-table": w(config.fwTable, D.fwTable),

    // ---- هندسه و فاصله ----
    "--ihms-radius-card": px(config.radiusCard, D.radiusCard),
    "--ihms-radius-btn": px(config.radiusBtn, D.radiusBtn),
    "--ihms-pad": px(config.pad, D.pad),
    "--ihms-gap": px(config.gap, D.gap),
    "--ihms-icon-size": px(config.iconSize, D.iconSize),
    "--ihms-icon-stroke": String(num(config.iconStroke) ?? D.iconStroke),

    // ---- ارتفاع/سایه (حالتِ بصری) ----
    "--ihms-elev-1": elev[0],
    "--ihms-elev-2": elev[1],
    "--ihms-elev-3": elev[2],
  };
}

// اعمال زنده‌ی تنظیمات ظاهری روی DOM — از طریق CSS Custom Properties، نه
// دستکاری مستقیم ماژول shared.js. با این روش، هیچ‌کدام از ~۹۸۵ ارجاع
// موجود به THEME.xxx در کل پروژه نیازی به تغییر ندارند: خودِ THEME در
// shared.js به‌جای رشته‌ی هگز ثابت، رشته‌ی var(--ihms-xxx, مقدار-پیش‌فرض)
// برمی‌گرداند؛ این تابع فقط مقدار واقعی آن متغیرهای CSS را ست می‌کند.
// اگر تنظیمی هنوز بارگذاری نشده/در دسترس نباشد، مقدار fallback داخل خودِ
// var() همان ظاهر فعلی و آشنای سامانه را حفظ می‌کند — بدون رگرسیون بصری.
export const APPEARANCE_CACHE_KEY = "ihms_appearance_cache";

export function applyAppearanceToDom(config) {
  if (typeof document === "undefined" || !config) return;
  const root = document.documentElement.style;
  const light = config.themeMode === "light";

  const tokens = resolveAppearanceTokens(config);
  Object.keys(tokens).forEach((k) => root.setProperty(k, tokens[k]));
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

// کشِ استارتِ سردِ بدونِ‌فلش. کلِ configِ خام (وب + هر دو لایهٔ override)
// ذخیره می‌شود؛ main.jsx خودش effectiveAppearance را برای scopeِ درست
// (سوپرادمین / موبایل / وب) محاسبه و اعمال می‌کند. نسخه‌دار است تا کشِ
// شکلِ قدیمی نادیده گرفته شود، نه بد اعمال شود.
export function cacheAppearanceConfig(config) {
  try { localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify({ v: 3, config })); } catch { /* بی‌اهمیت */ }
}
export function readCachedAppearanceConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY) || "null");
    return parsed && parsed.v === 3 && parsed.config ? parsed.config : null;
  } catch { return null; }
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
