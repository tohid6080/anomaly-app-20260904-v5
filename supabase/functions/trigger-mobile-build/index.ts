// supabase/functions/trigger-mobile-build/index.ts
//
// «دکمه‌ی آپدیت موبایل» در پنل Super Admin این تابع را صدا می‌زند تا بدون
// رفتن به GitHub، ساختِ APK را شروع کند:
//   1) اعتبار توکن فراخوان بررسی می‌شود — فقط Super Admin.
//   2) version_code بعدی خودکار محاسبه و یک ردیف app_releases با
//      is_published=false («در حال ساخت») درج می‌شود.
//   3) با یک GitHub PAT (سکرت GITHUB_DISPATCH_TOKEN) ورک‌فلوی
//      build-android.yml روی شاخه‌ی main دیسپچ می‌شود.
//   4) وقتی ورک‌فلو تمام شد، خودش Release عمومی می‌سازد و همان ردیف را
//      (بر اساس version_code) به is_published=true آپدیت می‌کند
//      (سکرت SUPABASE_SERVICE_ROLE_KEY در GitHub Actions).
//
// سکرت‌های لازم (یک‌بار):
//   supabase secrets set GITHUB_DISPATCH_TOKEN=github_pat_...
//   (اختیاری) GITHUB_REPO=owner/repo   GITHUB_REF=main
//   GitHub → repo Settings → Secrets → Actions: SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy trigger-mobile-build

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, restFetch } from "../_shared/supabaseAdmin.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_DISPATCH_TOKEN") ?? "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "tohid6080/anomaly-app-20260904-v5";
const GITHUB_REF = Deno.env.get("GITHUB_REF") ?? "main";
const WORKFLOW_FILE = Deno.env.get("GITHUB_WORKFLOW_FILE") ?? "build-android.yml";

function nextPatch(version: string): string {
  const m = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return version || "1.0.1";
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims || claims.is_super_admin !== true) {
    return json({ error: "دسترسی غیرمجاز — این عملیات فقط برای Super Admin مجاز است." }, 403);
  }
  const performedBy = String(claims.username || "super_admin");

  if (!GITHUB_TOKEN) {
    return json({ error: "سکرت GITHUB_DISPATCH_TOKEN تنظیم نشده است. لطفاً یک GitHub PAT با دسترسی Actions=write و Contents=write برای این ریپو بسازید و با «supabase secrets set GITHUB_DISPATCH_TOKEN=...» ثبت کنید." }, 400);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* اختیاری */ }
  const releaseNotes = String(body?.releaseNotes || "").trim();

  // ---------- version_code بعدی و رشته‌ی نسخه ----------
  const latest = await restFetch("app_releases?select=version,version_code&order=version_code.desc&limit=1");
  const maxCode = latest.ok && Array.isArray(latest.data) && latest.data.length > 0 ? Number(latest.data[0].version_code) || 0 : 0;
  const versionCode = maxCode + 1;
  const baseVersion = latest.ok && Array.isArray(latest.data) && latest.data.length > 0 ? String(latest.data[0].version || "1.0.0") : "1.0.0";
  const version = String(body?.version || "").trim() || nextPatch(baseVersion);

  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${version}/ihms-${version}.apk`;

  // ---------- درج ردیف «در حال ساخت» ----------
  const insertRes = await restFetch("app_releases", {
    method: "POST",
    body: JSON.stringify([{
      version,
      version_code: versionCode,
      release_notes: releaseNotes,
      apk_url: "",
      apk_path: "",
      download_url: downloadUrl,
      is_published: false,
      published_by: performedBy,
      published_at: null,
    }]),
  });
  if (!insertRes.ok) {
    return json({ error: "خطا در ثبت ردیف نسخه: " + (insertRes.error || insertRes.status) }, 500);
  }

  // ---------- دیسپچ ورک‌فلوی GitHub ----------
  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ihms-trigger-mobile-build",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: GITHUB_REF,
        inputs: {
          version,
          version_code: String(versionCode),
          release_notes: releaseNotes,
          publish_release: "true",
        },
      }),
    },
  );

  if (!ghRes.ok) {
    const text = await ghRes.text().catch(() => "");
    // ردیفِ درج‌شده را حذف کن تا تاریخچه با نسخه‌ی یتیم شلوغ نشود
    await restFetch(`app_releases?version_code=eq.${versionCode}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
    return json({ error: `دیسپچ GitHub ناموفق بود (${ghRes.status}): ${text}` }, 502);
  }

  return json({
    ok: true,
    version,
    versionCode,
    downloadUrl,
    message: "ساخت APK شروع شد. چند دقیقه بعد نسخه به‌صورت خودکار در همین لیست و روی گوشی کاربران منتشر می‌شود.",
  });
});
