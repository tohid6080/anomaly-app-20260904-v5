-- ماژول «تمرینِ تخلیه با چک‌اینِ موبایلی». سه جدول:
--   evacuation_drills         — خودِ تمرین (عنوان/زمان/وضعیت)، نوشتن از طریقِ UI احرازشده (offlineWrite) → id text (uid کلاینت)
--   evacuation_muster_points  — نقاطِ تجمعِ هر تمرین، هرکدام یک checkin_token یکتا برایِ QR → id text (uid کلاینت)
--   evacuation_checkins       — ثبتِ حضور. فقط از طریقِ Edge Function با service_role درج می‌شود
--                               (عیناً الگویِ survey_responses) → id uuid، چون هرگز از offlineWrite نمی‌آید.
create extension if not exists pgcrypto;

create table if not exists public.evacuation_drills (
  id            text primary key,
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null default '',
  scheduled_at  timestamptz,
  site_map_id   text references public.site_maps(id) on delete set null,
  status        text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists evacuation_drills_company_idx on public.evacuation_drills (company_id);

create table if not exists public.evacuation_muster_points (
  id             text primary key,
  company_id     uuid not null references public.companies(id) on delete cascade,
  drill_id       text not null references public.evacuation_drills(id) on delete cascade,
  name           text not null default '',
  zone_id        text references public.site_zones(id) on delete set null,
  checkin_token  uuid not null default gen_random_uuid(),
  created_at     timestamptz not null default now()
);
create unique index if not exists evacuation_muster_points_token_idx on public.evacuation_muster_points (checkin_token);
create index if not exists evacuation_muster_points_drill_idx on public.evacuation_muster_points (drill_id);

create table if not exists public.evacuation_checkins (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  drill_id          text not null references public.evacuation_drills(id) on delete cascade,
  muster_point_id   text not null references public.evacuation_muster_points(id) on delete cascade,
  participant_name  text not null default '',
  personnel_id      text references public.personnel(id) on delete set null,
  checked_in_at     timestamptz not null default now()
);
create index if not exists evacuation_checkins_drill_idx on public.evacuation_checkins (drill_id);
create index if not exists evacuation_checkins_muster_point_idx on public.evacuation_checkins (muster_point_id);

-- ---------- RLS ----------
alter table public.evacuation_drills        enable row level security;
alter table public.evacuation_muster_points  enable row level security;
alter table public.evacuation_checkins       enable row level security;

drop policy if exists evacuation_drills_company_rw on public.evacuation_drills;
create policy evacuation_drills_company_rw on public.evacuation_drills
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists evacuation_muster_points_company_rw on public.evacuation_muster_points;
create policy evacuation_muster_points_company_rw on public.evacuation_muster_points
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- چک‌این‌ها: صاحبِ شرکت فقط می‌خواند و حذف می‌کند (مثلاً حذفِ یک ثبتِ اشتباه).
-- هیچ policy ای برایِ INSERT از anon/authenticated نیست → درج فقط با
-- service_role در Edge Function، دقیقاً مثلِ survey_responses.
drop policy if exists evacuation_checkins_company_read on public.evacuation_checkins;
create policy evacuation_checkins_company_read on public.evacuation_checkins
  for select using (company_id = current_company_id() or is_current_user_super_admin());
drop policy if exists evacuation_checkins_company_delete on public.evacuation_checkins;
create policy evacuation_checkins_company_delete on public.evacuation_checkins
  for delete using (company_id = current_company_id() or is_current_user_super_admin());

-- ---------- قیمت‌گذاری ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('evacuationDrill', 'تمرین تخلیه', 0, 0, false, 65)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["evacuationDrill"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'evacuationDrill');
