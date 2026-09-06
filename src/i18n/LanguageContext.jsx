import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translate, setActiveLangStorageKey } from "./translations.js";

const LanguageContext = createContext(null);

const DEFAULT_STORAGE_KEY = "ihms_lang";

function readStoredLang(storageKey) {
  try {
    const v = localStorage.getItem(storageKey || DEFAULT_STORAGE_KEY);
    return v === "en" ? "en" : "fa";
  } catch {
    return "fa";
  }
}

/**
 * فاز ۱: این Provider فقط زبان صفحه‌ی ورود، هدر، و پروفایل/تنظیمات را
 * کنترل می‌کند — بقیه‌ی سامانه فعلاً همیشه فارسی می‌ماند. دلیل اینکه این
 * Context در سطح کل اپ قرار گرفته (نه فقط دور این سه بخش)، این است که در
 * فازهای بعد، بقیه‌ی ماژول‌ها هم بتوانند بدون تغییر ساختار، به همین یک
 * منبع وصل شوند.
 */
export function LanguageProvider({ children, storageKey = DEFAULT_STORAGE_KEY }) {
  // کدِ غیر-React (لایه‌ی داده) از getCurrentLang() استفاده می‌کند؛ اینجا
  // به آن می‌گوییم همین scope را بخواند. در هر لحظه فقط یک LanguageProvider
  // در درخت هست (سوپرادمین XOR سامانه‌ی اصلی)، پس تداخلی رخ نمی‌دهد.
  setActiveLangStorageKey(storageKey);

  const [lang, setLangState] = useState(() => readStoredLang(storageKey));

  const setLang = useCallback((next) => {
    const value = next === "en" ? "en" : "fa";
    setLangState(value);
    try { localStorage.setItem(storageKey, value); } catch { /* بی‌اهمیت */ }
  }, [storageKey]);

  // پارامترِ اختیاریِ params برای درون‌ریزیِ جای‌نگه‌دارهای {name} در متنِ
  // ترجمه — سازگار با فراخوانی‌های بدونِ پارامترِ موجود.
  const t = useCallback((key, params) => translate(lang, key, params), [lang]);
  const dir = lang === "en" ? "ltr" : "rtl";

  // جهت و زبانِ ریشه‌ی صفحه (<html>) را با زبان فعال هم‌گام می‌کنیم تا کلِ
  // درخت — کارت‌ها، جدول‌ها، فرم‌ها، دکمه‌ها — در حالت انگلیسی به‌صورت LTR
  // و در فارسی RTL بچیند، بدون اینکه لازم باشد در تک‌تک اجزا direction
  // دستی گذاشته شود. index.html به‌صورت پیش‌فرض dir="rtl" است؛ این افکت
  // فقط هنگام انگلیسی آن را به ltr تغییر می‌دهد، پس چیدمان فارسی هیچ
  // تغییری نمی‌کند. در هر لحظه فقط یک LanguageProvider (سامانه XOR
  // سوپرادمین) در درخت است، پس تداخلی پیش نمی‌آید.
  useEffect(() => {
    try {
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
    } catch { /* بی‌اهمیت */ }
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
