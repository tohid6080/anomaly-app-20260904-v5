import { sb, sbOk } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";

/**
 * اعلان‌های PSSR — همان الگویِ personnel_notifications: یک جدولِ ماندگار،
 * بدونِ محاسبه‌ی زنده، چون هرکدام به یک رویدادِ گسسته (ایجاد Action، بسته‌شدن
 * Action و ...) وصل‌اند نه یک وضعیتِ زنده‌ی قابل‌محاسبه.
 */
function notifFromRow(r) {
  return {
    id: r.id, pssrId: r.pssr_id, meetingId: r.meeting_id, actionItemId: r.action_item_id,
    recipientAccountType: r.recipient_account_type, type: r.type, message: r.message,
    isRead: !!r.is_read, createdAt: r.created_at,
  };
}

export async function loadMyPssrNotifications(accountType, accountId) {
  if (!accountId) return [];
  const field = accountType === "employer" ? "recipient_employer_account_id" : "recipient_contractor_id";
  const rows = await sb(`pssr_notifications?${field}=eq.${accountId}&is_read=is.false&select=*&order=created_at.desc&limit=50`);
  return sbOk(rows) ? rows.map(notifFromRow) : [];
}

export async function markPssrNotificationRead(id) {
  await offlineWrite({ module: "pssrNotifications", table: "pssr_notifications", action: "update", id, payload: { is_read: true } });
}
