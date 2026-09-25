-- آمار عمومیِ صفحه اصلیِ سایت (تعداد بازدید + تعداد کلیکِ دکمه‌های اصلی) —
-- طبقِ خواسته‌ی صریح برای نمایش در سوپرادمین › مانیتورینگ و تحلیل. فقط
-- شمارنده نگه می‌داریم (نه لاگِ ردیف‌به‌ردیفِ هر رویداد)، چون فقط «چند بار»
-- خواسته شده نه جزئیاتِ هر بازدید — همین باعث می‌شود جدول هیچ‌وقت رشد نکند.
--
-- دقیقاً همان الگوی امنیتیِ trial_requests/guest_purchase_requests: RLS هیچ
-- policy‌ای برای anon/authenticated ندارد (پیش‌فرض deny-all)؛ تنها مسیرِ
-- نوشتن، RPC اتمیکِ increment_landing_stat است که فقط از طریقِ Edge Function
-- عمومیِ track-landing-event (با service_role) صدا زده می‌شود — همین‌جا هم
-- از رقابتِ هم‌زمان (race) روی شمارنده جلوگیری می‌کند.

create table if not exists public.landing_page_stats (
  metric_key text primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.landing_page_stats enable row level security;

drop policy if exists "super admin select landing page stats" on public.landing_page_stats;
create policy "super admin select landing page stats" on public.landing_page_stats
  for select using (is_current_user_super_admin());

create or replace function public.increment_landing_stat(p_metric_key text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.landing_page_stats (metric_key, count, updated_at)
  values (p_metric_key, 1, now())
  on conflict (metric_key) do update
    set count = public.landing_page_stats.count + 1, updated_at = now();
$$;

revoke all on function public.increment_landing_stat(text) from public, anon, authenticated;
grant execute on function public.increment_landing_stat(text) to service_role;
