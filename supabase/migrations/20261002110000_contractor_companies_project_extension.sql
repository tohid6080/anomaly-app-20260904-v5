-- توسعه‌ی contractor_companies برای نقشِ «Project» در شرکت‌های مستقل/چندپروژه —
-- علاوه بر نقشِ قبلی‌اش (رجیستری نام شرکت پیمانکار برای ساختار Employer/
-- Contractor؛ آن مسیر و جدولش هیچ تغییری نمی‌کند، فقط دو ستونِ تازه و
-- nullable/پیش‌فرض‌دار اضافه می‌شود که برای آن مسیر بی‌اثر است).
alter table public.contractor_companies
  add column if not exists description  text not null default '',
  add column if not exists template_key  text;

-- تا امروز فقط SELECT روی شرکتِ خودِ کاربر باز بود
-- (۲۰۲۶۱۰۰۱۱۰۰۰۰۰_contractor_companies_own_company_read) — یعنی سرپرست
-- می‌توانست فهرستِ پروژه‌هایِ شرکتش را ببیند ولی نمی‌توانست خودش پروژه
-- بسازد/تغییرنام بدهد/غیرفعال کند. این سه policy دقیقاً همان الگو
-- (current_company_id()) را برایِ INSERT/UPDATE/DELETE هم باز می‌کند —
-- اضافه، نه جایگزین: دسترسیِ کاملِ سوپرادمین
-- (contractor_companies_super_admin_all) دست‌نخورده می‌ماند چون policyهای
-- یک دستور با OR ترکیب می‌شوند.
drop policy if exists contractor_companies_own_company_write on public.contractor_companies;
create policy contractor_companies_own_company_write on public.contractor_companies
  for insert
  with check (company_id = current_company_id());

drop policy if exists contractor_companies_own_company_update on public.contractor_companies;
create policy contractor_companies_own_company_update on public.contractor_companies
  for update
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

drop policy if exists contractor_companies_own_company_delete on public.contractor_companies;
create policy contractor_companies_own_company_delete on public.contractor_companies
  for delete
  using (company_id = current_company_id());
