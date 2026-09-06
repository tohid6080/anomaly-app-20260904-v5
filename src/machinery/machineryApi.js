import { sb, sbOk, uid, todayISO, getCurrentCompanyId } from "../shared.js";
import { offlineWrite, offlineWriteFile } from "../offline/offlineWrite.js";
import { isOnline } from "../offline/networkStatus.js";
import { getRecordsByModule, putRecord } from "../offline/offlineDb.js";
import { checkUploadAllowed } from "../offline/dbSizeMonitor.js";
import { parseStorageUrl, deleteFromStorage } from "../offline/storageUpload.js";
import { deleteGateItemsForRecord } from "../hseGateApi.js";
import { translate, getCurrentLang, listSep } from "../i18n/translations.js";

export const MACHINE_TYPES = [
  { value: "heavy", labelKey: "machineTypeHeavy" },
  { value: "light", labelKey: "machineTypeLight" },
];
export const OWNERSHIP_STATUSES = [
  { value: "owned", labelKey: "ownershipOwned" },
  { value: "rented", labelKey: "ownershipRented" },
];
export const LICENSE_TYPES = [
  { value: "special", labelKey: "licenseSpecial" },
  { value: "grade_one", labelKey: "licenseGradeOne" },
  { value: "grade_three", labelKey: "licenseGradeThree" },
];
export const TRAFFIC_STATUSES = [
  { value: "active", labelKey: "trafficActive", color: "#166534", bg: "#dcfce7" },
  { value: "inactive", labelKey: "trafficInactive", color: "#5b6b7d", bg: "#eef1f5" },
];
export const APPROVAL_STATUSES = [
  { value: "draft", labelKey: "approvalDraft", color: "#5b6b7d", bg: "#eef1f5" },
  { value: "pending", labelKey: "approvalPending", color: "#b45309", bg: "#fef3c7" },
  { value: "approved", labelKey: "approvalApproved", color: "#166534", bg: "#dcfce7" },
  { value: "needs_correction", labelKey: "approvalNeedsCorrection", color: "#b45309", bg: "#fef3c7" },
  { value: "rejected", labelKey: "approvalRejected", color: "#c92a2a", bg: "#fdecec" },
];
export function approvalStatusMeta(v) {
  return APPROVAL_STATUSES.find((s) => s.value === v) || APPROVAL_STATUSES[0];
}

// required: true → پیمانکار تا وقتی این مدرک را بارگذاری نکرده، اصلاً امکان
// ارسال درخواست برای تأیید کارفرما را ندارد. بقیه («در صورت نیاز»/«در صورت
// وجود»/سایر مدارک) اختیاری‌اند.
export const MACHINERY_DOC_TYPES = [
  { value: "card_image", labelKey: "mdocCardImage", required: true },
  { value: "insurance", labelKey: "mdocInsurance", required: true },
  { value: "inspection", labelKey: "mdocInspection", required: true },
  { value: "health_certificate", labelKey: "mdocHealthCert", required: false },
  { value: "driver_license_front", labelKey: "mdocDriverLicenseFront", required: true },
  { value: "driver_license_back", labelKey: "mdocDriverLicenseBack", required: true },
  { value: "backup_driver_license_front", labelKey: "mdocBackupDriverLicenseFront", required: false },
  { value: "backup_driver_license_back", labelKey: "mdocBackupDriverLicenseBack", required: false },
  { value: "other", labelKey: "mdocOther", required: false },
];
export const REQUIRED_MACHINERY_DOC_TYPES = MACHINERY_DOC_TYPES.filter((t) => t.required);

// برمی‌گرداند کدام مدارک الزامی هنوز بارگذاری نشده‌اند (برای قفل کردن دکمه‌ی
// ارسال تا وقتی کامل نشوند).
export function getMissingRequiredDocs(uploadedDocTypes) {
  const uploadedSet = new Set(uploadedDocTypes);
  return REQUIRED_MACHINERY_DOC_TYPES.filter((t) => !uploadedSet.has(t.value));
}

// آستانه‌ی هشدار نزدیک‌شدن به انقضا (روز) — هم برای بیمه هم معاینه فنی/سرتیفیکیت
export const EXPIRY_WARNING_DAYS = 30;

function machineryFromRow(r) {
  return {
    id: r.id,
    contractorId: r.contractor_id || "",
    contractorName: r.contractor_name || "",
    project: r.project || "",
    machineName: r.machine_name || "",
    machineType: r.machine_type || "heavy",
    plateNumber: r.plate_number || "",
    chassisNumber: r.chassis_number || "",
    manufactureYear: r.manufacture_year || "",
    ownershipStatus: r.ownership_status || "owned",
    insuranceExpiry: r.insurance_expiry || "",
    insuranceIssueDate: r.insurance_issue_date || "",
    inspectionExpiry: r.inspection_expiry || "",
    inspectionIssueDate: r.inspection_issue_date || "",
    healthCertIssueDate: r.health_cert_issue_date || "",
    healthCertExpiry: r.health_cert_expiry || "",
    driverLicenseIssueDate: r.driver_license_issue_date || "",
    driverLicenseExpiry: r.driver_license_expiry || "",
    backupDriverLicenseIssueDate: r.backup_driver_license_issue_date || "",
    backupDriverLicenseExpiry: r.backup_driver_license_expiry || "",
    unsafeBehavior: r.unsafe_behavior || "",
    driverName: r.driver_name || "",
    driverLicenseType: r.driver_license_type || "grade_one",
    backupDriverName: r.backup_driver_name || "",
    deviceCode: r.device_code || "",
    trafficStatus: r.traffic_status || "active",
    approvalStatus: r.approval_status || "pending",
    reviewNote: r.review_note || "",
    deleteRequestedBy: r.delete_requested_by || "",
    deleteRequestedAt: r.delete_requested_at || "",
    deleteRequestNote: r.delete_request_note || "",
    createdBy: r.created_by || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    syncStatus: r.__syncStatus || "synced",
  };
}

function machineryToDb(rec) {
  return {
    contractor_id: rec.contractorId || null,
    contractor_name: rec.contractorName || "",
    project: rec.project || "",
    machine_name: rec.machineName || "",
    machine_type: rec.machineType || "heavy",
    plate_number: rec.plateNumber || "",
    chassis_number: rec.chassisNumber || "",
    manufacture_year: rec.manufactureYear || "",
    ownership_status: rec.ownershipStatus || "owned",
    insurance_expiry: rec.insuranceExpiry || null,
    insurance_issue_date: rec.insuranceIssueDate || null,
    inspection_expiry: rec.inspectionExpiry || null,
    inspection_issue_date: rec.inspectionIssueDate || null,
    health_cert_issue_date: rec.healthCertIssueDate || null,
    health_cert_expiry: rec.healthCertExpiry || null,
    driver_license_issue_date: rec.driverLicenseIssueDate || null,
    driver_license_expiry: rec.driverLicenseExpiry || null,
    backup_driver_license_issue_date: rec.backupDriverLicenseIssueDate || null,
    backup_driver_license_expiry: rec.backupDriverLicenseExpiry || null,
    unsafe_behavior: rec.unsafeBehavior || "",
    driver_name: rec.driverName || "",
    driver_license_type: rec.driverLicenseType || "grade_one",
    backup_driver_name: rec.backupDriverName || "",
    device_code: rec.deviceCode || "",
    traffic_status: rec.trafficStatus || "active",
    created_by: rec.createdBy || "",
  };
}

export async function loadMachineryList() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`machinery?select=*&order=created_at.desc${filter}`);
  return (sbOk(rows) ? rows : []).map(machineryFromRow);
}

export async function loadMachineryListOfflineFirst() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  if (isOnline()) {
    const rows = await sb(`machinery?select=*&order=created_at.desc${filter}`);
    if (sbOk(rows)) {
      // نوشتن/خواندن کش محلی نباید کل بارگذاری را خراب کند — در صورت خطا،
      // دست‌کم داده‌ی تازه‌ی سرور برگردانده شود (نگاه کنید به همین رفعِ
      // مشابه در loadAnomaliesOfflineFirst در App.jsx).
      try {
        for (const r of rows) await putRecord("machinery", r.id, r, "synced");
        const cached = await getRecordsByModule("machinery");
        const serverIds = new Set(rows.map((r) => r.id));
        const localOnly = cached.filter((c) => c.syncStatus !== "synced" && !serverIds.has(c.id) && !c.data?.deleted);
        return [
          ...localOnly.map((c) => machineryFromRow({ ...c.data, __syncStatus: c.syncStatus })),
          ...rows.map((r) => machineryFromRow({ ...r, __syncStatus: "synced" })),
        ];
      } catch (e) {
        console.error("همگام‌سازی کش محلی ماشین‌آلات ناموفق بود", e);
        return rows.map((r) => machineryFromRow({ ...r, __syncStatus: "synced" }));
      }
    }
  }
  const cached = await getRecordsByModule("machinery");
  return cached.filter((c) => !c.data?.deleted).map((c) => machineryFromRow({ ...c.data, __syncStatus: c.syncStatus }));
}

// ثبت اولیه — همیشه با وضعیت «پیش‌نویس» شروع می‌شود، چون تا مدارک الزامی
// بارگذاری نشوند اصلاً نباید برای کارفرما قابل مشاهده/بررسی باشد.
export async function insertMachinery(rec) {
  const id = uid("machine");
  const payload = { ...machineryToDb(rec), approval_status: "draft", review_note: "", company_id: getCurrentCompanyId() };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "insert", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "errCreate") };
  if (!result.record) return { __error: true, message: translate(getCurrentLang(), "errServerInvalidResponse") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// فقط ذخیره‌ی اطلاعات متنی — وضعیت تأیید فعلی (پیش‌نویس/نیاز به اصلاح/رد) را
// دست‌نخورده نگه می‌دارد. برای وقتی که پیمانکار هنوز آماده‌ی ارسال نیست.
export async function updateMachineryInfo(id, rec) {
  const payload = { ...machineryToDb(rec), updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "commonErrorSave") };
  if (!result.record) return { __error: true, message: translate(getCurrentLang(), "errServerInvalidResponse") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ذخیره + ارسال واقعی برای بررسی کارفرما — لایه‌ی UI باید قبل از فراخوانی این
// تابع، کامل بودن مدارک الزامی را چک کرده باشد (getMissingRequiredDocs)؛
// اینجا هم دوباره چک می‌شود تا اگر مستقیم/بدون فرم صدا زده شد هم امن بماند.
export async function submitMachineryForReview(id, rec, uploadedDocTypes) {
  const missing = getMissingRequiredDocs(uploadedDocTypes || []);
  if (missing.length > 0) {
    return { __error: true, message: translate(getCurrentLang(), "errMissingRequiredDocs", { list: missing.map((d) => translate(getCurrentLang(), d.labelKey)).join(listSep(getCurrentLang())) }) };
  }
  const payload = { ...machineryToDb(rec), approval_status: "pending", review_note: "", updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "commonErrorSave") };
  if (!result.record) return { __error: true, message: translate(getCurrentLang(), "errServerInvalidResponse") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// حذف کامل ماشین به همراه مدارکش — عمداً روی cascade خودِ دیتابیس تکیه
// نمی‌کنیم (که ممکن است روی همه‌ی دیپلوی‌ها درست اعمال نشده باشد)، بلکه
// صریحاً مدارک را اول حذف می‌کنیم تا اگر آن قید وجود نداشت، حذف ماشین با
// خطای «کلید خارجی در حال استفاده» بی‌صدا شکست نخورد.
export async function deleteMachineryDB(id) {
  const docs = await loadMachineryDocuments(id);
  for (const doc of docs) {
    const parsed = doc.fileData ? parseStorageUrl(doc.fileData) : null;
    if (parsed) { try { await deleteFromStorage(parsed.bucket, parsed.path); } catch { /* ادامه بده */ } }
    await offlineWrite({ module: "machineryDocuments", table: "machinery_documents", action: "delete", id: doc.id, payload: {} });
  }
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "commonErrorDelete") };
  // طبق گزارش صریح: بعد از حذف خودِ ماشین، رکورد گیت مربوطه (در انتظار
  // تأیید/ارجاع‌شده) هم پاک شود — وگرنه یتیم می‌ماند و برای همیشه در
  // «کارهای در دست اقدام من» با پلاک/نام ماشینِ حذف‌شده باقی می‌ماند.
  deleteGateItemsForRecord("machineryManagement", id).catch(() => {});
  return { ok: true };
}

// ---------- درخواست حذف برای ماشین‌آلات تأییدشده (مورد ۶) ----------
// طبق سیاست تأییدشده: پیمانکار نمی‌تواند مستقیم ماشین تأییدشده را حذف
// کند (این محدودیت سمت RLS هم اعمال شده، نه فقط اینجا) — فقط می‌تواند
// درخواست بدهد؛ سرپرست/مدیر HSE یا ادمین تأیید (حذف واقعی) یا رد
// (پاک‌کردن درخواست) می‌کند.
export async function requestMachineryDeletion(id, note, requestedBy) {
  const payload = { delete_requested_by: requestedBy || "", delete_requested_at: new Date().toISOString(), delete_request_note: note || "" };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "errSubmitDeleteRequest") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// تأیید درخواست حذف — همان حذف واقعی را انجام می‌دهد (فقط توسط
// سرپرست/مدیر HSE یا ادمین قابل‌اجراست؛ RLS هم همین را تضمین می‌کند)
export async function approveMachineryDeletion(id) {
  return deleteMachineryDB(id);
}

// رد درخواست حذف — ماشین باقی می‌ماند، فقط علائم درخواست پاک می‌شود
export async function rejectMachineryDeletion(id) {
  const payload = { delete_requested_by: null, delete_requested_at: null, delete_request_note: null };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "errRejectDeleteRequest") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// تصمیم کارفرما — approved | needs_correction | rejected
export async function setMachineryApproval(id, status, reviewNote) {
  const payload = { approval_status: status, review_note: reviewNote || "", updated_at: new Date().toISOString() };
  const result = await offlineWrite({ module: "machinery", table: "machinery", action: "update", id, payload });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "commonErrorSave") };
  if (!result.record) return { __error: true, message: translate(getCurrentLang(), "errServerInvalidResponse") };
  return { ...machineryFromRow(result.record), syncStatus: result.offline ? "pending" : "synced" };
}

// ---------- مدارک ----------

function machineryDocFromRow(r) {
  return {
    id: r.id,
    machineryId: r.machinery_id,
    docType: r.doc_type,
    fileData: r.file_data,
    fileName: r.file_name || "",
    mimeType: r.mime_type || "",
    uploadedAt: r.uploaded_at,
  };
}

export async function loadMachineryDocuments(machineryId) {
  const rows = await sb(`machinery_documents?machinery_id=eq.${machineryId}&select=*`);
  return (sbOk(rows) ? rows : []).map(machineryDocFromRow);
}

export async function uploadMachineryDocument(machineryId, docType, fileData, fileName, mimeType) {
  if (isOnline()) {
    const { allowed, storageMb } = await checkUploadAllowed();
    if (!allowed) {
      return { __error: true, message: translate(getCurrentLang(), "errStorageFullDeleteOldDocs", { mb: storageMb }) };
    }
  }
  // آپلود جدید جایگزین مدرک قبلی همان نوع می‌شود (مثل مدارک پرسنل)
  const existing = await sb(`machinery_documents?machinery_id=eq.${machineryId}&doc_type=eq.${docType}&select=id`);
  if (sbOk(existing) && existing.length > 0) {
    for (const row of existing) {
      await offlineWrite({ module: "machineryDocuments", table: "machinery_documents", action: "delete", id: row.id, payload: {} });
    }
  }
  const id = uid("mdoc");
  const result = await offlineWriteFile({
    module: "machineryDocuments", table: "machinery_documents", bucket: "machinery-documents", id,
    base64Data: fileData, contentType: mimeType, fileFieldName: "file_data",
    extraFields: { machinery_id: machineryId, doc_type: docType, file_name: fileName, mime_type: mimeType },
  });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "errUploadDoc") };
  if (!result.record) return { __error: true, message: translate(getCurrentLang(), "errServerInvalidResponse") };
  return machineryDocFromRow(result.record);
}

export async function deleteMachineryDocument(id) {
  const result = await offlineWrite({ module: "machineryDocuments", table: "machinery_documents", action: "delete", id, payload: {} });
  if (!result.ok) return { __error: true, message: result.error || translate(getCurrentLang(), "errDeleteDoc") };
  return { ok: true };
}

// ---------- محاسبه‌ی روزهای باقی‌مانده تا انقضا (برای هشدار) ----------
export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (isNaN(target.getTime())) return null;
  const today = new Date(todayISO());
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}
