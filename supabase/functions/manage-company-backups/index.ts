// supabase/functions/manage-company-backups/index.ts
//
// عملیاتِ کمکیِ Backupها که به service_role یا Storage نیاز دارند — فقط
// SuperAdmin. (فهرست‌کردنِ Backupها مستقیم از جدولِ company_backups با توکنِ
// super_admin در کلاینت انجام می‌شود؛ اینجا فقط کارهایی که کلاینت نمی‌تواند.)
//
// body: { action, ... }
//   - "storage_usage"                     → مصرفِ باکتِ company-backups (کل + هر شرکت)
//   - "sign_download" { backupId }        → لینکِ موقتِ دانلودِ فایلِ zip
//   - "delete"        { backupId }        → حذفِ فایل + سطرِ متادیتا
//   - "trigger"       { companyId }       → ساختِ یک Backup دستیِ جدید
//   - "create_import_upload_url"          → signed upload URL برای گذاشتنِ یک
//                                           فایلِ ZIPِ دانلودشده در
//                                           company-backups/imports/<uuid>.zip
//   - "delete_import" { path }            → حذفِ یک فایلِ importِ موقت
//
// Deploy:
//   supabase functions deploy manage-company-backups --no-verify-jwt

import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, SUPABASE_URL, SERVICE_ROLE_KEY, callRpc, restFetch } from "../_shared/supabaseAdmin.ts";
import { BACKUP_BUCKET } from "../_shared/companyBackup.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims || claims.is_super_admin !== true) return json({ error: "دسترسی غیرمجاز — فقط Super Admin" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body?.action || "");

  try {
    if (action === "storage_usage") {
      const res = await callRpc("get_backup_storage_usage", {});
      if (!res.ok) return json({ error: "خطا در خواندنِ مصرفِ Backup" }, 500);
      return json(res.data ?? {});
    }

    if (action === "sign_download") {
      const backupId = String(body?.backupId || "");
      if (!backupId) return json({ error: "backupId الزامی است" }, 400);
      const meta = await restFetch(`company_backups?id=eq.${backupId}&select=storage_bucket,storage_path,status,company_name`);
      if (!meta.ok || !Array.isArray(meta.data) || meta.data.length === 0) return json({ error: "Backup پیدا نشد" }, 404);
      const row = meta.data[0] as Record<string, any>;
      if (row.status !== "completed") return json({ error: "این Backup هنوز کامل نشده" }, 400);
      const bucket = row.storage_bucket || BACKUP_BUCKET;
      const sign = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${row.storage_path}`, {
        method: "POST",
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      if (!sign.ok) return json({ error: "خطا در ساختِ لینکِ دانلود", detail: await sign.text().catch(() => "") }, 500);
      const { signedURL } = await sign.json();
      return json({ ok: true, url: `${SUPABASE_URL}/storage/v1${signedURL}`, fileName: `backup-${row.company_name}-${backupId}.zip` });
    }

    if (action === "delete") {
      const backupId = String(body?.backupId || "");
      if (!backupId) return json({ error: "backupId الزامی است" }, 400);
      const meta = await restFetch(`company_backups?id=eq.${backupId}&select=storage_bucket,storage_path`);
      if (!meta.ok || !Array.isArray(meta.data) || meta.data.length === 0) return json({ error: "Backup پیدا نشد" }, 404);
      const row = meta.data[0] as Record<string, any>;
      const bucket = row.storage_bucket || BACKUP_BUCKET;
      // فایل را حذف کن (اگر نبود هم اشکالی ندارد)
      await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${row.storage_path}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      }).catch(() => {});
      const del = await restFetch(`company_backups?id=eq.${backupId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (!del.ok) return json({ error: "خطا در حذفِ متادیتا", detail: del.error }, 500);
      return json({ ok: true });
    }

    if (action === "create_import_upload_url") {
      // یک مسیرِ یکتا در همان باکتِ خصوصی؛ کلاینت ZIP را مستقیم آنجا PUT می‌کند
      const path = `imports/${crypto.randomUUID()}.zip`;
      const sign = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BACKUP_BUCKET}/${path}`, {
        method: "POST",
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!sign.ok) return json({ error: "خطا در ساختِ لینکِ آپلود", detail: await sign.text().catch(() => "") }, 500);
      const { url } = await sign.json(); // "/object/upload/sign/<bucket>/<path>?token=..."
      return json({ ok: true, bucket: BACKUP_BUCKET, path, uploadUrl: `${SUPABASE_URL}/storage/v1${url}` });
    }

    if (action === "delete_import") {
      const path = String(body?.path || "");
      // فقط داخلِ imports/ — نه هیچ آبجکتِ دیگری از باکت
      if (!path.startsWith("imports/")) return json({ error: "path نامعتبر" }, 400);
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${path}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      }).catch(() => {});
      return json({ ok: true });
    }

    if (action === "trigger") {
      const companyId = String(body?.companyId || "");
      if (!companyId) return json({ error: "companyId الزامی است" }, 400);
      // به run-company-backup واگذار می‌شود؛ همان توکنِ SuperAdminِ فراخوان را جلو می‌بریم
      const res = await fetch(`${SUPABASE_URL}/functions/v1/run-company-backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
          apikey: SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ companyId, trigger: "manual" }),
      });
      const text = await res.text();
      return new Response(text, { status: res.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    return json({ error: "action نامعتبر" }, 400);
  } catch (e) {
    return json({ error: "خطای داخلی: " + String((e as Error)?.message || e) }, 500);
  }
});
