-- =============================================================================
-- افزودنِ دورهٔ «هفتگی» به خدمات + آماده‌سازیِ خدمتِ «پشتیبان‌گیری»
-- =============================================================================
-- تا امروز period یک ماژول فقط monthly/yearly/once بود. پشتیبان‌گیری قبلاً
-- (در مدل Plan-Based) سه‌گزینه‌ای هفتگی/ماهانه/سالانه بود؛ حالا در ماژول
-- Module-Based همان سه‌گزینه به‌صورت سه ردیفِ مستقل در جدولِ services اضافه
-- می‌شود — قیمتِ هر ردیف واقعاً مالِ همان دوره است، نه وابسته به تاگلِ کلیِ
-- ماهانه/سالانهٔ سبدِ خرید (که قبلاً computeCartTotal اشتباهاً از آن استفاده
-- می‌کرد؛ اصلاحش در pricingApi.js انجام شده).
-- =============================================================================

alter table public.services add column if not exists price_weekly numeric not null default 0;

alter table public.services drop constraint if exists services_period_check;
alter table public.services add constraint services_period_check check (period in ('weekly', 'monthly', 'yearly', 'once'));

comment on column public.services.price_weekly is
  'قیمتِ هفتگی این خدمت — فقط وقتی period=''weekly'' معنا دارد.';

-- سه ردیفِ «پشتیبان‌گیری» — قیمت ۰ (سوپرادمین از کنسولِ قیمت‌گذاری تنظیم می‌کند)
insert into public.services (id, name, description, period, price_weekly, price_monthly, price_yearly, sort_order) values
  ('svc-backup-weekly',  'پشتیبان‌گیریِ هفتگی', 'تهیهٔ نسخهٔ پشتیبان از اطلاعاتِ شرکت هر هفته', 'weekly',  0, 0, 0, 10),
  ('svc-backup-monthly', 'پشتیبان‌گیریِ ماهانه', 'تهیهٔ نسخهٔ پشتیبان از اطلاعاتِ شرکت هر ماه',   'monthly', 0, 0, 0, 11),
  ('svc-backup-yearly',  'پشتیبان‌گیریِ سالانه', 'تهیهٔ نسخهٔ پشتیبان از اطلاعاتِ شرکت هر سال',   'yearly',  0, 0, 0, 12)
on conflict (id) do nothing;
