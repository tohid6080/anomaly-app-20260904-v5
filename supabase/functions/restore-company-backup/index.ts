// supabase/functions/restore-company-backup/index.ts
//
// یک Backup را Restore می‌کند — با حفظِ PKها، روابطِ FK و فایل‌ها.
//
// منطق:
//   1) سطرِ company_backups و فایلِ zip خوانده و checksum بررسی می‌شود.
//   2) وضعیتِ شرکتِ مقصد بررسی می‌شود:
//        - شرکت وجود ندارد → Company و همه‌ی داده‌ها/فایل‌ها ساخته می‌شوند.
//        - شرکت هست ولی داده ندارد → داده‌ها داخل همان شرکت Restore می‌شوند.
//        - شرکت هست و داده دارد و mode != "replace" → بدون هیچ تغییری
//          { needsConfirmation: true } برمی‌گردد.
//   3) در mode="replace": اول یک Backupِ ایمنیِ pre_restore از وضعیتِ فعلی
//      گرفته می‌شود، بعد داده‌ی فعلی پاک و Backup جایگزین می‌شود.
//   4) درجِ داده‌ها اتمیک است (RPC restore_company_from_bundle، یک تراکنش).
//      فایل‌ها بعد از موفقیتِ DB دوباره آپلود می‌شوند؛ خطای هر فایل در گزارش
//      می‌آید ولی کلِ Restore را متوقف نمی‌کند.
//
// فقط SuperAdmin.  body: { backupId: uuid, mode?: "auto" | "replace" }
//
// Deploy:
//   supabase functions deploy restore-company-backup

import JSZip from "npm:jszip@3.10.1";
import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, SUPABASE_URL, SERVICE_ROLE_KEY, restFetch } from "../_shared/supabaseAdmin.ts";
import {
  BACKUP_BUCKET,
  BACKUP_SCHEMA_VERSION,
  COMPANY_TABLE_ORDER,
  createAndStoreBackup,
  sha256Hex,
} from "../_shared/companyBackup.ts";

// جداولِ نماینده برای تشخیصِ «شرکت داده‌ی فعال دارد یا نه»
const PROBE_TABLES = ["employer_accounts", "job_positions", "personnel", "anomalies", "bowties", "machinery", "scaffold_tags", "incidents"];

async function companyHasData(companyId: string): Promise<Record<string, boolean>> {
  const present: Record<string, boolean> = {};
  for (const t of PROBE_TABLES) {
    const res = await restFetch(`${t}?company_id=eq.${companyId}&select=id&limit=1`);
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) present[t] = true;
  }
  return present;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims || claims.is_super_admin !== true) return json({ error: "دسترسی غیرمجاز — فقط Super Admin" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const backupId = String(body?.backupId || "");
  const mode = body?.mode === "replace" ? "replace" : "auto";
  if (!backupId) return json({ error: "backupId الزامی است" }, 400);

  // ---------- سطرِ متادیتا ----------
  const metaRes = await restFetch(`company_backups?id=eq.${backupId}&select=*`);
  if (!metaRes.ok || !Array.isArray(metaRes.data) || metaRes.data.length === 0) {
    return json({ error: "Backup پیدا نشد" }, 404);
  }
  const meta = metaRes.data[0] as Record<string, any>;
  if (meta.status !== "completed") return json({ error: `این Backup قابلِ Restore نیست (وضعیت: ${meta.status})` }, 400);
  const companyId = String(meta.company_id);

  // ---------- دانلود و بازکردنِ zip ----------
  let zip: JSZip;
  let zipBytes: Uint8Array;
  try {
    const dl = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${meta.storage_bucket || BACKUP_BUCKET}/${meta.storage_path}`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    );
    if (!dl.ok) return json({ error: "فایلِ Backup در Storage یافت نشد", detail: dl.status }, 404);
    zipBytes = new Uint8Array(await dl.arrayBuffer());
    if (meta.checksum) {
      const actual = await sha256Hex(zipBytes);
      if (actual !== meta.checksum) {
        return json({ error: "checksum فایلِ Backup نمی‌خوانَد — فایل خراب است. Restore متوقف شد." }, 409);
      }
    }
    zip = await JSZip.loadAsync(zipBytes);
  } catch (e) {
    return json({ error: "خطا در بازکردنِ Backup: " + String((e as Error)?.message || e) }, 500);
  }

  // ---------- خواندنِ manifest و data ----------
  let manifest: any = {};
  try {
    const mf = zip.file("manifest.json");
    if (mf) manifest = JSON.parse(await mf.async("string"));
  } catch { /* manifest اختیاری برای ادامه */ }
  const schemaMismatch = manifest?.schemaVersion && manifest.schemaVersion !== BACKUP_SCHEMA_VERSION;

  const bundle: Record<string, unknown[]> = {};
  const dataFiles = Object.keys(zip.files).filter((n) => n.startsWith("data/") && n.endsWith(".json"));
  for (const name of dataFiles) {
    const table = name.slice("data/".length, -".json".length);
    try {
      bundle[table] = JSON.parse(await zip.files[name].async("string"));
    } catch (e) {
      return json({ error: `خطا در خواندنِ data/${table}.json: ${String((e as Error)?.message || e)}` }, 500);
    }
  }
  if (!bundle.companies || !Array.isArray(bundle.companies) || bundle.companies.length === 0) {
    return json({ error: "Backup ناقص است — ردیفِ companies ندارد" }, 422);
  }

  // ---------- وضعیتِ شرکتِ مقصد ----------
  const compRes = await restFetch(`companies?id=eq.${companyId}&select=id,name`);
  const companyExists = compRes.ok && Array.isArray(compRes.data) && compRes.data.length > 0;
  let currentData: Record<string, boolean> = {};
  if (companyExists) currentData = await companyHasData(companyId);
  const hasData = Object.keys(currentData).length > 0;

  if (companyExists && hasData && mode !== "replace") {
    return json({
      needsConfirmation: true,
      reason: "company_has_data",
      companyId,
      companyName: compRes.data[0].name,
      currentData,
      backupId,
      message: "شرکت داده‌ی فعال دارد. برای جایگزینی، Restore را با mode=\"replace\" و تأییدِ نام شرکت اجرا کنید.",
    });
  }

  const replace = companyExists && hasData; // در این نقطه یعنی mode==="replace"
  const report: Record<string, unknown> = {
    backupId, companyId,
    companyName: manifest?.companyName || bundle.companies[0]?.["name"],
    startedAt: new Date().toISOString(),
    mode: replace ? "replace" : (companyExists ? "restore-into-empty" : "create"),
    schemaVersionMismatch: !!schemaMismatch,
  };

  // ---------- Backupِ ایمنیِ pre_restore (فقط در حالتِ replace) ----------
  if (replace) {
    const safety = await createAndStoreBackup({
      companyId,
      trigger: "pre_restore",
      createdBy: `${claims.username || "super_admin"} (pre-restore)`,
      makeZip: () => new JSZip() as any,
    });
    if (!safety.ok) {
      return json({ error: "Backupِ ایمنیِ قبل از Replace ناموفق بود — Restore متوقف شد.", detail: safety.error }, 500);
    }
    report.safetyBackupId = safety.backupId;
  }

  // ---------- درجِ اتمیکِ داده‌ها ----------
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/restore_company_from_bundle`, {
    method: "POST",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_company_id: companyId,
      p_order: COMPANY_TABLE_ORDER,
      p_bundle: bundle,
      p_replace: replace,
    }),
  });
  const rpcText = await rpc.text();
  if (!rpc.ok) {
    return json({
      error: "درجِ داده‌ها ناموفق بود — تراکنش Rollback شد، هیچ داده‌ای تغییر نکرد.",
      detail: rpcText,
      report,
    }, 500);
  }
  report.dbResult = rpcText ? JSON.parse(rpcText) : null;

  // ---------- بازآپلودِ فایل‌ها ----------
  const fileNames = Object.keys(zip.files).filter((n) => n.startsWith("files/") && !zip.files[n].dir);
  let filesRestored = 0;
  const fileFailures: { path: string; error: string }[] = [];
  for (const name of fileNames) {
    const rest = name.slice("files/".length); // "<bucket>/<path...>"
    const slash = rest.indexOf("/");
    if (slash === -1) continue;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    try {
      const bytes = await zip.files[name].async("uint8array");
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/octet-stream",
          "x-upsert": "true",
        },
        body: bytes,
      });
      if (up.ok) filesRestored++;
      else fileFailures.push({ path: `${bucket}/${path}`, error: `${up.status} ${await up.text().catch(() => "")}` });
    } catch (e) {
      fileFailures.push({ path: `${bucket}/${path}`, error: String((e as Error)?.message || e) });
    }
  }

  // ---------- اکانت‌هایی که رمزشان در Backup نبوده و نیاز به بازنشانی دارند ----------
  const pwResetUsernames = [
    ...((bundle.employer_accounts as any[]) || []).map((r) => r.username),
    ...((bundle.contractors as any[]) || []).map((r) => r.username),
  ].filter(Boolean);

  report.completedAt = new Date().toISOString();
  report.filesInBackup = fileNames.length;
  report.filesRestored = filesRestored;
  report.fileFailures = fileFailures;
  report.passwordResetNeeded = pwResetUsernames;

  // ---------- ثبت در admin_audit_log ----------
  await restFetch("admin_audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      action: "restore_company_backup",
      target_type: "company",
      target_id: companyId,
      target_username: report.companyName,
      performed_by: claims.username || "super_admin",
      performed_by_role: "super_admin",
      note: `Restore از Backup ${backupId} — حالت ${report.mode}، ${(report.dbResult as any)?.totalRows ?? "?"} ردیف، ${filesRestored}/${fileNames.length} فایل` +
            (replace ? `، safetyBackup ${report.safetyBackupId}` : ""),
    }]),
  }).catch(() => {});

  return json({ ok: true, report });
});
