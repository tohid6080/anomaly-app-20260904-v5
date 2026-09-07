// supabase/functions/_shared/companyBackup.ts
//
// منبع واحدِ حقیقت برای سیستم Backup/Restore شرکت‌ها — بین سه Edge Function
// مشترک است: run-company-backup، restore-company-backup، manage-company-backups.
//
// ⚠️ نگهداری حیاتی: هر جدول جدیدی که ستون company_id بگیرد باید به
// COMPANY_TABLE_ORDER (در جای درستِ ترتیب والد→فرزند) اضافه شود؛ وگرنه آن
// جدول در Backup نمی‌آید و Restore ناقص می‌شود. همین فهرست، معکوسِ
// DELETE_ORDER در supabase/functions/delete-company/index.ts است.

import { SUPABASE_URL, SERVICE_ROLE_KEY, restFetch } from "./supabaseAdmin.ts";

// نسخه‌ی ساختار Backup. با هر تغییرِ ناسازگارِ schema (حذف/تغییر نوع ستون،
// حذف جدول) این را بالا ببرید تا Restoreِ نسخه‌های قدیمی هشدار بدهد.
export const BACKUP_SCHEMA_VERSION = "2026-09-07.1";

export const BACKUP_BUCKET = "company-backups";

// ترتیبِ والد→فرزند برای درج هنگام Restore. برای Purge، معکوس همین.
// «companies» جداست (اول از همه، به‌صورت upsert) و اینجا نمی‌آید.
export const COMPANY_TABLE_ORDER: string[] = [
  // مستقل‌ها / نزدیک به ریشه
  "job_positions",
  "contractors",
  "employer_accounts",
  "anomaly_categories",
  "user_activity",
  "archive_log",
  "chat_matrix_extra_identities",
  "chat_visibility_rules",
  "chat_conversations",
  "hse_climate_campaigns",
  "training_courses",
  "scaffold_tags",
  "machinery",
  "personnel",
  "personnel_audit_log",
  "sbs_sample_size_assignments",
  "sbs_observations",
  "risk_knowledge_base",
  "hcms_risk_matrix",
  "incidents",
  "bowties",
  "anomalies",
  "anomaly_notifications", // فرزندِ anomalies (بدون company_id)
  "tripod_analyses",
  "dbee_weights",
  "bowtie_effectiveness_thresholds",
  "bowtie_consequences",
  "bowtie_threats",
  "tripod_branches",
  "bowtie_barriers",
  "hse_gate_items",
  "proactive_indicator_assessments",
  "hcms_risk_assessments",
  "tripod_branch_preconditions",
  "bowtie_escalation_factors",
  "corrective_actions",
  "anomaly_photos",
  "chat_participants",
  "chat_messages",
  "hse_climate_responses",
  "training_requirements",
  "scaffold_tag_photos",
  "machinery_documents",
  "personnel_notifications",
  "personnel_documents",
  "proactive_indicator_answers",
  "risk_assessment_history",
  "tripod_targets",
  "tripod_status_history",
  "tripod_corrective_actions",
  "tripod_branch_hidden_failures",
  "dbee_source_barrier_map",
  "dbee_score_history",
  "anomaly_barrier_links",
  "bowtie_escalation_controls",
  "permissions",
  "system_announcements",
  "company_subscription_history",
  "company_payments",
  "payments",
];

// نکته: anomaly_notifications ستون company_id ندارد؛ در fetchAllRows از
// طریق anomaly_id (فرزندِ anomalies) واکشی می‌شود.

// ستون‌های حاوی اعتبارنامه که هرگز نباید در Backup ذخیره شوند.
export const SECRET_COLUMNS: Record<string, string[]> = {
  employer_accounts: ["password", "password_hash"],
  contractors: ["password", "password_hash"],
};

// ستون‌هایی که ممکن است URL فایلِ Storage نگه دارند (برای جمع‌آوری فایل‌ها).
// جدول → لیستِ ستون‌ها. ستون‌های jsonb (مثل corrective_actions.attachments)
// به‌صورت متنی برای هر رشته‌ی شبیهِ URL اسکن می‌شوند.
export const FILE_URL_COLUMNS: Record<string, string[]> = {
  anomaly_photos: ["photo"],
  personnel_documents: ["file_data"],
  machinery_documents: ["file_data"],
  scaffold_tag_photos: ["file_data"],
  chat_messages: ["attachment_url"],
  corrective_actions: ["attachments"],
  payments: ["receipt_image"],
  system_announcements: ["image_url", "login_image_url"],
};

const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/";

export function parseStorageUrl(url: unknown): { bucket: string; path: string } | null {
  if (typeof url !== "string") return null;
  const idx = url.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  const rest = url.slice(idx + STORAGE_PUBLIC_MARKER.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  return { bucket: rest.slice(0, slash), path: decodeURIComponent(rest.slice(slash + 1)) };
}

// همه‌ی رشته‌های شبیهِ URLِ Storage را از یک مقدار (رشته یا jsonb) بیرون می‌کشد.
export function collectStorageRefs(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    if (value.includes(STORAGE_PUBLIC_MARKER)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStorageRefs(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStorageRefs(v, out);
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// واکشیِ صفحه‌بندی‌شده‌ی همه‌ی ردیف‌های یک جدول برای یک شرکت.
export async function fetchAllRows(
  table: string,
  companyId: string,
  anomalyIds: string[],
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: Record<string, unknown>[] = [];
  // ساخت فیلتر
  let filter: string;
  if (table === "anomaly_notifications") {
    if (anomalyIds.length === 0) return [];
    filter = `anomaly_id=in.(${anomalyIds.join(",")})`;
  } else {
    filter = `company_id=eq.${companyId}`;
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await restFetch(`${table}?${filter}&select=*&order=id.asc&offset=${from}&limit=${pageSize}`, {
      headers: { Prefer: "count=none" },
    });
    if (!res.ok) {
      // بعضی جدول‌ها ممکن است ستون id مرتب‌شونده نداشته باشند؛ بدون order دوباره امتحان کن
      const res2 = await restFetch(`${table}?${filter}&select=*&offset=${from}&limit=${pageSize}`);
      if (!res2.ok) throw new Error(`fetch ${table} failed: ${res2.error || res2.status}`);
      const batch2 = (res2.data as Record<string, unknown>[]) || [];
      rows.push(...batch2);
      if (batch2.length < pageSize) break;
      from += pageSize;
      continue;
    }
    const batch = (res.data as Record<string, unknown>[]) || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function stripSecrets(table: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const cols = SECRET_COLUMNS[table];
  if (!cols) return rows;
  return rows.map((r) => {
    const c = { ...r };
    for (const col of cols) delete c[col];
    return c;
  });
}

export interface BuiltBackup {
  bundle: { schemaVersion: string; companyId: string; companyName: string; createdAt: string; tables: Record<string, Record<string, unknown>[]> };
  fileList: { bucket: string; path: string }[];
  fileBytes: Record<string, Uint8Array>; // "bucket/path" -> bytes
  rowCount: number;
}

// همه‌ی داده‌ها و فایل‌های یک شرکت را جمع می‌کند (بدون ساختِ zip — آن کارِ
// فراخوان است). هم run-company-backup و هم Backupِ ایمنیِ pre_restore از این
// استفاده می‌کنند.
export async function buildCompanyBackup(companyId: string): Promise<BuiltBackup> {
  const companyRes = await restFetch(`companies?id=eq.${companyId}&select=*`);
  if (!companyRes.ok || !Array.isArray(companyRes.data) || companyRes.data.length === 0) {
    throw new Error("company not found");
  }
  const companyRow = companyRes.data[0] as Record<string, unknown>;

  const tables: Record<string, Record<string, unknown>[]> = { companies: [companyRow] };
  let rowCount = 1;

  // anomalies را اول لازم داریم تا anomaly_notifications قابل واکشی باشد
  let anomalyIds: string[] = [];

  for (const table of COMPANY_TABLE_ORDER) {
    let rows = await fetchAllRows(table, companyId, anomalyIds);
    if (table === "anomalies") anomalyIds = rows.map((r) => String(r.id));
    rows = stripSecrets(table, rows);
    tables[table] = rows;
    rowCount += rows.length;
  }

  // جمع‌آوری فایل‌ها
  const refs = new Set<string>();
  for (const [table, cols] of Object.entries(FILE_URL_COLUMNS)) {
    const rows = tables[table] || [];
    for (const row of rows) {
      for (const col of cols) collectStorageRefs(row[col], refs);
    }
  }

  const fileList: { bucket: string; path: string }[] = [];
  const fileBytes: Record<string, Uint8Array> = {};
  for (const url of refs) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    const key = `${parsed.bucket}/${parsed.path}`;
    if (fileBytes[key]) continue;
    const dl = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${parsed.bucket}/${encodeURI(parsed.path)}`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    );
    if (!dl.ok) continue; // فایلِ گم‌شده در Storage — در manifest به‌عنوان missing ثبت می‌شود
    const buf = new Uint8Array(await dl.arrayBuffer());
    fileBytes[key] = buf;
    fileList.push({ bucket: parsed.bucket, path: parsed.path });
  }

  return {
    bundle: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      companyId,
      companyName: String(companyRow.name || ""),
      createdAt: new Date().toISOString(),
      tables,
    },
    fileList,
    fileBytes,
    rowCount,
  };
}

// افزودن هدرِ احرازِ Backup — یا JWT سوپرادمین، یا سکرتِ کرون.
export function isCronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("BACKUP_CRON_SECRET") || "";
  if (!secret) return false;
  const provided = req.headers.get("x-cron-secret") || "";
  return provided.length > 0 && provided === secret;
}

// -----------------------------------------------------------------------------
// ساختِ کاملِ یک Backup: جمع‌آوری داده/فایل‌ها → zip → آپلود به باکت →
// ثبت/به‌روزرسانیِ سطرِ company_backups. هم run-company-backup و هم مرحله‌ی
// Backupِ ایمنیِ restore-company-backup از این استفاده می‌کنند تا فقط یک
// پیاده‌سازی وجود داشته باشد.
// -----------------------------------------------------------------------------
export interface CreateBackupOptions {
  companyId: string;
  trigger: "manual" | "scheduled" | "pre_restore";
  createdBy: string;
  backupId?: string; // اگر از قبل سطر pending ساخته شده (مسیر cron)
  // JSZip از فراخوان تزریق می‌شود تا این ماژول به npm وابسته نباشد
  makeZip: () => {
    file: (name: string, data: string | Uint8Array) => void;
    generateAsync: (opts: unknown) => Promise<Uint8Array>;
  };
}

export interface CreateBackupResult {
  ok: boolean;
  backupId: string;
  sizeBytes?: number;
  checksum?: string;
  totalRows?: number;
  totalFiles?: number;
  error?: string;
}

async function patchBackupRow(id: string, patch: Record<string, unknown>) {
  await restFetch(`company_backups?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: { Prefer: "return=minimal" },
  }).catch(() => {});
}

export async function createAndStoreBackup(opts: CreateBackupOptions): Promise<CreateBackupResult> {
  const { companyId, trigger, createdBy, makeZip } = opts;

  const companyRes = await restFetch(`companies?id=eq.${companyId}&select=id,name`);
  if (!companyRes.ok || !Array.isArray(companyRes.data) || companyRes.data.length === 0) {
    return { ok: false, backupId: opts.backupId || "", error: "company not found" };
  }
  const companyName = String((companyRes.data[0] as Record<string, unknown>).name || "");

  let backupId = opts.backupId || "";
  if (backupId) {
    await patchBackupRow(backupId, { status: "running", started_at: new Date().toISOString(), error: null });
  } else {
    backupId = crypto.randomUUID();
    const ins = await restFetch("company_backups", {
      method: "POST",
      body: JSON.stringify([{
        id: backupId,
        company_id: companyId,
        company_name: companyName,
        storage_path: `${companyId}/${backupId}.zip`,
        status: "running",
        trigger,
        schema_version: BACKUP_SCHEMA_VERSION,
        created_by: createdBy,
      }]),
      headers: { Prefer: "return=minimal" },
    });
    if (!ins.ok) return { ok: false, backupId, error: `metadata insert: ${ins.error}` };
  }

  try {
    const built = await buildCompanyBackup(companyId);
    const zip = makeZip();

    const tableCounts: Record<string, number> = {};
    for (const [table, rows] of Object.entries(built.bundle.tables)) {
      tableCounts[table] = rows.length;
      zip.file(`data/${table}.json`, JSON.stringify(rows));
    }

    let totalFileBytes = 0;
    const fileEntries: { bucket: string; path: string; bytes: number }[] = [];
    for (const { bucket, path } of built.fileList) {
      const bytes = built.fileBytes[`${bucket}/${path}`];
      if (!bytes) continue;
      zip.file(`files/${bucket}/${path}`, bytes);
      totalFileBytes += bytes.byteLength;
      fileEntries.push({ bucket, path, bytes: bytes.byteLength });
    }

    const manifest = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      companyId,
      companyName: built.bundle.companyName,
      createdAt: built.bundle.createdAt,
      trigger,
      tables: tableCounts,
      files: fileEntries,
      totalRows: built.rowCount,
      totalFiles: fileEntries.length,
      totalFileBytes,
      redactedColumns: SECRET_COLUMNS,
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const checksum = await sha256Hex(zipBytes);

    const up = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BACKUP_BUCKET}/${companyId}/${backupId}.zip`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/zip",
          "x-upsert": "true",
        },
        body: zipBytes,
      },
    );
    if (!up.ok) {
      const detail = await up.text().catch(() => "");
      await patchBackupRow(backupId, { status: "failed", error: `upload: ${detail || up.status}`, completed_at: new Date().toISOString() });
      return { ok: false, backupId, error: `upload: ${detail || up.status}` };
    }

    await patchBackupRow(backupId, {
      status: "completed",
      size_bytes: zipBytes.byteLength,
      checksum,
      manifest,
      table_count: Object.keys(tableCounts).length,
      row_count: built.rowCount,
      file_count: fileEntries.length,
      completed_at: new Date().toISOString(),
      error: null,
    });

    if (trigger !== "pre_restore") {
      await restFetch(`companies?id=eq.${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ backup_last_run_at: new Date().toISOString() }),
        headers: { Prefer: "return=minimal" },
      }).catch(() => {});
    }

    return { ok: true, backupId, sizeBytes: zipBytes.byteLength, checksum, totalRows: built.rowCount, totalFiles: fileEntries.length };
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    await patchBackupRow(backupId, { status: "failed", error: msg, completed_at: new Date().toISOString() });
    return { ok: false, backupId, error: msg };
  }
}
