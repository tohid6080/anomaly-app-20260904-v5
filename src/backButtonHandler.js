import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * مدیریت دکمهٔ سخت‌افزاری «بازگشت» اندروید.
 *
 * طبق خواستهٔ صریح: دکمهٔ برگشت گوشی باید مثل دکمهٔ برگشت داخلی سامانه
 * عمل کند و نباید باعث بسته‌شدن (خروج) نرم‌افزار شود. Capacitor به‌صورت
 * پیش‌فرض روی رویداد backButton، وقتی هیچ listenerی نباشد، اپ را با
 * exitApp می‌بندد — این ماژول آن رفتار را کاملاً جایگزین می‌کند:
 *
 *  - هر صفحه/داشبورد یک «هندلر بازگشت» ثبت می‌کند. آخرین هندلرِ ثبت‌شده
 *    (بالاترین لایهٔ فعالِ UI) اول فرصت پاسخ می‌گیرد.
 *  - اگر هندلری رویداد را «مصرف» کرد (true برگرداند) کار تمام است.
 *  - اگر هیچ هندلری مصرفش نکرد، به‌جای بستنِ اپ فقط به پس‌زمینه می‌رود
 *    (minimizeApp) — رفتار استانداردِ اندروید، بدون خروج از نرم‌افزار.
 *
 * روی وب/دسکتاپ این ماژول کاملاً بی‌اثر است (Capacitor.isNativePlatform
 * برابر false).
 */

const handlerStack = [];
let listenerRegistered = false;

function ensureListener() {
  if (listenerRegistered || !Capacitor.isNativePlatform()) return;
  listenerRegistered = true;
  CapacitorApp.addListener("backButton", () => {
    for (let i = handlerStack.length - 1; i >= 0; i--) {
      try {
        if (handlerStack[i]() === true) return;
      } catch {
        // یک هندلرِ خراب نباید کل زنجیره را متوقف کند
      }
    }
    // هیچ‌کس رویداد را مصرف نکرد — طبق الزام، اپ بسته نمی‌شود؛ فقط
    // به پس‌زمینه می‌رود.
    CapacitorApp.minimizeApp().catch(() => {});
  });
}

/**
 * ثبت یک هندلر بازگشت برای طول عمر یک کامپوننت.
 * @param {() => boolean} handler اگر رویداد را مدیریت کرد true برگرداند.
 */
export function useAndroidBackButton(handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    ensureListener();
    const stable = () => ref.current();
    handlerStack.push(stable);
    return () => {
      const idx = handlerStack.indexOf(stable);
      if (idx !== -1) handlerStack.splice(idx, 1);
    };
  }, []);
}
