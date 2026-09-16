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

-- روی دیتابیسِ واقعی، محدودیتِ یکتاییِ قدیمیِ tag_number با نامِ
-- scaffold_tags_tag_number_key وجود نداشت (drop مستقیم با خطای ۴۲۷۰۴
-- شکست خورد) — احتمالاً یا اصلاً constraint نبوده (فقط یک unique index)،
-- یا با نامِ دیگری ساخته شده. برای اینکه این migration مستقل از نامِ
-- واقعیِ آن روی هر محیطی کار کند، هر unique constraint/index که دقیقاً
-- روی ستونِ tag_number (تنها) است را پویا پیدا و حذف می‌کنیم؛ بعد
-- constraintِ جدید را فقط اگر از قبل نبود اضافه می‌کنیم.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.scaffold_tags'::regclass
      and con.contype = 'u'
      and (
        select array_agg(attname::text order by attnum)
        from pg_attribute
        where attrelid = con.conrelid and attnum = any(con.conkey)
      ) = array['tag_number']::text[]
  loop
    execute format('alter table public.scaffold_tags drop constraint %I', r.conname);
  end loop;

  for r in
    select indexname
    from pg_indexes
    where schemaname = 'public' and tablename = 'scaffold_tags'
      and indexdef ilike '%UNIQUE%' and indexdef ilike '%(tag_number)%'
      and indexname not in (
        select conname from pg_constraint where conrelid = 'public.scaffold_tags'::regclass
      )
  loop
    execute format('drop index if exists public.%I', r.indexname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.scaffold_tags'::regclass
      and conname = 'scaffold_tags_company_tag_number_key'
  ) then
    alter table public.scaffold_tags
      add constraint scaffold_tags_company_tag_number_key unique (company_id, tag_number);
  end if;
end $$;
