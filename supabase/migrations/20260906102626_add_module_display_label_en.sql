-- نامِ ماژول‌ها دوزبانه می‌شود: display_label نامِ فارسی و display_label_en
-- نامِ انگلیسی. در حالت فارسی نامِ فارسی و در حالت انگلیسی نامِ انگلیسی
-- نمایش داده می‌شود (وب و موبایل یکسان). فیلدِ خالی → ترجمه‌ی i18n به‌عنوان
-- fallback استفاده می‌شود.
--
-- نام‌های فارسیِ پیش‌فرضِ فعلی حفظ می‌شوند و برای هر ماژول یک نامِ انگلیسیِ
-- پیش‌فرضِ مناسب هم ست می‌شود (همان مقادیرِ کلیدهای module* در translations.js
-- که تا امروز در منو/ساید‌بار نمایش داده می‌شده‌اند).

alter table if exists public.system_module_config
  add column if not exists display_label_en text not null default '';

-- بازپُرکردنِ نامِ فارسی فقط اگر خالی باشد (تغییرِ نامِ واقعیِ ادمین حفظ شود)،
-- و ست‌کردنِ نامِ انگلیسیِ پیش‌فرض (این ستون تازه اضافه شده، پس تغییرِ ادمینی
-- روی آن وجود ندارد).
update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'چت'),
  display_label_en = 'Chat'
where module_key = 'chat';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'آرشیو فایل‌ها'),
  display_label_en = 'File Archive'
where module_key = 'archiveManagement';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت عدم انطباق‌ها'),
  display_label_en = 'Non-Conformance Management'
where module_key = 'anomalyReport';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت ارزیابی ریسک'),
  display_label_en = 'Risk Assessment Management'
where module_key = 'riskAssessment';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت ورود و تردد پرسنل'),
  display_label_en = 'Personnel Access Management'
where module_key = 'personnelAccess';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'اندازه‌گیری شاخص‌های Proactive HSE'),
  display_label_en = 'Proactive HSE Indicators'
where module_key = 'proactiveIndicators';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت حوادث'),
  display_label_en = 'Incident Management'
where module_key = 'incidentManagement';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت ماشین‌آلات'),
  display_label_en = 'Machinery Management'
where module_key = 'machineryManagement';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'مدیریت داربست'),
  display_label_en = 'Scaffolding Management'
where module_key = 'scaffoldManagement';

update public.system_module_config set
  display_label    = coalesce(nullif(display_label, ''), 'داشبورد مدیریتی و گزارش‌های تحلیلی'),
  display_label_en = 'Management Dashboard & Analytics'
where module_key = 'managementDashboard';
