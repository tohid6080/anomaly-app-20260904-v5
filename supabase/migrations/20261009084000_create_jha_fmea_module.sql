-- JHA (تحلیلِ خطرِ شغلی) و FMEA (تحلیلِ حالاتِ خرابی و اثراتِ آن) — دو
-- زیرآیتمِ تازه زیرِ «مدیریتِ ارزیابیِ ریسک»، کنارِ BowTie/HCMS. هر چهار
-- جدول تراکنشی‌اند (id text + uid() کلاینت + offlineWrite)، دقیقاً مثلِ
-- anomalies/hcms_risk_assessments — نه الگویِ job_positions/training_courses،
-- چون این رکوردها در فیلد/در جلسه‌یِ کاری ساخته و ویرایش می‌شوند.
create table if not exists public.jha_assessments (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null default '',
  work_activity text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jha_assessments_company_idx on public.jha_assessments (company_id);

create table if not exists public.jha_steps (
  id text primary key,
  jha_id text not null references public.jha_assessments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  seq integer not null default 0,
  step_description text not null default '',
  hazards text not null default '',
  existing_controls text not null default '',
  risk_level text not null default '',
  additional_controls text not null default '',
  responsible text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists jha_steps_jha_idx on public.jha_steps (jha_id);

create table if not exists public.fmea_assessments (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null default '',
  process_or_component text not null default '',
  contractor_id text,
  contractor_name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fmea_assessments_company_idx on public.fmea_assessments (company_id);

create table if not exists public.fmea_items (
  id text primary key,
  fmea_id text not null references public.fmea_assessments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  seq integer not null default 0,
  failure_mode text not null default '',
  effect text not null default '',
  severity integer not null default 1 check (severity between 1 and 10),
  cause text not null default '',
  occurrence integer not null default 1 check (occurrence between 1 and 10),
  current_controls text not null default '',
  detection integer not null default 1 check (detection between 1 and 10),
  -- حاصل‌ضربِ سه عددِ صحیحِ ساده — بدونِ نیاز به منطقِ کلاینت (برخلافِ چهار
  -- سطحِ ترکیبی/حرفی‌عددیِ HCMS)؛ کلاینت هنگامِ insert هرگز آن را ارسال نمی‌کند.
  rpn integer generated always as (severity * occurrence * detection) stored,
  recommended_action text not null default '',
  responsible text not null default '',
  due_date date,
  created_at timestamptz not null default now()
);
create index if not exists fmea_items_fmea_idx on public.fmea_items (fmea_id);

alter table public.jha_assessments  enable row level security;
alter table public.jha_steps        enable row level security;
alter table public.fmea_assessments enable row level security;
alter table public.fmea_items       enable row level security;

drop policy if exists jha_assessments_company_rw on public.jha_assessments;
create policy jha_assessments_company_rw on public.jha_assessments for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists jha_steps_company_rw on public.jha_steps;
create policy jha_steps_company_rw on public.jha_steps for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists fmea_assessments_company_rw on public.fmea_assessments;
create policy fmea_assessments_company_rw on public.fmea_assessments for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists fmea_items_company_rw on public.fmea_items;
create policy fmea_items_company_rw on public.fmea_items for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- ---------- قیمت‌گذاری — زیرآیتمِ riskAssessment، دقیقاً الگویِ hcmsDashboard ----------
insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
values
  ('jhaDashboard', 'JHA - تحلیل خطر شغلی', 0, 0, false, 33),
  ('fmeaDashboard', 'FMEA - تحلیل حالات خرابی و اثرات آن', 0, 0, false, 34)
on conflict (module_key) do nothing;

-- ---------- Backfill — هر شرکتی که riskAssessment را از قبل در
-- company_modules فعال دارد، این دو زیرآیتم را هم رایگان بگیرد (دقیقاً
-- الگویِ 20260916051500_backfill_content_module_subs.sql) ----------
do $$
declare
  parent_row record;
  sub_key    text;
  subs       text[] := array['jhaDashboard', 'fmeaDashboard'];
begin
  for parent_row in
    select company_id, starts_at, ends_at
    from public.company_modules
    where is_active = true and module_key = 'riskAssessment'
  loop
    foreach sub_key in array subs loop
      insert into public.company_modules
        (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      values
        (parent_row.company_id, sub_key, true, parent_row.starts_at, parent_row.ends_at, 0, 0, 'admin_grant', 'backfill_jha_fmea')
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;
end $$;
