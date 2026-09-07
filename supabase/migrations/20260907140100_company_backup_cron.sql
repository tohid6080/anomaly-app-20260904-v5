-- =============================================================================
-- زمان‌بندیِ Job روزانه‌ی Backup خودکارِ شرکت‌ها  (pg_cron)
-- =============================================================================
-- پیش‌نیاز: Migration قبلی (20260907140000_company_backup_system.sql) اجرا
-- شده باشد — آن migration وجودِ pg_cron / pg_net را الزامی می‌کند، پس اینجا
-- schema «cron» قطعاً موجود است.
--
-- Secretهای Vault که تابعِ dispatch در زمانِ اجرا لازم دارد (نام‌های ثابت):
--   backup_edge_base_url   مثلاً https://<PROJECT-REF>.supabase.co/functions/v1
--   backup_cron_secret     همان مقدارِ env به نامِ BACKUP_CRON_SECRET روی Edge Functionها
-- اگر این‌ها نباشند، Job خطا نمی‌دهد؛ فقط dispatch یک نتیجه‌ی
-- {"ok":false,"error":"vault secrets ... missing"} برمی‌گرداند.
-- =============================================================================

do $$
begin
  -- هشدارِ اطلاعاتیِ اختیاری اگر Secretها هنوز در Vault نیستند (بلوکه نمی‌کند)
  begin
    if not exists (select 1 from vault.decrypted_secrets where name = 'backup_edge_base_url')
       or not exists (select 1 from vault.decrypted_secrets where name = 'backup_cron_secret') then
      raise notice 'توجه: backup_edge_base_url / backup_cron_secret هنوز در Vault نیستند — Job ثبت می‌شود ولی تا افزودنِ آن‌ها کاری نمی‌کند.';
    end if;
  exception when others then
    raise notice 'بررسیِ Vault ممکن نشد (بی‌اهمیت) — ادامه‌ی ثبتِ Job.';
  end;

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
end $$;
