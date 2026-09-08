import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { hideSplashWhenReady } from "./splashScreenControl.js";
import { applyAppearanceToDom, effectiveAppearance, readCachedAppearanceConfig } from "./systemConfigApi.js";

// این استایل قبلاً یک <style> درون‌خطی در index.html بود. تزریقش از طریق
// جاوااسکریپت (به‌جای HTML) باگ شناخته‌شده‌ی Vite روی ویندوز را دور می‌زند:
// وقتی مسیر پروژه بین حروف بزرگ/کوچک درایو ناسازگار باشد (مثلاً D:/Projects
// در Explorer در برابر d:/projects که Vite داخلی می‌بیند)، پلاگین
// html-inline-proxy در resolve کردن ماژول مجازی <style> شکست می‌خورد.
const baseStyle = document.createElement("style");
baseStyle.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  #root { min-height: 100vh; }
  img { max-width: 100%; }
  input, select, textarea, button { max-width: 100%; }
  :root {
    color-scheme: dark;
    /* پیش‌فرضِ تمِ تیرهٔ نئونی (نمونهٔ طراحی). بعد از بارگذاری از دیتابیس
       (systemConfigApi.js::applyAppearanceToDom) در صورت وجودِ تنظیمِ
       سفارشیِ شرکت override می‌شود. */
    --ihms-navy: #0a1620;
    --ihms-navy-deep: #07121a;
    --ihms-navy-mid: #123a49;
    --ihms-teal: #14b8a6;
    --ihms-teal-deep: #0f9488;
    --ihms-teal-soft: #0f2e2b;
    --ihms-bg: #0b1a24;
    --ihms-surface: #0f2a3a;
    --ihms-surface-2: #123240;
    --ihms-border: #1e3d4d;
    --ihms-border-soft: #17303c;
    --ihms-border-strong: #274a5c;
    --ihms-text: #e8eef2;
    --ihms-text2: #9fb4c0;
    --ihms-text3: #6a8290;
    --ihms-heading: #eef4f7;
    --ihms-danger: #ef4444;
    --ihms-danger-bg: #3a1e1e;
    --ihms-warn: #f59e0b;
    --ihms-warn-bg: #3a2c14;
    --ihms-ok: #22c55e;
    --ihms-ok-bg: #173021;
    --ihms-font: 'Vazirmatn', 'Inter', Tahoma, Arial, sans-serif;

    /* سیستمِ توکنِ حرفه‌ای — مقادیرِ پیش‌فرض دقیقاً برابرِ اعدادِ hardcodeِ
       امروزِ کد؛ applyAppearanceToDom در صورتِ تنظیمِ سفارشی override می‌کند. */
    --ihms-header-bg: #0a1620; --ihms-header-border: #07121a;
    --ihms-sidebar-bg: #0a1620; --ihms-sidebar-border: #1e3d4d;
    --ihms-card-bg: #0f2a3a; --ihms-card-border: #1e3d4d;
    --ihms-widget-bg: #0f2a3a; --ihms-widget-border: #1e3d4d;
    --ihms-fw: 400; --ihms-fw-heading: 700;
    --ihms-fs-header: 13px; --ihms-fw-header: 700;
    --ihms-fs-menu: 14.5px; --ihms-fw-menu: 600;
    --ihms-fs-title: 17px; --ihms-fw-title: 800;
    --ihms-fs-body: 13px; --ihms-fw-body: 400;
    --ihms-fs-card: 12px; --ihms-fw-card: 700;
    --ihms-fs-kpi: 26px; --ihms-fw-kpi: 800;
    --ihms-fs-table: 12.5px; --ihms-fw-table: 600;
    --ihms-radius-card: 12px; --ihms-radius-btn: 9px;
    --ihms-pad: 14px; --ihms-gap: 10px;
    --ihms-icon-size: 16px; --ihms-icon-stroke: 2;
    --ihms-elev-1: 0 1px 2px rgba(15,42,63,0.04), 0 4px 14px -8px rgba(15,42,63,0.12);
    --ihms-elev-2: 0 1px 2px rgba(15,42,63,0.04), 0 12px 32px -12px rgba(15,42,63,0.14);
    --ihms-elev-3: 0 2px 6px rgba(15,42,63,0.06), 0 20px 44px -16px rgba(15,42,63,0.22);
  }
  body { background: #0b1a24; }
`;
document.head.appendChild(baseStyle);

// استارتِ سرد بدونِ فلش: اگر تنظیماتِ ظاهریِ کش‌شده‌ای هست، همین حالا و
// هم‌زمان (قبل از رندرِ React و قبل از رفت‌وبرگشتِ شبکه) اعمالش کن. اگر
// نبود، همان مقادیرِ :root بالا ظاهرِ پیش‌فرض را حفظ می‌کنند.
try {
  const hash = location.hash || "";
  if (!/^#hse-climate-survey/.test(hash)) {
    const cfg = readCachedAppearanceConfig();
    if (cfg) {
      const scope = /^#super-admin/.test(hash) ? "superadmin" : (window.innerWidth < 1024 ? "mobile" : "web");
      applyAppearanceToDom(effectiveAppearance(cfg, scope));
    }
  }
} catch { /* بی‌اهمیت — پیش‌فرض‌های :root کافی‌اند */ }

// طبق یک باگ واقعی که گزارش شد: Service Worker قبلاً بدون قید و شرط
// حتی در npm run dev هم ثبت می‌شد — که باعث می‌شد کاربر با وجود
// build مجدد و Hard Refresh، هنوز محتوای کش‌شده‌ی قدیمی ببیند (چون
// Service Worker با Hot Module Reload خودِ Vite تداخل می‌کند). الان
// فقط در نسخه‌ی نهایی واقعی (Production build) ثبت می‌شود —
// import.meta.env.PROD مقداری است که خودِ Vite در npm run build
// روی true تنظیم می‌کند، نه در npm run dev.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// بعد از رندر اولیه‌ی اپ (که همان صفحه‌ی ورود خواهد بود، مگر نشستی از
// قبل ذخیره شده باشد)، Splash Screen بومی را با یک محو شدن نرم کنار
// می‌زند. این تابع کاملاً مستقل از هر منطق Login/احراز هویتی است.
hideSplashWhenReady();
