-- «ابزارهای سریع HSE» تا امروز صرف‌نظر از پلن، برای همه‌ی شرکت‌ها همیشه در
-- دسترس بود (isModuleInPlan یک استثنای کدی برایش داشت). حالا که quickTools
-- به‌شکل عادی وارد PLAN_FEATURES شده و هر ابزار هم زیرمجموعه‌ی جدا و
-- انتخاب‌شدنی دارد (کلیدها دقیقاً برابر با id هر ابزار در quickToolsData.jsx:
-- unit-converter / ltifr / trir / noise / crane-load / sling-angle /
-- rad-zones / rad-distance / lifting-plan)، بدون این backfill هر پلنِ
-- موجود که features غیرخالی دارد یک‌شبه کل جعبه‌ابزار را از دست می‌داد.
--
-- این مهاجرت فقط پلن‌هایی را دست می‌زند که features‌شان آرایه است (null یعنی
-- «بدون محدودیت» و اصلاً نیازی به backfill ندارد — isModuleInPlan همان‌طور
-- باز می‌ماند).

-- ۱) هر پلنِ موجود همان ۸ ابزارِ همیشه-رایگان + خودِ quickTools را می‌گیرد —
--    دقیقاً همان چیزی که پیش از این بدون هیچ گیت‌ی در دسترس بود.
update public.plans
set features = (
  select jsonb_agg(distinct elem)
  from jsonb_array_elements_text(
    features || '["quickTools","unit-converter","ltifr","trir","noise","crane-load","sling-angle","rad-zones","rad-distance"]'::jsonb
  ) as elem
)
where features is not null
  and jsonb_typeof(features) = 'array';

-- ۲) «طراحی نقشه‌ی لیفتینگ» قبلاً یک ماژولِ جداگانه با گیتِ خودش بود
--    (کلید liftingPlan). فقط پلن‌هایی که آن را صراحتاً داشتند، معادلِ
--    زیرابزارِ جدیدش (lifting-plan) را هم می‌گیرند — نه همه‌ی پلن‌ها، تا
--    محدودیتِ قبلی برای بقیه دست‌نخورده بماند.
update public.plans
set features = (
  select jsonb_agg(distinct elem)
  from jsonb_array_elements_text(features || '["lifting-plan"]'::jsonb) as elem
)
where features is not null
  and jsonb_typeof(features) = 'array'
  and features @> '["liftingPlan"]'::jsonb;
