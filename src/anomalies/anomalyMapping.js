// نگاشت/CRUD پایه‌ی آنومالی — استخراج‌شده از App.jsx تا سایر ماژول‌ها
// (مثلاً ماشین‌آلات/پرسنل، برای ثبتِ مستقیمِ آنومالی از دلِ مغایرتِ مدارک)
// هم بتوانند بدونِ وابستگی به App.jsx به این مپرها دسترسی داشته باشند.
import { sb, sbOk, sbErrMsg, getCurrentCompanyId } from "../shared.js";

export function anomalyFromRow(r) {
  return {
    id: r.id,
    trackingNumber: r.tracking_number || "",
    project: r.project || "",
    contractor: r.contractor || "",
    subContractor: r.sub_contractor || "",
    area: r.area || "",
    zoneId: r.zone_id || "",
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
export function anomalyRecordToDb(record) {
  return {
    id: record.id,
    tracking_number: record.trackingNumber,
    project: record.project,
    contractor: record.contractor,
    sub_contractor: record.subContractor,
    area: record.area,
    zone_id: record.zoneId || null,
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

export async function insertAnomaly(record) {
  const body = [anomalyRecordToDb(record)];
  const rows = await sb("anomalies", { method: "POST", body: JSON.stringify(body) });
  if (!sbOk(rows)) return { __error: true, message: sbErrMsg(rows) };
  return rows[0];
}
