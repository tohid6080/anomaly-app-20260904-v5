-- =============================================================================
-- ماژول «ارزیابی عملکرد HSE پیمانکاران» — IHMS-Native
-- =============================================================================
-- طراحی و Preview این ماژول قبلاً با کاربر مرور و تأیید شد (یک HTML Preview
-- کامل ساخته و تأیید گرفته شد؛ خلاصه‌ی طراحی همان‌جا مستند است). این
-- Migration فاز پایگاه‌داده‌ی همان طراحی است.
--
-- قراردادهای این پروژه که اینجا رعایت شده‌اند:
--   * PK جدول‌های داده‌ایِ کاربر از نوعِ TEXT است (نه uuid) — سمتِ کلاینت با
--     newLocalId()/uid() ساخته می‌شود تا با لایه‌ی offlineWrite/syncEngine
--     سازگار باشد (دقیقاً مثلِ pssr_action_items/corrective_actions).
--   * company_id همیشه uuid not null references public.companies(id) —
--     تنها ستونی که واقعاً uuid است در کل مدلِ داده‌ایِ این پروژه.
--   * contractor_id → public.contractors(id) از نوعِ uuid (تأیید‌شده از
--     permit_authorized_signers و pssr_action_items که همین الگو را دارند).
--   * RLS با توابعِ کمکیِ استانداردِ پروژه (current_company_id() /
--     is_current_user_super_admin()) — همان الگویی که Migrationِ
--     20260916110000 کلِ پروژه را به آن یکپارچه کرد.
--
-- تصمیمِ طراحی مهم: هیچ ردیفِ پیش‌فرضی برای شرکت‌های موجود Seed نمی‌شود.
-- وزن‌ها/ضرایب/آستانه‌های پیش‌فرض به‌صورتِ ثابت در کدِ کلاینت
-- (contractorEvalApi.js) تعریف می‌شوند و این جدول‌ها فقط "override"ِ هر
-- شرکت را نگه می‌دارند — دقیقاً همان الگویِ «خالی یعنی پیش‌فرض» که برای
-- system_module_config.display_label قبلاً در این پروژه جا افتاده. این یعنی
-- بدونِ نیازِ به هیچ Seedی، همه‌ی شرکت‌های موجود همین امروز یک پیکربندیِ
-- منطقی می‌بینند و کارفرما فقط در صورتِ نیاز آن را سفارشی می‌کند.
-- =============================================================================

-- ---------- ۱) تنظیماتِ سراسریِ هر شرکت: دوره‌بندی + آستانه‌ها ----------
create table if not exists public.contractor_eval_config (
  id                       text primary key,
  company_id               uuid not null references public.companies(id) on delete cascade,
  cadence                  text not null default 'quarterly'
    check (cadence in ('monthly','quarterly','semiannual','annual')),
  calc_method              text not null default 'redistribute'
    check (calc_method in ('redistribute','full_score')),
  excellent_min            numeric not null default 85,
  good_min                 numeric not null default 70,
  acceptable_min           numeric not null default 50,
  hse_review_deadline_days integer not null default 10,
  employer_approval_deadline_days integer not null default 5,
  updated_by               text not null default '',
  updated_at               timestamptz not null default now(),
  unique (company_id)
);

-- ---------- ۲) وزنِ هر ماژول (Override — نبودِ ردیف یعنی وزنِ پیش‌فرض) ----------
create table if not exists public.contractor_eval_settings (
  id           text primary key,
  company_id   uuid not null references public.companies(id) on delete cascade,
  category_key text not null,
  weight       numeric not null default 0,
  is_active    boolean not null default true,
  updated_by   text not null default '',
  updated_at   timestamptz not null default now(),
  unique (company_id, category_key)
);

-- ---------- ۳) ضریب/هدفِ هر شاخص (Override) + شاخص‌های سفارشیِ کارفرما ----------
create table if not exists public.contractor_eval_indicator_settings (
  id            text primary key,
  company_id    uuid not null references public.companies(id) on delete cascade,
  category_key  text not null,
  indicator_key text not null,
  coefficient   numeric,
  target_value  numeric,
  is_active     boolean not null default true,
  is_custom     boolean not null default false,
  label_fa      text not null default '',
  label_en      text not null default '',
  label_de      text not null default '',
  updated_by    text not null default '',
  updated_at    timestamptz not null default now(),
  unique (company_id, category_key, indicator_key)
);

-- ---------- ۴) تاریخچه‌ی تغییرِ تنظیمات (Audit Trail — چه‌کسی/چه‌زمانی/چه‌مقداری) ----------
create table if not exists public.contractor_eval_settings_audit (
  id            text primary key,
  company_id    uuid not null references public.companies(id) on delete cascade,
  changed_by    text not null default '',
  changed_at    timestamptz not null default now(),
  field_changed text not null default '',
  old_value     text not null default '',
  new_value     text not null default ''
);

-- ---------- ۵) نسخه‌ی منجمدشده‌ی تنظیماتِ مؤثر، به‌ازای هر دوره (بازتولیدپذیریِ تاریخی) ----------
create table if not exists public.contractor_eval_settings_versions (
  id           text primary key,
  company_id   uuid not null references public.companies(id) on delete cascade,
  version_no   integer not null,
  snapshot     jsonb not null default '{}'::jsonb,
  published_by text not null default '',
  published_at timestamptz not null default now(),
  note         text not null default ''
);

-- ---------- ۶) دوره‌های ارزیابی ----------
create table if not exists public.contractor_eval_periods (
  id                 text primary key,
  company_id         uuid not null references public.companies(id) on delete cascade,
  title              text not null default '',
  cadence            text not null default 'quarterly'
    check (cadence in ('monthly','quarterly','semiannual','annual')),
  period_start       date not null,
  period_end         date not null,
  status             text not null default 'draft' check (status in ('draft','active','closed')),
  settings_version_id text references public.contractor_eval_settings_versions(id) on delete set null,
  created_by         text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists contractor_eval_periods_company_idx on public.contractor_eval_periods (company_id, period_start desc);

-- ---------- ۷) ارزیابیِ هر پیمانکار در هر دوره (سرِ رکورد + Workflow) ----------
create table if not exists public.contractor_eval_records (
  id                    text primary key,
  period_id             text not null references public.contractor_eval_periods(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  contractor_id         uuid not null references public.contractors(id) on delete cascade,
  status                text not null default 'draft'
    check (status in ('draft','calculated','hse_review','employer_review','returned','final')),
  total_score           numeric,
  level                 text,
  calculated_at         timestamptz,
  hse_reviewed_by       text not null default '',
  hse_reviewed_at       timestamptz,
  hse_review_note       text not null default '',
  employer_approved_by  text not null default '',
  employer_approved_at  timestamptz,
  employer_note         text not null default '',
  return_note           text not null default '',
  finalized_at          timestamptz,
  created_by            text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (period_id, contractor_id)
);
create index if not exists contractor_eval_records_company_idx on public.contractor_eval_records (company_id, status);
create index if not exists contractor_eval_records_contractor_idx on public.contractor_eval_records (contractor_id);

-- ---------- ۸) امتیازِ هر ماژول، به‌ازای هر رکوردِ ارزیابی (Snapshot برای Drill-down) ----------
create table if not exists public.contractor_eval_category_scores (
  id                   text primary key,
  eval_record_id       text not null references public.contractor_eval_records(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  category_key         text not null,
  weight_applied        numeric not null default 0,
  raw_score            numeric,
  weighted_contribution numeric,
  is_applicable        boolean not null default true,
  na_reason            text not null default '',
  created_at           timestamptz not null default now()
);
create index if not exists contractor_eval_category_scores_record_idx on public.contractor_eval_category_scores (eval_record_id);

-- ---------- ۹) جزئیاتِ هر شاخص، به‌ازای هر رکوردِ ارزیابی (بندِ ۹ بریف: کاملاً شفاف) ----------
create table if not exists public.contractor_eval_indicator_results (
  id              text primary key,
  eval_record_id  text not null references public.contractor_eval_records(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  category_key    text not null,
  indicator_key   text not null,
  actual_value    numeric,
  target_value    numeric,
  achievement_pct numeric,
  coefficient     numeric,
  points_earned   numeric,
  source_module   text not null default '',
  source_note     text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists contractor_eval_indicator_results_record_idx on public.contractor_eval_indicator_results (eval_record_id);

-- ---------- ۱۰) فیلدهای سفارشیِ کارفرما (بندِ ۶ بریف) ----------
create table if not exists public.contractor_eval_custom_fields (
  id           text primary key,
  company_id   uuid not null references public.companies(id) on delete cascade,
  category_key text not null default '',
  field_key    text not null,
  label_fa     text not null default '',
  label_en     text not null default '',
  label_de     text not null default '',
  field_type   text not null default 'number' check (field_type in ('number','percent','boolean','select')),
  coefficient  numeric not null default 0,
  is_active    boolean not null default true,
  created_by   text not null default '',
  created_at   timestamptz not null default now(),
  unique (company_id, field_key)
);

-- ---------- ۱۱) مقدارِ فیلدهای سفارشی، به‌ازای هر رکوردِ ارزیابی (ورود دستی) ----------
create table if not exists public.contractor_eval_custom_field_values (
  id             text primary key,
  eval_record_id text not null references public.contractor_eval_records(id) on delete cascade,
  company_id     uuid not null references public.companies(id) on delete cascade,
  field_key      text not null,
  value          text not null default '',
  note           text not null default '',
  created_at     timestamptz not null default now(),
  unique (eval_record_id, field_key)
);

-- =============================================================================
-- RLS — الگوی استانداردِ پروژه (Migration 20260916110000)
-- =============================================================================
alter table public.contractor_eval_config enable row level security;
alter table public.contractor_eval_settings enable row level security;
alter table public.contractor_eval_indicator_settings enable row level security;
alter table public.contractor_eval_settings_audit enable row level security;
alter table public.contractor_eval_settings_versions enable row level security;
alter table public.contractor_eval_periods enable row level security;
alter table public.contractor_eval_records enable row level security;
alter table public.contractor_eval_category_scores enable row level security;
alter table public.contractor_eval_indicator_results enable row level security;
alter table public.contractor_eval_custom_fields enable row level security;
alter table public.contractor_eval_custom_field_values enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'contractor_eval_config','contractor_eval_settings','contractor_eval_indicator_settings',
    'contractor_eval_settings_audit','contractor_eval_settings_versions','contractor_eval_periods',
    'contractor_eval_records','contractor_eval_category_scores','contractor_eval_indicator_results',
    'contractor_eval_custom_fields','contractor_eval_custom_field_values'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_company_rw', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using (company_id = current_company_id() or is_current_user_super_admin())
        with check (company_id = current_company_id() or is_current_user_super_admin())
    $f$, t || '_company_rw', t);
  end loop;
end $$;

-- نکته‌ی امنیتی شناخته‌شده (مطابقِ الگوی موجودِ کلِ پروژه، نه یک نقصِ تازه):
-- محدودیتِ «پیمانکار فقط ارزیابیِ خودش را ببیند» در این پروژه هیچ‌جا در سطحِ
-- RLS به‌ازایِ contractor_id اعمال نمی‌شود (فقط company_id) — همان الگویی
-- که Permit/PSSR/Personnel هم دارند؛ این محدودیت در لایه‌ی contractorEvalApi.js
-- با فیلترِ صریحِ contractor_id + status=final در کوئری اعمال می‌شود.
