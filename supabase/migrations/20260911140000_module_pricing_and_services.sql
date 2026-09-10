-- =============================================================================
-- قیمت‌گذاریِ ماژولی + خدمات/افزودنی‌ها + انتخابِ ماژول به ماژول در خرید
-- =============================================================================
-- هدف: هر ماژول قیمتِ مستقل داشته باشد؛ اگر انتخابِ مشتری با «جهانِ ماژول‌ها»
-- و بازه‌ی تعدادِ یک پلن جور شد، همان پلنِ آماده (با قیمتِ فلَتِ ارزان‌تر)
-- پیشنهاد/اعمال شود.
--
-- همه‌چیز افزودنی است و مسیرِ فعلی را نمی‌شکند:
--   * گیتِ ماژول‌ها هنوز از یک نقطه است: isModuleInPlan(features, key).
--     فقط منبعِ آرایه از plan.features به COALESCE(companies.module_overrides,
--     plan.features) تغییر می‌کند (یک‌خط در shared.js).
--   * companies.module_overrides پیش‌فرض NULL → هر شرکتِ موجود بدونِ تغییر.
--   * زرین‌پال دست‌نخورده؛ خریدِ ماژولی فعلاً فقط از مسیرِ کارت‌به‌کارت.
-- =============================================================================

-- ---------- ۱) قیمتِ هر ماژول (سطحِ سامانه) ----------
create table if not exists public.module_prices (
  module_key   text primary key,          -- دقیقاً همان کلیدِ PLAN_FEATURES / isModuleInPlan
  label        text not null default '',
  price_monthly numeric not null default 0,
  price_yearly  numeric not null default 0,
  is_free      boolean not null default false,   -- true → همیشه فعال، خطِ فاکتور نمی‌شود
  requires     jsonb  not null default '[]'::jsonb,  -- کلیدهایی که با انتخابِ این، خودکار لازم می‌شوند
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  updated_by   text not null default '',
  updated_at   timestamptz not null default now()
);
comment on table public.module_prices is
  'قیمتِ مستقلِ هر ماژول برای «انتخابِ ماژول به ماژول» در صفحه‌ی خرید. module_key = کلیدِ PLAN_FEATURES.';

-- ---------- ۲) خدمات و افزودنی‌ها ----------
create table if not exists public.services (
  id           text primary key,
  name         text not null default '',
  description  text not null default '',
  price_monthly numeric not null default 0,
  price_yearly  numeric not null default 0,
  period       text not null default 'monthly' check (period in ('monthly','yearly','once')),
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_by   text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.services is
  'خدمات/افزودنی‌های جدا از ماژول (پشتیبانیِ ویژه، آموزشِ حضوری، فضای اضافه، ادغام‌ها). مستقل از پلن به سبد اضافه می‌شوند.';

-- ---------- ۳) ستون‌های افزودنیِ companies ----------
alter table public.companies add column if not exists module_overrides jsonb;      -- NULL → از plan.features بخوان
alter table public.companies add column if not exists subscription_snapshot jsonb; -- breakdownِ خرید در لحظه (قفلِ قیمت)
comment on column public.companies.module_overrides is
  'اگر NULL نباشد، همین آرایه مبنای isModuleInPlan است (به‌جای plan.features). خریدِ ماژولی این را ست می‌کند؛ خریدِ پلنِ آماده آن را NULL می‌کند.';

-- ---------- ۴) ستون‌های افزودنیِ plans ----------
alter table public.plans add column if not exists min_modules integer;
alter table public.plans add column if not exists max_modules integer;
alter table public.plans add column if not exists module_universe jsonb;   -- NULL → از features استفاده شود
comment on column public.plans.module_universe is
  'مجموعه‌ی مجازِ کلیدهای ماژول برای این پلن (برای تطبیقِ انتخابِ ماژولی). NULL → همان features.';

-- ---------- ۵) ستون‌های افزودنیِ payments (مسیرِ کارت‌به‌کارتِ ماژولی) ----------
alter table public.payments add column if not exists selected_modules jsonb;
alter table public.payments add column if not exists selected_services jsonb;
alter table public.payments add column if not exists resolved_plan_id text;
-- خریدِ ماژولیِ «سفارشی» ممکن است پلنِ متناظر نداشته باشد؛ plan_id باید
-- بتواند خالی بماند. اگر از قبل هم nullable باشد، این بی‌اثر است.
alter table public.payments  alter column plan_id drop not null;
alter table public.companies alter column plan_id drop not null;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.module_prices enable row level security;
alter table public.services      enable row level security;

-- خواندن برای همه (صفحه‌ی خرید بعد از لاگینِ عادیِ مشتری خوانده می‌شود)
drop policy if exists module_prices_read on public.module_prices;
create policy module_prices_read on public.module_prices for select using (true);
drop policy if exists services_read on public.services;
create policy services_read on public.services for select using (true);

-- نوشتن فقط Super Admin
drop policy if exists module_prices_write on public.module_prices;
create policy module_prices_write on public.module_prices for all
  using (is_current_user_super_admin()) with check (is_current_user_super_admin());
drop policy if exists services_write on public.services;
create policy services_write on public.services for all
  using (is_current_user_super_admin()) with check (is_current_user_super_admin());

-- =============================================================================
-- seed: یک ردیفِ قیمتِ ۰ برای هر کلیدِ ماژولِ گیت‌شونده (فقط اگر نبود).
-- ماژول‌های همیشه‌رایگان با is_free=true. Super Admin بقیه را قیمت‌گذاری می‌کند.
-- =============================================================================
insert into public.module_prices (module_key, label, is_free, sort_order) values
  ('chat',                     'چت داخلی',                         true,  1),
  ('notifications',            'اعلان‌ها',                          true,  2),
  ('profile',                  'پروفایل و تنظیمات',                 true,  3),
  ('quickTools',               'ابزارهای سریع HSE (پایه)',          true,  4),
  ('anomalyReport',            'مدیریت عدم‌انطباق‌ها (آنومالی)',    false, 10),
  ('incidentManagement',       'مدیریت حوادث',                      false, 11),
  ('proactiveIndicators',      'شاخص‌های پراکتیو',                  false, 12),
  ('scaffoldManagement',       'مدیریت تگ داربست',                  false, 13),
  ('personnelAccess',          'ورود و تردد پرسنل',                 false, 20),
  ('riskAssessment',           'مدیریت ارزیابی ریسک (BowTie)',      false, 30),
  ('hcmsDashboard',            'HCMS - کنترل خطرات',               false, 31),
  ('riskKnowledgeManagement',  'بانک اطلاعاتیِ ارزیابی ریسک',       false, 32),
  ('operationalDashboard',     'داشبورد کاری',                     false, 40),
  ('managementDashboard',      'داشبورد مدیریتی و تحلیلی',          false, 41),
  ('machineryManagement',      'مدیریت ماشین‌آلات',                 false, 42),
  ('liftingPlan',              'طراحی و شبیه‌سازی لیفتینگ',         false, 50),
  ('energy-calculator',        'محاسبه‌ی مصرف برق',                 false, 51),
  ('fleet-fuel-calculator',    'محاسبه‌ی مصرف سوخت ناوگان',         false, 52),
  ('excavation-calculator',    'شیب و عرض ایمن گودبرداری',          false, 53),
  ('archiveManagement',        'آرشیو فایل‌ها',                     false, 60),
  ('trainingManagement',       'مدیریت آموزش',                      false, 61),
  ('permissionManagement',     'مدیریت نقش و دسترسی',               false, 62),
  ('jobPositionManagement',    'مدیریت مشاغل',                      false, 63),
  ('effectivenessThresholds',  'آستانه‌های اثربخشی',                false, 64),
  ('hcmsMatrixManagement',     'مدیریت ماتریسِ HCMS',              false, 65),
  ('chatAccessManagement',     'مدیریت دسترسیِ چت',                false, 66),
  ('scaffoldCodeManagement',   'مدیریت کدهای داربست',              false, 67),
  ('anomalyCategoryManagement','دسته‌بندیِ آنومالی',               false, 68)
on conflict (module_key) do nothing;

-- «داشبورد کاری» و «داشبورد مدیریتی» یک جفت‌اند (special-case فعلیِ isModuleInPlan).
update public.module_prices set requires = '["operationalDashboard"]'::jsonb where module_key = 'managementDashboard' and requires = '[]'::jsonb;
-- ابزارهای premium نیازمندِ فعال‌بودنِ «ابزارهای سریع»اند (که رایگان است).
update public.module_prices set requires = '["quickTools"]'::jsonb
  where module_key in ('liftingPlan','energy-calculator','fleet-fuel-calculator','excavation-calculator') and requires = '[]'::jsonb;

-- seedِ نمونه‌ی خدمات (قیمتِ ۰ — Super Admin تنظیم می‌کند)
insert into public.services (id, name, description, period, sort_order) values
  ('svc-support-247', 'پشتیبانیِ اختصاصیِ ۲۴/۷',        'کانالِ اختصاصی + SLA',                'monthly', 1),
  ('svc-onsite',      'آموزشِ حضوریِ راه‌اندازی',        'یک‌بار، حضورِ کارشناس در محل',        'once',    2),
  ('svc-storage-50',  'فضای ذخیره‌سازیِ اضافه ۵۰GB',     'روی سقفِ فضای پلن',                    'monthly', 3),
  ('svc-tardad',      'ادغام با سامانه‌ی حضور و غیاب',   'اتصالِ خودکارِ ترددِ پرسنل',           'monthly', 4)
on conflict (id) do nothing;
