-- ماژولِ مدیریتِ PPE (تجهیزاتِ حفاظتِ فردی). دو کلاسِ جدولِ متفاوت —
-- عیناً تمایزِ تأییدشده‌یِ کدبیس (ر.ک. job_positions/training_courses/
-- training_requirements در برابرِ personnel_documents):
--   ppe_items / ppe_requirements  — رجیستری/ماتریسِ تعریف، همیشه آنلاین
--                                    ویرایش می‌شود → id uuid با پیش‌فرض،
--                                    بدونِ uid()/offlineWrite.
--   ppe_distributions             — لاگِ تراکنشیِ توزیع، از طریقِ offlineWrite
--                                    نوشته می‌شود → id text (uid کلاینت).
create table if not exists public.ppe_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppe_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_position_id uuid not null references public.job_positions(id) on delete cascade,
  ppe_item_id uuid not null references public.ppe_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_position_id, ppe_item_id)
);
create index if not exists ppe_requirements_job_position_idx on public.ppe_requirements (job_position_id);
create index if not exists ppe_requirements_item_idx on public.ppe_requirements (ppe_item_id);

create table if not exists public.ppe_distributions (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  contractor_id text,
  contractor_name text not null default '',
  personnel_id text not null references public.personnel(id) on delete cascade,
  ppe_item_id uuid not null references public.ppe_items(id) on delete cascade,
  distributed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'distributed', 'refused')),
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ppe_distributions_personnel_idx on public.ppe_distributions (personnel_id);
create index if not exists ppe_distributions_company_idx on public.ppe_distributions (company_id);

alter table public.ppe_items enable row level security;
alter table public.ppe_requirements enable row level security;
alter table public.ppe_distributions enable row level security;

drop policy if exists ppe_items_company_rw on public.ppe_items;
create policy ppe_items_company_rw on public.ppe_items for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists ppe_requirements_company_rw on public.ppe_requirements;
create policy ppe_requirements_company_rw on public.ppe_requirements for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists ppe_distributions_company_rw on public.ppe_distributions;
create policy ppe_distributions_company_rw on public.ppe_distributions for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- ---------- قیمت‌گذاری ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('ppeManagement', 'مدیریت تجهیزات حفاظت فردی (PPE)', 0, 0, false, 68)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["ppeManagement"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'ppeManagement');
