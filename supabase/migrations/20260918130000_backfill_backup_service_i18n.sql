-- پرکردنِ name_en/name_de/description_en/description_de برایِ ۳ خدمتِ
-- پشتیبان‌گیری (svc-backup-weekly/monthly/yearly) — این سه ردیف در
-- 20260918110000 از قلم افتاده بودند چون در آن زمان فقط ۴ خدمتِ اولیه
-- (svc-support-247/onsite/storage-50/tardad) بررسی شده بود؛ کاربر با
-- اسکرین‌شاتِ واقعیِ صفحه تأیید کرد این سه هنوز فارسی‌اند.
update public.services set
  name_en = 'Weekly Backup', name_de = 'Wöchentliche Datensicherung',
  description_en = 'Weekly backup of your company''s data', description_de = 'Wöchentliche Sicherung der Unternehmensdaten'
  where id = 'svc-backup-weekly';
update public.services set
  name_en = 'Monthly Backup', name_de = 'Monatliche Datensicherung',
  description_en = 'Monthly backup of your company''s data', description_de = 'Monatliche Sicherung der Unternehmensdaten'
  where id = 'svc-backup-monthly';
update public.services set
  name_en = 'Yearly Backup', name_de = 'Jährliche Datensicherung',
  description_en = 'Yearly backup of your company''s data', description_de = 'Jährliche Sicherung der Unternehmensdaten'
  where id = 'svc-backup-yearly';

-- انتشارِ مجددِ عکسِ‌فوری — دقیقاً همان منطقِ 20260918120000، چون هر
-- Migration ای که جدولِ زنده را عوض می‌کند باید عکسِ‌فوریِ منتشرشده را هم
-- دوباره بسازد، وگرنه صفحه‌ی مشتری همچنان نسخه‌ی قدیمی را می‌بیند.
do $$
declare
  snapshot jsonb;
begin
  snapshot := jsonb_build_object(
    'v', 1,
    'publishedAt', now(),
    'publishedBy', 'migration:20260918130000',
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
  values ('module_pricing_snapshot', snapshot::text, null, now(), 'migration:20260918130000')
  on conflict (key) do update set
    value_text = excluded.value_text,
    value_numeric = excluded.value_numeric,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
end $$;
