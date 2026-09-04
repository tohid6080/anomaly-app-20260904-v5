-- تشخیصی موقت — قید‌های CHECK واقعیِ payments (و بقیه‌ی جدول‌های لمس‌شده)
-- که diagnostic قبلی (فقط information_schema.columns + pg_policies)
-- نگرفته بود؛ همان علتِ واقعیِ خطای 23514. بعد از استفاده حذف می‌شود.
create or replace function public.debug_check_constraints()
returns table(tbl text, constraint_name text, definition text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    rel.relname::text,
    con.conname::text,
    pg_get_constraintdef(con.oid)::text
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname in ('payments', 'companies', 'company_subscription_history', 'error_reports')
    and con.contype = 'c'
  order by rel.relname, con.conname;
$$;
grant execute on function public.debug_check_constraints() to anon, authenticated;
