-- جدول system_module_config موقع seed اولیه برای هر ماژول یک display_label
-- فارسی گرفت (همان برچسب پیش‌فرض). حالا که سامانه دوزبانه شده، منطق نمایش
-- این‌طور است: اگر display_label خالی باشد → از ترجمه‌ی i18n استفاده می‌شود
-- (دوزبانه)، و اگر پر باشد → همان نامِ سفارشیِ ادمین در وب و موبایل نمایش
-- داده می‌شود.
--
-- مقدارهای seedشده «نامِ سفارشی» نیستند، فقط تکرارِ برچسب پیش‌فرض‌اند و اگر
-- بمانند، در حالت انگلیسی هم فارسی نشان داده می‌شوند. این مهاجرت فقط ردیف‌هایی
-- را که display_labelشان دقیقاً برابرِ همان مقدارِ seedشده است به رشته‌ی خالی
-- برمی‌گرداند — پس اگر ادمین قبلاً واقعاً نامی را عوض کرده باشد (مقدارِ متفاوت)،
-- دست‌نخورده می‌ماند.

update public.system_module_config set display_label = '' where module_key = 'personnelAccess'     and display_label = 'مدیریت ورود و تردد پرسنل';
update public.system_module_config set display_label = '' where module_key = 'anomalyReport'        and display_label = 'مدیریت عدم انطباق‌ها';
update public.system_module_config set display_label = '' where module_key = 'machineryManagement'  and display_label = 'مدیریت ماشین‌آلات';
update public.system_module_config set display_label = '' where module_key = 'scaffoldManagement'   and display_label = 'مدیریت داربست';
update public.system_module_config set display_label = '' where module_key = 'riskAssessment'       and display_label = 'مدیریت ارزیابی ریسک';
update public.system_module_config set display_label = '' where module_key = 'incidentManagement'   and display_label = 'مدیریت حوادث';
update public.system_module_config set display_label = '' where module_key = 'proactiveIndicators'  and display_label = 'شاخص‌های Proactive HSE';
update public.system_module_config set display_label = '' where module_key = 'chat'                 and display_label = 'چت';
update public.system_module_config set display_label = '' where module_key = 'archiveManagement'    and display_label = 'آرشیو فایل‌ها';
update public.system_module_config set display_label = '' where module_key = 'managementDashboard'  and display_label = 'داشبورد مدیریتی';

-- هر DEFAULT احتمالی روی ستون هم برداشته می‌شود تا ردیف‌های آینده با رشته‌ی
-- خالی ساخته شوند، نه یک برچسب فارسیِ ثابت.
alter table if exists public.system_module_config alter column display_label drop default;
