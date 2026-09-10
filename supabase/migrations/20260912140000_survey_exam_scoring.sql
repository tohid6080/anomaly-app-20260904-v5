-- فاز ۲ ماژولِ «نظرسنجی و آزمون HSE» — حالتِ آزمون و نمره‌دهی.
-- نمره سمتِ سرور (Edge Function submit-survey-response) محاسبه و اینجا ذخیره
-- می‌شود؛ کلیدِ پاسخ (config.correct) هرگز به کلاینت فرستاده نمی‌شود.

alter table public.survey_responses add column if not exists score      numeric;
alter table public.survey_responses add column if not exists max_score  numeric;
alter table public.survey_responses add column if not exists percent    numeric;
alter table public.survey_responses add column if not exists passed     boolean;

comment on column public.survey_responses.percent is
  'درصدِ نمرهٔ آزمون (0..100). برای پاسخ‌های حالتِ «نظرسنجی» تهی است.';

-- برچسبِ ماژول در کنسولِ قیمت‌گذاری با تغییرِ نام هماهنگ شود
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    update public.module_prices set label = 'نظرسنجی و آزمون HSE'
     where module_key = 'hseSurvey' and label = 'نظرسنجی HSE';
  end if;
end $$;
