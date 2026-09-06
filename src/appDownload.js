import { Capacitor } from "@capacitor/core";

// ریپوی GitHub که Releaseهای APK در آن منتشر می‌شوند (ثابت — همان مقداری که
// در Edge Function trigger-mobile-build و ورک‌فلو استفاده شده).
const GITHUB_REPO = "tohid6080/anomaly-app-20260904-v5";

// لینکِ دانلودِ مستقیمِ APKِ آخرین Releaseِ منتشرشده را از خودِ GitHub API
// می‌گیرد (browser_download_url همان Asset)، نه از یک URL ساخته‌شده. اگر API
// در دسترس نبود، به fallbackِ ذخیره‌شده (app_releases.apk_url) برمی‌گردد.
export async function resolveLatestApkUrl(fallbackUrl = "") {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const rel = await res.json();
      const apk = (rel.assets || []).find(
        (a) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk"),
      );
      if (apk?.browser_download_url) return apk.browser_download_url;
    }
  } catch {
    /* آفلاین یا محدودیتِ نرخِ API — از fallback استفاده می‌شود */
  }
  return fallbackUrl || "";
}

// دانلودِ مستقیمِ APK.
//   • موبایل: لینک را مستقیم به مرورگرِ سیستم (Download Manager اندروید)
//     می‌سپاریم. مرورگر فایل را در پوشه‌ی Downloads دانلود می‌کند و در
//     نوتیفیکیشن دکمه‌ی «باز کردن / نصب» می‌گذارد — بدون پنجره‌ی
//     «اشتراک‌گذاری با دیگران»، بدون دانلودِ ۲۰ مگابایتیِ بی‌صدا داخلِ اپ،
//     و بدون FileProvider. چون امضای همه‌ی بیلدها از v1.0.5 یکی است،
//     نسخه‌ی جدید روی نسخه‌ی قبلی نصب می‌شود (نیاز به حذفِ نسخه‌ی قبلی نیست).
//   • دسکتاپ/وب: یک لینکِ مخفی با صفتِ download کلیک می‌شود؛ مرورگر به‌خاطر
//     هدرِ «Content-Disposition: attachment» خودِ فایل را دانلود می‌کند
//     (نه اینکه صفحه‌ی GitHub باز شود).
export async function openApkDownload(url) {
  if (!url) return false;

  if (Capacitor.isNativePlatform()) {
    // «_system» را Capacitor به یک Intent.ACTION_VIEW تبدیل می‌کند و مرورگرِ
    // پیش‌فرضِ گوشی باز می‌شود؛ همان مسیری که برای دانلود+نصبِ APK مطمئن است.
    try { window.open(url, "_system"); return true; } catch { /* در ادامه */ }
    try { window.location.href = url; return true; } catch { return false; }
  }

  // دسکتاپ / وب
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = ""; // برای لینکِ cross-origin مرورگر به هدرِ attachment تکیه می‌کند
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    window.open(url, "_blank", "noopener");
    return true;
  }
}
