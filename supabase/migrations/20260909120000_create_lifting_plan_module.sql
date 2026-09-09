-- =============================================================================
-- ماژول «Lifting Plan Designer» — طراحی نقشه‌ی لیفتینگ، IHMS-Native
-- =============================================================================
-- این ماژول از ابتدا با معماری فعلی IHMS ساخته می‌شود: همان Supabase، همان
-- الگوی company_id + RLS، همان لایه‌ی offlineWrite/syncEngine، همان Storage.
--
-- نکته‌ی مهمِ سازگاری: در این پروژه کلیدِ اصلیِ جدول‌های داده‌ایِ کاربر
-- (machinery/personnel/contractors/…) از نوعِ TEXT است و سمتِ کلاینت با
-- uid("prefix") ساخته می‌شود (offlineWrite شناسه را در payload می‌گذارد).
-- فقط companies.id از نوعِ uuid است. پس اینجا هم PKها TEXT‌اند، company_id
-- از نوعِ uuid، و FK به machinery/contractors از نوعِ TEXT.
--
-- جداولِ فاز ۱:
--   * lifting_plans            — سرِ قابل‌ویرایشِ هر پلن (متادیتا + scene + calc)
--   * lifting_plan_revisions   — Versioning: snapshotِ تغییرناپذیر در هر «ثبت نسخه»
--   * lifting_plan_audit       — Audit Trail (append-only)
--   * lifting_crane_models     — Master Data: Load Chartِ واقعیِ سازنده
--   * lifting_rigging_items    — Master Data: تجهیزاتِ ریگینگ
--   * lifting_acceptance_criteria — Threshold/Acceptance به‌صورت Configurable + Versioned
--
-- الگوی RLS: توکنِ سفارشیِ امضاشده؛ claimهای company_id و is_super_admin از
-- طریقِ auth.jwt() در policyها در دسترس‌اند (منطبق با error_reports/app_releases).
-- =============================================================================

-- ---------- ۱) سرِ پلن ----------
create table if not exists public.lifting_plans (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,

  -- متادیتا (خواسته‌ی صریح: Project / Company-Contractor / Plan Number / Revision /
  -- Date / Prepared By / Reviewed By / Approved By / Status)
  plan_number text not null default '',
  revision text not null default '0',
  plan_date date,
  project text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  title text not null default '',
  prepared_by text not null default '',
  reviewed_by text not null default '',
  approved_by text not null default '',
  status text not null default 'draft'
    check (status in ('draft','in_review','approved','rejected','archived')),

  -- محتوای داده‌محورِ نقشه (نه اسکرین‌شات): آرایه‌ای از اشیا؛ هر شیء
  -- { type, geometry:{x,y,rotation,scale}, props:{...}, machineryId?, personnelId? }
  -- type ∈ crane|load|hook|sling|shackle|spreader_beam|structure|truck|
  --        power_line|worker|barrier|exclusion_zone
  scene jsonb not null default '{"canvas":{"scale_m_per_px":0.1,"grid":true},"objects":[]}'::jsonb,

  -- خروجیِ محاسبات و هندسه (شعاعِ کار، ظرفیتِ مجاز از Load Chart، درصدِ
  -- بهره‌برداری، فواصل، pass/fail) — قابلِ ذخیره و بازیابی، نه فقط تصویر.
  calc jsonb not null default '{}'::jsonb,

  -- کدام نسخه‌ی Acceptance Criteria هنگام ارزیابیِ این پلن مبنا بوده
  -- (FK پایین‌تر، بعد از تعریفِ جدولِ criteria، با ALTER اضافه می‌شود)
  criteria_version_id text,

  -- قلاب‌های یکپارچگی با سایرِ ماژول‌های IHMS (فاز ۴ فعال می‌شوند؛ الان فقط ذخیره)
  linked_risk_assessment_id text,
  linked_capa_ids jsonb not null default '[]'::jsonb,
  document_ids jsonb not null default '[]'::jsonb,   -- ارجاع به فایل‌های Storage (گواهی/پیوست)

  archived_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifting_plans_company_idx  on public.lifting_plans (company_id);
create index if not exists lifting_plans_status_idx   on public.lifting_plans (company_id, status);
create index if not exists lifting_plans_created_idx  on public.lifting_plans (created_at desc);

comment on table public.lifting_plans is
  'سرِ قابل‌ویرایشِ هر Lifting Plan. scene/calc داده‌محورند (JSONB، نه اسکرین‌شات). نسخه‌های ثبت‌شده در lifting_plan_revisions.';

-- ---------- ۲) نسخه‌های تغییرناپذیر (Versioning) ----------
create table if not exists public.lifting_plan_revisions (
  id text primary key,
  plan_id text not null references public.lifting_plans(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  revision text not null,
  snapshot jsonb not null,   -- snapshotِ کاملِ ردیفِ پلن + scene + calc در لحظه‌ی فریز
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lifting_plan_revisions_plan_idx on public.lifting_plan_revisions (plan_id, created_at desc);
create index if not exists lifting_plan_revisions_company_idx on public.lifting_plan_revisions (company_id);

comment on table public.lifting_plan_revisions is
  'Snapshotِ تغییرناپذیرِ یک Lifting Plan در هر «ثبت نسخه». برای تاریخچه و بازیابی.';

-- ---------- ۳) Audit Trail (append-only) ----------
create table if not exists public.lifting_plan_audit (
  id text primary key,
  plan_id text not null references public.lifting_plans(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null
    check (action in ('create','update','duplicate','revision','status_change','archive','restore','delete','scene_save','calc_run')),
  detail jsonb not null default '{}'::jsonb,   -- تغییرِ فیلدها / from→to
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lifting_plan_audit_plan_idx on public.lifting_plan_audit (plan_id, created_at desc);
create index if not exists lifting_plan_audit_company_idx on public.lifting_plan_audit (company_id);

comment on table public.lifting_plan_audit is
  'Audit Trailِ append-only برای هر Lifting Plan — چه کسی، چه زمانی، چه تغییری.';

-- ---------- ۴) Master Data: مدل جرثقیل + Load Chartِ واقعی ----------
create table if not exists public.lifting_crane_models (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  machinery_id text,   -- لینکِ اختیاری به رجیستریِ ماشین‌آلاتِ IHMS برای هویت/گواهی — بدونِ تکرارِ داده
  manufacturer text not null default '',
  model text not null default '',
  crane_type text not null default 'mobile'
    check (crane_type in ('mobile','crawler','tower','telehandler','overhead','other')),
  config_label text not null default '',   -- پیکربندیِ کانترویت/بوم/آوتریگرِ این چارت
  -- Load Chartِ واردشده از چارتِ واقعیِ سازنده: [{radius_m, boom_length_m, capacity_kg}]
  -- نرم‌افزار هیچ ظرفیتِ فرضی نمی‌سازد؛ اگر این خالی باشد، محاسبه‌ی ظرفیت «نامشخص» می‌ماند.
  load_chart jsonb not null default '[]'::jsonb,
  chart_source text not null default '',    -- مرجعِ چارت (شماره‌ی سند/فایل)
  max_capacity_kg numeric,                  -- صرفاً برای نمایشِ فهرست؛ مبنای محاسبه خودِ load_chart است
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifting_crane_models_company_idx on public.lifting_crane_models (company_id, is_active);

comment on table public.lifting_crane_models is
  'Master Dataِ مدل جرثقیل به‌همراه Load Chartِ واقعیِ سازنده. مبنای محاسبه‌ی ظرفیتِ مجاز.';

-- ---------- ۵) Master Data: تجهیزاتِ ریگینگ ----------
create table if not exists public.lifting_rigging_items (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  machinery_id text,
  item_type text not null default 'sling'
    check (item_type in ('sling','shackle','spreader_beam','hook','block','other')),
  tag text not null default '',
  description text not null default '',
  wll_kg numeric,          -- Working Load Limit
  weight_kg numeric,       -- وزنِ خودِ تجهیز (وارد در محاسبه‌ی بارِ کل)
  length_m numeric,
  cert_expiry date,
  document_ids jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifting_rigging_items_company_idx on public.lifting_rigging_items (company_id, is_active);

comment on table public.lifting_rigging_items is
  'Master Dataِ تجهیزاتِ ریگینگ (اسلینگ/شگل/اسپریدر…) با WLL/وزن/طول/گواهی.';

-- ---------- ۶) Acceptance Criteria — Configurable + Versioned ----------
create table if not exists public.lifting_acceptance_criteria (
  id text primary key,
  -- company_id = null → قالبِ پیش‌فرضِ سیستمی (قابلِ خواندن برای همه)
  company_id uuid references public.companies(id) on delete cascade,
  version integer not null default 1,
  is_active boolean not null default true,
  -- همه‌ی Thresholdها اینجا — هیچ‌کدام در کد Hard-code نمی‌شوند.
  criteria jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lifting_acceptance_criteria_company_idx
  on public.lifting_acceptance_criteria (company_id, is_active, version desc);

comment on table public.lifting_acceptance_criteria is
  'معیارهای پذیرشِ لیفتینگ به‌صورت Configurable و Versioned. company_id=null یعنی قالبِ پیش‌فرضِ سیستمی.';

-- ---------- FKِ متقابلِ criteria_version_id (بعد از تعریفِ جدولِ criteria) ----------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lifting_plans_criteria_version_fk') then
    alter table public.lifting_plans
      add constraint lifting_plans_criteria_version_fk
      foreign key (criteria_version_id)
      references public.lifting_acceptance_criteria(id) on delete set null;
  end if;
end $$;

-- =============================================================================
-- RLS — الگوی استانداردِ پروژه
-- =============================================================================
alter table public.lifting_plans                enable row level security;
alter table public.lifting_plan_revisions       enable row level security;
alter table public.lifting_plan_audit           enable row level security;
alter table public.lifting_crane_models         enable row level security;
alter table public.lifting_rigging_items        enable row level security;
alter table public.lifting_acceptance_criteria  enable row level security;

-- کاربرِ واردشده‌ی هر شرکت فقط ردیف‌های همان شرکت را می‌بیند/می‌نویسد؛
-- Super Admin برای پشتیبانی دسترسیِ کامل دارد.
do $$
declare
  t text;
begin
  foreach t in array array[
    'lifting_plans','lifting_plan_revisions','lifting_plan_audit',
    'lifting_crane_models','lifting_rigging_items'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_company_rw', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using (
          coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
        )
        with check (
          coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
        )
    $f$, t || '_company_rw', t);
  end loop;
end $$;

-- Acceptance Criteria: قالبِ سیستمی (company_id is null) برای همه خواندنی؛
-- نوشتنِ قالبِ سیستمی فقط Super Admin، ردیفِ شرکتی مثلِ بقیه.
drop policy if exists lifting_acceptance_criteria_read on public.lifting_acceptance_criteria;
create policy lifting_acceptance_criteria_read on public.lifting_acceptance_criteria
  for select
  using (
    company_id is null
    or coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

drop policy if exists lifting_acceptance_criteria_write on public.lifting_acceptance_criteria;
create policy lifting_acceptance_criteria_write on public.lifting_acceptance_criteria
  for all
  using (
    (company_id is not null and coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', ''))
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  )
  with check (
    (company_id is not null and coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', ''))
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

-- =============================================================================
-- باکتِ Storage برای گواهی/پیوستِ پلن‌ها — الگوی machinery-documents/app-releases
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('lifting-plan-docs', 'lifting-plan-docs', true)
on conflict (id) do update set public = true;

drop policy if exists "lifting-plan-docs read" on storage.objects;
create policy "lifting-plan-docs read" on storage.objects
  for select using (bucket_id = 'lifting-plan-docs');

drop policy if exists "lifting-plan-docs insert" on storage.objects;
create policy "lifting-plan-docs insert" on storage.objects
  for insert with check (bucket_id = 'lifting-plan-docs');

drop policy if exists "lifting-plan-docs update" on storage.objects;
create policy "lifting-plan-docs update" on storage.objects
  for update using (bucket_id = 'lifting-plan-docs') with check (bucket_id = 'lifting-plan-docs');

drop policy if exists "lifting-plan-docs delete" on storage.objects;
create policy "lifting-plan-docs delete" on storage.objects
  for delete using (bucket_id = 'lifting-plan-docs');

-- =============================================================================
-- قالبِ پیش‌فرضِ سیستمیِ Acceptance Criteria (نسخه ۱) — فقط اگر وجود ندارد
-- =============================================================================
insert into public.lifting_acceptance_criteria (id, company_id, version, is_active, criteria, note, created_by)
select 'lac-system-v1', null, 1, true,
  jsonb_build_object(
    'maxUtilizationPct', 85,
    'warnUtilizationPct', 75,
    'minPersonnelClearance_m', 3,
    'groundBearingSafetyFactor', 2,
    'windLimit_ms', 9.8,
    'minLoadRadiusMargin_m', 0,
    'powerLineClearance', jsonb_build_array(
      jsonb_build_object('maxKv', 1,   'clearance_m', 3),
      jsonb_build_object('maxKv', 50,  'clearance_m', 3),
      jsonb_build_object('maxKv', 200, 'clearance_m', 4.6),
      jsonb_build_object('maxKv', 350, 'clearance_m', 6.1),
      jsonb_build_object('maxKv', 500, 'clearance_m', 7.6)
    )
  ),
  'قالبِ پیش‌فرضِ سیستمی — مبنای OSHA 1926.1408/1417؛ قابلِ override در سطحِ شرکت.',
  'system'
where not exists (
  select 1 from public.lifting_acceptance_criteria where company_id is null and version = 1
);
