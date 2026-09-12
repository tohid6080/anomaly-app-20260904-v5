import { sb, sbOk, uid, getCurrentCompanyId } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (k, p) => translate(getCurrentLang(), k, p);
const MODULE = "permitSigners";
const TABLE = "permit_authorized_signers";

/* ---------------- نگاشتِ ردیف ↔ آبجکت ---------------- */
export function signerFromRow(r) {
  return {
    id: r.id,
    companyId: r.company_id,
    contractorId: r.contractor_id,
    fullName: r.full_name || "",
    jobTitle: r.job_title || "",
    status: r.status === "leave" ? "leave" : "active",
    substituteId: r.substitute_id || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function signerToDb(rec) {
  return {
    company_id: rec.companyId || getCurrentCompanyId(),
    contractor_id: rec.contractorId,
    full_name: (rec.fullName || "").trim(),
    job_title: (rec.jobTitle || "").trim(),
    status: rec.status === "leave" ? "leave" : "active",
    substitute_id: rec.substituteId || null,
    updated_at: new Date().toISOString(),
  };
}

/* ---------------- خواندن ---------------- */
// فهرستِ کاملِ همه‌ی پیمانکارها — برای نمایِ سرپرست/کارشناسِ HSE کارفرما
export async function loadAllAuthorizedSigners() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`${TABLE}?select=*&order=full_name.asc${filter}`);
  return sbOk(rows) ? rows.map(signerFromRow) : [];
}

// فهرستِ یک پیمانکارِ مشخص — هم برایِ نمایِ خودِ پیمانکار (فقط مجموعه‌ی خودش)
// و هم برایِ انتخاب‌گرِ امضا در PermitRuntime (فقط ردیف‌هایِ status=active)
export async function loadContractorSigners(contractorId) {
  if (!contractorId) return [];
  const rows = await sb(`${TABLE}?contractor_id=eq.${contractorId}&select=*&order=full_name.asc`);
  return sbOk(rows) ? rows.map(signerFromRow) : [];
}

/* ---------------- نوشتن (offlineWrite) ---------------- */
export async function createSigner(rec, createdBy) {
  const id = uid("psig");
  const res = await offlineWrite({
    module: MODULE, table: TABLE, action: "insert", id,
    payload: { ...signerToDb(rec), created_by: createdBy || "" },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true, id };
}

export async function saveSigner(rec) {
  if (!rec?.id) return { __error: true, message: tr("pmErrSave") };
  const res = await offlineWrite({ module: MODULE, table: TABLE, action: "update", id: rec.id, payload: signerToDb(rec) });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
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

export async function deleteSigner(id) {
  const res = await offlineWrite({ module: MODULE, table: TABLE, action: "delete", id });
  if (!res?.ok) return { __error: true, message: res?.error || tr("pmErrSave") };
  return { ok: true };
}
