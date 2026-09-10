-- =============================================================================
-- ماژول «محاسبه‌ی مصرفِ سوختِ ناوگانِ خودرو» (Vehicle Fuel Consumption
-- Calculator) — IHMS-Native، دقیقاً همان الگویِ energy_module.sql و
-- excavation_module.sql: همان Supabase، همان company_id + RLS، همان
-- offlineWrite/syncEngine.
--
-- هیچ عددِ مصرفی در کد Hard-code نمی‌شود — همه در fleet_vehicle_bank
-- (ردیف‌های سیستمیِ company_id=null، به‌علاوه‌ی خودروهای اختصاصیِ هر
-- Company/Project) نگه‌داری و قابلِ به‌روزرسانی است. منبعِ هر عدد در ستونِ
-- source ثبت می‌شود.
-- =============================================================================

-- ---------- ۱) بانکِ خودرو (استاندارد + اختصاصیِ Company/Project) ----------
create table if not exists public.fleet_vehicle_bank (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade,   -- null → خودروی استانداردِ سیستمی
  project text not null default '',
  brand text not null default '',
  model text not null default '',
  trim text not null default '',               -- تیپ
  engine text not null default '',
  gearbox text not null default '',            -- دستی/اتومات/CVT/… (متن آزاد)
  fuel_type text not null default 'gasoline'
    check (fuel_type in ('gasoline','diesel','cng','hybrid','lpg','other')),
  model_year integer,
  city_l100 numeric,       -- مصرفِ شهری L/100km
  highway_l100 numeric,    -- مصرفِ جاده‌ای/برون‌شهری L/100km
  combined_l100 numeric,   -- مصرفِ ترکیبی L/100km
  source text not null default '',             -- منبعِ اطلاعات (سازنده/استاندارد/مصرفِ واقعی/…)
  plate text not null default '',
  fleet_code text not null default '',
  notes text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fleet_vehicle_bank_scope_idx
  on public.fleet_vehicle_bank (company_id, project, is_active);

comment on table public.fleet_vehicle_bank is
  'بانکِ خودروهای بنزینی/سوختی. ردیفِ company_id=null خودروی استانداردِ سیستمی است؛ هر شرکت خودروهای اختصاصیِ خودش را (سطحِ شرکت یا پروژه) اضافه و بازاستفاده می‌کند. منبعِ هر عددِ مصرف در ستونِ source.';

-- ---------- ۲) سرِ هر مطالعه‌ی ناوگان ----------
create table if not exists public.fleet_fuel_assessments (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,

  project text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  title text not null default '',
  assessment_date date,

  -- نسبتِ پیش‌فرضِ کیلومترِ شهری وقتی کاربر تفکیکِ شهری/جاده‌ای نداده باشد
  -- (فقط یک fallback؛ محاسبه‌ی اصلی بر پایه‌ی km واقعیِ شهری و جاده‌ای است).
  city_share_default numeric not null default 0.6,

  -- ردیف‌های خودرو (هر ردیف: مرجعِ بانک + برنامه‌ی پیمایش + مصرفِ واقعیِ اختیاری)
  items jsonb not null default '[]'::jsonb,

  -- خروجیِ کاملِ محاسبات و داشبورد
  calc jsonb not null default '{}'::jsonb,

  notes text not null default '',
  archived_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fleet_fuel_assessments_company_idx on public.fleet_fuel_assessments (company_id);
create index if not exists fleet_fuel_assessments_created_idx on public.fleet_fuel_assessments (created_at desc);

comment on table public.fleet_fuel_assessments is
  'هر «ذخیره در IHMS» در محاسبه‌گرِ مصرفِ سوختِ ناوگان یک ردیف اینجا می‌سازد — فهرستِ خودروها + برنامه‌ی پیمایش + خروجیِ کاملِ محاسبه (برآوردی و در صورتِ وجود، مصرفِ واقعی).';

-- ---------- ۳) Audit Trail (append-only) ----------
create table if not exists public.fleet_fuel_audit (
  id text primary key,
  assessment_id text not null references public.fleet_fuel_assessments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null
    check (action in ('create','update','archive','restore','delete')),
  detail jsonb not null default '{}'::jsonb,
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists fleet_fuel_audit_assessment_idx on public.fleet_fuel_audit (assessment_id, created_at desc);
create index if not exists fleet_fuel_audit_company_idx on public.fleet_fuel_audit (company_id);

-- =============================================================================
-- RLS — الگوی استانداردِ پروژه
-- =============================================================================
alter table public.fleet_vehicle_bank      enable row level security;
alter table public.fleet_fuel_assessments  enable row level security;
alter table public.fleet_fuel_audit        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fleet_fuel_assessments','fleet_fuel_audit']
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

-- بانکِ خودرو: ردیفِ سیستمی (company_id is null) برای همه خواندنی؛ نوشتنِ
-- سیستمی فقط Super Admin؛ ردیفِ شرکتی مثلِ بقیه.
drop policy if exists fleet_vehicle_bank_read on public.fleet_vehicle_bank;
create policy fleet_vehicle_bank_read on public.fleet_vehicle_bank
  for select
  using (
    company_id is null
    or coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

drop policy if exists fleet_vehicle_bank_write on public.fleet_vehicle_bank;
create policy fleet_vehicle_bank_write on public.fleet_vehicle_bank
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
-- بانکِ خودروهای استانداردِ سیستمی — خودروهای بنزینیِ رایج در ایران.
-- اعدادِ مصرف «تقریبی/برآوردی از منابعِ عمومی» هستند و باید با مصرفِ واقعیِ
-- کارتِ سوخت/کیلومترشمار تطبیق داده شوند. id ثابت؛ فقط اگر وجود ندارد.
-- =============================================================================
insert into public.fleet_vehicle_bank
  (id, company_id, project, brand, model, trim, engine, gearbox, fuel_type, model_year, city_l100, highway_l100, combined_l100, source, is_system, is_active, created_by)
values
  ('fvb-sys-pride-111',   null, '', 'سایپا',    'پراید ۱۱۱',        'SE',   '1.3L 8V',   'دستی',   'gasoline', 2018,  9.0, 6.2, 7.5, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-pride-131',   null, '', 'سایپا',    'پراید ۱۳۱',        'SL',   '1.3L 8V',   'دستی',   'gasoline', 2018,  9.2, 6.4, 7.7, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-tiba',        null, '', 'سایپا',    'تیبا',              '2',    '1.5L 8V',   'دستی',   'gasoline', 2020,  8.6, 5.8, 7.0, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-saina',       null, '', 'سایپا',    'ساینا',             'S',    '1.5L 8V',   'دستی',   'gasoline', 2021,  8.4, 5.7, 6.9, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-quick',       null, '', 'سایپا',    'کوییک',             'R',    '1.5L 8V',   'اتومات', 'gasoline', 2021,  9.5, 6.3, 7.6, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-shahin',      null, '', 'سایپا',    'شاهین',             'G',    '1.5L TU5',  'دستی',   'gasoline', 2022,  8.8, 5.5, 6.8, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-samand-lx',   null, '', 'ایران‌خودرو','سمند LX',          'EF7',  '1.7L EF7',  'دستی',   'gasoline', 2019,  10.5, 7.0, 8.5, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-samand-cng',  null, '', 'ایران‌خودرو','سمند EF7 دوگانه',   'EF7-CNG','1.7L EF7', 'دستی',  'cng',      2020,  10.8, 7.2, 8.7, 'برآورد از منابع عمومی — دوگانه‌سوز؛ با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-dena-plus',   null, '', 'ایران‌خودرو','دنا پلاس توربو',     'TC',   '1.6L Turbo','اتومات', 'gasoline', 2022,  9.8, 6.2, 7.6, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-dena',        null, '', 'ایران‌خودرو','دنا',               'EF7',  '1.7L EF7',  'دستی',   'gasoline', 2020,  10.2, 6.6, 8.0, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-rana-plus',   null, '', 'ایران‌خودرو','رانا پلاس',          'LX',   '1.6L',      'دستی',   'gasoline', 2021,  9.6, 6.1, 7.4, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-tara-mt',     null, '', 'ایران‌خودرو','تارا',              'دستی', '1.6L',      'دستی',   'gasoline', 2022,  9.2, 5.8, 7.1, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-tara-at',     null, '', 'ایران‌خودرو','تارا',              'اتومات','1.6L Turbo','اتومات', 'gasoline', 2022,  9.9, 6.2, 7.7, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-peugeot-206', null, '', 'ایران‌خودرو','پژو ۲۰۶',          'تیپ ۵','1.6L TU5',  'دستی',   'gasoline', 2018,  9.0, 5.6, 6.9, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-peugeot-207', null, '', 'ایران‌خودرو','پژو ۲۰۷i',          'اتومات','1.6L TU5',  'اتومات', 'gasoline', 2021,  9.8, 6.0, 7.5, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-peugeot-pars',null, '', 'ایران‌خودرو','پژو پارس',          'ELX',  '1.7L EF7',  'دستی',   'gasoline', 2019,  10.6, 7.0, 8.6, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-peugeot-405', null, '', 'ایران‌خودرو','پژو ۴۰۵',          'GLX',  '1.8L XU7',  'دستی',   'gasoline', 2017,  11.5, 7.5, 9.2, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-l90',         null, '', 'رنو',      'ال۹۰ / تندر',       'E2',   '1.6L',      'دستی',   'gasoline', 2018,  8.8, 5.4, 6.7, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-sandero',     null, '', 'رنو',      'ساندرو',            'استپ‌وی','1.6L',     'اتومات', 'gasoline', 2019,  9.4, 5.9, 7.2, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-tiggo7pro',   null, '', 'چری / مدیران‌خودرو','تیگو ۷ پرو','Excellent','1.5L Turbo','CVT','gasoline', 2022,  10.2, 6.6, 8.0, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-arizo5',      null, '', 'چری / مدیران‌خودرو','آریزو ۵',   'IE',   '1.5L Turbo','CVT',    'gasoline', 2021,  9.6, 6.2, 7.5, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-mvm315',      null, '', 'ام‌وی‌ام','ام‌وی‌ام ۳۱۵',        'H',    '1.5L',      'دستی',   'gasoline', 2019,  8.9, 5.7, 7.0, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-corolla',     null, '', 'تویوتا',   'کرولا',             'GLi',  '1.8L',      'CVT',    'gasoline', 2019,  8.4, 5.4, 6.6, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-elantra',     null, '', 'هیوندای',  'النترا',            'GLS',  '2.0L',      'اتومات', 'gasoline', 2018,  9.6, 5.9, 7.3, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-sonata',      null, '', 'هیوندای',  'سوناتا',            'GLS',  '2.4L',      'اتومات', 'gasoline', 2018,  11.0, 6.6, 8.3, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-cerato',      null, '', 'کیا',      'سراتو',             'اتومات','2.0L',     'اتومات', 'gasoline', 2019,  10.2, 6.2, 7.8, 'برآورد از منابع عمومی — با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-hilux',       null, '', 'تویوتا',   'هایلوکس (بنزینی)',   'دو کابین','2.7L',   'اتومات', 'gasoline', 2018,  14.0, 10.5, 12.0, 'برآورد از منابع عمومی — وانت؛ با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-vanet',       null, '', 'زامیاد',   'وانت زامیاد (بنزینی)','Z24',  '2.4L',      'دستی',   'gasoline', 2019,  13.5, 10.0, 11.5, 'برآورد از منابع عمومی — وانت؛ با مصرفِ واقعی تطبیق دهید', true, true, 'system'),
  ('fvb-sys-vanet-cng',   null, '', 'زامیاد',   'وانت زامیاد دوگانه',  'Z24-CNG','2.4L',    'دستی',   'cng',      2020,  14.0, 10.5, 12.0, 'برآورد از منابع عمومی — وانتِ دوگانه‌سوز؛ با مصرفِ واقعی تطبیق دهید', true, true, 'system')
on conflict (id) do nothing;

-- =============================================================================
-- Backfill: ابزارهای «مصرفِ برق» و «مصرفِ سوختِ ناوگان» را به هر پلنِ موجودی
-- که features آن آرایه است اضافه کن — تا مثلِ بقیه‌ی ابزارها برای شرکت‌های
-- موجود پنهان نماند (هم‌الگوی 20260910120000_quicktools_plan_backfill.sql).
-- =============================================================================
update public.plans
set features = (
  select jsonb_agg(distinct elem)
  from jsonb_array_elements_text(
    features || '["energy-calculator","fleet-fuel-calculator"]'::jsonb
  ) as elem
)
where features is not null
  and jsonb_typeof(features) = 'array';
