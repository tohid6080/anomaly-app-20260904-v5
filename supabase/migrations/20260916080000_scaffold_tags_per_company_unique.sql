-- محدودیتِ یکتاییِ tag_number از سراسرِ جدول به هر شرکت تغییر می‌کند
-- =============================================================================
-- کشف‌شده هنگامِ ایمپورتِ تاریخیِ تگ‌هایِ توسعه۱ (ر.ک.
-- 20260916070000_import_tose1_scaffold_tags.sql): scaffold_tags_tag_number_key
-- یکتاییِ tag_number را رویِ کلِ جدول اعمال می‌کرد، نه فقط داخلِ یک شرکت —
-- درصورتی‌که خودِ trigger (scaffold_tags_assign_sequence، ر.ک.
-- 20260916030000_scaffold_tags_atomic_sequence.sql) از اول per-company
-- نوشته شده («هر شرکت شمارشگرِ خودش را دارد» — MAX همیشه با
-- «where company_id = new.company_id» محاسبه می‌شود). یعنی طراحیِ
-- شماره‌گذاری اصلاً فرضش بر این بوده که دو شرکتِ مختلف می‌توانند مستقل از
-- هم به «Md1-XX-SC-01» برسند — ولی خودِ constraint این را اجازه نمی‌داد.
--
-- این ناهماهنگی تا امروز خودش را نشان نداده بود چون هیچ دو شرکتی رویِ هم
-- نیفتاده بودند، تا وقتی «شرکت پیش‌فرض (داده‌های موجود)» (یک شرکتِ
-- دمو/نمونه، با ۸۱ ردیف که همه دقیقاً در یک لحظه seed شده‌اند) و شرکتِ
-- واقعیِ توسعه۱ هر دو از همین الگویِ شماره‌گذاری استفاده کردند — insertِ
-- تگ‌هایِ واقعیِ توسعه۱ بی‌صدا با «on conflict do nothing» رد می‌شد، چون
-- همان tag_number از قبل زیرِ شرکتِ دمو ثبت شده بود.
--
-- بدونِ ریسک: constraintِ قدیمی (unique رویِ tag_number به‌تنهایی) از
-- constraintِ جدید (unique رویِ company_id+tag_number) سخت‌گیرانه‌تر بود،
-- پس هیچ جفتِ (company_id, tag_number) تکراری‌ای از قبل نمی‌تواند وجود
-- داشته باشد — ADD CONSTRAINT تضمین‌شده موفق می‌شود. هیچ کدِ اپلیکیشنی هم
-- رویِ نامِ این constraint یا رویِ «on conflict (tag_number)» تکیه نمی‌کند
-- (grep تأیید کرد) — پس این تغییر هیچ رفتارِ دیگری را نمی‌شکند.
--
-- تأییدشده روی یک نمونه‌ی موقتِ Postgres 16 با بازتولیدِ دقیقِ همین
-- برخورد (دو شرکت، یک tag_number مشترک): قبل از fix، insertِ شرکتِ واقعی
-- بی‌صدا صفر ردیف درج می‌کرد؛ بعد از fix، هر دو شرکت مستقل tag_number
-- خودشان را دارند، ردیفِ شرکتِ دمو دست‌نخورده می‌ماند، و trigger برایِ هر
-- دو شرکت جداگانه درست کار می‌کند.

alter table public.scaffold_tags
  drop constraint scaffold_tags_tag_number_key;

alter table public.scaffold_tags
  add constraint scaffold_tags_company_tag_number_key unique (company_id, tag_number);
