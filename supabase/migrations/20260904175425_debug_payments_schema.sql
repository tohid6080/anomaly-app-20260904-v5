-- تشخیصی موقت — بررسی دقیق ستون‌ها و RLS واقعیِ جدول‌های payments،
-- companies، company_subscription_history و system_settings قبل از هر
-- تغییری در سیستم پرداخت/اشتراک (طبق الزام صریح کاربر). بعد از استفاده حذف می‌شود.
create or replace function public.debug_payments_schema()
returns table(tbl text, col text, data_type text, is_nullable text, col_default text)
language sql
security definer
set search_path = public, pg_catalog, information_schema
as $$
  select table_name::text, column_name::text, data_type::text, is_nullable::text, column_default::text
  from information_schema.columns
  where table_schema = 'public' and table_name in ('payments', 'companies', 'company_subscription_history', 'system_settings')
  order by table_name, ordinal_position;
$$;
grant execute on function public.debug_payments_schema() to anon, authenticated;

create or replace function public.debug_payments_policies()
returns table(tablename text, policyname text, cmd text, permissive text, roles text, qual text, with_check text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select tablename::text, policyname::text, cmd::text, permissive::text, roles::text, qual::text, with_check::text
  from pg_policies
  where schemaname = 'public' and tablename in ('payments', 'companies', 'company_subscription_history', 'system_settings')
  order by tablename, cmd, policyname;
$$;
grant execute on function public.debug_payments_policies() to anon, authenticated;
