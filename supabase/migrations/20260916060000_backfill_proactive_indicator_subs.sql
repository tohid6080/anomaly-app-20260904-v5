-- Backfillِ زیرماژول‌هایِ «شاخص‌های پراکتیو HSE» برایِ شرکت‌هایی که والدشان
-- از قبل فعال است
-- =============================================================================
-- برخلافِ ۸ ماژولِ قبلی، این‌جا خودِ گیتِ زیرماژول‌به‌زیرماژول از قبل وجود
-- داشت — proactiveIndicatorsApi.js/loadActiveIndicators() از همیشه هر
-- شاخص را با isModuleInPlan(planFeatures, "accidentProneness"/"hseClimate"/
-- ind.key) جدا چک می‌کرد. تنها چیزی که کم بود، راهی برایِ ادمین برایِ
-- گرنت‌کردنِ این سه کلید بود («بخشِ شرکت‌ها» تا امروز فقط خودِ
-- «proactiveIndicators» را می‌شناخت، نه زیرماژول‌هایش را).
--
-- یعنی این گیت همین الان هم، قبل از این migration، هرجا planFeatures
-- محدود است (غیرِ null) این سه کلید را می‌طلبید — پس این backfill رگرسیونِ
-- تازه‌ای را جلو نمی‌گیرد (آن ریسک فقط برایِ ۸ ماژولِ قبلی بود که گیتِ
-- زیرماژولشان تازه اضافه شد)، بلکه یک نقصِ از قبل‌موجود را جبران می‌کند: هر
-- شرکتی که «proactiveIndicators» دارد ولی هیچ‌وقت این سه کلید را جداگانه
-- نگرفته (چون تا امروز هیچ UIای برایِ گرفتنش نبود)، اکنون هر سه را
-- می‌گیرد و می‌تواند بعداً هرکدام را جدا از «بخشِ شرکت‌ها» خاموش کند.

do $$
declare
  parent_row  record;
  sub_key     text;
  pi_subs text[] := array['accidentProneness', 'hseClimate', 'sbs'];
begin
  for parent_row in
    select company_id, starts_at, ends_at
    from public.company_modules
    where is_active = true and module_key = 'proactiveIndicators'
  loop
    foreach sub_key in array pi_subs
    loop
      insert into public.company_modules
        (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      values
        (parent_row.company_id, sub_key, true, parent_row.starts_at, parent_row.ends_at, 0, 0, 'admin_grant', 'backfill_sub_modules')
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;
end $$;
