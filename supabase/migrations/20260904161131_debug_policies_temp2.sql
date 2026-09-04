-- تشخیصی موقت (راند دوم) — چرا با اینکه policy با همان قرارداد بقیه‌ی
-- جدول‌ها بازنویسی شد، درج در error_reports هنوز 42501 می‌دهد. بلافاصله
-- بعد از استفاده حذف می‌شود.
create or replace function public.debug_list_policies2()
returns table(tablename text, policyname text, cmd text, permissive text, roles text, qual text, with_check text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select tablename::text, policyname::text, cmd::text, permissive::text, roles::text, qual::text, with_check::text
  from pg_policies
  where schemaname = 'public' and tablename in ('error_reports', 'anomalies')
  order by tablename, policyname;
$$;
grant execute on function public.debug_list_policies2() to anon, authenticated;

create or replace function public.debug_grants()
returns table(grantee text, table_name text, privilege_type text)
language sql
security definer
set search_path = public, pg_catalog, information_schema
as $$
  select grantee::text, table_name::text, privilege_type::text
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in ('error_reports', 'anomalies')
  and grantee in ('anon', 'authenticated')
  order by table_name, grantee, privilege_type;
$$;
grant execute on function public.debug_grants() to anon, authenticated;

create or replace function public.debug_company_check(p_company_id uuid)
returns table(claims jsonb, current_company_id_val uuid, is_super_admin_val boolean, would_match boolean)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb,
    current_company_id(),
    is_current_user_super_admin(),
    (p_company_id = current_company_id() or is_current_user_super_admin());
$$;
grant execute on function public.debug_company_check(uuid) to anon, authenticated;
