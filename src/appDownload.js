import { Capacitor } from "@capacitor/core";

// صفحه‌ی واسطِ دانلود روی دامنه‌ی خودِ سامانه (GitHub Pages با دامنه‌ی
// سفارشیِ ihmsapp.ir). کاربر همیشه یک لینکِ «دامنه‌ی خودمان» را می‌زند؛
// آدرسِ Storage/GitHub فقط لحظه‌ای در نوتیفیکیشنِ دانلودِ اندروید دیده
// می‌شود، نه در لینکی که کلیک می‌شود. صفحه‌ی get با ?u=<لینک> فوراً به
// همان لینک هدایت می‌کند و اگر ?u نداشت، خودش آخرین APKِ منتشرشده را از
// app_releases می‌خواند.
const DOWNLOAD_PAGE = "https://ihmsapp.ir/get/";

// دیگر به api.github.com/.../releases/latest تکیه نمی‌کنیم: آن endpoint
// روی CDN کش می‌شود و بلافاصله بعد از انتشارِ نسخه‌ی جدید هنوز نسخه‌ی
// «قبلی» را برمی‌گرداند — علتِ اصلیِ اینکه گوشی نسخه‌ی قدیمی را دانلود
// می‌کرد و اندروید نصبِ آن را روی نسخه‌ی جدیدتر رد می‌کرد. حالا مبنا فقط
// همان ردیفِ نسخه‌محورِ app_releases است (apk_url / download_url) که دقیقاً
// برای همان version_code نوشته شده.
export async function resolveLatestApkUrl(preferredUrl = "") {
  return String(preferredUrl || "").trim();
}

// لینکِ نهاییِ دانلود همیشه از طریقِ صفحه‌ی واسطِ روی دامنه‌ی سامانه باز
// می‌شود تا نامِ GitHub در لینکِ کلیک‌شده دیده نشود.
function viaDownloadPage(url) {
  const u = String(url || "").trim();
  return u ? `${DOWNLOAD_PAGE}?u=${encodeURIComponent(u)}&t=${Date.now()}` : `${DOWNLOAD_PAGE}?t=${Date.now()}`;
}

// دانلودِ APK.
//   • موبایل: صفحه‌ی get را به مرورگرِ سیستم می‌سپاریم؛ آن صفحه فوراً به
//     لینکِ APK هدایت می‌کند و Download Manager فایل را می‌گیرد و دکمه‌ی
//     «نصب» را در نوتیفیکیشن می‌گذارد.
//   • دسکتاپ/وب: صفحه‌ی get در تبِ جدید باز می‌شود و همان‌جا دانلود شروع می‌شود.
export async function openApkDownload(url) {
  const target = viaDownloadPage(url);

  if (Capacitor.isNativePlatform()) {
    try { window.open(target, "_system"); return true; } catch { /* در ادامه */ }
    try { window.location.href = target; return true; } catch { return false; }
  }

  try {
    window.open(target, "_blank", "noopener");
    return true;
  } catch {
    window.location.href = target;
    return true;
  }
}
