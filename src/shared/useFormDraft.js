import { useState, useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 800;

/**
 * پیش‌نویسِ محلیِ فرم‌های طولانی — فقط برای جلوگیری از گم‌شدنِ چیزی که
 * کاربر تایپ کرده در صورت قطعیِ برق/رفرش تصادفی/بستنِ ناخواسته‌ی صفحه.
 * هیچ درخواستِ بک‌اندی اینجا رد و بدل نمی‌شود — طبق قاعده‌ی «local draft,
 * explicit commit» در CLAUDE.md، ثبتِ نهایی همچنان فقط با دکمه‌ی ذخیره‌ی
 * خودِ فرم انجام می‌شود؛ این هوک صرفاً یک نسخه‌ی پشتیبانِ محلی نگه می‌دارد.
 *
 * storageKey باید per-form و per-user باشد (مثلاً شاملِ نام‌کاربری) تا
 * پیش‌نویسِ یک کاربر با دیگری قاطی نشود.
 */
export function useFormDraft(storageKey, values, { enabled = true } = {}) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const timerRef = useRef(null);
  const skipFirstRef = useRef(true);

  // بررسیِ اولیه: آیا از قبل پیش‌نویسی برای این فرم ذخیره شده؟ — فقط یک‌بار
  // موقعِ mount، تا رندرهای بعدی چیزی را که کاربر توسط «نادیده گرفتن» پاک
  // کرده دوباره true نکنند.
  useEffect(() => {
    if (!enabled) { setHasDraft(false); return; }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setHasDraft(true);
        setDraftSavedAt(parsed.__savedAt || null);
      }
    } catch {
      // localStorage در دسترس نبود (حالت خصوصی و مانند آن) — پیش‌نویس نداریم، مشکلی نیست
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // ذخیره‌ی خودکار با debounce — اولین رندر را عمداً رد می‌کنیم تا مقادیرِ
  // اولیه‌ی خالیِ فرم، پیش‌نویسِ موجود را قبل از این‌که کاربر تصمیم بگیرد پاک نکند.
  useEffect(() => {
    if (!enabled) return;
    if (skipFirstRef.current) { skipFirstRef.current = false; return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...values, __savedAt: new Date().toISOString() }));
      } catch {
        // اگر ذخیره ناموفق بود (مثلاً پر بودنِ حافظه‌ی محلی)، بی‌سروصدا نادیده گرفته می‌شود
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, storageKey, enabled]);

  const readDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch { /* بی‌اهمیت */ }
    setHasDraft(false);
    setDraftSavedAt(null);
  }, [storageKey]);

  return { hasDraft, draftSavedAt, readDraft, discardDraft };
}
