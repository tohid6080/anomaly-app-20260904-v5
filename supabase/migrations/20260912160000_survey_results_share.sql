-- فاز ۳ ماژولِ «نظرسنجی و آزمون HSE» — اشتراکِ عمومیِ نتایجِ تجمیعی.
-- توکنِ جداگانه تا خاموش/روشن‌کردنِ اشتراکِ نتایج به لینکِ پاسخ‌دهی کاری نداشته
-- باشد. صفحهٔ عمومیِ نتایج فقط داده‌ی تجمیعی می‌دهد؛ هیچ پاسخِ فردی/هویتی.

alter table public.surveys add column if not exists results_token uuid not null default gen_random_uuid();
create unique index if not exists surveys_results_token_idx on public.surveys (results_token);

comment on column public.surveys.results_token is
  'توکنِ لینکِ عمومیِ نتایجِ تجمیعی (#survey-results/<token>) — مستقل از public_token.';
