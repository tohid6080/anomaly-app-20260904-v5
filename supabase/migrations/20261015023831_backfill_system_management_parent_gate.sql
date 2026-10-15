-- ریشه‌ی واقعیِ باگِ «مدیریت آموزش دیده نمی‌شود» (و هر زیرماژولِ دیگرِ
-- «مدیریت سیستم»، برایِ اکثرِ شرکت‌ها)
-- =============================================================================
-- دادهٔ واقعیِ تولید نشان داد: خودِ کلیدِ والدِ «systemManagement» هیچ‌وقت در
-- کاتالوگِ module_prices ثبت نشده بود — پس هیچ مسیرِ ادمینی (نه تک‌تک
-- Add Module، نه «افزودنِ همهٔ ماژول‌ها») هرگز نمی‌توانست آن را به شرکتی
-- اعطا کند؛ فقط Migrationِ یک‌بارهٔ 20260914172900 (که از plans.features
-- می‌خواند) توانسته بود آن را برایِ چند شرکتِ خیلی قدیمی ثبت کند. نتیجه:
-- اکثرِ شرکت‌ها زیرماژول‌هایی مثلِ trainingManagement را «فعال» داشتند
-- (از طریقِ «افزودنِ همهٔ ماژول‌ها» که این‌ها را چون در GATED_MODULE_SUBS
-- زیرِ systemManagement تعریف نشده بودند، مسطح/مستقل می‌دید) ولی چون
-- systemManagementِ والد را نداشتند، کلِ بخشِ «مدیریت سیستم» (نه فقط
-- آموزش) در سایدبار مخفی می‌ماند.
--
-- این Migration دو کار می‌کند:
--   ۱) systemManagement را به کاتالوگِ module_prices اضافه می‌کند — رایگان
--      (is_free=true)، چون خودش فقط یک گروه‌بندیِ ظرفیتی است، نه یک
--      ماژولِ مستقلِ قیمت‌گذاری‌شونده (قیمتِ واقعی رویِ زیرماژول‌هایش است).
--   ۲) برایِ هر شرکتی که از قبل حداقلِ یکی از زیرماژول‌هایِ شناخته‌شدهٔ
--      «مدیریت سیستم» را فعال دارد ولی خودِ والد را ندارد، همین الان والد
--      را هم اعطا می‌کند — دقیقاً همان قاعده‌ی Backfillِ idempotentِ قبلی
--      (contractorEvalSettings/trainingManagement)، این‌بار برایِ خودِ گیتِ
--      سطحِ‌بالا.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('systemManagement', 'مدیریت سیستم', 0, 0, true, 59)
    on conflict (module_key) do nothing;
  end if;
end $$;

do $$
declare
  company record;
begin
  for company in
    select distinct company_id from public.company_modules
    where is_active = true and module_key in (
      'permissionManagement', 'jobPositionManagement', 'scaffoldCodeManagement',
      'trainingManagement', 'chatAccessManagement', 'hcmsMatrixManagement',
      'effectivenessThresholds', 'anomalyCategoryManagement', 'contractorEvalSettings'
    )
  loop
    insert into public.company_modules
      (company_id, module_key, is_active, starts_at, price_monthly, price_yearly, source, created_by)
    values
      (company.company_id, 'systemManagement', true, now(), 0, 0, 'admin_grant', 'backfill_system_management_parent')
    on conflict (company_id, module_key) do nothing;
  end loop;
end $$;
