import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const MODULE = "permitSigners";
const TABLE = "permit_authorized_signers";
// نام/شغلِ هر امضاکننده آزادانه تایپ نمی‌شود — همیشه از همان حسابِ ثبت‌شده
// در SuperAdmin ← مدیریتِ حساب‌ها «خوانده» می‌شود؛ حالا هر ردیف یا به یک
// حسابِ پیمانکاری (contractor_id) یا یک حسابِ کارفرما/سرپرستِ HSE
// (employer_account_id) وصل است — دقیقاً یکی از این دو، نه هر دو.
const SELECT = "*,contractors(name,contact_person_name,is_active,job_positions(title)),employer_accounts(name,role,is_active,job_positions(title))";

/* ---------------- نگاشتِ ردیف ↔ آبجکت ---------------- */
export function signerFromRow(r) {
  if (r.employer_account_id) {
    const e = r.employer_accounts || {};
    return {
      id: r.id,
      companyId: r.company_id,
      accountType: "employer",
      contractorId: null,
      employerAccountId: r.employer_account_id,
      fullName: e.name || "",
      jobTitle: e.job_positions?.title || "",
      // گروهِ همتاسازیِ جانشین: همه‌ی حساب‌هایِ کارفرما/سرپرستِ HSE یک گروه‌اند
      // (بر خلافِ پیمانکارها که هرکدام به شرکتِ خودشان محدودند).
      groupName: tr("pmGroupEmployer"),
      role: e.role || "",
      accountActive: e.is_active !== false,
      status: r.status === "leave" ? "leave" : "active",
      substituteId: r.substitute_id || "",
      createdBy: r.created_by || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
  const c = r.contractors || {};
  return {
    id: r.id,
    companyId: r.company_id,
    accountType: "contractor",
    contractorId: r.contractor_id,
    employerAccountId: null,
    fullName: c.contact_person_name || "",
    jobTitle: c.job_positions?.title || "",
    groupName: c.name || "",
    role: "",
    accountActive: c.is_active !== false,
    status: r.status === "leave" ? "leave" : "active",
    substituteId: r.substitute_id || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ---------------- خواندن ---------------- */
// فهرستِ کاملِ همه‌ی امضاکنندگان (پیمانکاری + کارفرمایی) — برای نمایِ
// سرپرست/کارشناسِ HSE کارفرما
export async function loadAllAuthorizedSigners() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`${TABLE}?select=${SELECT}&order=created_at.asc${filter}`);
  return sbOk(rows) ? rows.map(signerFromRow) : [];
}

// فهرستِ یک حسابِ پیمانکاریِ مشخص — چون هر حساب حداکثر یک‌بار می‌تواند
// امضاکننده باشد، این معمولاً صفر یا یک ردیف برمی‌گرداند: هم برایِ نمایِ
// خودِ پیمانکار («آیا من مجازم؟») و هم قبل از امضا در PermitRuntime.
export async function loadContractorSigners(contractorId) {
  if (!contractorId) return [];
  const rows = await sb(`${TABLE}?contractor_id=eq.${contractorId}&select=${SELECT}`);
  return sbOk(rows) ? rows.map(signerFromRow) : [];
}

// حساب‌های پیمانکاریِ ثبت‌شده در SuperAdmin (شرکتِ جاری) — برایِ پیکِ
// «افزودنِ امضاکننده»: نامِ شخص/شرکت/شغل از همان حساب، نه ورودیِ آزاد.
export async function loadContractorAccountsForSigning() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`contractors?select=id,name,contact_person_name,is_active,job_positions(title)&order=name.asc${filter}`);
  return sbOk(rows) ? rows.map((r) => ({
    id: r.id,
    accountType: "contractor",
    fullName: r.contact_person_name || "",
    groupName: r.name || "",
    jobTitle: r.job_positions?.title || "",
    isActive: r.is_active !== false,
  })) : [];
}

// حساب‌هایِ کارفرما/سرپرستِ HSE ثبت‌شده در SuperAdmin (شرکتِ جاری) — همان
// پیکِ «افزودنِ امضاکننده»، برایِ سمتِ کارفرما. role: 'employer' | 'hse_supervisor'.
export async function loadEmployerAccountsForSigning() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`employer_accounts?select=id,name,role,is_active,job_positions(title)&order=name.asc${filter}`);
  return sbOk(rows) ? rows.map((r) => ({
    id: r.id,
    accountType: "employer",
    fullName: r.name || "",
    groupName: tr("pmGroupEmployer"),
    jobTitle: r.job_positions?.title || "",
    role: r.role || "",
    isActive: r.is_active !== false,
  })) : [];
}

/* ---------------- نوشتن (offlineWrite) ---------------- */
// accountType: "contractor" | "employer"
export async function createSigner(accountType, accountId, createdBy) {
  const id = uid("psig");
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "insert", id,
    payload: {
      company_id: getCurrentCompanyId(),
      contractor_id: accountType === "contractor" ? accountId : null,
      employer_account_id: accountType === "employer" ? accountId : null,
      status: "active", substitute_id: null, created_by: createdBy || "",
    },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true, id };
}

// تغییرِ فعال/مرخصی — یک فرمانِ اتمیک جدا (نه بخشی از فرمِ ویرایش) چون خودش
// اثرِ فوری روی این‌که چه کسی مجاز به امضاست دارد.
export async function setSignerStatus(id, status) {
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "update", id,
    payload: { status: status === "leave" ? "leave" : "active", updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

export async function setSignerSubstitute(id, substituteId) {
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "update", id,
    payload: { substitute_id: substituteId || null, updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}

export async function deleteSigner(id) {
  const res = await offlineWrite({ module: MODULE, table: TABLE, action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}
