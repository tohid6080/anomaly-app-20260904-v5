// supabase/functions/restore-company-backup/index.ts
//
// یک Backup را Restore می‌کند — با حفظِ PKها، روابطِ FK و فایل‌ها.
//
// منبعِ Backup یکی از این دو:
//   • { backupId }   → یک نسخه‌ی موجود در باکتِ company-backups (سطرِ company_backups)
//   • { importPath } → یک فایلِ ZIPِ دانلودشده که کلاینت به
//                      company-backups/imports/<uuid>.zip آپلود کرده
//                      (سناریو: شرکت کاملاً حذف شده و فقط فایلِ ZIP در دست است)
//
// mode:
//   • "validate" → فقط اعتبارسنجی + Preview. هیچ تغییری اعمال نمی‌شود.
//   • "auto"     → Restore. اگر شرکت داده‌ی فعال داشته باشد { needsConfirmation:true }.
//   • "replace"  → اول Backupِ ایمنیِ pre_restore، بعد Purge (معکوسِ FK) + جایگزینی.
//
// Import بین‌شرکتی (پکیجِ مشترک در شرکتِ دیگر):
//   body: { importPath|backupId, targetCompanyId, modules: string[], mode? }
//   وقتی targetCompanyId با شرکتِ صاحبِ ZIP فرق دارد → فقط ماژول‌های مرجعِ
//   انتخاب‌شده (BowTie / بانک دانش ریسک / ماتریس HCMS / دسته‌بندی آنومالی /
//   دوره‌های آموزشی) به‌صورتِ نسخه‌ی مستقلِ جدید (PK نو، FK بازنگاشت) به شرکتِ
//   مقصد اضافه می‌شوند — additive، بدون Purge.
//
// درجِ داده اتمیک است (RPC restore_company_from_bundle). فایل‌ها بعد از
// موفقیتِ DB دوباره آپلود می‌شوند؛ خطای هر فایل در گزارش می‌آید.
//
// فقط SuperAdmin.
// Deploy: supabase functions deploy restore-company-backup --no-verify-jwt

import JSZip from "npm:jszip@3.10.1";
import { getCallerClaims } from "../_shared/jwtUtils.ts";
import { json, CORS_HEADERS, SUPABASE_URL, SERVICE_ROLE_KEY, restFetch } from "../_shared/supabaseAdmin.ts";
import {
  BACKUP_BUCKET,
  BACKUP_SCHEMA_VERSION,
  COMPANY_TABLE_ORDER,
  SHAREABLE_MODULE_KEYS,
  createAndStoreBackup,
  importSharedModules,
  sha256Hex,
} from "../_shared/companyBackup.ts";

// چند ردیفِ نمونه از یک ماژولِ مشترک در bundle، برای Preview
const SHAREABLE_COUNT_TABLE: Record<string, string> = {
  bowtie: "bowties",
  riskKnowledge: "risk_knowledge_base",
  hcmsMatrix: "hcms_risk_matrix",
  anomalyCategories: "anomaly_categories",
  trainingCourses: "training_courses",
};

const PROBE_TABLES = ["employer_accounts", "job_positions", "personnel", "anomalies", "bowties", "machinery", "scaffold_tags", "incidents"];

async function companyHasData(companyId: string): Promise<Record<string, boolean>> {
  const present: Record<string, boolean> = {};
  for (const t of PROBE_TABLES) {
    const res = await restFetch(`${t}?company_id=eq.${companyId}&select=id&limit=1`);
    if (res.ok && Array.isArray(res.data) && res.data.length > 0) present[t] = true;
  }
  return present;
}

async function deleteImport(path: string) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${path}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const claims = await getCallerClaims(req);
  if (!claims || claims.is_super_admin !== true) return json({ error: "دسترسی غیرمجاز — فقط Super Admin" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const backupId = String(body?.backupId || "");
  const importPath = String(body?.importPath || "");
  const mode = body?.mode === "replace" ? "replace" : body?.mode === "validate" ? "validate" : "auto";

  // ---------- تعیینِ منبع ----------
  let bucket = BACKUP_BUCKET;
  let objectPath = "";
  let expectedChecksum: string | null = null;
  let sourceLabel = "";
  const isImport = !backupId && !!importPath;

  if (backupId) {
    const metaRes = await restFetch(`company_backups?id=eq.${backupId}&select=*`);
    if (!metaRes.ok || !Array.isArray(metaRes.data) || metaRes.data.length === 0) return json({ error: "Backup پیدا نشد" }, 404);
    const meta = metaRes.data[0] as Record<string, any>;
    if (meta.status !== "completed") return json({ error: `این Backup قابلِ Restore نیست (وضعیت: ${meta.status})` }, 400);
    bucket = meta.storage_bucket || BACKUP_BUCKET;
    objectPath = meta.storage_path;
    expectedChecksum = meta.checksum || null;
    sourceLabel = `backup:${backupId}`;
  } else if (importPath) {
    if (!importPath.startsWith("imports/")) return json({ error: "importPath نامعتبر" }, 400);
    objectPath = importPath;
    sourceLabel = `import:${importPath}`;
  } else {
    return json({ error: "backupId یا importPath الزامی است" }, 400);
  }

  // ---------- دانلود و بازکردنِ zip ----------
  let zip: JSZip;
  let zipChecksum = "";
  try {
    const dl = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (!dl.ok) return json({ error: "فایلِ Backup در Storage یافت نشد", detail: dl.status }, 404);
    const zipBytes = new Uint8Array(await dl.arrayBuffer());
    zipChecksum = await sha256Hex(zipBytes);
    if (expectedChecksum && zipChecksum !== expectedChecksum) {
      return json({ error: "checksum فایلِ Backup نمی‌خوانَد — فایل خراب است. Restore متوقف شد." }, 409);
    }
    zip = await JSZip.loadAsync(zipBytes);
  } catch (e) {
    return json({ error: "خطا در بازکردنِ فایلِ ZIP: " + String((e as Error)?.message || e) }, 400);
  }

  // ---------- Manifest + data ----------
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: any = null;
  try {
    const mf = zip.file("manifest.json");
    if (mf) manifest = JSON.parse(await mf.async("string"));
  } catch { /* پایین به‌عنوان خطا ثبت می‌شود */ }
  if (!manifest || typeof manifest !== "object") errors.push("manifest.json موجود/معتبر نیست");
  if (manifest && !manifest.schemaVersion) errors.push("manifest فاقدِ schemaVersion است");
  if (manifest && !manifest.companyId) errors.push("manifest فاقدِ companyId است");

  const bundle: Record<string, unknown[]> = {};
  const dataFiles = Object.keys(zip.files).filter((n) => n.startsWith("data/") && n.endsWith(".json") && !zip.files[n].dir);
  let dataRows = 0;
  for (const name of dataFiles) {
    const table = name.slice("data/".length, -".json".length);
    try {
      const arr = JSON.parse(await zip.files[name].async("string"));
      bundle[table] = Array.isArray(arr) ? arr : [];
      dataRows += bundle[table].length;
    } catch (e) {
      errors.push(`data/${table}.json خراب است: ${String((e as Error)?.message || e)}`);
    }
  }
  if (!Array.isArray(bundle.companies) || bundle.companies.length === 0) {
    errors.push("data/companies.json موجود نیست یا خالی است");
  }

  const fileEntries = Object.keys(zip.files).filter((n) => n.startsWith("files/") && !zip.files[n].dir);

  const schemaVersionMatch = !!manifest && manifest.schemaVersion === BACKUP_SCHEMA_VERSION;
  if (manifest && !schemaVersionMatch) {
    warnings.push(`نسخه‌ی schema این فایل (${manifest.schemaVersion}) با نسخه‌ی فعلی (${BACKUP_SCHEMA_VERSION}) فرق دارد`);
  }
  const manifestCompanyId = manifest?.companyId ? String(manifest.companyId) : "";
  const bundleCompanyId = Array.isArray(bundle.companies) && bundle.companies[0]
    ? String((bundle.companies[0] as any).id) : "";
  if (manifestCompanyId && bundleCompanyId && manifestCompanyId !== bundleCompanyId) {
    errors.push("companyId در manifest با ردیفِ companies نمی‌خوانَد");
  }
  if (manifest && typeof manifest.totalRows === "number" && manifest.totalRows !== dataRows) {
    warnings.push(`شمارشِ ردیف‌ها (${dataRows}) با manifest (${manifest.totalRows}) فرق دارد`);
  }
  if (manifest && typeof manifest.totalFiles === "number" && manifest.totalFiles !== fileEntries.length) {
    warnings.push(`شمارشِ فایل‌ها (${fileEntries.length}) با manifest (${manifest.totalFiles}) فرق دارد`);
  }

  const valid = errors.length === 0;
  const companyId = manifestCompanyId || bundleCompanyId;

  // =========================================================================
  // Import بین‌شرکتی: هدفِ متفاوت از شرکتِ صاحبِ ZIP + انتخابِ ماژول‌های مشترک.
  // نسخه‌ی مستقلِ جدید (PK نو، FK بازنگاشت) — additive، بدون Purge.
  // =========================================================================
  const targetCompanyId = String(body?.targetCompanyId || "");
  const reqModules: string[] = Array.isArray(body?.modules)
    ? body.modules.filter((m: unknown) => typeof m === "string") : [];

  if (targetCompanyId && targetCompanyId !== companyId) {
    const mods = reqModules.filter((m) => (SHAREABLE_MODULE_KEYS as readonly string[]).includes(m));
    if (!valid) return json({ error: "فایلِ Backup نامعتبر است.", errors, warnings }, 422);
    if (mods.length === 0) {
      return json({ error: "برای Import بین‌شرکتی حداقل یک ماژولِ مشترک انتخاب کن.", shareableModules: SHAREABLE_MODULE_KEYS }, 400);
    }
    const tRes = await restFetch(`companies?id=eq.${targetCompanyId}&select=id,name`);
    if (!tRes.ok || !Array.isArray(tRes.data) || tRes.data.length === 0) {
      return json({ error: "شرکتِ مقصد پیدا نشد" }, 404);
    }
    const tName = tRes.data[0].name;
    const moduleCounts: Record<string, number> = {};
    for (const m of mods) moduleCounts[m] = ((bundle[SHAREABLE_COUNT_TABLE[m]] as unknown[]) || []).length;

    if (mode === "validate") {
      return json({
        ok: true,
        crossCompany: true,
        source: sourceLabel,
        zipChecksum,
        valid: true,
        warnings,
        sourceCompany: { id: companyId, name: manifest?.companyName || bundleCompanyId },
        target: { companyId: targetCompanyId, companyName: tName },
        modules: mods,
        moduleCounts,
        mode: "shared-import (additive, new copies)",
      });
    }

    const imp = await importSharedModules(bundle as Record<string, Record<string, unknown>[]>, targetCompanyId, mods);
    const report: Record<string, unknown> = {
      mode: "shared-import",
      source: sourceLabel,
      sourceCompany: { id: companyId, name: manifest?.companyName },
      target: { companyId: targetCompanyId, companyName: tName },
      modules: mods,
      perModule: imp.perModule,
      total: imp.total,
      completedAt: new Date().toISOString(),
    };
    if (!imp.ok) {
      return json({ error: "Import بین‌شرکتی ناتمام ماند: " + imp.error, report }, 500);
    }
    await restFetch("admin_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        action: "import_shared_modules",
        target_type: "company",
        target_id: targetCompanyId,
        target_username: tName,
        performed_by: claims.username || "super_admin",
        performed_by_role: "super_admin",
        note: `Import از ${sourceLabel} → ماژول‌ها [${mods.join(", ")}]، ${imp.total} ردیف`,
      }]),
    }).catch(() => {});
    if (isImport) await deleteImport(importPath);
    return json({ ok: true, report });
  }

  // ---------- وضعیتِ شرکتِ مقصد ----------
  let companyExists = false;
  let targetName = "";
  let currentData: Record<string, boolean> = {};
  if (companyId) {
    const compRes = await restFetch(`companies?id=eq.${companyId}&select=id,name`);
    companyExists = compRes.ok && Array.isArray(compRes.data) && compRes.data.length > 0;
    if (companyExists) {
      targetName = compRes.data[0].name;
      currentData = await companyHasData(companyId);
    }
  }
  const hasData = Object.keys(currentData).length > 0;
  const willReplace = companyExists && hasData;

  const preview = {
    source: sourceLabel,
    zipChecksum,
    valid,
    errors,
    warnings,
    schemaVersionMatch,
    manifest: manifest ? {
      schemaVersion: manifest.schemaVersion,
      companyId: manifest.companyId,
      companyName: manifest.companyName,
      createdAt: manifest.createdAt,
      trigger: manifest.trigger,
      totalRows: manifest.totalRows,
      totalFiles: manifest.totalFiles,
      totalFileBytes: manifest.totalFileBytes,
      tables: manifest.tables,
    } : null,
    computed: {
      dataTables: dataFiles.length,
      dataRows,
      fileEntries: fileEntries.length,
      tablesWithRows: Object.entries(bundle).filter(([, v]) => (v as unknown[]).length > 0).length,
    },
    target: {
      companyId,
      companyExists,
      companyName: targetName || manifest?.companyName || bundleCompanyId,
      hasData,
      currentData,
    },
    willReplace,
  };

  // ---------- فقط Preview ----------
  if (mode === "validate") {
    return json({ ok: true, ...preview });
  }

  // ---------- از اینجا به بعد: Restore ----------
  if (!valid) {
    return json({ error: "فایلِ Backup نامعتبر است — Restore انجام نشد.", errors, warnings }, 422);
  }
  if (!companyId) {
    return json({ error: "companyId قابلِ تشخیص نیست", errors }, 422);
  }

  if (companyExists && hasData && mode !== "replace") {
    return json({
      needsConfirmation: true,
      reason: "company_has_data",
      companyId,
      companyName: targetName,
      currentData,
      backupId: backupId || undefined,
      importPath: importPath || undefined,
      message: "شرکت داده‌ی فعال دارد. برای جایگزینی، Restore را با mode=\"replace\" و تأییدِ نام شرکت اجرا کنید.",
    });
  }

  const replace = mode === "replace" && companyExists;
  const report: Record<string, unknown> = {
    source: sourceLabel,
    companyId,
    companyName: manifest?.companyName || (bundle.companies[0] as any)?.name || targetName,
    startedAt: new Date().toISOString(),
    mode: replace ? "replace" : (companyExists ? "restore-into-empty" : "create"),
    schemaVersionMismatch: !schemaVersionMatch,
    warnings,
  };

  // ---------- Backupِ ایمنیِ pre_restore (قبل از هر Replace) ----------
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
    body: JSON.stringify({ p_company_id: companyId, p_order: COMPANY_TABLE_ORDER, p_bundle: bundle, p_replace: replace }),
  });
  const rpcText = await rpc.text();
  if (!rpc.ok) {
    return json({ error: "درجِ داده‌ها ناموفق بود — تراکنش Rollback شد، هیچ داده‌ای تغییر نکرد.", detail: rpcText, report }, 500);
  }
  const dbResult = rpcText ? JSON.parse(rpcText) : null;
  report.dbResult = dbResult;

  if (dbResult && dbResult.ok === false && dbResult.status === "replace_required") {
    return json({
      needsConfirmation: true,
      reason: "company_has_data",
      companyId,
      companyName: targetName || report.companyName,
      currentData,
      backupId: backupId || undefined,
      importPath: importPath || undefined,
      message: "شرکت داده‌ی فعال دارد. برای جایگزینی، mode=\"replace\" لازم است.",
    });
  }
  if (dbResult && dbResult.ok === false) {
    return json({ error: "Restore انجام نشد.", detail: dbResult, report }, 500);
  }

  // ---------- بازآپلودِ فایل‌ها ----------
  let filesRestored = 0;
  const fileFailures: { path: string; error: string }[] = [];
  for (const name of fileEntries) {
    const rest = name.slice("files/".length);
    const slash = rest.indexOf("/");
    if (slash === -1) continue;
    const b = rest.slice(0, slash);
    const p = rest.slice(slash + 1);
    try {
      const bytes = await zip.files[name].async("uint8array");
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${b}/${encodeURI(p)}`, {
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
      else fileFailures.push({ path: `${b}/${p}`, error: `${up.status} ${await up.text().catch(() => "")}` });
    } catch (e) {
      fileFailures.push({ path: `${b}/${p}`, error: String((e as Error)?.message || e) });
    }
  }

  const pwResetUsernames = [
    ...((bundle.employer_accounts as any[]) || []).map((r) => r.username),
    ...((bundle.contractors as any[]) || []).map((r) => r.username),
  ].filter(Boolean);

  report.completedAt = new Date().toISOString();
  report.filesInBackup = fileEntries.length;
  report.filesRestored = filesRestored;
  report.fileFailures = fileFailures;
  report.passwordResetNeeded = pwResetUsernames;

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
      note: `Restore از ${sourceLabel} — حالت ${report.mode}، ${(dbResult as any)?.totalRows ?? "?"} ردیف، ${filesRestored}/${fileEntries.length} فایل` +
            (replace ? `، safetyBackup ${report.safetyBackupId}` : ""),
    }]),
  }).catch(() => {});

  // فایلِ importِ موقت پس از Restoreِ موفق پاک می‌شود
  if (isImport) await deleteImport(importPath);

  return json({ ok: true, report });
});
