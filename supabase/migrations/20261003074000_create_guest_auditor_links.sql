-- حالتِ «بازرسِ مهمان/بازدیدکننده» — لینکِ موقتِ فقط‌خواندنیِ بیرونی.
-- کاملاً جدا از issue-session-token/sessionToken.js/نقش‌هایِ JWT. تنها چیزِ
-- واقعاً تازه نسبت به بقیه‌یِ لینک‌هایِ عمومیِ این پروژه: expires_at اجباری +
-- کلیدِ خاموش‌کنِ status/revoked_at — چون هیچ توکنِ عمومیِ موجودی امروز
-- منقضی/قابلِ‌لغو نیست. ساختن/لغوِ لینک یک نوشتنِ معمولیِ احراز-هویت‌شده
-- است (offlineWrite)؛ فقط *مصرفِ* لینک (guest-auditor-info) بدونِ ورود است.
create extension if not exists pgcrypto;

create table if not exists public.guest_auditor_links (
  id                text primary key,
  company_id        uuid not null references public.companies(id) on delete cascade,
  token             uuid not null default gen_random_uuid(),
  label             text not null default '',
  expires_at        timestamptz not null,
  status            text not null default 'active' check (status in ('active', 'revoked')),
  revoked_at        timestamptz,
  revoked_by        text not null default '',
  last_accessed_at  timestamptz,
  access_count      integer not null default 0,
  created_by        text not null default '',
  created_at        timestamptz not null default now()
);
create unique index if not exists guest_auditor_links_token_idx on public.guest_auditor_links (token);
create index if not exists guest_auditor_links_company_idx on public.guest_auditor_links (company_id);

alter table public.guest_auditor_links enable row level security;
drop policy if exists guest_auditor_links_company_rw on public.guest_auditor_links;
create policy guest_auditor_links_company_rw on public.guest_auditor_links
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- بدونِ policy عمومی؛ مصرفِ لینک (نه ساخت/لغو) فقط از طریقِ Edge Function
-- با service_role (guest-auditor-info) است.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('guestAuditorAccess', 'دسترسی بازرس مهمان', 0, 0, false, 67)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["guestAuditorAccess"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'guestAuditorAccess');
