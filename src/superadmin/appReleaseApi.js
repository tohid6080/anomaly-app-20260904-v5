import { sb, sbOk, SUPABASE_URL, SUPABASE_ANON_KEY, APP_VERSION_CODE } from "../shared.js";
import { getSessionToken } from "../sessionToken.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

// پیام‌های نمایشی این لایه‌ی داده با زبان فعلی کاربر هماهنگ‌اند — همان الگوی
// مستندشده در translations.js برای فایل‌های غیر React.
const tr = (key, params) => translate(getCurrentLang(), key, params);

const APK_BUCKET = "app-releases";

function releaseFromRow(r) {
  return {
    id: r.id,
    version: r.version || "",
    versionCode: r.version_code,
    releaseNotes: r.release_notes || "",
    apkUrl: r.apk_url || "",
    apkPath: r.apk_path || "",
    downloadUrl: r.download_url || "",
    // لینکی که واقعاً برای دانلود استفاده می‌شود: اول APK آپلودشده، بعد لینک بیرونی
    effectiveDownloadUrl: r.apk_url || r.download_url || "",
    isPublished: r.is_published === true,
    publishedBy: r.published_by || "",
    publishedAt: r.published_at || null,
    createdAt: r.created_at || null,
  };
}

// ---------- خواندن ----------

// همه‌ی نسخه‌ها (پنل Super Admin) — جدیدترین بالا.
export async function loadAppReleases() {
  const rows = await sb("app_releases?select=*&order=version_code.desc", {}, "super_admin");
  return sbOk(rows) ? rows.map(releaseFromRow) : [];
}

// آخرین نسخه‌ی «منتشرشده» — برای پنل «درباره IHMS» و بررسیِ نسخه در اپ موبایل.
// SELECT این جدول عمومی است، پس scope مشتری کافی است (حتی پیش از ورود).
export async function loadLatestPublishedRelease() {
  const rows = await sb("app_releases?is_published=eq.true&select=*&order=version_code.desc&limit=1");
  return sbOk(rows) && rows.length > 0 ? releaseFromRow(rows[0]) : null;
}

// ---------- نسخه‌بندی ----------

// نسخه‌ی patchِ بعدی برای پیش‌پرکردنِ فرم (1.2.0 → 1.2.1). اگر قالب نامعتبر
// بود، همان ورودی برگردانده می‌شود.
export function nextPatchVersion(version) {
  const m = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return version || "";
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

// آیا این نسخه از نسخه‌ی همین بیلد جدیدتر است؟ (مبنای پیام «نسخه جدید موجود است»)
export function isNewerThanCurrent(release) {
  return !!release && typeof release.versionCode === "number" && release.versionCode > APP_VERSION_CODE;
}

// ---------- آپلود APK به Storage ----------

async function uploadApk(file, versionCode) {
  const safeName = (file.name || "app.apk").replace(/[^\w.\-]+/g, "_");
  const path = `v${versionCode}/${Date.now()}_${safeName}`;
  const token = getSessionToken("super_admin") || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${APK_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/vnd.android.package-archive",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { __error: true, message: tr("arErrApkUpload", { detail: text || res.status }) };
  }
  return { path, url: `${SUPABASE_URL}/storage/v1/object/public/${APK_BUCKET}/${path}` };
}

async function deleteApk(path) {
  if (!path) return;
  const token = getSessionToken("super_admin") || SUPABASE_ANON_KEY;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${APK_BUCKET}/${path}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// ---------- نوشتن ----------

// ثبت (و در صورت انتخاب، انتشارِ) یک نسخه‌ی جدید. version_code خودکار =
// بزرگ‌ترین version_code موجود + ۱ (یا ۱ برای اولین نسخه).
export async function createAppRelease({ version, releaseNotes, downloadUrl, apkFile, publish, createdBy }) {
  const v = String(version || "").trim();
  if (!v) return { __error: true, message: tr("arErrVersionRequired") };

  const existing = await sb("app_releases?select=version_code&order=version_code.desc&limit=1", {}, "super_admin");
  const maxCode = sbOk(existing) && existing.length > 0 ? Number(existing[0].version_code) || 0 : 0;
  const versionCode = maxCode + 1;

  let apkUrl = "";
  let apkPath = "";
  if (apkFile) {
    const up = await uploadApk(apkFile, versionCode);
    if (up?.__error) return up;
    apkUrl = up.url;
    apkPath = up.path;
  }

  if (!apkUrl && !String(downloadUrl || "").trim()) {
    return { __error: true, message: tr("arErrNeedApkOrLink") };
  }

  const payload = {
    version: v,
    version_code: versionCode,
    release_notes: String(releaseNotes || "").trim(),
    apk_url: apkUrl,
    apk_path: apkPath,
    download_url: String(downloadUrl || "").trim(),
    is_published: publish === true,
    published_by: publish === true ? (createdBy || "") : "",
    published_at: publish === true ? new Date().toISOString() : null,
  };
  const rows = await sb("app_releases", { method: "POST", body: JSON.stringify([payload]) }, "super_admin");
  if (!sbOk(rows)) {
    await deleteApk(apkPath); // rollback فایل یتیم
    return { __error: true, message: tr("arErrCreate", { detail: rows?.message || "" }) };
  }
  return { ok: true, release: releaseFromRow(rows[0]) };
}

// فعال/غیرفعال کردن انتشارِ یک نسخه‌ی موجود.
export async function setReleasePublished(id, isPublished, by) {
  const payload = {
    is_published: isPublished === true,
    published_by: isPublished === true ? (by || "") : "",
    published_at: isPublished === true ? new Date().toISOString() : null,
  };
  const rows = await sb(`app_releases?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("arErrPublishToggle") };
  return { ok: true };
}

// «دکمه‌ی آپدیت موبایل» — بدون رفتن به GitHub، ساخت APK را از طریق Edge
// Function شروع می‌کند. Edge Function خودش version_code بعدی را می‌زند، یک
// ردیف «در حال ساخت» درج می‌کند و ورک‌فلوی GitHub را دیسپچ می‌کند؛ وقتی
// ساخت تمام شد، همان ردیف خودکار «منتشرشده» می‌شود.
export async function triggerMobileBuild({ version, releaseNotes } = {}) {
  const token = getSessionToken("super_admin");
  if (!token) return { __error: true, message: tr("saErrInvalidSession") };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/trigger-mobile-build`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ version: version || "", releaseNotes: releaseNotes || "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { __error: true, message: data?.error || tr("arErrTriggerBuild") };
    return data;
  } catch {
    return { __error: true, message: tr("saErrServerConn") };
  }
}

// حذف یک نسخه (به‌همراه APKاش در Storage).
export async function deleteAppRelease(id) {
  const row = await sb(`app_releases?id=eq.${id}&select=apk_path`, {}, "super_admin");
  const rows = await sb(`app_releases?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }, "super_admin");
  if (!sbOk(rows)) return { __error: true, message: tr("arErrDelete") };
  if (sbOk(row) && row.length > 0 && row[0].apk_path) await deleteApk(row[0].apk_path);
  return { ok: true };
}
