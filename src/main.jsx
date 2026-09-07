import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { hideSplashWhenReady } from "./splashScreenControl.js";

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
    --ihms-danger: #ef4444;
    --ihms-danger-bg: #3a1e1e;
    --ihms-warn: #f59e0b;
    --ihms-warn-bg: #3a2c14;
    --ihms-ok: #22c55e;
    --ihms-ok-bg: #173021;
    --ihms-font: 'Vazirmatn', 'Inter', Tahoma, Arial, sans-serif;
  }
  body { background: #0b1a24; }
`;
document.head.appendChild(baseStyle);

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
