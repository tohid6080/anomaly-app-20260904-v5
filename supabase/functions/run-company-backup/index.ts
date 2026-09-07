// supabase/functions/run-company-backup/index.ts
//
// یک Backup کاملِ یک شرکت می‌سازد: همه‌ی ردیف‌های همه‌ی جداولِ company-scoped
// + فایل‌های Storageِ مرتبط، به‌صورت یک فایلِ zip در باکتِ خصوصیِ
// company-backups، به‌همراه manifest (نسخه‌ی schema، شمارشِ ردیف‌ها، فهرست و
// checksum فایل‌ها). متادیتا در جدولِ public.company_backups ثبت می‌شود.
//
// فراخوان:
//   - دستی از UIِ SuperAdmin  → هدر Authorization: Bearer <super-admin JWT>
//   - Job روزانه‌ی pg_cron     → هدر x-cron-secret: <BACKUP_CRON_SECRET>
//
// body: { backupId?, companyId, trigger?, includeModules?: string[] }
//   includeModules → فقط همان ماژول‌ها Backup می‌شوند (partial backup).
//
// Deploy:
//   supabase functions deploy run-company-backup --no-verify-jwt

import JSZip from "npm:jszip@3.10.1";
import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS } from "../_shared/supabaseAdmin.ts";
import { createAndStoreBackup, isCronAuthorized } from "../_shared/companyBackup.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  const isSuper = !!claims && claims.is_super_admin === true;
  if (!isSuper && !isCronAuthorized(req)) return json({ error: "دسترسی غیرمجاز" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const companyId = String(body?.companyId || "");
  const trigger = ["manual", "scheduled", "pre_restore"].includes(body?.trigger) ? body.trigger : "manual";
  const includeModules = Array.isArray(body?.includeModules)
    ? body.includeModules.filter((x: unknown) => typeof x === "string") : undefined;
  if (!companyId) return json({ error: "companyId الزامی است" }, 400);

  const result = await createAndStoreBackup({
    companyId,
    trigger,
    createdBy: claims?.username || (isSuper ? "super_admin" : "cron"),
    backupId: body?.backupId ? String(body.backupId) : undefined,
    includeModules,
    makeZip: () => new JSZip() as any,
  });

  if (!result.ok) return json({ error: "خطا در ساخت Backup: " + result.error, backupId: result.backupId }, 500);
  return json({
    ok: true,
    backupId: result.backupId,
    companyId,
    sizeBytes: result.sizeBytes,
    checksum: result.checksum,
    totalRows: result.totalRows,
    totalFiles: result.totalFiles,
    trigger,
  });
});
