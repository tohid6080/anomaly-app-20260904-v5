// supabase/functions/submit-guest-purchase-request/index.ts
//
// عمومی و بدون نیاز به احراز هویت — تنها راه نوشتن در guest_purchase_requests
// (که RLS اش عمداً هیچ policy ای برای anon/authenticated ندارد، دقیقاً همان
// الگوی submit-trial-request). صفحه‌ی عمومیِ «مشاهده پلن‌ها برای خرید» این
// تابع را صدا می‌زند تا بازدیدکننده بتواند بدونِ داشتنِ حساب، ماژول/خدماتِ
// انتخابی + رسیدِ کارت‌به‌کارت را ثبت کند. SuperAdmin بعداً شرکت/حساب را
// می‌سازد و رسید را تأیید می‌کند.
//
// اعلانِ تلگرام/ایمیلِ درخواستِ تازه — هر دو کاملاً اختیاری؛ همان secretهای
// مشترکِ submit-proposal-lead (اگر از قبل تنظیم شده‌اند، همین‌جا هم کار
// می‌کنند، کاری اضافه لازم نیست):
//   supabase secrets set TELEGRAM_BOT_TOKEN=xxxx TELEGRAM_CHAT_ID=xxxx
//   supabase secrets set RESEND_API_KEY=xxxx NOTIFY_EMAIL_TO=you@example.com
//
// Deploy:
//   supabase functions deploy submit-guest-purchase-request --no-verify-jwt

import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";
import { sendTelegramNotification, sendEmailNotification } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "بدنه‌ی درخواست نامعتبر است" }, 400);
  }

  const fullName = String(body?.fullName || "").trim();
  const phone = String(body?.phone || "").trim();
  const companyName = String(body?.companyName || "").trim();
  const payerName = String(body?.payerName || "").trim();
  const payerPhone = String(body?.payerPhone || "").trim();
  const receiptImage = String(body?.receiptImage || "");
  const selectedModules = Array.isArray(body?.selectedModules) ? body.selectedModules.map((m: unknown) => String(m)) : [];
  const selectedServices = Array.isArray(body?.selectedServices) ? body.selectedServices.map((s: unknown) => String(s)) : [];
  const billingCycle = body?.billingCycle === "monthly" ? "monthly" : "yearly";
  const amount = Number(body?.amount) || 0;
  const currency = body?.currency === "usd" || body?.currency === "eur" ? body.currency : "irr";

  if (!fullName || !phone || !companyName) {
    return json({ error: "نام و نام خانوادگی، موبایل و نام شرکت/سازمان الزامی است" }, 400);
  }
  if (!/^09\d{9}$/.test(phone)) return json({ error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود" }, 400);
  if (!payerName) return json({ error: "نام واریزکننده الزامی است" }, 400);
  if (!/^09\d{9}$/.test(payerPhone)) return json({ error: "شماره موبایلِ واریزکننده نامعتبر است" }, 400);
  if (!receiptImage) return json({ error: "تصویرِ رسید الزامی است" }, 400);
  if (selectedModules.length === 0) return json({ error: "حداقل یک ماژول را انتخاب کنید" }, 400);

  const payload = {
    full_name: fullName,
    phone,
    company_name: companyName,
    email: String(body?.email || "").trim(),
    selected_modules: selectedModules,
    selected_services: selectedServices,
    billing_cycle: billingCycle,
    amount,
    currency,
    payer_name: payerName,
    payer_phone: payerPhone,
    tracking_number: String(body?.trackingNumber || "").trim(),
    receipt_image: receiptImage,
    status: "pending",
  };

  try {
    const inserted = await restFetch("guest_purchase_requests", { method: "POST", body: JSON.stringify([payload]) });
    if (!inserted.ok) return json({ error: "خطا در ثبتِ درخواست — لطفاً بعداً دوباره تلاش کنید" }, 500);

    // اعلانِ غیرمسدودکننده — درخواست از قبل با موفقیت ثبت شده، پس شکستِ
    // اعلان نباید پاسخِ موفقِ کاربر را خراب کند. این یک «درخواستِ در انتظارِ
    // بررسی»ست (نه ثبت‌نامِ خودکار)، پس برایِ پیگیریِ سریع، لیستِ ماژول‌ها هم
    // به‌جایِ کلیدهایِ خام، با برچسبِ خوانا نشان داده می‌شود.
    const moduleLabelsRes = selectedModules.length > 0
      ? await restFetch(`module_prices?module_key=in.(${selectedModules.map((k) => encodeURIComponent(k)).join(",")})&select=module_key,label`)
      : { ok: true, data: [] };
    const moduleLabelMap = new Map(
      (moduleLabelsRes.ok && Array.isArray(moduleLabelsRes.data) ? moduleLabelsRes.data : []).map((r: any) => [r.module_key, r.label])
    );
    const moduleNames = selectedModules.map((k) => moduleLabelMap.get(k) || k).join("، ");
    const currencyLabel: Record<string, string> = { irr: "ریال", usd: "دلار", eur: "یورو" };
    const summary = [
      "🆕 درخواستِ خریدِ ماژول در انتظارِ بررسی — IHMS",
      `نام: ${fullName}`,
      `شرکت: ${companyName}`,
      `تلفن: ${phone}`,
      payload.email ? `ایمیل: ${payload.email}` : null,
      `ماژول‌ها: ${moduleNames || "—"}`,
      selectedServices.length > 0 ? `خدمات: ${selectedServices.join("، ")}` : null,
      `دوره: ${billingCycle === "monthly" ? "ماهانه" : "سالانه"}`,
      `مبلغ: ${amount.toLocaleString("fa-IR")} ${currencyLabel[currency] || currency}`,
      `واریزکننده: ${payerName} (${payerPhone})`,
      payload.tracking_number ? `شماره‌ی پیگیری: ${payload.tracking_number}` : null,
      "⏳ نیازمندِ تأییدِ رسید در پنلِ سوپرادمین",
    ].filter(Boolean).join("\n");
    await Promise.allSettled([
      sendTelegramNotification(summary),
      sendEmailNotification("درخواستِ خریدِ ماژول در انتظارِ بررسی — IHMS", summary),
    ]);

    return json({ ok: true });
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
