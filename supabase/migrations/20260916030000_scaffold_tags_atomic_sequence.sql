-- تخصیصِ اتمیکِ شماره‌ی سریالِ تگ داربست
--
-- تا الان این شماره در سمتِ کلاینت محاسبه می‌شد (یک SELECT برایِ یافتنِ
-- بیشترین شماره‌ی موجود، بعد +1، در یک درخواستِ جدا از خودِ INSERT) — یک
-- race condition واقعی: دو درخواستِ هم‌زمانِ «تگ جدید» (یا حتی یک درخواستِ
-- تکی که دکمه‌اش دوبار کلیک شده) می‌توانستند هر دو دقیقاً یک tag_number
-- محاسبه کنند، و INSERT دومی با
--   duplicate key value violates unique constraint "scaffold_tags_tag_number_key"
-- رد می‌شد — دقیقاً همان خطایی که پیمانکار موقعِ اخذِ تگ دید.
--
-- این migration شماره را به یک BEFORE INSERT trigger منتقل می‌کند که خودِ
-- شماره‌گذاری را زیرِ یک قفلِ advisory (per company_id) و داخلِ همان
-- تراکنشِ INSERT انجام می‌دهد — پس دو INSERT هم‌زمان برایِ یک شرکت
-- سریالایز می‌شوند (دومی منتظرِ کامیت‌شدنِ اولی می‌ماند و MAX واقعی و
-- به‌روز را می‌بیند)، نه این‌که هر دو یک عدد را حدس بزنند.
--
-- نکته‌ی مهم: این trigger فقط وقتی tag_number را عوض می‌کند که کلاینت
-- صراحتاً سنتینلِ «...-SC-00» فرستاده باشد (یعنی «خودت شماره‌ی واقعی را
-- تعیین کن») یا وقتی اصلاً قابلِ‌پارس نبوده — هر مقدارِ دیگر (مثلاً یک
-- tag_number تاریخیِ واقعی، مثلِ "...-SC-17"، که با Restore از یک Backup
-- برمی‌گردد؛ ر.ک. restore_company_from_bundle در
-- 20260907140000_company_backup_system.sql که به‌صورتِ INSERT معمولی و
-- بدون غیرفعال‌کردنِ trigger عمل می‌کند) دست‌نخورده می‌ماند. بدونِ این گارد،
-- هر Restore شماره‌های تاریخیِ واقعی را با شماره‌های تازه‌ی نادرست عوض
-- می‌کرد. "00" به‌عنوانِ سنتینل امن است چون منطقِ قدیمیِ تولیدِ شماره همیشه
-- از ۱ (نه ۰) شروع می‌کرد — پس هیچ ردیفِ واقعی/تاریخی‌ای با "-SC-00" وجود
-- ندارد.

create or replace function public.scaffold_tags_assign_sequence()
returns trigger
language plpgsql
as $$
declare
  v_current_seq int;
  v_prefix      text;
  v_next_seq    int;
begin
  v_current_seq := (regexp_match(coalesce(new.tag_number, ''), '-SC-([0-9]+)$'))[1]::int;

  if v_current_seq is not null and v_current_seq <> 0 then
    return new;
  end if;

  -- سریالایزِ INSERTهایِ هم‌زمان برایِ همین شرکت — قفل تا پایانِ تراکنش
  -- نگه‌داشته می‌شود
  perform pg_advisory_xact_lock(hashtext('scaffold_tags:' || new.company_id::text));

  v_prefix := regexp_replace(coalesce(new.tag_number, ''), '-SC-[0-9]+$', '');
  if v_prefix = '' then
    v_prefix := 'Md1-' || coalesce(nullif(new.contractor_name, ''), 'NA');
  end if;

  select coalesce(max((regexp_match(tag_number, '-SC-([0-9]+)$'))[1]::int), 0) + 1
    into v_next_seq
    from public.scaffold_tags
    where company_id = new.company_id;

  new.tag_number := v_prefix || '-SC-' || lpad(v_next_seq::text, 2, '0');
  return new;
end;
$$;

drop trigger if exists trg_scaffold_tags_assign_sequence on public.scaffold_tags;

create trigger trg_scaffold_tags_assign_sequence
before insert on public.scaffold_tags
for each row
execute function public.scaffold_tags_assign_sequence();
