-- مایکروسایتِ عمومیِ گزارشِ ایمنیِ شرکت — یک ردیفِ تنظیماتِ در هر شرکت.
-- بدونِ policy عمومی برایِ خواندن؛ صفحه‌ی عمومی (#safety-report/<token>) فقط
-- از طریقِ Edge Function با service_role می‌خواند (public-safety-microsite-info)
-- و خودش computeSafetyAggregates() را صدا می‌زند — هرگز مستقیم از این جدول.
create extension if not exists pgcrypto;

create table if not exists public.company_safety_microsites (
  id            text primary key,
  company_id    uuid not null unique references public.companies(id) on delete cascade,
  enabled       boolean not null default false,
  public_token  uuid not null default gen_random_uuid(),
  display_name  text not null default '',
  -- چهار آماره‌یِ واقعاً قابلِ‌محاسبه از دیتایِ موجود (نگاه کن به
  -- computeSafetyAggregates در _shared/companySafetyAggregates.ts). LTIFR/نرخِ
  -- آموزش/نرخِ بسته‌شدنِ اقدام‌ها عمداً این‌جا نیستند — نیازمندِ دیتایِ
  -- ساعتِ‌کاری/آموزش/تاریخچه‌ایی‌اند که در این فاز وجود ندارد؛ افزودنِ
  -- کلیدهایی که همیشه null می‌مانند، placeholder محسوب می‌شود.
  show_fields   jsonb not null default '{"openAnomaliesCount":true,"overdueCorrectiveActionsCount":true,"activePermitsCount":true,"daysSinceLastIncident":true}'::jsonb,
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists company_safety_microsites_token_idx on public.company_safety_microsites (public_token);

alter table public.company_safety_microsites enable row level security;
drop policy if exists company_safety_microsites_company_rw on public.company_safety_microsites;
create policy company_safety_microsites_company_rw on public.company_safety_microsites
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('safetyMicrosite', 'مایکروسایت عمومی گزارش ایمنی', 0, 0, false, 66)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["safetyMicrosite"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'safetyMicrosite');
