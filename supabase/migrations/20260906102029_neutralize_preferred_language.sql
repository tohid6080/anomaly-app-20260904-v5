-- ستون preferred_language دیگر هنگام ورود اعمال نمی‌شود (نگاه کنید به
-- finishLogin در App.jsx). دلیل: وقتی یک ترجیحِ ذخیره‌شده وجود داشت، بعد از
-- ورود، انتخابِ قابل‌مشاهده‌ی زبان روی صفحه‌ی ورود را بازنویسی می‌کرد —
-- باعث می‌شد گاهی با انتخابِ «فارسی»، کاربرانی مثل tohid / saeid که قبلاً
-- زبانشان را در پروفایل روی «en» گذاشته بودند، انگلیسی وارد شوند.
--
-- زبان حالا فقط با انتخابِ صفحه‌ی ورود / تاگلِ داخل اپ تعیین می‌شود و در
-- localStorage همان دستگاه می‌ماند. این مهاجرت مقدارهای باقی‌مانده را پاک
-- می‌کند تا هیچ کاربرِ فعلی‌ای تحت تأثیر نماند و DEFAULT ستون هم برداشته شود.

update public.employer_accounts set preferred_language = null where preferred_language is not null;
update public.contractors     set preferred_language = null where preferred_language is not null;

alter table if exists public.employer_accounts alter column preferred_language drop default;
alter table if exists public.contractors     alter column preferred_language drop default;
