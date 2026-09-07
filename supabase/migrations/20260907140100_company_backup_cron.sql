-- =============================================================================
-- زمان‌بندیِ Job روزانه‌ی Backup خودکارِ شرکت‌ها  (pg_cron)
-- =============================================================================
-- پیش‌نیازها (یک‌بار):
--
--   1) اکستنشن‌های pg_cron و pg_net نصب شده باشند (Migration قبلی تلاش می‌کند؛
--      اگر با خطای مجوز رد شد، از Dashboard → Database → Extensions فعالشان کن).
--
--   2) دو سکرت در Supabase Vault موجود باشند (مقادیر واقعیِ پروژه):
--        - backup_edge_base_url   مثلاً https://<PROJECT-REF>.supabase.co/functions/v1
--        - backup_cron_secret     همان مقدارِ env به نامِ BACKUP_CRON_SECRET روی Edge Functionها
--
-- اگر pg_cron هنوز نصب نباشد، این فایل بی‌اثر رد می‌شود (خطا نمی‌دهد) و در
-- اجرای بعدیِ supabase db push دوباره تلاش می‌شود.
-- =============================================================================

do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron نصب نیست — زمان‌بندی ثبت نشد. بعد از فعال‌سازی pg_cron دوباره supabase db push بزن.';
    return;
  end if;

  -- idempotent: اگر Job قبلاً ثبت شده، اول حذفش کن
  begin
    perform cron.unschedule('company-backups-daily');
  exception when others then
    null;
  end;

  -- هر روز ساعت ۰۲:۳۰ UTC
  perform cron.schedule(
    'company-backups-daily',
    '30 2 * * *',
    'select public.dispatch_company_backups();'
  );
  raise notice 'Job روزانه‌ی company-backups-daily ثبت شد.';
end $$;
