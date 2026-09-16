-- Backfillِ زیرماژول‌هایِ آرشیو برایِ شرکت‌هایی که «آرشیو فایل‌ها» از قبل
-- فعال است
-- =============================================================================
-- ادامه‌ی همان کاری که 20260916051500_backfill_content_module_subs.sql
-- برایِ ۷ ماژولِ دیگر انجام داد — این‌بار برایِ archiveManagement، که
-- ۶‌تا دسته‌ی داخلی (TABS در ArchiveManager.jsx) دارد: پرسنل، آنومالی،
-- BowTie، ماشین‌آلات، داربست، HCMS. تا امروز هیچ‌کدام از این ۶ به‌صورتِ
-- جداگانه در company_modules ثبت نمی‌شد — فقط خودِ «archiveManagement».
-- حالا که هرکدام با isModuleInPlan جدا گیت می‌شود، هر شرکتی که فقط
-- والد را دارد، بدونِ این backfill بلافاصله هر ۶ تبِ آرشیو را از دست
-- می‌داد.
--
-- idempotent (on conflict do nothing) — دوباره‌اجرا بی‌خطر است. قیمتِ
-- ردیف‌هایِ تازه عمداً صفر: زیرماژول بخشی از همان قراردادِ فعلیِ
-- archiveManagement حساب می‌شود، نه خطِ فاکتورِ جداگانه.

do $$
declare
  parent_row  record;
  sub_key     text;
  archive_subs text[] := array['archivePersonnel', 'archiveAnomaly', 'archiveBowtie', 'archiveMachinery', 'archiveScaffold', 'archiveHcms'];
begin
  for parent_row in
    select company_id, starts_at, ends_at
    from public.company_modules
    where is_active = true and module_key = 'archiveManagement'
  loop
    foreach sub_key in array archive_subs
    loop
      insert into public.company_modules
        (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      values
        (parent_row.company_id, sub_key, true, parent_row.starts_at, parent_row.ends_at, 0, 0, 'admin_grant', 'backfill_sub_modules')
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;
end $$;
