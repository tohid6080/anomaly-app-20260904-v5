/**
 * ثبتِ دستگاه برای اعلانِ Push واقعیِ چت — قرار بود فقط روی اپِ نیتیوِ
 * اندروید (Capacitor) کاری کند.
 *
 * موقتاً غیرفعال است. @capacitor/push-notifications برای کارکردن روی
 * اندروید به یک پروژه‌ی Firebase و فایلِ google-services.json نیاز دارد
 * که هرگز برای این اپ تنظیم نشده (نه در مخزن، نه در build-android.yml).
 * چون Capacitor همه‌ی پلاگین‌های نصب‌شده را زمانِ ساختِ اپِ نیتیو
 * (cap add android / cap sync android) خودکار در پروژه‌ی اندروید ثبت
 * می‌کند — صرف‌نظر از اینکه کدِ جاوااسکریپت واقعاً صدایش بزند یا نه —
 * صرفِ نصب‌بودنِ این پلاگین بدونِ Firebase باعث می‌شد اپ درست موقعِ باز
 * شدن کرش کند (یک کرشِ نیتیو، نه خطایی که try/catch سمتِ جاوااسکریپت
 * بتواند بگیرد). برای همین هم پکیج از package.json حذف شده هم فراخوانیِ
 * پلاگین اینجا غیرفعال — با import ماندنِ پکیجِ حذف‌شده، حتی build وب هم
 * روی resolveِ این import شکست می‌خورد.
 *
 * برای فعال‌سازیِ دوباره: یک پروژه‌ی Firebase بسازید (افزودنِ اپِ اندروید
 * با applicationId=com.ihms.app)، google-services.json را بگیرید و به
 * مخزن/ورک‌فلوِ build-android.yml بدهید تا پیش از cap sync در android/app/
 * قرار بگیرد — سپس @capacitor/push-notifications را به package.json
 * برگردانید و بدنه‌ی این تابع را به پیاده‌سازیِ قبلی (checkPermissions →
 * requestPermissions → addListener("registration") → register()، هرکدام
 * پشتِ همان الگوی import پویا) برگردانید.
 */
export async function initPushNotifications() {
  // غیرفعال — نگاه کن به توضیحِ بالا.
}
