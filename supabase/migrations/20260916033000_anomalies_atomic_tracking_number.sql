-- تخصیصِ اتمیکِ شماره‌ی پیگیریِ خودکارِ آنومالی
--
-- دقیقاً همان الگویی که برایِ تگ داربست اصلاح شد (ر.ک.
-- 20260916030000_scaffold_tags_atomic_sequence.sql)، این‌جا هم پیاده
-- می‌شود: AnomalyForm وقتی کاربر فیلدِ «شماره‌ی پیگیری» را خالی می‌گذاشت،
-- در سمتِ کلاینت با `A-${String(existing.length + 1).padStart(4, "0")}`
-- (شمارشِ رکوردهایِ موجود، سپس ۱+) یک شماره حدس می‌زد — همان race
-- condition: دو ثبتِ آنومالیِ هم‌زمان می‌توانستند دقیقاً همان شماره را
-- حدس بزنند.
--
-- برخلافِ تگ داربست، این فیلد آزادانه هم قابلِ‌ویرایشِ دستی است (کاربر
-- می‌تواند هر متنی تایپ کند؛ حالتِ خودکار فقط وقتی فیلد خالی بماند فعال
-- می‌شود) — پس سنتینلِ این‌جا از نوعِ «tracking_number خالی/NULL» است، نه
-- یک الگویِ عددیِ خاص: هر مقدارِ غیرخالی (چه تایپ‌شده توسطِ کاربر، چه یک
-- ردیفِ تاریخیِ واقعی که با Restore از یک Backup برمی‌گردد؛ ر.ک.
-- restore_company_from_bundle در 20260907140000_company_backup_system.sql
-- که anomalies را هم با INSERT معمولی و بدون غیرفعال‌کردنِ trigger درج
-- می‌کند، چون anomalies در COMPANY_TABLE_ORDER هست) دست‌نخورده می‌ماند.
--
-- منطقِ شمارش عیناً همان الگویِ قبلی حفظ شده: COUNT کلِ ردیف‌هایِ همان
-- company_id، به‌علاوه‌ی ۱ (نه پارسِ MAX از خودِ رشته‌ی tracking_number،
-- چون فرمتِ آزاد است و همیشه قابلِ‌پارس نیست) — دقیقاً همان چیزی که
-- existing.length + 1 قبلاً محاسبه می‌کرد، فقط حالا اتمیک و سمتِ دیتابیس.

create or replace function public.anomalies_assign_tracking_number()
returns trigger
language plpgsql
as $$
declare
  v_next_seq int;
begin
  if new.tracking_number is not null and btrim(new.tracking_number) <> '' then
    return new;
  end if;

  -- سریالایزِ INSERTهایِ هم‌زمان برایِ همین شرکت — قفل تا پایانِ تراکنش
  -- نگه‌داشته می‌شود
  perform pg_advisory_xact_lock(hashtext('anomalies:' || new.company_id::text));

  select count(*) + 1
    into v_next_seq
    from public.anomalies
    where company_id = new.company_id;

  new.tracking_number := 'A-' || lpad(v_next_seq::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_anomalies_assign_tracking_number on public.anomalies;

create trigger trg_anomalies_assign_tracking_number
before insert on public.anomalies
for each row
execute function public.anomalies_assign_tracking_number();
