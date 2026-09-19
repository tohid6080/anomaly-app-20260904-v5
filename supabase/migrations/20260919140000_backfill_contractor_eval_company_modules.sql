-- Backfillِ دسترسیِ ماژولِ جدید «ارزیابی عملکرد HSE پیمانکاران» برایِ
-- شرکت‌های از‌قبل‌موجود
-- =============================================================================
-- علتِ محتملِ گزارشِ کاربر («ماژول دیده نمی‌شود»، بعدِ Deploy موفق): این
-- ماژول یک کلیدِ کاملاً تازه در company_modules است. isModuleInPlan در
-- shared.js وقتی planFeatures شرکت null باشد (یعنی آن شرکت هیچ ردیفی در
-- company_modules ندارد) fail-open است و همه‌چیز را نشان می‌دهد — ولی هر
-- شرکتی که از قبل حداقل یک ردیفِ فعال در company_modules دارد (یعنی از
-- طریقِ Pricing Console واقعاً پلن گرفته)، از این پس fail-closed است: هر
-- کلیدی که آنجا نباشد، مخفی می‌ماند. چون این ماژول تا امروز اصلاً وجود
-- نداشت، هیچ شرکتی — even شرکت‌هایی که کلِ ماژول‌ها را خریده‌اند — ردیفی
-- برایش ندارند. دقیقاً همان الگویی که Migrationِ 20260916051500 برایِ
-- زیرماژول‌های تازه‌گیت‌شده بست.
--
-- Idempotent (on conflict do nothing) — دوباره‌اجرا بی‌خطر است و هیچ
-- انتخابِ بعدیِ SuperAdmin (مثلاً غیرفعال‌کردنِ دستی) را بازنویسی نمی‌کند.
-- قیمت صفر: این یک اعطایِ رایگانِ اولیه است، نه خط‌فاکتورِ تازه؛ SuperAdmin
-- هر وقت خواست می‌تواند از Pricing Console غیرفعال/قیمت‌گذاری کند.

do $$
declare
  company record;
begin
  -- ۱) خودِ ماژول: برایِ هر شرکتی که حداقل یک ردیفِ فعال دارد (یعنی از
  -- قبل واردِ سیستمِ پلن‌محورِ company_modules شده، نه شرکتِ fail-open خامِ
  -- بدونِ هیچ ردیف).
  for company in
    select distinct company_id from public.company_modules where is_active = true
  loop
    insert into public.company_modules
      (company_id, module_key, is_active, starts_at, price_monthly, price_yearly, source, created_by)
    values
      (company.company_id, 'contractorHseEvaluation', true, now(), 0, 0, 'admin_grant', 'backfill_contractor_eval')
    on conflict (company_id, module_key) do nothing;
  end loop;

  -- ۲) زیرماژولِ «تنظیمات ارزیابی پیمانکار» برایِ هر شرکتی که «مدیریت
  -- سیستم» را فعال دارد — دقیقاً همان قاعده‌ی زیرماژول‌های دیگرِ همین بخش.
  for company in
    select distinct company_id from public.company_modules
    where is_active = true and module_key = 'systemManagement'
  loop
    insert into public.company_modules
      (company_id, module_key, is_active, starts_at, price_monthly, price_yearly, source, created_by)
    values
      (company.company_id, 'contractorEvalSettings', true, now(), 0, 0, 'admin_grant', 'backfill_contractor_eval')
    on conflict (company_id, module_key) do nothing;
  end loop;
end $$;
