-- پرکردنِ label_en/label_de برایِ ماژولِ PSSR — کلیدِ واقعیِ این ردیف در
-- دیتابیسِ زنده pssrManagement است، نه pssr (که در migrationِ اولیهٔ
-- ساختِ ماژول seed شده بود؛ ظاهراً بعداً از کنسولِ SuperAdmin ویرایش/
-- بازسازی شده و کلیدش تغییر کرده). Migrationِ 20260918110000 با فیلترِ
-- module_key='pssr' صفر ردیف را مچ کرد و بی‌صدا هیچ کاری نکرد — با یک
-- کوئریِ مستقیم به جدولِ زنده کشف شد. این آخرین رکوردِ باقی‌مانده بود
-- (تأیید شد با کوئریِ کاملِ is_active=true برای هر دو جدولِ module_prices
-- و services — بعدِ این، هیچ ردیفی خالی نمانده).
update public.module_prices set
  label_en = 'Pre-Startup Safety Review (PSSR)',
  label_de = 'Sicherheitsüberprüfung vor Inbetriebnahme (PSSR)'
  where module_key = 'pssrManagement';

do $$
declare
  snapshot jsonb;
begin
  snapshot := jsonb_build_object(
    'v', 1,
    'publishedAt', now(),
    'publishedBy', 'migration:20260918140000',
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
  values ('module_pricing_snapshot', snapshot::text, null, now(), 'migration:20260918140000')
  on conflict (key) do update set
    value_text = excluded.value_text,
    value_numeric = excluded.value_numeric,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
end $$;
