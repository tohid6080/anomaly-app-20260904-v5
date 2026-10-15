-- Backfillِ دسترسیِ ماژولِ «مدیریت آموزش» (trainingManagement) برایِ
-- شرکت‌های از‌قبل‌موجود
-- =============================================================================
-- همان کلاسِ باگِ Migrationِ 20260919140000 (contractorEvalSettings): این
-- زیرماژول یک کلیدِ تازه در company_modules است. isModuleInPlan در shared.js
-- وقتی planFeatures شرکت null باشد (یعنی آن شرکت هیچ ردیفی در
-- company_modules ندارد) fail-open است و همه‌چیز را نشان می‌دهد — ولی هر
-- شرکتی که از قبل حداقل یک ردیفِ فعالِ «مدیریت سیستم» دارد، از این پس
-- fail-closed است: trainingManagement تا امروز اصلاً وجود نداشت، پس هیچ
-- شرکتی — even شرکت‌هایی که سوپرادمین همین امروز آن را از «مدیریت ماژول‌ها»
-- روشن کرده — ردیفِ واقعی‌اش را نداشت و در سایدبار (زیرِ «مدیریت سیستم»)
-- دیده نمی‌شد.
--
-- Idempotent (on conflict do nothing) — دوباره‌اجرا بی‌خطر است و هیچ
-- انتخابِ بعدیِ SuperAdmin (مثلاً غیرفعال‌کردنِ دستی) را بازنویسی نمی‌کند.
-- قیمت صفر: این یک اعطایِ رایگانِ اولیه است، نه خط‌فاکتورِ تازه.

do $$
declare
  company record;
begin
  for company in
    select distinct company_id from public.company_modules
    where is_active = true and module_key = 'systemManagement'
  loop
    insert into public.company_modules
      (company_id, module_key, is_active, starts_at, price_monthly, price_yearly, source, created_by)
    values
      (company.company_id, 'trainingManagement', true, now(), 0, 0, 'admin_grant', 'backfill_training_management')
    on conflict (company_id, module_key) do nothing;
  end loop;
end $$;
