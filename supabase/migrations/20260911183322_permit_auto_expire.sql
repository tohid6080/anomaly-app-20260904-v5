-- انقضایِ خودکارِ مجوزهای کار — تا الان وضعیتِ «expired» در ماشینِ حالت تعریف
-- شده بود ولی هیچ مکانیزمی که واقعاً به آن برساند نبود. اینجا یک تابعِ
-- SQL که مجوزهای active با valid_until گذشته را expired می‌کند، به‌همراهِ
-- یک ردیفِ ممیزیِ خودکار (actor='system')، و یک pg_cron که هر روز صدایش می‌زند.
-- پیش‌نیاز: 20260907140000_company_backup_system.sql (pg_cron/pg_net + pgcrypto).

create or replace function public.expire_overdue_permits() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with expired as (
    update public.permits
       set status = 'expired', updated_at = now()
     where status = 'active'
       and valid_until is not null
       and valid_until < current_date
    returning id, company_id
  )
  insert into public.permit_audit (id, permit_id, company_id, action, actor, detail)
  select gen_random_uuid()::text, id, company_id, 'expired', 'system', 'انقضای خودکار (پایان اعتبار)'
    from expired;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.expire_overdue_permits() is
  'مجوزهای active که valid_until آن‌ها گذشته را expired می‌کند؛ توسطِ pg_cron روزانه صدا زده می‌شود.';

do $$
begin
  begin
    perform cron.unschedule('permits-expire-daily');
  exception when others then
    null;
  end;

  -- هر روز ساعت ۰۰:۰۵ UTC
  perform cron.schedule(
    'permits-expire-daily',
    '5 0 * * *',
    'select public.expire_overdue_permits();'
  );
end $$;
