-- =============================================================================
-- ماژول «محاسبه و پایشِ مصرفِ برقِ کارگاه/شرکت/کارخانه» (Energy / Power
-- Consumption Calculator) — IHMS-Native، دقیقاً همان الگویِ
-- lifting_plan_module.sql و excavation_module.sql: همان Supabase، همان
-- company_id + RLS، همان offlineWrite/syncEngine.
--
-- هیچ نرخ/تعرفه/ضریبی در کد Hard-code نمی‌شود — همه در energy_tariffs.tariff
-- (jsonb، Configurable + Versioned، هم‌شکلِ lifting_acceptance_criteria /
-- excavation_standard_profiles). بانکِ تجهیزاتِ استاندارد هم داده است نه کد:
-- ردیف‌های سیستمی (company_id is null) که هر شرکت می‌تواند کنارشان تجهیزاتِ
-- اختصاصیِ Company/Project خودش را اضافه کند.
-- =============================================================================

-- ---------- ۱) تعرفه‌ی برق — Configurable + Versioned ----------
create table if not exists public.energy_tariffs (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade,   -- null → قالبِ پیش‌فرضِ سیستمی
  version integer not null default 1,
  is_active boolean not null default true,
  -- { currency, energyRatePerKwh, demandChargePerKw, fixedMonthly, taxPct,
  --   diversityFactor, hoursPerYear, tiers:[], note }
  tariff jsonb not null default '{}'::jsonb,
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists energy_tariffs_company_idx
  on public.energy_tariffs (company_id, is_active, version desc);

comment on table public.energy_tariffs is
  'تعرفه‌ی برق و ضرایبِ محاسبه به‌صورت Configurable و Versioned. company_id=null یعنی قالبِ پیش‌فرضِ سیستمی (نرخ‌ها placeholder).';

-- ---------- ۲) بانکِ تجهیزات (استاندارد + اختصاصیِ هر Company/Project) ----------
create table if not exists public.energy_equipment_bank (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade,   -- null → تجهیزِ استانداردِ سیستمی
  project text not null default '',        -- '' → در سطحِ شرکت؛ غیرخالی → مخصوصِ همان پروژه
  name text not null default '',
  category text not null default 'other'
    check (category in ('cooling','heating','chiller','pump','compressor','fan','lighting','office','welding','panel','other')),
  rating_kind text not null default 'power' check (rating_kind in ('power','current')),
  power_kw numeric,
  current_a numeric,
  voltage_v numeric not null default 400,
  phase text not null default 'three' check (phase in ('single','three','dc')),
  power_factor numeric not null default 0.85,
  default_load_factor numeric not null default 1,     -- درصدِ بارِ واقعی (0..1)
  default_duty_cycle numeric not null default 1,      -- درصدِ زمانِ روشن‌بودن (0..1)
  notes text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists energy_equipment_bank_scope_idx
  on public.energy_equipment_bank (company_id, project, is_active);

comment on table public.energy_equipment_bank is
  'بانکِ تجهیزاتِ برقی. ردیفِ company_id=null استانداردِ سیستمی است؛ هر شرکت تجهیزاتِ اختصاصیِ خودش را (در سطحِ شرکت یا پروژه) اضافه و بازاستفاده می‌کند.';

-- ---------- ۳) سرِ هر مطالعه‌ی مصرف (Load List / Assessment) ----------
create table if not exists public.energy_assessments (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,

  project text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  title text not null default '',
  assessment_date date,

  -- کدام نسخه‌ی تعرفه مبنایِ هزینه‌ها بوده (برای بازتولیدِ دقیقِ نتیجه بعداً)
  tariff_version_id text references public.energy_tariffs(id) on delete set null,

  -- ردیف‌های تجهیزات (هر ردیف: مرجعِ بانک + برنامه‌ی کاری + override ها)
  -- [{ id, bankId?, name, category, ratingKind, powerKw, currentA, voltageV,
  --    phase, pf, qty, hoursPerDay, daysPerMonth, monthsPerYear,
  --    loadFactor, dutyCycle, notes }]
  items jsonb not null default '[]'::jsonb,

  -- خروجیِ کاملِ محاسبات و داشبورد — قابلِ ذخیره و بازیابی (نه فقط تصویر)
  calc jsonb not null default '{}'::jsonb,

  notes text not null default '',
  archived_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists energy_assessments_company_idx on public.energy_assessments (company_id);
create index if not exists energy_assessments_created_idx on public.energy_assessments (created_at desc);

comment on table public.energy_assessments is
  'هر «ذخیره در IHMS» در محاسبه‌گرِ مصرفِ برق یک ردیف اینجا می‌سازد — فهرستِ تجهیزات + برنامه‌ی کاری + خروجیِ کاملِ محاسبه/داشبورد.';

-- ---------- ۴) Audit Trail (append-only) ----------
create table if not exists public.energy_audit (
  id text primary key,
  assessment_id text not null references public.energy_assessments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  action text not null
    check (action in ('create','update','archive','restore','delete')),
  detail jsonb not null default '{}'::jsonb,
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists energy_audit_assessment_idx on public.energy_audit (assessment_id, created_at desc);
create index if not exists energy_audit_company_idx on public.energy_audit (company_id);

-- FKِ متقابلِ tariff_version_id بعد از تعریفِ energy_tariffs — همین‌جا امن است
-- چون energy_tariffs بالاتر ساخته شد.

-- =============================================================================
-- RLS — الگوی استانداردِ پروژه
-- =============================================================================
alter table public.energy_tariffs          enable row level security;
alter table public.energy_equipment_bank   enable row level security;
alter table public.energy_assessments      enable row level security;
alter table public.energy_audit            enable row level security;

do $$
declare t text;
begin
  foreach t in array array['energy_assessments','energy_audit']
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

-- تعرفه و بانکِ تجهیزات: ردیفِ سیستمی (company_id is null) برای همه خواندنی؛
-- نوشتنِ سیستمی فقط Super Admin؛ ردیفِ شرکتی مثلِ بقیه.
do $$
declare t text;
begin
  foreach t in array array['energy_tariffs','energy_equipment_bank']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format($f$
      create policy %I on public.%I
        for select
        using (
          company_id is null
          or coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
        )
    $f$, t || '_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using (
          (company_id is not null and coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', ''))
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
        )
        with check (
          (company_id is not null and coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', ''))
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
        )
    $f$, t || '_write', t);
  end loop;
end $$;

-- =============================================================================
-- قالبِ پیش‌فرضِ سیستمیِ تعرفه (نسخه ۱) — نرخ‌ها placeholder، باید با تعرفه‌ی
-- واقعیِ قبضِ برقِ شرکت جایگزین شوند. فقط اگر وجود ندارد.
-- =============================================================================
insert into public.energy_tariffs (id, company_id, version, is_active, tariff, note, created_by)
select 'etar-system-v1', null, 1, true,
  jsonb_build_object(
    'currency', 'IRR',
    'energyRatePerKwh', 0,          -- placeholder — نرخِ هر کیلووات‌ساعت
    'demandChargePerKw', 0,         -- placeholder — بهای قدرت/دیماند (ماهانه، به‌ازای هر kW پیک)
    'fixedMonthly', 0,             -- آبونمان/هزینه‌ی ثابتِ ماهانه
    'taxPct', 9,                    -- مالیات/عوارض بر جمعِ صورتحساب (٪)
    'diversityFactor', 0.8,         -- ضریبِ هم‌زمانی — پیکِ واقعیِ کل کمتر از جمعِ توانِ لحظه‌ایِ همه‌ی تجهیزات
    'hoursPerYear', 8760            -- ساعاتِ سالِ تقویمی — مبنای «بارِ متوسط»
  ),
  'قالبِ پیش‌فرضِ سیستمی — نرخ‌ها placeholder هستند؛ تعرفه‌ی واقعیِ قبض را در سطحِ شرکت وارد کنید.',
  'system'
where not exists (
  select 1 from public.energy_tariffs where company_id is null and version = 1
);

-- =============================================================================
-- بانکِ تجهیزاتِ استانداردِ سیستمی — مقادیرِ «نوعیِ» صفحه‌مشخصات؛ کاربر باید
-- با پلاکِ تجهیزِ خودش تطبیق دهد. فقط اگر وجود ندارد (id ثابت).
-- =============================================================================
insert into public.energy_equipment_bank
  (id, company_id, project, name, category, rating_kind, power_kw, voltage_v, phase, power_factor, default_load_factor, default_duty_cycle, notes, is_system, is_active, created_by)
values
  ('eeb-sys-split-ac',   null, '', 'کولر گازی اسپلیت ۲۴۰۰۰',        'cooling',    'power', 2.2,  230, 'single', 0.90, 0.80, 0.60, 'مقدارِ نوعی؛ با پلاکِ دستگاه تطبیق دهید', true, true, 'system'),
  ('eeb-sys-package-ac', null, '', 'کولر پکیج/هواساز',              'cooling',    'power', 7.5,  400, 'three',  0.85, 0.80, 0.70, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-heater',     null, '', 'بخاری/هیتر برقی',               'heating',    'power', 2.0,  230, 'single', 1.00, 0.90, 0.50, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-chiller-20', null, '', 'چیلر هواخنک ۲۰ تن',            'chiller',    'power', 22.0, 400, 'three',  0.86, 0.75, 0.80, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-pump-5k5',   null, '', 'پمپ گریز از مرکز ۵٫۵kW',       'pump',       'power', 5.5,  400, 'three',  0.84, 0.75, 0.80, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-pump-sub',   null, '', 'پمپ کفکش/شناور ۱٫۵kW',         'pump',       'power', 1.5,  230, 'single', 0.80, 0.70, 0.40, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-comp-screw', null, '', 'کمپرسور هوای اسکرو ۱۵kW',       'compressor', 'power', 15.0, 400, 'three',  0.87, 0.70, 0.75, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-comp-recip', null, '', 'کمپرسور پیستونی ۴kW',          'compressor', 'power', 4.0,  400, 'three',  0.80, 0.60, 0.50, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-fan-axial',  null, '', 'فن/هواکشِ محوری ۰٫۷۵kW',        'fan',        'power', 0.75, 400, 'three',  0.80, 0.80, 0.90, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-fan-wall',   null, '', 'پنکه/هواکشِ دیواری',            'fan',        'power', 0.09, 230, 'single', 0.70, 0.90, 0.70, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-led-highbay',null, '', 'چراغِ LED صنعتی ۱۵۰W',          'lighting',   'power', 0.15, 230, 'single', 0.95, 1.00, 0.45, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-fluor',      null, '', 'چراغِ فلورسنت ۲×۳۶W',           'lighting',   'power', 0.08, 230, 'single', 0.90, 1.00, 0.45, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-pc',         null, '', 'رایانه + مانیتور',              'office',     'power', 0.20, 230, 'single', 0.70, 0.60, 0.40, 'مقدارِ نوعی', true, true, 'system'),
  ('eeb-sys-office-ws',  null, '', 'ایستگاهِ کاریِ اداری (کل)',      'office',     'power', 0.35, 230, 'single', 0.70, 0.60, 0.40, 'شاملِ رایانه، چاپگرِ سهمی و متفرقه', true, true, 'system'),
  ('eeb-sys-weld-mma',   null, '', 'دستگاهِ جوشِ الکترود (MMA) ۲۵۰A','welding',    'power', 8.0,  400, 'three',  0.60, 0.80, 0.35, 'Duty Cycle نوعیِ کارگاهی', true, true, 'system'),
  ('eeb-sys-weld-mig',   null, '', 'دستگاهِ جوشِ MIG/MAG ۳۰۰A',      'welding',    'power', 12.0, 400, 'three',  0.70, 0.80, 0.40, 'Duty Cycle نوعیِ کارگاهی', true, true, 'system'),
  ('eeb-sys-panel-loss', null, '', 'تلفاتِ تابلو/MCC (تقریبی)',      'panel',      'power', 0.30, 400, 'three',  0.90, 1.00, 1.00, 'تلفاتِ دائمِ تابلو', true, true, 'system'),
  ('eeb-sys-ups',        null, '', 'شارژر/UPS',                     'panel',      'power', 1.0,  230, 'single', 0.90, 0.50, 1.00, 'مقدارِ نوعی', true, true, 'system')
on conflict (id) do nothing;
