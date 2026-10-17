// لایه‌ی داده‌ی پنل «لیفتینگ پلن» سوپرادمین — کاربرانِ آزمایشیِ نسخه‌ی وبِ
// IHMS CraneLift 3D (cranelift_trial_users). نوشتن از سمتِ کلاینت فقط از
// همین پنل (scope=super_admin) انجام می‌شود؛ ثبتِ اولیه‌ی کاربر از طریقِ
// Edge Functionِ submit-cranelift-trial-signup (سمتِ خودِ CraneLift) است.

import { sb, sbOk } from "../shared.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

function userFromRow(r) {
  return {
    id: r.id,
    firstName: r.first_name || "",
    lastName: r.last_name || "",
    fullName: [r.first_name, r.last_name].filter(Boolean).join(" "),
    mobile: r.mobile || "",
    companyName: r.company_name || "",
    trialStartedAt: r.trial_started_at || null,
    trialExpiresAt: r.trial_expires_at || null,
    isActive: r.is_active === true,
    createdAt: r.created_at || null,
  };
}

export async function loadCraneliftTrialUsers() {
  const rows = await sb("cranelift_trial_users?select=*&order=created_at.desc", {}, "super_admin");
  return sbOk(rows) ? rows.map(userFromRow) : [];
}

export async function setCraneliftTrialUserActive(id, isActive) {
  const rows = await sb(
    `cranelift_trial_users?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify({ is_active: isActive === true }) },
    "super_admin"
  );
  if (!sbOk(rows)) return { __error: true, message: tr("ctErrToggleActive") };
  return { ok: true };
}

export async function deleteCraneliftTrialUser(id) {
  const rows = await sb(`cranelift_trial_users?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("ctErrDelete") };
  return { ok: true };
}

// تمدیدِ دستیِ دوره‌ی آزمایشی — مبدأِ محاسبه، جدیدترینِ (تاریخِ انقضایِ
// فعلی، الان) است تا تمدیدِ یک کاربرِ هنوز-فعال رویِ باقیمانده‌اش اضافه
// شود، نه اینکه از صفر حساب شود؛ برایِ کاربرِ منقضی‌شده هم از همین لحظه
// شروع می‌شود (نه از تاریخِ قدیمیِ منقضی‌شده).
export async function extendCraneliftTrialUser(id, currentExpiresAt, amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return { __error: true, message: tr("ctErrExtendInvalid") };
  const base = new Date(Math.max(currentExpiresAt ? new Date(currentExpiresAt).getTime() : 0, Date.now()));
  if (unit === "month") base.setMonth(base.getMonth() + n);
  else base.setDate(base.getDate() + n);
  const rows = await sb(
    `cranelift_trial_users?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify({ trial_expires_at: base.toISOString() }) },
    "super_admin"
  );
  if (!sbOk(rows)) return { __error: true, message: tr("ctErrExtend") };
  return { ok: true, trialExpiresAt: base.toISOString() };
}
