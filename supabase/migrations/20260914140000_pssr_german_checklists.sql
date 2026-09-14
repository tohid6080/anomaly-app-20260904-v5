-- تکمیلِ دوزبانگیِ چک‌لیست‌های PSSR به سه‌زبانه: بعد از اضافه‌شدنِ فارسی
-- (20260914130000)، حالا آلمانی هم اضافه می‌شود — سامانه از قبل حالتِ
-- زبانِ آلمانی دارد (translations.de در LanguageContext)، پس چک‌لیست‌ها
-- هم باید با اون هماهنگ بشن. دقیقاً همون الگوی افزودنیِ ستونِ «_fa»:
-- ستون‌های انگلیسی/فارسیِ موجود دست‌نخورده می‌مانند، فقط «_de» اضافه می‌شود.

alter table public.pssr_requirement_templates
  add column if not exists group_title_de text,
  add column if not exists requirement_text_de text not null default '';

alter table public.pssr_action_items
  add column if not exists requirement_text_de text not null default '';
