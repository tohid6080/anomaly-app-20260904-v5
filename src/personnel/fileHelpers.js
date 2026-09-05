import { compressImage } from "../shared.js";

// حداکثر حجمِ خامِ ورودی (قبل از فشرده‌سازی) — فقط یک محافظ در برابر
// رمزگشاییِ فایلِ خیلی بزرگ در canvas؛ حجمِ ذخیره‌شده در هر صورت پس از
// compressImage بسیار کوچک‌تر است. یک عکسِ معمولیِ گوشی ۲–۵ مگابایت است،
// پس ۸ مگابایت کافی‌ست.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// عکس‌ها به‌صورت هوشمند فشرده می‌شوند (compressImage در shared.js —
// اصلاح جهت‌گیری، خروجی WebP در صورت پشتیبانی، کیفیتِ تطبیقی زیرِ بودجه‌ی
// حجم با حفظِ کفِ خوانایی)؛ فایل‌های غیرعکسی (PDF) بدون تغییر خوانده می‌شوند.
export function fileToBase64(file, maxDim = 1600) {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error("حجم فایل بیش از حد مجاز است (حداکثر ۸ مگابایت)"));
  }
  if (file.type && file.type.startsWith("image/")) {
    // پیش‌تنظیمِ «مدرک/اسکن» (مدارک پرسنل و ماشین‌آلات، پیوستِ اقدام اصلاحی):
    // متن باید خوانا بماند، پس ضلعِ بلند تا ۱۶۰۰px و کفِ کیفیت ۰٫۶۲ نگه
    // داشته می‌شود؛ بودجه‌ی حجم کمی بازتر از عکسِ صحنه.
    return compressImage(file, { maxDim, targetBytes: 170 * 1024, minQuality: 0.62, maxQuality: 0.9 });
  }
  // PDF / other: no resize, just base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("خطا در خواندن فایل"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function isPdfDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return false;
  // یا یک data URL کلاسیک (هنوز روی دستگاه، آفلاین و سینک‌نشده)
  // یا یک آدرس واقعی در Supabase Storage که با پسوند pdf. ذخیره شده
  return dataUrl.startsWith("data:application/pdf") || dataUrl.toLowerCase().endsWith(".pdf");
}
