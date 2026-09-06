import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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

function filenameFromUrl(url) {
  try {
    const p = new URL(url).pathname.split("/").pop();
    return p && p.toLowerCase().endsWith(".apk") ? decodeURIComponent(p) : "ihms-update.apk";
  } catch {
    return "ihms-update.apk";
  }
}

// دانلودِ مستقیمِ APK.
//   • موبایل: فایل با موتورِ HTTP بومیِ Capacitor (نه WebView، بدونِ CORS و
//     بدونِ باز شدنِ صفحه‌ی GitHub) دانلود می‌شود؛ سپس با «اشتراک‌گذاری» به
//     نصب‌کننده‌ی بسته‌ی اندروید سپرده می‌شود. اگر این مسیر شکست خورد،
//     fallback: باز کردنِ URL در مرورگرِ سیستم.
//   • دسکتاپ/وب: یک لینکِ مخفی با صفتِ download کلیک می‌شود؛ مرورگر به‌خاطر
//     هدرِ «Content-Disposition: attachment» خودِ فایل را دانلود می‌کند
//     (نه اینکه صفحه‌ی GitHub باز شود).
export async function openApkDownload(url) {
  if (!url) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const name = filenameFromUrl(url);
      const dl = await Filesystem.downloadFile({ url, path: name, directory: Directory.Cache });
      const path = dl?.path || name;
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      await Share.share({ title: name, url: uri, dialogTitle: name });
      return true;
    } catch {
      try { window.open(url, "_system"); return true; } catch { /* در ادامه */ }
      try { window.location.href = url; return true; } catch { return false; }
    }
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
