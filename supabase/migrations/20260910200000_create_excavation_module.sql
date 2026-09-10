-- =============================================================================
-- ماژول «محاسبه‌گرِ شیب و عرضِ ایمنِ گودبرداری» (Excavation Slope & Width
-- Calculator) — IHMS-Native، دقیقاً همان الگویِ lifting_plan_module.sql:
-- همان Supabase، همان company_id + RLS، همان offlineWrite/syncEngine، همان
-- Storage. مرجع: OSHA 29 CFR 1926 Subpart P + Appendix B (Table B-1).
--
-- هیچ عددِ استانداردی در کد Hard-code نمی‌شود — همه در
-- excavation_standard_profiles.profile (jsonb، Configurable + Versioned،
-- دقیقاً هم‌شکلِ lifting_acceptance_criteria).
-- =============================================================================

-- ---------- ۱) Standard Profile — Configurable + Versioned ----------
create table if not exists public.excavation_standard_profiles (
  id text primary key,
  -- company_id = null → قالبِ پیش‌فرضِ سیستمی (OSHA Table B-1)، خواندنی برای همه
  company_id uuid references public.companies(id) on delete cascade,
  version integer not null default 1,
  is_active boolean not null default true,
  -- نسبت‌های شیب/آستانه‌ها اینجا — هیچ‌کدام در کد Hard-code نمی‌شوند.
  profile jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists excavation_standard_profiles_company_idx
  on public.excavation_standard_profiles (company_id, is_active, version desc);

comment on table public.excavation_standard_profiles is
  'استانداردِ شیبِ گودبرداری به‌صورت Configurable و Versioned (مبنای OSHA 1926 Subpart P Appendix B). company_id=null یعنی قالبِ پیش‌فرضِ سیستمی.';

-- ---------- ۲) سرِ هر ارزیابی/محاسبه ----------
create table if not exists public.excavation_assessments (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,

  project text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  title text not null default '',            -- عنوان/محل گود (مثلاً «گودِ فونداسیونِ سالنِ ۳»)
  assessment_date date,

  -- ---- ورودی‌ها (خواسته‌ی صریح) ----
  depth_m numeric not null default 0,
  bottom_width_m numeric not null default 0,
  length_m numeric not null default 0,
  soil_type text not null default 'type_b'
    check (soil_type in ('stable_rock','type_a','type_b','type_c')),
  has_water boolean not null default false,
  edge_load boolean not null default false,
  adjacent_structure boolean not null default false,
  vibration boolean not null default false,
  protection_method text not null default 'sloping'
    check (protection_method in ('sloping','benching','shoring','shield')),

  -- کدام نسخه‌ی Standard Profile مبنایِ این محاسبه بوده (برای بازتولیدِ دقیقِ نتیجه بعداً)
  standard_profile_version_id text references public.excavation_standard_profiles(id) on delete set null,

  -- خروجیِ کاملِ محاسبات (نسبت شیب، زاویه، عقب‌نشینی، عرض بالا، حجم، verdict، warnings[])
  -- قابلِ ذخیره و بازیابی، نه فقط تصویر — دقیقاً هم‌الگوی lifting_plans.calc
  calc jsonb not null default '{}'::jsonb,

  photo_ids jsonb not null default '[]'::jsonb,   -- ارجاع به فایل‌های Storage
  notes text not null default '',

  archived_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists excavation_assessments_company_idx  on public.excavation_assessments (company_id);
create index if not exists excavation_assessments_created_idx  on public.excavation_assessments (created_at desc);

comment on table public.excavation_assessments is
  'هر بار «Save to IHMS» در محاسبه‌گرِ شیب/عرضِ گودبرداری یک ردیف اینجا می‌سازد — ورودی‌ها + خروجیِ کاملِ محاسبه + عکس.';

-- ---------- ۳) Audit Trail (append-only) ----------
create table if not exists public.excavation_audit (
  id text primary key,
  assessment_id text not null references public.excavation_assessments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null
    check (action in ('create','update','archive','restore','delete','photo_upload')),
  detail jsonb not null default '{}'::jsonb,
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists excavation_audit_assessment_idx on public.excavation_audit (assessment_id, created_at desc);
create index if not exists excavation_audit_company_idx on public.excavation_audit (company_id);

comment on table public.excavation_audit is
  'Audit Trailِ append-only برای هر ارزیابیِ گودبرداری — چه کسی، چه زمانی، چه تغییری.';

-- =============================================================================
-- RLS — الگوی استانداردِ پروژه (دقیقاً هم‌شکلِ lifting_plan_module.sql)
-- =============================================================================
alter table public.excavation_standard_profiles enable row level security;
alter table public.excavation_assessments        enable row level security;
alter table public.excavation_audit              enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['excavation_assessments','excavation_audit']
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

-- Standard Profile: قالبِ سیستمی (company_id is null) برای همه خواندنی؛
-- نوشتنِ قالبِ سیستمی فقط Super Admin، ردیفِ شرکتی مثلِ بقیه.
drop policy if exists excavation_standard_profiles_read on public.excavation_standard_profiles;
create policy excavation_standard_profiles_read on public.excavation_standard_profiles
  for select
  using (
    company_id is null
    or coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

drop policy if exists excavation_standard_profiles_write on public.excavation_standard_profiles;
create policy excavation_standard_profiles_write on public.excavation_standard_profiles
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
-- باکتِ Storage برای عکسِ گودها — الگوی lifting-plan-docs/machinery-documents
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('excavation-photos', 'excavation-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "excavation-photos read" on storage.objects;
create policy "excavation-photos read" on storage.objects
  for select using (bucket_id = 'excavation-photos');

drop policy if exists "excavation-photos insert" on storage.objects;
create policy "excavation-photos insert" on storage.objects
  for insert with check (bucket_id = 'excavation-photos');

drop policy if exists "excavation-photos update" on storage.objects;
create policy "excavation-photos update" on storage.objects
  for update using (bucket_id = 'excavation-photos') with check (bucket_id = 'excavation-photos');

drop policy if exists "excavation-photos delete" on storage.objects;
create policy "excavation-photos delete" on storage.objects
  for delete using (bucket_id = 'excavation-photos');

-- =============================================================================
-- قالبِ پیش‌فرضِ سیستمیِ Standard Profile (نسخه ۱) — OSHA 1926 Subpart P
-- Appendix B, Table B-1 "Maximum Allowable Slopes" — فقط اگر وجود ندارد
-- =============================================================================
insert into public.excavation_standard_profiles (id, company_id, version, is_active, profile, note, created_by)
select 'exp-system-v1', null, 1, true,
  jsonb_build_object(
    -- هر نوعِ خاک: نسبتِ H:V طبقِ Table B-1 (hRatio افقی به‌ازای ۱ واحدِ عمق) +
    -- زاویه‌ی شیب از افق (فقط برای نمایش؛ مبنای محاسبه خودِ hRatio است)
    'slopes', jsonb_build_object(
      'stable_rock', jsonb_build_object('hRatio', 0,    'label', 'Stable Rock', 'maxAngleDeg', 90),
      'type_a',      jsonb_build_object('hRatio', 0.75, 'label', 'Type A',      'maxAngleDeg', 53),
      'type_b',      jsonb_build_object('hRatio', 1,    'label', 'Type B',      'maxAngleDeg', 45),
      'type_c',      jsonb_build_object('hRatio', 1.5,  'label', 'Type C',      'maxAngleDeg', 34)
    ),
    -- عمقی که فراتر از آن، طراحیِ Registered Professional Engineer الزامی می‌شود
    -- (OSHA 1926.652(b)(3)/(c) — بیش از ۲۰ فوت)
    'peRequiredDepthM', 6.1,
    -- حداقلِ عقب‌نشینیِ خاکِ حفاری‌شده/بار/ماشین‌آلات از لبه (OSHA 1926.651(j)(2) — حداقل ۲ فوت،
    -- یا هرچه یک PE تعیین کند). این عددِ پیش‌فرض یک حداقلِ محافظه‌کارانه است، نه جایگزینِ تحلیلِ بار.
    'minEdgeLoadSetbackM', 0.6,
    -- در حضورِ آب/رطوبت، طبقِ Appendix A، خاک را یک ردهٔ ضعیف‌تر در نظر می‌گیرد
    -- (Type A → B، Type B/C → C) — یک قاعدهٔ رایج و محافظه‌کارانه، نه یک فرمولِ ثابتِ OSHA.
    'treatWaterAsOneClassWeaker', true
  ),
  'قالبِ پیش‌فرضِ سیستمی — مبنای OSHA 29 CFR 1926 Subpart P, Appendix B, Table B-1؛ قابلِ override در سطحِ شرکت.',
  'system'
where not exists (
  select 1 from public.excavation_standard_profiles where company_id is null and version = 1
);
