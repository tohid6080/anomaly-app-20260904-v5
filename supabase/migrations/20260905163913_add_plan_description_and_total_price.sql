-- «توضیحات» و «قیمت کلی» (خرید یک‌جا/دائمی — Lifetime) برای پلن‌های
-- اشتراک. طبق خواسته‌ی صریح:
--   - هنگام ساخت/ویرایش پلن در پنل SuperAdmin هر دو فیلد پر می‌شوند.
--   - «قیمت کلی» کنار «قیمت سالانه» در فرم و جدول پلن‌ها قرار می‌گیرد.
--   - «توضیحات» در صفحه‌ی «حساب شرکت غیرفعال شده است» داخل کارت هر پلن
--     به کاربر نمایش داده می‌شود.
-- هر دو ستون افزودنی‌اند و روی پلن‌های موجود اثری ندارند
-- (description = NULL، price_total = 0).

alter table public.plans
  add column if not exists description text,
  add column if not exists price_total numeric not null default 0;
