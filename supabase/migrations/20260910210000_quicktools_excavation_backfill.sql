-- ابزارِ «محاسبه‌گرِ شیب و عرضِ ایمنِ گودبرداری» (excavation-calculator) به
-- quickToolsData.jsx و PLAN_FEATURES.quickTools.sub اضافه شد. طبقِ همان
-- منطقِ دو migrationِ backfillِ قبلی (20260910120000 و 20260910180000): بدونِ
-- این backfill هیچ پلنِ موجودی این ابزار را نمی‌بیند، درحالی‌که خودِ ماژول
-- (excavation_assessments/_audit/_standard_profiles که در
-- 20260910200000_create_excavation_module.sql ساخته شدند) از هم‌اکنون فعال
-- است.

update public.plans
set features = (
  select jsonb_agg(distinct elem)
  from jsonb_array_elements_text(
    features || '["excavation-calculator"]'::jsonb
  ) as elem
)
where features is not null
  and jsonb_typeof(features) = 'array';
