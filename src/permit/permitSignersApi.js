import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const MODULE = "permitSigners";
const TABLE = "permit_authorized_signers";
// نام/شغلِ هر امضاکننده آزادانه تایپ نمی‌شود — همیشه از همان حسابِ
// پیمانکاری که در SuperAdmin ← مدیریتِ حساب‌ها ثبت شده «خوانده» می‌شود؛
// پس هر خواندنی این رابطه را هم embed می‌کند (contractor_id → contractors → job_positions).
const SELECT = "*,contractors(name,contact_person_name,is_active,job_positions(title))";

/* ---------------- نگاشتِ ردیف ↔ آبجکت ---------------- */
export function signerFromRow(r) {
  const c = r.contractors || {};
  return {
    id: r.id,
    companyId: r.company_id,
    contractorId: r.contractor_id,
    fullName: c.contact_person_name || "",
    jobTitle: c.job_positions?.title || "",
    contractorCompanyName: c.name || "",
    accountActive: c.is_active !== false,
    status: r.status === "leave" ? "leave" : "active",
    substituteId: r.substitute_id || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ---------------- خواندن ---------------- */
// فهرستِ کاملِ همه‌ی امضاکنندگان — برای نمایِ سرپرست/کارشناسِ HSE کارفرما
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
    fullName: r.contact_person_name || "",
    companyName: r.name || "",
    jobTitle: r.job_positions?.title || "",
    isActive: r.is_active !== false,
  })) : [];
}

/* ---------------- نوشتن (offlineWrite) ---------------- */
export async function createSigner(contractorId, createdBy) {
  const id = uid("psig");
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "insert", id,
    payload: {
      company_id: getCurrentCompanyId(), contractor_id: contractorId,
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
