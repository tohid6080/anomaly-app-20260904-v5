-- Backfillِ زیرماژول‌هایِ «ابزارهای سریع HSE» برایِ شرکت‌هایی که والدشان
-- از قبل فعال است
-- =============================================================================
-- دقیقاً همان وضعیتِ شاخص‌های پراکتیو (ر.ک. 20260916060000): خودِ گیت از
-- قبل وجود داشت — QuickToolsDashboard.jsx همیشه هر ابزار را با
-- isModuleInPlan(planFeatures, t.id) جدا چک می‌کرد. فقط ۴ ابزار
-- (lifting-plan/excavation-calculator/energy-calculator/fleet-fuel-calculator)
-- در module_prices ردیفِ قیمت داشتند و در دراپ‌داونِ تخت قابل‌افزودن بودند؛
-- بقیه‌ی ۱۹ ابزار هیچ راهی برایِ گرنت‌شدن نداشتند.

do $$
declare
  parent_row  record;
  sub_key     text;
  sub_price   record;
  qt_subs text[] := array[
    'unit-converter', 'ltifr', 'trir', 'noise', 'crane-load', 'sling-angle',
    'sling-angle-geo', 'sling-tension', 'shackle-load', 'load-weight', 'load-cg',
    'crane-radius-capacity', 'ground-pressure', 'jack-load', 'lift-point-load',
    'rigging-wll-util', 'lift-risk-checklist', 'rad-zones', 'rad-distance',
    'lifting-plan', 'excavation-calculator', 'energy-calculator', 'fleet-fuel-calculator'
  ];
begin
  -- ۱) هرجا «quickTools» (والد) فعال است، هر ۲۳ ابزار را هم فعال کن —
  -- قیمتِ هرکدام از module_prices اگر ردیف داشت (همان ۴تایِ قدیمی، با
  -- همان قیمتِ واقعیِ تنظیم‌شده)، وگرنه صفر — بقیه‌ی ابزارها همیشه رایگان
  -- بوده‌اند، صرفاً بی‌راهِ گرنت‌شدن.
  for parent_row in
    select company_id, starts_at, ends_at
    from public.company_modules
    where is_active = true and module_key = 'quickTools'
  loop
    foreach sub_key in array qt_subs
    loop
      select price_monthly, price_yearly into sub_price
        from public.module_prices where module_key = sub_key;

      insert into public.company_modules
        (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      values
        (parent_row.company_id, sub_key, true, parent_row.starts_at, parent_row.ends_at,
         coalesce(sub_price.price_monthly, 0), coalesce(sub_price.price_yearly, 0),
         'admin_grant', 'backfill_sub_modules')
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;

  -- ۲) اگر شرکتی یکی از این ۲۳ ابزار را از قبل دارد (مثلاً از مسیرِ
  -- خریدِ تک‌ماژولیِ قدیمی روی یکی از آن ۴تا) ولی خودِ «quickTools» را
  -- ندارد، خودِ «quickTools» را هم (رایگان) فعال کن — وگرنه نه ردیفی
  -- برایِ نمایشِ تودرتو در «بخشِ شرکت‌ها» دارد، نه اصلاً منویِ «ابزارهای
  -- سریع» در سایدبار/موبایل ظاهر می‌شود (HSE_MODULES هم مثلِ همه‌جا اول
  -- خودِ «quickTools» را چک می‌کند).
  insert into public.company_modules (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
  select distinct cm.company_id, 'quickTools', true, now(), null, 0, 0, 'admin_grant', 'backfill_sub_modules'
  from public.company_modules cm
  where cm.is_active = true
    and cm.module_key = any (qt_subs)
    and not exists (
      select 1 from public.company_modules cm2
      where cm2.company_id = cm.company_id and cm2.module_key = 'quickTools'
    )
  on conflict (company_id, module_key) do nothing;
end $$;
