-- تشخیصی موقت: بررسی RLS روی tripod_corrective_actions / tripod_analyses / incidents
-- قبل از merge کردن‌شان در لیست اقدامات اصلاحیِ ماژول عدم انطباق‌ها.
-- در همین session بعد از استفاده DROP می‌شود.
create or replace function debug_check_tripod_incident_rls()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', tablename, 'policy', policyname, 'cmd', cmd, 'roles', roles, 'qual', qual
      )), '[]'::jsonb)
      from pg_policies
      where tablename in ('tripod_corrective_actions', 'tripod_analyses', 'incidents')
    ),
    'rls_enabled', (
      select coalesce(jsonb_agg(jsonb_build_object('table', relname, 'rls_enabled', relrowsecurity)), '[]'::jsonb)
      from pg_class
      where relname in ('tripod_corrective_actions', 'tripod_analyses', 'incidents')
    )
  );
$$;

grant execute on function debug_check_tripod_incident_rls() to anon, authenticated;
