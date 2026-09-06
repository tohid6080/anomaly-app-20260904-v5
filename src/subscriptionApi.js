import { sb, sbOk, uid, SUPABASE_URL, SUPABASE_ANON_KEY, getCurrentCompanyId } from "./shared.js";
import { getSessionToken } from "./sessionToken.js";
import { translate, getCurrentLang, numLocale } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

/**
 * محاسبه‌ی وضعیت واقعی دسترسی شرکت — طبق اصل صریح «Frontend فقط
 * نمایش‌دهنده باشد»: این تابع هیچ تصمیم نهایی نمی‌گیرد؛ فقط همان منطقی
 * را که تابع SQL is_company_subscription_active() سمت دیتابیس اجرا
 * می‌کند، اینجا هم برای نمایش لحظه‌ای (بدون نیاز به رفت‌وبرگشت شبکه)
 * تکرار می‌کند. اگر این دو یک‌روز از هم واگرا شوند، دیتابیس همیشه
 * تصمیم‌گیرنده‌ی نهایی است — این فقط برای UI سریع است.
 */
export function computeSubscriptionAccess(company) {
  if (!company) return { status: "unknown", isLocked: true, label: tr("subAccUnknown") };

  if (company.subscriptionStatus === "disabled") {
    return { status: "disabled", isLocked: true, label: tr("subAccDisabled") };
  }
  if (company.subscriptionStatus === "pending_payment") {
    return { status: "pending_payment", isLocked: true, label: tr("subAccPendingPayment") };
  }

  const now = new Date();

  if (company.subscriptionType === "trial") {
    if (!company.trialEnd) return { status: "trial_expired", isLocked: true, label: tr("subAccTrialNotSet") };
    const end = new Date(company.trialEnd);
    const msLeft = end.getTime() - now.getTime();
    if (msLeft <= 0) return { status: "trial_expired", isLocked: true, label: tr("subAccTrialEnded"), trialStart: company.trialStart, trialEnd: company.trialEnd };
    const daysLeft = Math.floor(msLeft / (24 * 3600 * 1000));
    const hoursLeft = Math.floor(msLeft / (3600 * 1000));
    const base = { status: "trial_active", isLocked: false, trialStart: company.trialStart, trialEnd: company.trialEnd };
    if (daysLeft >= 1) return { ...base, daysLeft, label: tr("subAccTrialDaysLeft", { days: daysLeft.toLocaleString(numLocale(getCurrentLang())) }) };
    return { ...base, hoursLeft, label: tr("subAccTrialHoursLeft", { hours: hoursLeft.toLocaleString(numLocale(getCurrentLang())) }) };
  }

  if (company.subscriptionType === "permanent") {
    return { status: "active", isLocked: false, label: tr("subAccPermanent") };
  }

  if (!company.subscriptionEndDate) return { status: "expired", isLocked: true, label: tr("subAccExpired") };
  const end = new Date(company.subscriptionEndDate);
  const msLeft = end.getTime() - now.getTime();
  if (msLeft <= 0) return { status: "expired", isLocked: true, label: tr("subAccExpired"), subscriptionStartDate: company.subscriptionStartDate, subscriptionEndDate: company.subscriptionEndDate };
  const daysLeft = Math.floor(msLeft / (24 * 3600 * 1000));
  return { status: "active", isLocked: false, daysLeft, subscriptionStartDate: company.subscriptionStartDate, subscriptionEndDate: company.subscriptionEndDate, label: daysLeft <= 7 ? tr("subAccDaysToEnd", { days: daysLeft.toLocaleString(numLocale(getCurrentLang())) }) : tr("subAccActive") };
}

// ---------- بررسی فعال‌بودن حساب کاربرِ واردشده (Forced Logout) ----------
// وقتی Super Admin یک حساب را غیرفعال (یا حذف) می‌کند، باید نشستِ باز آن
// کاربر فوراً بسته شود. چون توکن نشست یک JWT بدون‌حالت با عمر ۲۴ ساعت
// است و صرفِ غیرفعال‌شدن حساب توکن را باطل نمی‌کند، «تصمیم» سمت سرور
// گرفته می‌شود: Edge Function check-account-active امضای همین توکن را
// بررسی و ستون is_active همان حساب را با service_role می‌خواند — کلاینت
// نمی‌تواند نتیجه‌ی active=true را جعل کند.
//
// در صورت خطای شبکه/سرور عمداً { active: true } برمی‌گردد (fail-open) تا
// یک اختلال گذرا کاربرِ معتبر را از سامانه بیرون نیندازد.
export async function checkMyAccountActive() {
  const token = getSessionToken("customer");
  if (!token) return { active: false, reason: "no_token" };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/check-account-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: "{}",
    });
    if (!res.ok) return { active: true, reason: "check_failed" };
    const data = await res.json();
    return { active: data?.active !== false, reason: data?.reason || "" };
  } catch {
    return { active: true, reason: "network_error" };
  }
}

// اطلاعات اشتراک شرکت جاری — customer scope عادی (RLS خودش company
// isolation را تضمین می‌کند)؛ این همان چیزی است که بلافاصله بعد از ورود
// خوانده می‌شود تا مشخص شود کاربر باید به داشبورد برود یا صفحه‌ی انتخاب پلن.
export async function loadMySubscriptionInfo() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return null;
  const rows = await sb(`companies?id=eq.${companyId}&select=id,name,plan_id,subscription_type,subscription_status,subscription_start_date,subscription_end_date,trial_start,trial_end`);
  if (!sbOk(rows) || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id, name: r.name, planId: r.plan_id || "",
    subscriptionType: r.subscription_type || "trial", subscriptionStatus: r.subscription_status || "active",
    subscriptionStartDate: r.subscription_start_date || "", subscriptionEndDate: r.subscription_end_date || "",
    trialStart: r.trial_start || "", trialEnd: r.trial_end || "",
  };
}

// پلن‌های قابل‌خرید — customer scope؛ فقط پلن‌های فعال، برای نمایش در
// صفحه‌ی انتخاب پلن. قیمت مستقیم از همین رکورد خوانده می‌شود (نه
// Hard-code در Frontend).
export async function loadPurchasablePlans() {
  const rows = await sb("plans?is_active=eq.true&select=*&order=sort_order.asc.nullslast,price_monthly.asc");
  if (!sbOk(rows)) return [];
  return rows.map((r) => ({
    id: r.id, name: r.name, description: r.description || "",
    priceMonthly: Number(r.price_monthly) || 0, priceYearly: Number(r.price_yearly) || 0, priceTotal: Number(r.price_total) || 0,
    maxUsers: r.max_users, maxPersonnel: r.max_personnel, maxStorageMb: r.max_storage_mb,
    features: Array.isArray(r.features) ? r.features : [], trialDays: r.trial_days || null,
  }));
}

// تاریخچه‌ی پرداخت‌های آنلاین شرکت جاری — برای نمایش در پنل شرکت
export async function loadMyPayments() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`payments?company_id=eq.${companyId}&select=*&order=created_at.desc`);
  return sbOk(rows) ? rows.map(paymentFromRow) : [];
}

// نسخه‌ی سوپرادمین — پرداخت‌های آنلاین هر شرکتی، نه فقط شرکت خودش
export async function loadOnlinePaymentsForCompany(companyId) {
  if (!companyId) return [];
  const rows = await sb(`payments?company_id=eq.${companyId}&select=*&order=created_at.desc`, {}, "super_admin");
  return sbOk(rows) ? rows.map(paymentFromRow) : [];
}

function paymentFromRow(r) {
  return {
    id: r.id, companyId: r.company_id, planId: r.plan_id, billingCycle: r.billing_cycle,
    amount: Number(r.amount) || 0, orderId: r.order_id, status: r.status, refId: r.ref_id || "",
    createdAt: r.created_at, verifiedAt: r.verified_at,
  };
}

// ---------- پرداخت آنلاین زرین‌پال — همه‌ی منطق حساس سمت Edge Function ----------
// طبق الزام امنیتی صریح: هیچ کلید/Merchant ID زرین‌پالی اینجا نیست؛
// این تابع فقط Edge Function را با توکن نشست معتبر صدا می‌زند.

async function callPaymentFunction(body) {
  const token = getSessionToken("customer");
  if (!token) return { __error: true, message: tr("subErrInvalidSessionCustomer") };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/zarinpal-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { __error: true, message: data?.error || tr("subErrGatewayConn") };
    return data;
  } catch {
    return { __error: true, message: tr("saErrServerConn") };
  }
}

// شروع پرداخت — پلن و دوره را می‌فرستد، سرور قیمت واقعی را از دیتابیس
// می‌خواند (نه از Frontend)، رکورد payments می‌سازد، و لینک انتقال به
// زرین‌پال را برمی‌گرداند.
export async function initiatePayment(planId, billingCycle) {
  const result = await callPaymentFunction({ action: "request", planId, billingCycle });
  if (result?.__error) return result;
  return { ok: true, redirectUrl: result.url };
}

// تأیید پرداخت بعد از بازگشت از زرین‌پال — Authority و orderId از همان
// Query String صفحه‌ی بازگشت خوانده می‌شوند (نه از حافظه‌ی مرورگر که
// می‌تواند با Refresh یا ارسال مجدد دستکاری شود).
export async function verifyPayment(authority, orderId) {
  const result = await callPaymentFunction({ action: "verify", authority, orderId });
  if (result?.__error) return result;
  return { ok: true, activated: !!result.activated, refId: result.refId || "" };
}

// ---------- سوپرادمین — فعال‌سازی Trial ----------
// طبق تصمیم تأییدشده: مدت Trial از خودِ پلن خوانده می‌شود، نه Hard-code.
export async function activateTrialForCompany(companyId, planId, changedBy, startDateIso) {
  const planRows = await sb(`plans?id=eq.${planId}&select=trial_days`, {}, "super_admin");
  const trialDays = sbOk(planRows) && planRows.length > 0 ? Number(planRows[0].trial_days) || 0 : 0;
  if (trialDays <= 0) return { __error: true, message: tr("subErrPlanNoTrial") };

  const start = startDateIso ? new Date(startDateIso) : new Date();
  const end = new Date(start.getTime() + trialDays * 24 * 3600 * 1000);
  const payload = {
    plan_id: planId, subscription_type: "trial", subscription_status: "active",
    trial_start: start.toISOString(), trial_end: end.toISOString(),
  };
  const rows = await sb(`companies?id=eq.${companyId}`, { method: "PATCH", body: JSON.stringify(payload) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("subErrActivateTrial") };

  await sb("company_subscription_history", {
    method: "POST", prefer: "return=minimal",
    body: JSON.stringify([{ company_id: companyId, plan_id: planId, action: "trial_activated", changed_by: changedBy || "", note: tr("subTrialHistoryNote", { days: trialDays }) }]),
  }, "super_admin");

  return { ok: true, trialEnd: end.toISOString() };
}

// ---------- پرداخت کارت‌به‌کارت — مسیر دوم موازی با پرداخت آنلاین زرین‌پال ----------
// روی همان جدول payments موجود (نه جدول جدا) با method='card_transfer'،
// تا تاریخچه‌ی پرداخت هر شرکت یکپارچه بماند. منطق پرداخت آنلاین
// (initiatePayment/verifyPayment بالا) کاملاً دست‌نخورده است.

// اطلاعات نمایشی کارت (شماره کارت/نام صاحب کارت/توضیحات) — روی همان
// system_settings موجود (با پیشوند payment_cardtransfer_*)، دقیقاً همان
// الگوی appearance config در systemConfigApi.js. customer scope چون
// همین صفحه‌ی قفل (SubscriptionGate) بعد از لاگین عادی خوانده می‌شود.
const CARD_TRANSFER_KEYS = ["payment_cardtransfer_card_number", "payment_cardtransfer_holder_name", "payment_cardtransfer_description"];

export async function loadCardTransferSettings() {
  const rows = await sb(`system_settings?key=in.(${CARD_TRANSFER_KEYS.map((k) => `"${k}"`).join(",")})&select=key,value_text`);
  const map = {};
  if (sbOk(rows)) rows.forEach((r) => { map[r.key] = r.value_text; });
  return {
    cardNumber: map.payment_cardtransfer_card_number || "",
    holderName: map.payment_cardtransfer_holder_name || "",
    description: map.payment_cardtransfer_description || "",
  };
}

// ثبت رسید پرداخت — وضعیت اولیه همیشه «در انتظار تأیید» است (خودِ RLS هم
// این را در with_check اجبار می‌کند، پس این فقط یک لایه‌ی اطمینانِ دوم
// سمت کلاینت است، نه مرز امنیتی واقعی).
export async function submitCardTransferReceipt({ planId, billingCycle, amount, payerName, payerPhone, trackingNumber, receiptImage }, requestedBy) {
  const companyId = getCurrentCompanyId();
  if (!companyId) return { __error: true, message: tr("subErrCompanyUnknown") };
  if (!planId || !billingCycle) return { __error: true, message: tr("subErrPlanCycleInvalid") };
  if (!payerName?.trim() || !payerPhone?.trim() || !trackingNumber?.trim()) {
    return { __error: true, message: tr("subErrReceiptFieldsRequired") };
  }
  const id = uid("card");
  const payload = {
    id, company_id: companyId, plan_id: planId, billing_cycle: billingCycle,
    amount: Math.round(Number(amount) || 0), order_id: id,
    method: "card_transfer", status: "awaiting_review",
    payer_name: payerName.trim(), payer_phone: payerPhone.trim(),
    tracking_number: trackingNumber.trim(), receipt_image: receiptImage || null,
    requested_by: requestedBy || "",
  };
  const rows = await sb("payments", { method: "POST", body: JSON.stringify([payload]) });
  if (!sbOk(rows)) return { __error: true, message: tr("subErrSubmitReceipt", { detail: rows?.message || tr("subUnknownShort") }) };
  return { ok: true };
}

// تاریخچه‌ی پرداخت‌های کارت‌به‌کارتِ خودِ شرکت جاری — برای نمایش وضعیت
// («در انتظار تأیید»/رد/تأیید) بعد از ثبت.
export async function loadMyCardTransferPayments() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];
  const rows = await sb(`payments?company_id=eq.${companyId}&method=eq.card_transfer&select=*&order=created_at.desc`);
  return sbOk(rows) ? rows : [];
}
