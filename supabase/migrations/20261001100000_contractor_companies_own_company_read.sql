-- تا امروز، جدولِ contractor_companies (فهرستِ نام‌های زیرمجموعه‌ی هر
-- شرکت — که برایِ شرکت‌هایِ «مستقل/چند پروژه» به‌عنوانِ «فهرستِ پروژه‌ها»
-- هم استفاده می‌شود) فقط برایِ سوپرادمین خوانا بود
-- (contractor_companies_super_admin_all). این یعنی خودِ کارفرما/سرپرست
-- نمی‌توانست حتی بفهمد شرکتش چه پروژه‌هایی دارد.
--
-- این policy اضافی (نه جایگزین — هر دو policy با OR ترکیب می‌شوند، پس
-- دسترسیِ کاملِ سوپرادمین دست‌نخورده می‌ماند) فقط اجازه‌ی SELECT روی
-- ردیف‌هایِ همان شرکتِ خودِ کاربر را می‌دهد — دقیقاً همان الگویِ
-- current_company_id() که برایِ بقیه‌ی جدول‌هایِ این پروژه استفاده می‌شود.
drop policy if exists contractor_companies_own_company_read on public.contractor_companies;
create policy contractor_companies_own_company_read on public.contractor_companies
  for select
  using (company_id = current_company_id());
