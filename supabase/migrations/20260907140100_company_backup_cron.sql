-- =============================================================================
-- زمان‌بندیِ Job روزانه‌ی Backup خودکارِ شرکت‌ها  (pg_cron)
-- =============================================================================
-- ⚠️ این migration را فقط بعد از این دو کار اجرا کنید:
--
--   1) افزودنِ سکرت‌ها به Supabase Vault (Dashboard → Project Settings → Vault،
--      یا با SQL زیر — مقادیر واقعیِ پروژه را جایگزین کنید):
--
--        select vault.create_secret(
--          'https://<PROJECT-REF>.supabase.co/functions/v1',
--          'backup_edge_base_url',
--          'Base URL برای فراخوانیِ Edge Functionهای Backup'
--        );
--        select vault.create_secret(
--          '<یک رشته‌ی تصادفیِ قوی>',
--          'backup_cron_secret',
--          'سکرتِ مشترک بین cron و Edge Functionهای Backup'
--        );
--
--   2) ست‌کردنِ همان مقدارِ backup_cron_secret به‌عنوان env روی Edge Functionها:
--
--        supabase secrets set BACKUP_CRON_SECRET='<همان رشته‌ی بالا>'
--
-- بدون این دو، تابعِ dispatch_company_backups بی‌اثر برمی‌گردد (خطا نمی‌دهد).
-- =============================================================================

-- اگر Job قبلاً ثبت شده، اول حذفش کن (idempotent)
do $$
begin
  perform cron.unschedule('company-backups-daily');
exception when others then
  null;
end $$;

-- هر روز ساعت ۰۲:۳۰ UTC
select cron.schedule(
  'company-backups-daily',
  '30 2 * * *',
  $$ select public.dispatch_company_backups(); $$
);
