-- انتشارِ مجددِ عکسِ فوریِ قیمت‌گذاری بعدِ پرکردنِ label_en/label_de
-- =============================================================================
-- کشف‌شده بعدِ گزارشِ کاربر که مشکل هنوز حل نشده: صفحه‌ی خریدِ مشتری
-- (SubscriptionGate.jsx → loadModulePrices/loadServices بدونِ live:true)
-- به‌جایِ جدول‌هایِ زنده، «عکسِ فوریِ منتشرشده» در
-- system_settings.module_pricing_snapshot را می‌خواند (مکانیزمِ عمدیِ
-- «Save ≠ Publish» که نشستِ موبایل ساخته بود). Migrationِ قبلیِ من
-- (20260918110000) فقط جدول‌هایِ زنده را پر کرد؛ آن عکسِ فوری از قبل از
-- این backfill گرفته شده بود، پس هنوز labelEn/labelDe خالی داشت — دقیقاً
-- همان چیزی که کاربر «بازهم درست نشد» گزارش داد.
--
-- این migration دقیقاً همان شکلِ JSON را می‌سازد که publishPricingSnapshot()
-- در pricingApi.js می‌سازد (فیلدها/نام‌ها عیناً یکسان، چون همان تابع این
-- عکسِ فوری را در سمتِ کلاینت parse می‌کند) — معادلِ زدنِ دکمه‌ی «انتشار»
-- در کنسولِ قیمت‌گذاری، فقط از طریقِ SQL.
do $$
declare
  snapshot jsonb;
begin
  snapshot := jsonb_build_object(
    'v', 1,
    'publishedAt', now(),
    'publishedBy', 'migration:20260918120000',
    'modules', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'moduleKey', module_key,
        'label', coalesce(label, ''),
        'labelEn', coalesce(label_en, ''),
        'labelDe', coalesce(label_de, ''),
        'priceMonthly', coalesce(price_monthly, 0),
        'priceYearly', coalesce(price_yearly, 0),
        'priceMonthlyUsd', coalesce(price_monthly_usd, 0),
        'priceYearlyUsd', coalesce(price_yearly_usd, 0),
        'priceMonthlyEur', coalesce(price_monthly_eur, 0),
        'priceYearlyEur', coalesce(price_yearly_eur, 0),
        'isFree', coalesce(is_free, false),
        'requires', coalesce(requires, '[]'::jsonb),
        'sortOrder', coalesce(sort_order, 0)
      ) order by sort_order asc, module_key asc), '[]'::jsonb)
      from public.module_prices
      where is_active = true
    ),
    'services', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', coalesce(name, ''),
        'nameEn', coalesce(name_en, ''),
        'nameDe', coalesce(name_de, ''),
        'description', coalesce(description, ''),
        'descriptionEn', coalesce(description_en, ''),
        'descriptionDe', coalesce(description_de, ''),
        'priceWeekly', coalesce(price_weekly, 0),
        'priceMonthly', coalesce(price_monthly, 0),
        'priceYearly', coalesce(price_yearly, 0),
        'priceWeeklyUsd', coalesce(price_weekly_usd, 0),
        'priceMonthlyUsd', coalesce(price_monthly_usd, 0),
        'priceYearlyUsd', coalesce(price_yearly_usd, 0),
        'priceWeeklyEur', coalesce(price_weekly_eur, 0),
        'priceMonthlyEur', coalesce(price_monthly_eur, 0),
        'priceYearlyEur', coalesce(price_yearly_eur, 0),
        'period', coalesce(period, 'monthly'),
        'sortOrder', coalesce(sort_order, 0)
      ) order by sort_order asc, name asc), '[]'::jsonb)
      from public.services
      where is_active = true
    )
  );

  insert into public.system_settings (key, value_text, value_numeric, updated_at, updated_by)
  values ('module_pricing_snapshot', snapshot::text, null, now(), 'migration:20260918120000')
  on conflict (key) do update set
    value_text = excluded.value_text,
    value_numeric = excluded.value_numeric,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
end $$;
