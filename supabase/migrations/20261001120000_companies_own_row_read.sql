-- باگ: ورودِ مستقیمِ یک نفرِ HSE که داخلِ یک «پروژه» (برایِ شرکتِ
-- «مستقل/چند پروژه») ثبت شده، هنوز هدرِ «نامِ شرکت» (مثلاً «پالایش») را
-- نشان می‌داد، نه نامِ پروژه («سونگون») — یعنی isMultiProjectContractor
-- در App.jsx همیشه false می‌ماند.
--
-- ریشه: آن تشخیص با یک کوئریِ تازه به‌صورتِ
--   sb(`companies?id=eq.${currentUser.companyId}&select=org_structure_type`)
-- انجام می‌شود — این اولین‌باری است که یک نشستِ نقشِ CONTRACTOR مستقیماً
-- جدولِ companies را می‌خواند (همه‌ی خواندن‌هایِ قبلیِ این جدول یا از
-- طرفِ کارفرما/سرپرست بودند یا با توکنِ super_admin). جدولِ companies
-- طبقِ همان الگویِ بخشِ ۱/۲ موجود در normalize_rls_to_helper_functions
-- محافظت می‌شود؛ تا امروز هیچ policyِ صریحی اجازه نمی‌داد یک نشستِ
-- CONTRACTOR ردیفِ شرکتِ خودش را از همین جدول بخواند — پس آن کوئری
-- چیزی برنمی‌گرداند و isMultiProjectContractor همیشه false می‌ماند.
--
-- این policy اضافی (نه جایگزین — دقیقاً مثلِ contractor_companies_own_company_read
-- در ۲۰۲۶۱۰۰۱۱۰۰۰۰۰، چون Postgres permissive policyها با OR ترکیب
-- می‌شوند، پس هیچ دسترسیِ موجودی دست‌نخورده نمی‌ماند) فقط اجازه‌ی SELECT
-- روی ردیفِ همان شرکتِ خودِ کاربر (کارفرما یا پیمانکار/HSE، فرقی ندارد)
-- را می‌دهد — همان الگویِ current_company_id() که برایِ بقیه‌ی جدول‌هایِ
-- این پروژه استفاده می‌شود؛ اینجا ستونِ مقایسه id است چون خودِ این جدول
-- شرکت را نمایندگی می‌کند، نه company_id.
drop policy if exists companies_own_row_read on public.companies;
create policy companies_own_row_read on public.companies
  for select
  using (id = current_company_id());
