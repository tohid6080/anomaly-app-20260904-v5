// supabase/functions/_shared/companyBackup.ts
//
// منبع واحدِ حقیقت برای سیستم Backup/Restore شرکت‌ها — بین سه Edge Function
// مشترک است: run-company-backup، restore-company-backup، manage-company-backups.
//
// ⚠️ نگهداری حیاتی: هر جدول جدیدی که ستون company_id بگیرد باید به
// COMPANY_TABLE_ORDER (در جای درستِ ترتیب والد→فرزند) اضافه شود؛ وگرنه آن
// جدول در Backup نمی‌آید و Restore ناقص می‌شود.
//
// حسابرسیِ schema (۲۰۲۶-۰۹): ۶۱ جدولِ دارای ستون company_id + جدولِ
// anomaly_notifications (که company_id ندارد و از طریق FKِ غیرمستقیم
// anomaly_id → anomalies به شرکت وصل است). همه‌ی این ۶۲ جدول اینجا هستند.
//
// جداولی که عمداً بیرون‌اند چون داده‌ی یک شرکتِ خاص نیستند:
//   - admin_audit_log            (لاگ سراسریِ سوپرادمین، بدون company_id)
//   - trial_requests             (پیش از ساختِ شرکت)
//   - app_releases, login_attempts, super_admins
//   - جداولِ مرجعِ سراسری: plans, sbs_ref_*, tripod_ref_*,
//     proactive_indicator_definitions / proactive_indicator_questions
//   - پیکربندیِ سراسریِ سیستم: system_dashboard_config / _widgets /
//     system_module_config / system_notification_types / system_settings
//
// تنها جدولِ «وابستگیِ غیرمستقیم» anomaly_notifications است؛ بقیه‌ی جداولِ
// فرزند همگی ستونِ company_id مستقلِ خودشان را دارند، پس هم Backup و هم
// Purge با فیلترِ مستقیمِ company_id درست کار می‌کند (به‌جز anomaly_notifications
// که هرجا لازم است با نامْ به‌صورت خاص هندل می‌شود).

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
  "company_proactive_settings",
  "anomaly_categories",
  "user_activity",
  "error_reports",
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

// -----------------------------------------------------------------------------
// نگاشتِ ماژول → جدول‌ها. برای «انتخابِ ماژول هنگام گرفتنِ Backup» (partial
// backup). همه‌ی ۶۲ جدولِ COMPANY_TABLE_ORDER اینجا پوشش داده شده‌اند.
// معادلِ کلاینت: BACKUP_MODULES در src/superadmin/superAdminApi.js — هماهنگ بمانند.
// -----------------------------------------------------------------------------
export const MODULE_TABLES: Record<string, string[]> = {
  accounts: ["job_positions", "contractors", "employer_accounts"],
  settings: ["company_proactive_settings", "anomaly_categories", "permissions", "system_announcements", "hse_gate_items"],
  bowtie: ["bowties", "bowtie_threats", "bowtie_consequences", "bowtie_barriers", "bowtie_escalation_factors", "bowtie_escalation_controls", "bowtie_effectiveness_thresholds", "dbee_weights", "dbee_source_barrier_map", "dbee_score_history"],
  riskKnowledge: ["risk_knowledge_base", "risk_assessment_history"],
  hcms: ["hcms_risk_matrix", "hcms_risk_assessments"],
  anomalies: ["anomalies", "anomaly_notifications", "anomaly_photos", "anomaly_barrier_links", "corrective_actions"],
  personnel: ["personnel", "personnel_documents", "personnel_notifications", "personnel_audit_log", "proactive_indicator_assessments", "proactive_indicator_answers"],
  machinery: ["machinery", "machinery_documents"],
  scaffold: ["scaffold_tags", "scaffold_tag_photos"],
  incidents: ["incidents", "tripod_analyses", "tripod_branches", "tripod_branch_preconditions", "tripod_branch_hidden_failures", "tripod_targets", "tripod_status_history", "tripod_corrective_actions"],
  chat: ["chat_conversations", "chat_participants", "chat_messages", "chat_visibility_rules", "chat_matrix_extra_identities"],
  training: ["training_courses", "training_requirements"],
  proactiveExtra: ["hse_climate_campaigns", "hse_climate_responses", "sbs_observations", "sbs_sample_size_assignments"],
  financial: ["payments", "company_payments", "company_subscription_history"],
  logs: ["user_activity", "archive_log", "error_reports"],
};

// از یک لیستِ کلیدِ ماژول، مجموعه‌ی جدول‌ها را می‌سازد. اگر anomalies داخل بود،
// anomaly_notifications هم لازم است (بدون company_id، فرزندِ anomalies).
export function tablesForModules(moduleKeys: string[]): Set<string> {
  const out = new Set<string>();
  for (const k of moduleKeys) for (const t of (MODULE_TABLES[k] || [])) out.add(t);
  if (out.has("anomalies")) out.add("anomaly_notifications");
  return out;
}

// ماژول‌هایی که می‌شود بین شرکت‌ها به‌صورت «نسخه‌ی مستقلِ جدید» import کرد
// (محتوای مرجع/مشترک). حساب‌ها/مالی/لاگ/پرسنل عمداً نیستند.
export const SHAREABLE_MODULE_KEYS = ["bowtie", "riskKnowledge", "hcmsMatrix", "anomalyCategories", "trainingCourses"] as const;

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
  bundle: { schemaVersion: string; companyId: string; companyName: string; createdAt: string; tables: Record<string, Record<string, unknown>[]>; partial: boolean; includedModules: string[] | null };
  fileList: { bucket: string; path: string }[];
  fileBytes: Record<string, Uint8Array>; // "bucket/path" -> bytes
  rowCount: number;
}

// همه‌ی داده‌ها و فایل‌های یک شرکت را جمع می‌کند (بدون ساختِ zip — آن کارِ
// فراخوان است). هم run-company-backup و هم Backupِ ایمنیِ pre_restore از این
// استفاده می‌کنند.
// includeTables: اگر داده شود، فقط همین جداول Backup می‌شوند (partial backup).
// «companies» همیشه هست. اگر anomalies داخل بود، anomaly_notifications هم.
export async function buildCompanyBackup(companyId: string, includeTables?: Set<string>, includedModules?: string[]): Promise<BuiltBackup> {
  const companyRes = await restFetch(`companies?id=eq.${companyId}&select=*`);
  if (!companyRes.ok || !Array.isArray(companyRes.data) || companyRes.data.length === 0) {
    throw new Error("company not found");
  }
  const companyRow = companyRes.data[0] as Record<string, unknown>;

  const tables: Record<string, Record<string, unknown>[]> = { companies: [companyRow] };
  let rowCount = 1;

  const partial = includeTables instanceof Set && includeTables.size > 0;
  const wanted = partial
    ? new Set([...includeTables!, ...(includeTables!.has("anomalies") ? ["anomaly_notifications"] : [])])
    : null;

  // anomalies را اول لازم داریم تا anomaly_notifications قابل واکشی باشد
  let anomalyIds: string[] = [];

  for (const table of COMPANY_TABLE_ORDER) {
    if (wanted && !wanted.has(table)) { tables[table] = []; continue; }
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
      partial: !!partial,
      includedModules: partial ? (includedModules && includedModules.length ? includedModules : [...wanted!]) : null,
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
  includeModules?: string[]; // اگر داده شود، فقط این ماژول‌ها Backup می‌شوند (partial)
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
    const mods = Array.isArray(opts.includeModules) && opts.includeModules.length ? opts.includeModules : null;
    const built = await buildCompanyBackup(companyId, mods ? tablesForModules(mods) : undefined, mods || undefined);
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
      partial: built.bundle.partial,
      includedModules: built.bundle.includedModules,
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

// -----------------------------------------------------------------------------
// Import بین‌شرکتی: ماژول‌های مرجع/مشترک از یک bundleِ Backup را به‌صورتِ
// «نسخه‌ی مستقلِ جدید» (PK نو، company_id مقصد، FK بازنگاشت) در شرکتِ مقصد
// اضافه می‌کند (additive — داده‌ی موجود پاک نمی‌شود). الگو دقیقاً مثل
// copyBowtiesToCompany / copyRiskKnowledgeToCompany در superAdminApi.js.
// -----------------------------------------------------------------------------
type Row = Record<string, unknown>;
const newTextId = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function insertRows(table: string, rows: Row[]): Promise<number> {
  if (!rows.length) return 0;
  const res = await restFetch(table, { method: "POST", body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`insert ${table}: ${res.error || res.status}`);
  return Array.isArray(res.data) ? res.data.length : rows.length;
}

// جدولِ تخت با PK از نوع uuid: id/created_at/updated_at حذف، company_id مقصد.
async function flatCloneUuid(table: string, rows: Row[], targetCompanyId: string): Promise<number> {
  const payload = (rows || []).map((r) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = r as any;
    return { ...rest, company_id: targetCompanyId };
  });
  return insertRows(table, payload);
}

async function cloneBowtieGraph(bundle: Record<string, Row[]>, targetCompanyId: string): Promise<number> {
  const bowties = bundle.bowties || [];
  const T = bundle.bowtie_threats || [];
  const C = bundle.bowtie_consequences || [];
  const B = bundle.bowtie_barriers || [];
  const F = bundle.bowtie_escalation_factors || [];
  const CC = bundle.bowtie_escalation_controls || [];
  const DSM = bundle.dbee_source_barrier_map || [];
  let count = 0;

  for (const bt of bowties) {
    const oldBid = String((bt as any).id);
    const nb = newTextId("bowtie");
    const { id: _i, created_at: _c, updated_at: _u, ...btRest } = bt as any;
    await insertRows("bowties", [{ ...btRest, id: nb, company_id: targetCompanyId }]);

    const tMap: Record<string, string> = {};
    await insertRows("bowtie_threats", T.filter((x) => String((x as any).bowtie_id) === oldBid).map((x) => {
      const ni = newTextId("threat"); tMap[String((x as any).id)] = ni;
      const { id: _i2, created_at: _c2, ...rest } = x as any;
      return { ...rest, id: ni, bowtie_id: nb, company_id: targetCompanyId };
    }));

    const cMap: Record<string, string> = {};
    await insertRows("bowtie_consequences", C.filter((x) => String((x as any).bowtie_id) === oldBid).map((x) => {
      const ni = newTextId("cons"); cMap[String((x as any).id)] = ni;
      const { id: _i3, created_at: _c3, ...rest } = x as any;
      return { ...rest, id: ni, bowtie_id: nb, company_id: targetCompanyId };
    }));

    const bMap: Record<string, string> = {};
    await insertRows("bowtie_barriers", B.filter((x) => String((x as any).bowtie_id) === oldBid).map((x) => {
      const ni = newTextId("barrier"); bMap[String((x as any).id)] = ni;
      const { id: _i4, created_at: _c4, updated_at: _u4, ...rest } = x as any;
      return {
        ...rest, id: ni, bowtie_id: nb, company_id: targetCompanyId,
        threat_id: (x as any).threat_id ? (tMap[String((x as any).threat_id)] || null) : null,
        consequence_id: (x as any).consequence_id ? (cMap[String((x as any).consequence_id)] || null) : null,
        effectiveness_status: "not_assessed", effectiveness_score: null, effectiveness_calculated_at: null,
      };
    }));

    const fMap: Record<string, string> = {};
    await insertRows("bowtie_escalation_factors", F.filter((x) => bMap[String((x as any).barrier_id)]).map((x) => {
      const ni = newTextId("escf"); fMap[String((x as any).id)] = ni;
      const { id: _i5, created_at: _c5, ...rest } = x as any;
      return { ...rest, id: ni, barrier_id: bMap[String((x as any).barrier_id)], company_id: targetCompanyId };
    }));

    await insertRows("bowtie_escalation_controls", CC.filter((x) => fMap[String((x as any).escalation_factor_id)]).map((x) => {
      const { id: _i6, created_at: _c6, ...rest } = x as any;
      return { ...rest, id: newTextId("escc"), escalation_factor_id: fMap[String((x as any).escalation_factor_id)], company_id: targetCompanyId };
    }));

    await insertRows("dbee_source_barrier_map", DSM
      .filter((x) => String((x as any).bowtie_id) === oldBid && bMap[String((x as any).barrier_id)])
      .map((x) => {
        const { id: _i7, created_at: _c7, ...rest } = x as any;
        return { ...rest, id: newTextId("dsm"), bowtie_id: nb, barrier_id: bMap[String((x as any).barrier_id)], company_id: targetCompanyId };
      }));

    count++;
  }
  return count;
}

// bundle: { "<table>": [rows...] } از data/*.json فایلِ ZIP
export async function importSharedModules(
  bundle: Record<string, Row[]>,
  targetCompanyId: string,
  moduleKeys: string[],
): Promise<{ ok: boolean; perModule: Record<string, number>; total: number; error?: string }> {
  const perModule: Record<string, number> = {};
  try {
    for (const key of moduleKeys) {
      if (key === "bowtie") {
        perModule.bowtie = await cloneBowtieGraph(bundle, targetCompanyId);
      } else if (key === "riskKnowledge") {
        perModule.riskKnowledge = await flatCloneUuid("risk_knowledge_base", bundle.risk_knowledge_base || [], targetCompanyId);
      } else if (key === "hcmsMatrix") {
        perModule.hcmsMatrix = await flatCloneUuid("hcms_risk_matrix", bundle.hcms_risk_matrix || [], targetCompanyId);
      } else if (key === "anomalyCategories") {
        perModule.anomalyCategories = await flatCloneUuid("anomaly_categories", bundle.anomaly_categories || [], targetCompanyId);
      } else if (key === "trainingCourses") {
        perModule.trainingCourses = await flatCloneUuid("training_courses", bundle.training_courses || [], targetCompanyId);
      }
    }
    const total = Object.values(perModule).reduce((a, b) => a + b, 0);
    return { ok: true, perModule, total };
  } catch (e) {
    return { ok: false, perModule, total: Object.values(perModule).reduce((a, b) => a + b, 0), error: String((e as Error)?.message || e) };
  }
}
