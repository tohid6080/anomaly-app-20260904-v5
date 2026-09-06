-- ترجیح زبانِ حساب (preferred_language) فقط باید زمانی مقدار داشته باشد که
-- کاربر عمداً از پروفایلش زبانی را انتخاب کرده باشد. تا امروز مقدارِ پیش‌فرضِ
-- «fa» روی خیلی از حساب‌ها ذخیره شده بود (چه به‌عنوان DEFAULT ستون، چه از روی
-- fallbackهای قدیمیِ کد)، و همین باعث می‌شد بعد از ورود، انتخابِ زبان در
-- صفحه‌ی ورود یا زبانِ به‌خاطر‌سپرده‌ی همان دستگاه با «fa» بازنویسی شود.
--
-- این مهاجرت:
--   1) ستون را در صورت نبود می‌سازد (دفاعی — ستون دستی اضافه شده بود و
--      migration نداشت).
--   2) هر DEFAULT روی ستون را برمی‌دارد تا حساب‌های جدید با NULL ساخته شوند.
--   3) مقدارهای «fa» موجود را به NULL تبدیل می‌کند (بی‌ضرر: «fa» همان زبانِ
--      پیش‌فرضِ نمایشی است). مقدارهای «en» دست‌نخورده می‌مانند چون انتخابِ
--      عمدیِ کاربرند.

alter table if exists public.employer_accounts add column if not exists preferred_language text;
alter table if exists public.contractors     add column if not exists preferred_language text;

alter table if exists public.employer_accounts alter column preferred_language drop default;
alter table if exists public.contractors     alter column preferred_language drop default;

update public.employer_accounts set preferred_language = null where preferred_language = 'fa';
update public.contractors     set preferred_language = null where preferred_language = 'fa';
