import { sb, sbOk, getCurrentCompanyId } from "./shared.js";
import { translate, getCurrentLang } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * قابلیت عمومی «گزارش خطا» — هر کاربر (ادمین/کارفرما/سرپرست HSE/پیمانکار)
 * هنگام مشاهده‌ی خطا می‌تواند آن را به SuperAdmin گزارش کند. جدول
 * error_reports دقیقاً مثل hse_gate_items با RLS سطح‌شرکت محافظت می‌شود:
 * هر کاربر فقط می‌تواند برای شرکت خودش گزارش ثبت کند، و فقط SuperAdmin
 * می‌تواند گزارش‌های همه‌ی شرکت‌ها را ببیند/پیگیری کند.
 */

export async function submitErrorReport({ currentUser, moduleKey, pageLabel, description, technicalMessage, technicalStack }) {
  const companyId = getCurrentCompanyId();
  if (!companyId) return { __error: true, message: tr("erpErrCompanyUnknown") };
  const payload = {
    company_id: companyId,
    reported_by_username: currentUser?.username || "",
    reported_by_name: currentUser?.name || "",
    reported_by_role: currentUser?.role || "",
    module_key: moduleKey || "",
    page_label: pageLabel || "",
    description: (description || "").trim(),
    technical_message: technicalMessage || "",
    technical_stack: (technicalStack || "").slice(0, 4000),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
  // ریشه‌ی واقعی 42501 پیدا شد: با تشخیص مستقیم روی دیتابیس تأیید شد که
  // policy درج (INSERT) کاملاً درست است (would_match=true) — اما چون
  // sb() پیش‌فرض «Prefer: return=representation» می‌فرستد (برای برگرداندن
  // ردیف تازه‌درج‌شده)، Postgres/PostgREST علاوه بر policy درج، policy
  // SELECT همان ردیف را هم چک می‌کند تا بتواند RETURNING بدهد — و چون
  // policy انتخاب این جدول عمداً فقط SuperAdmin است (نه صاحب رکورد)،
  // همین باعث رد کل درخواست با همان خطای RLS می‌شد، با اینکه شرط درج
  // خودش کاملاً برقرار بود. راه‌حل: return=minimal بخواهیم — کلاینت به
  // ردیف تازه‌درج‌شده نیازی ندارد (فقط موفقیت/خطا مهم است)، پس دیگر
  // نیازی به عبور از policy SELECT نیست.
  const rows = await sb("error_reports", { method: "POST", body: JSON.stringify([payload]), prefer: "return=minimal" });
  if (!sbOk(rows)) {
    // پیام واقعی PostgREST/RLS هم لاگ و هم برگردانده می‌شود — قبلاً اینجا
    // یک پیام عمومی ثابت بود و جزئیات واقعی خطا (که خودِ دیباگ همین
    // قابلیت بهش نیاز داشت) گم می‌شد.
    console.error("ثبت گزارش خطا ناموفق بود", rows);
    return { __error: true, message: tr("erpErrSubmit", { detail: rows?.message || tr("erpUnknown") }) };
  }
  return { ok: true };
}

// ---------- سمت SuperAdmin — مشاهده و پیگیری همه‌ی گزارش‌های همه‌ی شرکت‌ها ----------

function errorReportFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    companyName: r.companies?.name || "",
    reportedByUsername: r.reported_by_username || "",
    reportedByName: r.reported_by_name || "",
    reportedByRole: r.reported_by_role || "",
    moduleKey: r.module_key || "",
    pageLabel: r.page_label || "",
    description: r.description || "",
    technicalMessage: r.technical_message || "",
    technicalStack: r.technical_stack || "",
    userAgent: r.user_agent || "",
    status: r.status || "open",
    adminNote: r.admin_note || "",
    resolvedBy: r.resolved_by || "",
    resolvedAt: r.resolved_at || "",
    createdAt: r.created_at,
  };
}

export async function loadErrorReports(statusFilter) {
  const filter = statusFilter && statusFilter !== "all" ? `&status=eq.${statusFilter}` : "";
  const rows = await sb(`error_reports?select=*,companies(name)&order=created_at.desc${filter}`, {}, "super_admin");
  return sbOk(rows) ? rows.map(errorReportFromRow) : [];
}

export async function updateErrorReportStatus(id, status, adminNote, resolvedBy) {
  const patch = { status, admin_note: adminNote || "" };
  if (status === "resolved") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = resolvedBy || "";
  }
  const rows = await sb(`error_reports?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("erpErrUpdateStatus") };
  return { ok: true };
}
