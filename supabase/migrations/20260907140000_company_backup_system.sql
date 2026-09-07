-- =============================================================================
-- سیستم Backup / Restore کامل شرکت‌ها  (SuperAdmin → Storage & Usage)
-- =============================================================================
-- این migration:
--   1) پیش‌نیازها را بررسی می‌کند: pg_cron و pg_net باید از قبل نصب باشند
--      (روی Supabase فعال‌سازی‌شان از Dashboard → Database → Extensions است،
--      نه از داخلِ migration). اگر نصب نباشند، این migration با خطای واضح
--      متوقف می‌شود — هیچ وانمودی به نصبِ موفق نمی‌کند.
--   2) ستون‌های سطحِ Backup را به plans و companies اضافه می‌کند.
--   3) جدول company_backups را می‌سازد — عمداً بدون FK به companies، تا با
--      حذف کاملِ شرکت، متادیتای Backupهای قبلی باقی بماند.
--   4) باکتِ خصوصیِ Storage به نام company-backups را می‌سازد.
--   5) توابع SQL: تعیین دوره‌ی مؤثر، فهرست شرکت‌های سررسیدشده، مصرفِ Storageِ
--      Backupها، restore_company_from_bundle (Restoreِ اتمیک با گاردِ Replace)،
--      purge_company_data، و dispatch_company_backups.
--
-- زمان‌بندیِ cron در فایلِ جداگانه‌ی 20260907140100_company_backup_cron.sql است.
-- Secretهای Vault (نام‌های ثابت، هیچ مقداری اینجا نیست):
--   backup_edge_base_url , backup_cron_secret
-- =============================================================================

-- ---------- 0) پیش‌نیازِ اکستنشن‌ها — بدون وانمود، خطای واضح ----------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron نصب نیست. اول از Dashboard -> Database -> Extensions فعالش کن، بعد این migration را اجرا کن.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'pg_net نصب نیست. اول از Dashboard -> Database -> Extensions فعالش کن، بعد این migration را اجرا کن.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1) سطحِ Backup روی پلن و شرکت
-- -----------------------------------------------------------------------------
alter table public.plans
  add column if not exists backup_tier text not null default 'none';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'plans_backup_tier_check') then
    alter table public.plans add constraint plans_backup_tier_check
      check (backup_tier in ('none','weekly','monthly','yearly'));
  end if;
end $$;

comment on column public.plans.backup_tier is
  'دوره‌ی Backup خودکارِ قابل‌ارائه در این پلن: none | weekly | monthly | yearly';

alter table public.companies
  add column if not exists backup_frequency text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_backup_frequency_check') then
    alter table public.companies add constraint companies_backup_frequency_check
      check (backup_frequency is null or backup_frequency in ('none','weekly','monthly','yearly'));
  end if;
end $$;

alter table public.companies
  add column if not exists backup_last_run_at timestamptz;

comment on column public.companies.backup_frequency is
  'Override دوره‌ی Backup این شرکت. NULL یعنی از plans.backup_tier ارث می‌برد.';
comment on column public.companies.backup_last_run_at is
  'زمان آخرین Backupِ موفقِ خودکار — مبنای تشخیصِ سررسید در Job روزانه.';

-- -----------------------------------------------------------------------------
-- 2) جدول متادیتای Backupها  (بدون FK به companies — با حذف شرکت باقی می‌ماند)
-- -----------------------------------------------------------------------------
create table if not exists public.company_backups (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null,
  company_name   text not null,
  storage_bucket text not null default 'company-backups',
  storage_path   text not null,
  status         text not null default 'pending'
                 check (status in ('pending','running','completed','failed')),
  trigger        text not null default 'manual'
                 check (trigger in ('manual','scheduled','pre_restore')),
  schema_version text not null,
  size_bytes     bigint,
  checksum       text,
  manifest       jsonb,
  table_count    integer,
  row_count      bigint,
  file_count     integer,
  error          text,
  created_by     text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists company_backups_company_idx  on public.company_backups (company_id);
create index if not exists company_backups_status_idx   on public.company_backups (status);
create index if not exists company_backups_started_idx  on public.company_backups (started_at desc);

comment on table public.company_backups is
  'متادیتای هر نسخه‌ی Backup شرکت. فایلِ zip در باکتِ company-backups. عمداً بدون FK به companies تا با حذف شرکت پاک نشود.';

alter table public.company_backups enable row level security;

drop policy if exists company_backups_superadmin_all on public.company_backups;
create policy company_backups_superadmin_all on public.company_backups
  for all to authenticated
  using (public.is_current_user_super_admin())
  with check (public.is_current_user_super_admin());

-- -----------------------------------------------------------------------------
-- 3) باکتِ خصوصیِ Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-backups', 'company-backups', false)
on conflict (id) do nothing;
-- هیچ policyِ anon/authenticated روی این باکت — دسترسی فقط از Edge Functionها
-- با service_role. دانلود از UI از طریق signed URL که همان Edge Function می‌سازد.

-- -----------------------------------------------------------------------------
-- 4) تابع: دوره‌ی مؤثرِ Backup یک شرکت (Override شرکت > سطحِ پلن > none)
-- -----------------------------------------------------------------------------
create or replace function public.company_backup_effective_frequency(p_company_id uuid)
returns text
language sql
stable
as $$
  select coalesce(nullif(c.backup_frequency, ''), p.backup_tier, 'none')
  from public.companies c
  left join public.plans p on p.id = c.plan_id
  where c.id = p_company_id;
$$;

-- -----------------------------------------------------------------------------
-- 5) تابع: شرکت‌هایی که موعد Backup خودکارشان رسیده
-- -----------------------------------------------------------------------------
create or replace function public.companies_due_for_backup()
returns table (company_id uuid, company_name text, frequency text)
language sql
stable
as $$
  with resolved as (
    select
      c.id,
      c.name,
      coalesce(nullif(c.backup_frequency, ''), p.backup_tier, 'none') as freq,
      c.backup_last_run_at
    from public.companies c
    left join public.plans p on p.id = c.plan_id
    where c.subscription_status = 'active'
  )
  select id, name, freq
  from resolved
  where freq <> 'none'
    and (
      backup_last_run_at is null
      or (freq = 'weekly'  and backup_last_run_at < now() - interval '7 days')
      or (freq = 'monthly' and backup_last_run_at < now() - interval '1 month')
      or (freq = 'yearly'  and backup_last_run_at < now() - interval '1 year')
    );
$$;

-- -----------------------------------------------------------------------------
-- 6) تابع: مصرفِ Storageِ Backupها  (جدا از Storageِ عادیِ شرکت)
--    عمداً از anon/authenticated بسته است؛ فقط Edge Function با service_role
--    (که خودش احرازِ Super Admin را انجام می‌دهد).
-- -----------------------------------------------------------------------------
create or replace function public.get_backup_storage_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_bytes bigint;
  v_total_objects bigint;
  v_by_company jsonb;
begin
  select coalesce(sum((metadata->>'size')::bigint), 0), count(*)
    into v_total_bytes, v_total_objects
  from storage.objects
  where bucket_id = 'company-backups';

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_by_company
  from (
    select
      split_part(o.name, '/', 1) as company_id,
      coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes_used,
      count(*) as object_count
    from storage.objects o
    where o.bucket_id = 'company-backups'
    group by 1
  ) x;

  return jsonb_build_object(
    'totalBytesUsed', v_total_bytes,
    'totalObjects', v_total_objects,
    'byCompany', v_by_company,
    'generatedAt', now()
  );
end;
$$;

revoke all on function public.get_backup_storage_usage() from public, anon, authenticated;
grant execute on function public.get_backup_storage_usage() to service_role;

-- -----------------------------------------------------------------------------
-- 7) تابع اصلیِ Restore — اتمیک، با گاردِ Replace و حفظ PK / روابط FK
-- -----------------------------------------------------------------------------
-- p_company_id : شناسه‌ی شرکتِ مقصد
-- p_order      : ترتیبِ والد→فرزندِ جداول (از _shared/companyBackup.ts می‌آید —
--                منبعِ واحدِ حقیقت؛ شاملِ همه‌ی ۶۱ جدولِ company-scoped +
--                anomaly_notifications)
-- p_bundle     : { "companies":[...], "<table>":[...], ... }  (خامِ ردیف‌ها)
-- p_replace    : اگر true، اول همه‌ی داده‌ی فعلیِ شرکت با ترتیبِ معکوسِ FK
--                حذف و بعد جایگزین می‌شود.
--
-- رفتار:
--   • شرکت وجود ندارد            → Restore کامل (companies + همه‌ی جداول).
--   • شرکت هست ولی داده ندارد     → فقط جداول پر می‌شوند (ردیفِ companies حفظ).
--   • شرکت هست و داده دارد، p_replace=false → هیچ تغییری؛ برمی‌گردد
--        { "ok": false, "status": "replace_required" }.
--   • شرکت هست و داده دارد، p_replace=true  → Purge (معکوسِ FK) + جایگزینی.
--
-- کلِ عملیات یک تراکنش است؛ هر خطا → Rollback کامل. چون درج فقط داخلِ
-- شرکتِ خالی/تازه انجام می‌شود، Restoreِ عادی هرگز Duplicate PK نمی‌سازد.
create or replace function public.restore_company_from_bundle(
  p_company_id uuid,
  p_order      text[],
  p_bundle     jsonb,
  p_replace    boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tbl        text;
  v_i          integer;
  v_scope      text;
  v_rows       jsonb;
  v_inserted   bigint;
  v_bool       boolean;
  v_counts     jsonb := '{}'::jsonb;
  v_total      bigint := 0;
  v_exists     boolean;
  v_has_data   boolean := false;
begin
  -- ولیدیشنِ نامِ جدول‌ها
  foreach v_tbl in array p_order loop
    if v_tbl !~ '^[a-z_]+$' then
      raise exception 'invalid table name in p_order: %', v_tbl;
    end if;
  end loop;

  select exists (select 1 from public.companies where id = p_company_id) into v_exists;

  -- آیا شرکت داده‌ی فعال دارد؟ (همه‌ی جداولِ p_order — نه فقط چند نمونه)
  if v_exists then
    foreach v_tbl in array p_order loop
      if v_tbl = 'anomaly_notifications' then
        v_scope := format('anomaly_id in (select id from public.anomalies where company_id = %L)', p_company_id);
      else
        v_scope := format('company_id = %L', p_company_id);
      end if;
      execute format('select exists (select 1 from public.%I where %s)', v_tbl, v_scope) into v_bool;
      if v_bool then
        v_has_data := true;
        exit;
      end if;
    end loop;
  end if;

  -- گاردِ Replace: شرکتِ دارای داده بدون p_replace → هیچ تغییری
  if v_exists and v_has_data and not p_replace then
    return jsonb_build_object(
      'ok', false,
      'status', 'replace_required',
      'companyId', p_company_id,
      'companyExists', true,
      'hasData', true
    );
  end if;

  -- ---------- Purge (فقط p_replace روی شرکتِ موجود) — معکوسِ ترتیبِ FK ----------
  if p_replace and v_exists then
    for v_i in reverse array_length(p_order, 1) .. 1 loop
      v_tbl := p_order[v_i];
      if v_tbl = 'anomaly_notifications' then
        v_scope := format('anomaly_id in (select id from public.anomalies where company_id = %L)', p_company_id);
      else
        v_scope := format('company_id = %L', p_company_id);
      end if;
      execute format('delete from public.%I where %s', v_tbl, v_scope);
    end loop;
    delete from public.companies where id = p_company_id;
    v_exists := false;
  end if;

  -- ---------- درجِ ردیفِ companies (فقط اگر وجود ندارد) ----------
  v_rows := coalesce(p_bundle -> 'companies', '[]'::jsonb);
  if jsonb_array_length(v_rows) > 0 and not v_exists then
    execute 'insert into public.companies
             select * from jsonb_populate_recordset(null::public.companies, $1)'
      using v_rows;
    v_counts := v_counts || jsonb_build_object('companies', jsonb_array_length(v_rows));
    v_total  := v_total + jsonb_array_length(v_rows);
  else
    v_counts := v_counts || jsonb_build_object('companies', 0);
  end if;

  -- ---------- درجِ جداول به ترتیبِ والد→فرزند ----------
  foreach v_tbl in array p_order loop
    v_rows := coalesce(p_bundle -> v_tbl, '[]'::jsonb);
    v_inserted := jsonb_array_length(v_rows);
    if v_inserted > 0 then
      execute format(
        'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)',
        v_tbl, v_tbl
      ) using v_rows;
    end if;
    v_counts := v_counts || jsonb_build_object(v_tbl, v_inserted);
    v_total  := v_total + v_inserted;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'status', case when p_replace then 'replaced' else 'restored' end,
    'companyId', p_company_id,
    'replace', p_replace,
    'tables', v_counts,
    'totalRows', v_total,
    'restoredAt', now()
  );
end;
$$;

revoke all on function public.restore_company_from_bundle(uuid, text[], jsonb, boolean) from public, anon, authenticated;
grant execute on function public.restore_company_from_bundle(uuid, text[], jsonb, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- 8) تابع: Purge اتمیکِ داده‌ی یک شرکت (ابزارِ مستقل — معکوسِ ترتیبِ FK)
-- -----------------------------------------------------------------------------
create or replace function public.purge_company_data(
  p_company_id uuid,
  p_order      text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tbl    text;
  v_i      integer;
  v_scope  text;
  v_del    bigint;
  v_counts jsonb := '{}'::jsonb;
begin
  foreach v_tbl in array p_order loop
    if v_tbl !~ '^[a-z_]+$' then
      raise exception 'invalid table name in p_order: %', v_tbl;
    end if;
  end loop;

  for v_i in reverse array_length(p_order, 1) .. 1 loop
    v_tbl := p_order[v_i];
    if v_tbl = 'anomaly_notifications' then
      v_scope := format('anomaly_id in (select id from public.anomalies where company_id = %L)', p_company_id);
    else
      v_scope := format('company_id = %L', p_company_id);
    end if;
    execute format('with d as (delete from public.%I where %s returning 1) select count(*) from d', v_tbl, v_scope)
      into v_del;
    v_counts := v_counts || jsonb_build_object(v_tbl, v_del);
  end loop;

  return jsonb_build_object('ok', true, 'companyId', p_company_id, 'deleted', v_counts);
end;
$$;

revoke all on function public.purge_company_data(uuid, text[]) from public, anon, authenticated;
grant execute on function public.purge_company_data(uuid, text[]) to service_role;

-- -----------------------------------------------------------------------------
-- 9) تابع: dispatch — Job روزانه‌ی pg_cron این را صدا می‌زند.
--    آدرس و سکرت از Supabase Vault خوانده می‌شوند (نام‌های ثابت؛ هیچ مقداری
--    اینجا hardcode نیست). فراخوانیِ HTTP با API فعلیِ pg_net: net.http_post.
-- -----------------------------------------------------------------------------
create or replace function public.dispatch_company_backups()
returns jsonb
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_base_url  text;
  v_secret    text;
  v_rec       record;
  v_backup_id uuid;
  v_dispatched int := 0;
  v_skipped    int := 0;
begin
  select decrypted_secret into v_base_url
    from vault.decrypted_secrets where name = 'backup_edge_base_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'backup_cron_secret' limit 1;

  if v_base_url is null or v_secret is null then
    return jsonb_build_object('ok', false,
      'error', 'vault secrets backup_edge_base_url / backup_cron_secret missing');
  end if;

  for v_rec in select * from public.companies_due_for_backup() loop
    -- idempotent: اگر Backupِ در جریان/در صف برای این شرکت هست، رد شو
    if exists (
      select 1 from public.company_backups
      where company_id = v_rec.company_id and status in ('pending','running')
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_backup_id := gen_random_uuid();
    insert into public.company_backups
      (id, company_id, company_name, storage_path, status, trigger, schema_version, created_by)
    values
      (v_backup_id, v_rec.company_id, v_rec.company_name,
       v_rec.company_id::text || '/' || v_backup_id::text || '.zip',
       'pending', 'scheduled', '2026-09-07.1', 'cron');

    perform net.http_post(
      url     := v_base_url || '/run-company-backup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body    := jsonb_build_object(
        'backupId',  v_backup_id,
        'companyId', v_rec.company_id,
        'trigger',   'scheduled'
      )
    );
    v_dispatched := v_dispatched + 1;
  end loop;

  return jsonb_build_object('ok', true, 'dispatched', v_dispatched, 'skipped', v_skipped, 'ranAt', now());
end;
$$;

revoke all on function public.dispatch_company_backups() from public, anon, authenticated;
grant execute on function public.dispatch_company_backups() to service_role;
-- Job روزانه‌ی pg_cron این را به‌عنوان نقشِ صاحبِ Job (postgres) اجرا می‌کند.
