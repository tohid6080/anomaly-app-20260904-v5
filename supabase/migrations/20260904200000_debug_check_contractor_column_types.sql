-- تشخیصی موقت: نوع دقیق ستون‌های contractors.id و corrective_actions.responsible_contractor_id
-- قبل از افزودن ستون‌های مشابه به tripod_corrective_actions. در همین session بعد از استفاده DROP می‌شود.
create or replace function debug_check_contractor_column_types()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'columns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', table_name, 'column', column_name, 'type', data_type, 'udt', udt_name, 'nullable', is_nullable
      )), '[]'::jsonb)
      from information_schema.columns
      where (table_name = 'contractors' and column_name = 'id')
         or (table_name = 'corrective_actions' and column_name in ('responsible_contractor_id', 'id'))
         or (table_name = 'tripod_corrective_actions' and column_name in ('id', 'analysis_id'))
    ),
    'fks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'table', conrelid::regclass::text, 'constraint', conname, 'def', pg_get_constraintdef(oid)
      )), '[]'::jsonb)
      from pg_constraint
      where conrelid = 'corrective_actions'::regclass and contype = 'f'
    )
  );
$$;

grant execute on function debug_check_contractor_column_types() to anon, authenticated;
