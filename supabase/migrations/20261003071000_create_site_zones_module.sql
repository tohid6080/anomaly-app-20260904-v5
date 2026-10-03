-- رجیستریِ «Site Zones» — زیرساختِ مشترکِ نقشه‌یِ حرارتیِ حوادث و
-- دیجیتال‌توئینِ سبکِ سایت. هر zone یک ردیفِ رئال است (نه بلابِ JSONB در
-- دلِ یک رکوردِ دیگر) چون نقشه‌یِ حرارتی به group by zone_id, count(*) نیاز
-- دارد و دیجیتال‌توئین به join با وضعیتِ زنده‌یِ مجوز/اسکفلد — هیچ‌کدام با
-- یک آرایه‌یِ مدفون در یک ستونِ دیگر امکان‌پذیر نیست.
-- توجه دربارهٔ نوعِ id: برخلافِ migrationهایِ تازه‌ترِ این نشست که id را
-- uuid-with-default می‌گذاشتند، اینجا عمداً id را همان الگویِ غالبِ کلِ
-- کدبیس (permits.id، scaffold_tags.id، corrective_actions.id، anomalies.id
-- — همه text، با uid() سمتِ کلاینت ساخته می‌شوند، تأییدشده مستقیم از رویِ
-- کد) گرفتیم: چون این دو جدول قرار است از طریقِ offlineWrite() نوشته
-- شوند، و offlineWrite همیشه یک id را از قبل (یا از خودِ caller، یا با
-- newLocalId() که فرمتِ uuid هم ندارد) در payload می‌گذارد — اگر ستون
-- uuid بود، همان اولین نوشتنِ آفلاین/local-id با خطایِ «invalid input
-- syntax for type uuid» شکست می‌خورد.
create table if not exists public.site_maps (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default '',
  image_url text not null,
  is_active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_zones (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  site_map_id text not null references public.site_maps(id) on delete cascade,
  name text not null default '',
  zone_type text not null default 'general'
    check (zone_type in ('hazard', 'permit', 'scaffold', 'muster_point', 'general')),
  x_frac numeric not null check (x_frac >= 0 and x_frac <= 1),
  y_frac numeric not null check (y_frac >= 0 and y_frac <= 1),
  linked_permit_id text references public.permits(id) on delete set null,
  linked_scaffold_id text references public.scaffold_tags(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_zones_map_idx on public.site_zones (site_map_id);
create index if not exists site_zones_company_idx on public.site_zones (company_id);

alter table public.site_maps enable row level security;
alter table public.site_zones enable row level security;

drop policy if exists site_maps_company_rw on public.site_maps;
create policy site_maps_company_rw on public.site_maps for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists site_zones_company_rw on public.site_zones;
create policy site_zones_company_rw on public.site_zones for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- باکتِ Storage برایِ عکسِ نقشه‌یِ سایت — دقیقاً الگویِ
-- 20260911184728_permit_branding_bucket.sql.
insert into storage.buckets (id, name, public)
  values ('site-maps', 'site-maps', true)
  on conflict (id) do update set public = true;

drop policy if exists "site-maps read" on storage.objects;
create policy "site-maps read" on storage.objects for select using (bucket_id = 'site-maps');
drop policy if exists "site-maps insert" on storage.objects;
create policy "site-maps insert" on storage.objects for insert with check (bucket_id = 'site-maps');

-- افزایشی، بدونِ‌شکستن — رکوردهایِ قدیمیِ آنومالی/حادثه بدونِ zone دقیقاً
-- همان‌طور که بودند کار می‌کنند؛ فیلدِ متنیِ area/location هم دست‌نخورده
-- می‌ماند، zone_id فقط کنارش اضافه می‌شود.
alter table public.anomalies add column if not exists zone_id text references public.site_zones(id) on delete set null;
alter table public.incidents add column if not exists zone_id text references public.site_zones(id) on delete set null;

-- ---------- قیمت‌گذاری ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values
      ('incidentHeatmap', 'نقشه حرارتی حوادث', 0, 0, false, 62),
      ('siteDigitalTwin', 'دیجیتال توئین سایت', 0, 0, false, 63),
      ('siteZonesManagement', 'مدیریت نقشه و مناطق سایت', 0, 0, false, 64)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["incidentHeatmap", "siteDigitalTwin", "siteZonesManagement"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'incidentHeatmap');
