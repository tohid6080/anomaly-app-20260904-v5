-- افزودنِ نوعِ «سایر» به فیلدِ سفارشیِ ارزیابیِ پیمانکار
-- =============================================================================
-- کاربر خواست برایِ «افزودن شاخص سفارشی» یک گزینه‌ی «سایر» باشد که امتیازش
-- در فرمِ ارزیابی به‌صورت کاملاً دستی (۰ تا ۱۰۰) وارد شود و با یک توضیحِ
-- الزامی شفاف‌سازی شود — برخلافِ سه نوعِ قبلی (number/percent/boolean) که
-- قرار بود بر پایه‌ی هدف/فرمول محاسبه شوند. این migration مقدارِ 'other' را
-- به Check Constraint جدولِ contractor_eval_custom_fields اضافه می‌کند.
-- جدول کاملاً تازه است (هیچ شرکتی هنوز از این قابلیت استفاده نکرده)، پس
-- تغییرِ مستقیمِ Constraint امن است، بدونِ نیاز به داده‌ی موجود را migrate کرد.
alter table public.contractor_eval_custom_fields
  drop constraint if exists contractor_eval_custom_fields_field_type_check;
alter table public.contractor_eval_custom_fields
  add constraint contractor_eval_custom_fields_field_type_check
  check (field_type in ('number', 'percent', 'boolean', 'select', 'other'));
