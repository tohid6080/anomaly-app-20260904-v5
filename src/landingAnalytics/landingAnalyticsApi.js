import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../shared.js";

/**
 * سمتِ بازدیدکننده‌ی صفحه اصلیِ سایت — فقط دو رویداد را به Edge Function
 * عمومیِ track-landing-event گزارش می‌کند (بازدید صفحه / کلیکِ یکی از
 * دکمه‌های اصلی). عمداً fire-and-forget: اگر شبکه در دسترس نبود یا تابع
 * خطا داد، هیچ‌چیزی نباید در تجربه‌ی بازدیدکننده (ناوبری/باز شدنِ فرم/…)
 * را متوقف یا کند کند — دقیقاً به همین دلیل نه await می‌شود نه خطایش جایی
 * نمایش داده می‌شود.
 */
function sendLandingEvent(metricKey) {
  try {
    fetch(`${SUPABASE_URL}/functions/v1/track-landing-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ metricKey }),
    }).catch(() => {});
  } catch {
    // بی‌اهمیت — آمار است، نه یک نوشتنِ حیاتی
  }
}

export function trackLandingPageView() {
  sendLandingEvent("page_view");
}

export function trackLandingButtonClick(metricKey) {
  sendLandingEvent(metricKey);
}
