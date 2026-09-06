// ---------- ماژول مشترک ----------
// این فایل شامل چیزهایی است که هم App.jsx و هم ماژول‌های فرعی (مثل bowtie/)
// به آن نیاز دارند: اتصال Supabase، توکن‌های طراحی (THEME/styles) و چند تابع
// کمکی عمومی. جدا نگه‌داشتن این‌ها از App.jsx از وابستگی حلقوی (circular
// import) بین App.jsx و ماژول‌های فرعی جلوگیری می‌کند.

import { useState, useEffect } from "react";
import { getSessionToken } from "./sessionToken.js";
import { translate, getCurrentLang } from "./i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

export const APP_NAME = "Integrated HSE Management System";

// نسخه‌ی همین بیلد از اپ. APP_VERSION رشته‌ی نمایشی است و APP_VERSION_CODE
// یک عدد صعودی که اپ موبایل برای تشخیص «نسخه‌ی جدید موجود است» با
// version_code آخرین انتشارِ ثبت‌شده در جدول app_releases مقایسه می‌کند.
// هنگام انتشار یک نسخه‌ی جدید، این دو مقدار باید هم‌زمان با ساخت APK
// جدید به‌روزرسانی شوند.
export const APP_VERSION = "1.0.1";
export const APP_VERSION_CODE = 2;

// نکته امنیتی: فقط از کلید publishable/anon استفاده می‌شود، هرگز کلید secret را
// داخل کد سمت مرورگر قرار ندهید چون هرکسی که اپ را باز کند می‌تواند آن را ببیند.
export const SUPABASE_URL = "https://zmmxiyqlwkqjzghbcydi.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_pvobGcp2snOD3oFTX2LVMg_bZx2A9CR";
// استفاده در offline/networkStatus.js برای تست واقعی در دسترس‌بودن (نه فقط navigator.onLine)
export const SUPABASE_PING_URL = `${SUPABASE_URL}/rest/v1/`;

// آدرس عمومی و قابل‌اشتراک نسخه‌ی وب سامانه (GitHub Pages). لینک‌هایی که
// قرار است بیرونِ اپ باز شوند (مثل پرسشنامه‌ی عمومی HSE Climate) باید
// همیشه به این آدرس اشاره کنند، نه به window.location — چون در اپ اندروید
// (Capacitor) مقدار window.location.origin برابر http://localhost است و
// در محیط dev هم localhost؛ لینکِ ساخته‌شده در آن حالت‌ها از اینترنت
// قابل‌دسترسی نیست. اگر روزی دامنه عوض شود، فقط همین‌جا تغییر کند.
export const PUBLIC_APP_URL = "https://tohid6080.github.io/anomaly-app-20260904-v5/";

export async function sb(path, options = {}, scope = "customer") {
  try {
    // از وقتی RLS واقعی روی اکثر جدول‌ها فعال شد، این دیگر فقط یک بهبود
    // پس‌زمینه نیست — اگر توکن معتبر نباشد، درخواست‌های company-scoped
    // واقعاً چیزی برنمی‌گردانند (نه فقط یک حالت موقت بی‌اثر). پارامتر scope
    // اجازه می‌دهد فراخوانی‌های سوپرادمین صریحاً توکن super_admin خودشان
    // را بخواهند، نه توکن مشتری (که برای سوپرادمین اصلاً وجود ندارد).
    const sessionToken = getSessionToken(scope);
    const authToken = sessionToken || SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Supabase error", res.status, text);
      return { __error: true, status: res.status, message: text || `HTTP ${res.status}` };
    }
    if (res.status === 204) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Supabase fetch failed", e);
    return { __error: true, status: 0, message: String((e && e.message) || e) };
  }
}

// ---------- فاز ۲: زمینه‌ی «شرکت فعلی» ----------
// در لحظه‌ی ورود (یا بازیابی نشست از localStorage بعد از رفرش) یک‌بار تنظیم
// می‌شود. توابع دیتالایر هر ماژول که به شرکت وابسته‌اند (مثلاً personnelApi)
// این مقدار را می‌خوانند و به کوئری‌هایشان اضافه می‌کنند — به‌جای اینکه
// company_id به‌صورت پراکنده در ده‌ها فایل دستی همه‌جا پاس داده شود.
//
// نکته‌ی امنیتی: این مقدار صرفاً یک فیلتر راحت سمت کلاینت است (برای
// اینکه هر کوئری مجبور نباشد company_id را دستی حمل کند) — مرز امنیتی
// واقعی و غیرقابل‌دورزدن سمت دیتابیس با RLS اعمال می‌شود: هر جدول
// شرکت‌محور Policy «company isolation» دارد که company_id ردیف را با
// current_company_id() (تابعی که از claim امضاشده‌ی company_id در همان
// توکن نشست سفارشی این پروژه می‌خواند، نه از این متغیر جاوااسکریپتی)
// مقایسه می‌کند. یعنی حتی اگر این متغیر دستکاری شود، درخواست همچنان
// توسط دیتابیس رد می‌شود.
let _currentCompanyId = null;
export function setCurrentCompanyId(id) {
  _currentCompanyId = id || null;
}
export function getCurrentCompanyId() {
  return _currentCompanyId;
}

export function sbOk(rows) {
  return Array.isArray(rows);
}
export function sbErrMsg(rows) {
  if (rows && rows.__error) return rows.message;
  return tr("sharedErrUnknown");
}

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ---------- فشرده‌سازیِ هوشمندِ تصویر سمت مرورگر (قبل از ذخیره‌ی base64) ----------
// اینجا (نه App.jsx) نگه داشته شده چون کامپوننت‌های زیرپوشه‌ای هم به آن نیاز
// دارند و import مستقیم از App.jsx وابستگیِ حلقوی می‌سازد.
//
// همه‌ی تصمیم‌ها خودکار و متناسب با خودِ تصویر گرفته می‌شوند:
//   • جهت‌گیریِ EXIF اصلاح می‌شود — عکس‌های چرخیده‌ی موبایل صاف آپلود می‌شوند.
//   • فقط کوچک‌سازی؛ هیچ‌وقت بزرگ‌نمایی نمی‌شود. ضلعِ بلند حداکثر maxDim.
//   • بازنموداری با کیفیتِ بالا (imageSmoothingQuality="high") تا متنِ مدرک
//     بعد از کوچک‌شدن هم خوانا بماند.
//   • خروجی همیشه JPEG است (سازگار با کلِ زنجیره‌ی Storage/آرشیو موجود).
//   • کیفیت با جست‌وجوی دودویی طوری انتخاب می‌شود که حجم زیر targetBytes
//     بماند، ولی هرگز پایین‌تر از minQuality نرود (کفِ خوانایی مدرک)، و اگر
//     تصویر از قبل زیر بودجه باشد بی‌جهت کیفیتش کم نشود (سقفِ maxQuality).

async function decodeImageWithOrientation(file) {
  // مسیر ترجیحی: جهت‌گیریِ EXIF را هنگام رمزگشایی درست اعمال می‌کند
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch { /* افتادن به مسیر جایگزین */ }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(tr("sharedErrReadFile")));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(tr("sharedErrInvalidImage")));
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(tr("sharedErrProcessImage")));
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function canvasToBlobAsync(canvas, type, q) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), type, q);
    else resolve(null);
  });
}

export async function compressImage(file, opts = {}) {
  const {
    maxDim = 1280,
    targetBytes = 110 * 1024,
    minQuality = 0.58,
    maxQuality = 0.85,
  } = opts;
  const type = "image/jpeg";

  const src = await decodeImageWithOrientation(file);
  const sw = src.width || src.naturalWidth;
  const sh = src.height || src.naturalHeight;
  if (!sw || !sh) throw new Error(tr("sharedErrInvalidImage"));

  let w = sw, h = sh;
  if (Math.max(w, h) > maxDim) {
    if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
    else { w = Math.round((w * maxDim) / h); h = maxDim; }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  if (src.close) src.close();

  // اگر با بالاترین کیفیت هم زیرِ بودجه‌ی حجم هستیم، همان را نگه می‌داریم
  // (تصویرِ تمیز/کوچک نباید بی‌جهت افت کیفیت بدهد).
  const topBlob = await canvasToBlobAsync(canvas, type, maxQuality);
  if (!topBlob) return canvas.toDataURL(type, 0.8); // مرورگرِ بدون toBlob (بسیار نادر)
  if (topBlob.size <= targetBytes) return blobToDataUrl(topBlob);

  // وگرنه بینِ minQuality و maxQuality: بالاترین کیفیتی که زیرِ بودجه بماند.
  let underBest = null;
  let lo = minQuality, hi = maxQuality;
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlobAsync(canvas, type, mid);
    if (!blob) break;
    if (blob.size <= targetBytes) { underBest = blob; lo = mid; }
    else { hi = mid; }
  }
  if (underBest) return blobToDataUrl(underBest);

  // هنوز زیرِ بودجه نیامده — کفِ کیفیت؛ پایین‌تر نمی‌رویم تا خواناییِ مدرک
  // حفظ شود.
  const floorBlob = await canvasToBlobAsync(canvas, type, minQuality);
  return blobToDataUrl(floorBlob || topBlob);
}

// پیش‌تنظیمِ «عکسِ صحنه» (تصاویر آنومالی/اقدام‌اصلاحی/رسید پرداخت): این‌ها
// عکسِ محیط‌اند نه اسکنِ متن؛ برای اشغال‌نکردنِ فضای Storage بودجه‌ی حجم
// کوچک‌تر و ضلعِ حداکثر ۱۲۸۰px — همچنان برای دیدنِ موضوعِ عکس کاملاً واضح.
export function resizeImageFile(file) {
  return compressImage(file, { maxDim: 1280, targetBytes: 85 * 1024, minQuality: 0.55, maxQuality: 0.82 });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- توکن‌های طراحی (پالت و تایپوگرافی سازمانی) ----------
export const THEME = {
  navy: "var(--ihms-navy, #0e2a3f)",
  navyDeep: "#0a1f30",
  navyMid: "#123a54",
  teal: "var(--ihms-teal, #0d8f8a)",
  tealDeep: "#0a7570",
  tealSoft: "#e3f5f4",
  bg: "var(--ihms-bg, #f2f5f8)",
  surface: "var(--ihms-surface, #ffffff)",
  border: "var(--ihms-border, #e3e8ee)",
  borderStrong: "var(--ihms-border-strong, #cbd5e1)",
  text: "var(--ihms-text, #152535)",
  text2: "var(--ihms-text2, #5b6b7d)",
  text3: "var(--ihms-text3, #93a1b0)",
  danger: "#c92a2a",
  dangerBg: "#fdecec",
  font: "var(--ihms-font)",
};

export const styles = {
  centerScreen: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: `radial-gradient(1100px 500px at 15% -10%, ${THEME.tealSoft} 0%, transparent 55%), linear-gradient(160deg, #f6f8fa 0%, #e9eef3 100%)`, fontFamily: THEME.font, padding: 20 },
  brandBadge: { width: 44, height: 44, borderRadius: 12, background: THEME.teal, display: "flex", alignItems: "center", justifyContent: "center" },
  card: { background: THEME.surface, padding: "clamp(18px, 5vw, 30px)", borderRadius: 16, boxShadow: "0 1px 2px rgba(15,42,63,0.04), 0 12px 32px -12px rgba(15,42,63,0.14)", border: `1px solid ${THEME.border}`, width: 340, maxWidth: "100%", boxSizing: "border-box", direction: "rtl", marginBottom: 14 },
  label: { display: "block", marginBottom: 6, marginTop: 16, fontSize: 13, fontWeight: 600, color: THEME.text2, letterSpacing: "0.01em" },
  input: { width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, fontSize: 14.5, boxSizing: "border-box", fontFamily: THEME.font, color: THEME.text, background: "#fbfcfd", outline: "none", transition: "border-color .15s" },
  button: { width: "100%", marginTop: 24, padding: "13px", borderRadius: 10, border: "none", background: `linear-gradient(180deg, ${THEME.teal}, ${THEME.tealDeep})`, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 6px 16px -6px rgba(13,143,138,0.5)", fontFamily: THEME.font, letterSpacing: "0.01em" },
  smallButton: { padding: "9px 16px", borderRadius: 8, border: "none", background: THEME.navyMid, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font },
  error: { color: THEME.danger, fontSize: 13, marginTop: 12, marginBottom: 0, fontWeight: 500 },
  hint: { fontSize: 11.5, color: THEME.text3, marginTop: 18, textAlign: "center", direction: "ltr", letterSpacing: "0.02em" },
  dashboardWrapper: { direction: "rtl", fontFamily: THEME.font, minHeight: "100vh", background: THEME.bg },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: `linear-gradient(120deg, ${THEME.navy}, ${THEME.navyDeep})`, color: "#fff", padding: "14px clamp(12px, 4vw, 22px)", boxShadow: "0 4px 18px -6px rgba(10,31,48,0.45)", position: "sticky", top: 0, zIndex: 20 },
  appNameTag: { fontSize: 10.5, opacity: 0.7, marginBottom: 2, textAlign: "right", letterSpacing: "0.01em", fontWeight: 600 },
  logoutButton: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", padding: "8px 16px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: THEME.font },
  menuList: { padding: "20px clamp(10px, 4vw, 18px) 32px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" },
  menuList2: { display: "flex", flexDirection: "column", gap: 10 },
  menuCard: { background: THEME.surface, padding: "17px 18px", borderRadius: 13, boxShadow: "0 1px 2px rgba(15,42,63,0.04), 0 4px 14px -8px rgba(15,42,63,0.12)", border: `1px solid ${THEME.border}`, cursor: "pointer", fontSize: 14.5, fontWeight: 600, color: THEME.text, display: "flex", alignItems: "center" },
  anomalyMenuCard: { borderInlineStart: `3px solid ${THEME.teal}`, background: THEME.tealSoft },
  userRow: { background: THEME.surface, padding: "14px 18px", borderRadius: 12, border: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14.5 },
  backLink: { cursor: "pointer", color: THEME.teal, marginBottom: 18, fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))", gap: 10, marginTop: 8 },
  statBox: { background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 13, padding: "14px 8px", textAlign: "center", boxShadow: "0 1px 2px rgba(15,42,63,0.03)" },
  statNum: { fontSize: 21, fontWeight: 700, color: THEME.navy, fontFamily: THEME.font },
  statLabel: { fontSize: 10.5, color: THEME.text3, marginTop: 3, fontWeight: 600 },
  filterBar: { display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" },
  filterSelect: { padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${THEME.border}`, fontSize: 13, background: THEME.surface, color: THEME.text, fontFamily: THEME.font },
  badge: { fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "#eef1f5", color: THEME.text2, fontWeight: 600 },
  photoGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  photoThumbWrap: { position: "relative", width: 80, height: 80 },
  photoThumb: { width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${THEME.border}`, cursor: "pointer" },
  photoRemoveBtn: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: THEME.danger, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  photoViewerOverlay: { position: "fixed", inset: 0, background: "rgba(10,20,30,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  photoViewerImg: { maxWidth: "100%", maxHeight: "90vh", borderRadius: 10 },
  photoViewerClose: { position: "absolute", top: 20, left: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
};

/**
 * useState که مقدارش را در localStorage نگه می‌دارد — دقیقاً مثل useState
 * معمولی استفاده می‌شود، فقط با رفرش کردن صفحه از بین نمی‌رود. برای همین از
 * این هوک برای «کاربر واردشده» و «صفحه‌ی فعلی هر پنل» استفاده می‌کنیم تا
 * رفرش کردن، کاربر را از سامانه و از همان صفحه‌ای که بوده بیرون نیندازد.
 */
export function usePersistedState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (state === null || state === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // بی‌اهمیت اگر localStorage در دسترس نبود (مثلاً حالت خصوصی مرورگر)
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * ماژول‌ها/زیرماژول‌های فعال پلنِ فعلیِ شرکت — طبق خواسته‌ی صریح: «اگه پلن
 * اشتراکی برای شرکتی فعال میشه دیگه ماژول هایی که غیرفعال کردیم دیگه رو
 * هیچ‌کدوم از کاربراش نشون نده». اگر شرکتی هنوز پلنی تخصیص نگرفته (یا
 * features آن پلن خالی/نامشخص است)، عمداً null برمی‌گردد — یعنی «باز»
 * (همه‌چیز نمایش داده شود)، تا رفتار شرکت‌های موجود بدون پلن خراب نشود.
 */
export async function loadCurrentCompanyPlanFeatures() {
  const companyId = getCurrentCompanyId();
  if (!companyId) return null;
  try {
    const companyRows = await sb(`companies?id=eq.${companyId}&select=plan_id`);
    if (!sbOk(companyRows) || companyRows.length === 0 || !companyRows[0].plan_id) return null;
    const planRows = await sb(`plans?id=eq.${companyRows[0].plan_id}&select=features,is_active`);
    if (!sbOk(planRows) || planRows.length === 0 || planRows[0].is_active === false) return null;
    return Array.isArray(planRows[0].features) ? planRows[0].features : null;
  } catch {
    return null;
  }
}

// planFeatures === null یعنی «بدون محدودیت» (fail-open) — نه یک آرایه‌ی خالی
export function isModuleInPlan(planFeatures, moduleKey) {
  if (planFeatures === null || planFeatures === undefined) return true;
  return planFeatures.includes(moduleKey);
}
