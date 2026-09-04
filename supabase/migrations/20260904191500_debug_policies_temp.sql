-- تشخیصی موقت — فقط برای خواندن تعریف واقعی RLS policyهای جدول‌های موجود
-- (anomalies، hse_gate_items، error_reports) تا الگوی صحیح خواندن claim
-- از JWT سفارشی این پروژه تأیید شود. بلافاصله بعد از استفاده حذف می‌شود.
create or replace function public.debug_list_policies()
returns table(tablename text, policyname text, cmd text, qual text, with_check text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select tablename::text, policyname::text, cmd::text, qual::text, with_check::text
  from pg_policies
  where schemaname = 'public' and tablename in ('anomalies', 'hse_gate_items', 'error_reports', 'employer_accounts')
  order by tablename, policyname;
$$;
grant execute on function public.debug_list_policies() to anon, authenticated;

-- همچنین خودِ claims قابل‌مشاهده برای فراخوان فعلی (برای مقایسه با آنچه
-- کلاینت واقعاً می‌فرستد)
create or replace function public.debug_current_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
grant execute on function public.debug_current_claims() to anon, authenticated;
