-- ایمپورتِ تاریخیِ «آمار تگ داربست» شرکتِ توسعه۱ (MD1) از فایلِ اکسلِ
-- ارائه‌شده توسط کاربر — شیتِ «Scaff tag»، برایِ دو پیمانکار «نصب نیرو»
-- (NN) و «امیرگسترخرم هونام» (AG).
-- =============================================================================
-- کارفرما همین‌الان کلِ لیست را می‌بیند چون loadScaffoldTags() فقط بر اساسِ
-- company_id فیلتر می‌کند (scaffoldApi.js) — نیازی به تغییرِ کد نبود. هر
-- پیمانکار هم فقط ردیف‌هایِ خودش را می‌بیند چون ScaffoldDashboard.jsx
-- (خط ۶۷) contractorName را با نامِ کاربرِ لاگین‌کرده تطبیق می‌دهد — پس
-- contractor_name در این ایمپورت باید دقیقاً با ستونِ name در جدولِ
-- contractors یکی باشد (همان‌طور که پایین با lookup تضمین می‌شود).
--
-- شماره‌هایِ تگ همان شماره‌هایِ واقعیِ تاریخی‌اند (Md1-NN-SC-01 و...)، نه
-- سنتینلِ «-SC-00» — طبقِ خودِ trigger (ر.ک.
-- 20260916030000_scaffold_tags_atomic_sequence.sql) هر مقدارِ غیرِصفر
-- دست‌نخورده می‌ماند، پس این تریگر شماره‌ها را عوض نمی‌کند.
--
-- ۸۵ ردیف از ۸۷ ردیفِ واقعیِ شیت ایمپورت می‌شود:
--   • ردیفِ ۳۹ (تگ Md1-NN-SC-39) کنار گذاشته شد — موقعیتش در فایل
--     صراحتاً «خالی» است و نه پیمانکاری دارد نه تاریخی؛ یعنی شماره‌ای
--     رزروشده ولی هرگز واقعاً برپا نشده.
--   • یکی از دو ردیفِ «Md1-NN-SC-31» (ردیفِ ۳۱: «برچیدن تخته‌های کفِ LCC»)
--     کنار گذاشته شد چون دقیقاً همان شماره‌تگِ ردیفِ ۳۰ («فوم استیشن») را
--     دارد — تگِ تکراری در خودِ فایلِ منبع؛ ضمناً تاریخِ برچیدنش
--     (۱۴۰۴/۰۸/۱۰) یک روز قبل از تاریخِ برپایی‌اش (۱۴۰۴/۰۸/۱۱) است. این
--     یکی نیاز به تصمیمِ کاربر دارد، جداگانه در چت مطرح شده.
--
-- status: هر ردیف که «تاریخ برچیدن داربست» داشت -> removed؛ وگرنه اگر
-- «تاریخ برپایی» داشت -> tag_issued (هنوز برپاست)؛ وگرنه (فقط
-- Md1-NN-SC-70) -> pending_installation. ستونِ OK/NOT OK خودِ فایل در این
-- نگاشت استفاده نشد چون تنها ردیفِ NoT OK (Md1-AG-SC-19) بعداً برچیده هم
-- شده، پس در نهایی removed است — همانی که این قانون هم می‌دهد.
--
-- idempotent: هم id (بر پایه‌ی tag_number) و هم خودِ tag_number را unique
-- نگه می‌دارد، و on conflict do nothing دارد — اجرایِ دوباره بی‌خطر است.

do $$
declare
  v_company_id public.companies.id%type;
  v_company_count int;
  v_company_names text;
  v_nn_id public.contractors.id%type;
  v_ag_id public.contractors.id%type;
  v_contractor_names text;
  v_inserted int;
begin
  select count(*), string_agg(name || ' (' || id || ')', E'\n')
    into v_company_count, v_company_names
    from public.companies where name ilike '%توسعه%';

  if v_company_count <> 1 then
    raise exception 'انتظار می‌رفت دقیقاً یک شرکت با نام شاملِ «توسعه» پیدا شود، % پیدا شد. کاندیدها:%',
      v_company_count, E'\n' || coalesce(v_company_names, '(هیچ‌کدام)');
  end if;

  select id into v_company_id from public.companies where name ilike '%توسعه%';

  select id into v_nn_id from public.contractors where company_id = v_company_id and name = 'نصب نیرو';
  if v_nn_id is null then
    select string_agg(name, E'\n') into v_contractor_names from public.contractors where company_id = v_company_id;
    raise exception 'پیمانکارِ «نصب نیرو» زیرِ این شرکت پیدا نشد. پیمانکارهایِ موجودِ این شرکت:%',
      E'\n' || coalesce(v_contractor_names, '(هیچ‌کدام)');
  end if;

  select id into v_ag_id from public.contractors where company_id = v_company_id and name = 'امیرگسترخرم هونام';
  if v_ag_id is null then
    select string_agg(name, E'\n') into v_contractor_names from public.contractors where company_id = v_company_id;
    raise exception 'پیمانکارِ «امیرگسترخرم هونام» زیرِ این شرکت پیدا نشد. پیمانکارهایِ موجودِ این شرکت:%',
      E'\n' || coalesce(v_contractor_names, '(هیچ‌کدام)');
  end if;

  insert into public.scaffold_tags
    (id, company_id, tag_number, contractor_id, contractor_name, location, erection_date, status, issue_date, removal_date, purpose, created_by)
  values
    ('scaffold-import-Md1-NN-SC-01', v_company_id, 'Md1-NN-SC-01', v_nn_id, 'نصب نیرو', 'دسترسی به منهول اگزوز', '2025-09-14', 'tag_issued', '2025-09-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-02', v_company_id, 'Md1-NN-SC-02', v_nn_id, 'نصب نیرو', 'ایراینتک', '2025-09-11', 'removed', '2025-09-11', '2025-12-02', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-03', v_company_id, 'Md1-NN-SC-03', v_nn_id, 'نصب نیرو', 'اطراف توربین', '2025-09-15', 'removed', '2025-09-15', '2025-11-13', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-04', v_company_id, 'Md1-NN-SC-04', v_nn_id, 'نصب نیرو', 'LCC', '2025-08-11', 'removed', '2025-08-11', '2025-10-05', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-05', v_company_id, 'Md1-NN-SC-05', v_nn_id, 'نصب نیرو', 'ژنراتور', '2025-08-16', 'tag_issued', '2025-08-16', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-06', v_company_id, 'Md1-NN-SC-06', v_nn_id, 'نصب نیرو', 'CO2 روم', '2025-08-16', 'removed', '2025-08-16', '2025-09-26', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-07', v_company_id, 'Md1-NN-SC-07', v_nn_id, 'نصب نیرو', 'باس داک', '2025-09-26', 'removed', '2025-09-26', '2025-10-01', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-08', v_company_id, 'Md1-NN-SC-08', v_nn_id, 'نصب نیرو', 'مین ترانس', '2025-08-22', 'removed', '2025-08-22', '2025-09-25', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-09', v_company_id, 'Md1-NN-SC-09', v_nn_id, 'نصب نیرو', 'Admin  اطراف', '2025-09-14', 'tag_issued', '2025-09-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-10', v_company_id, 'Md1-NN-SC-10', v_nn_id, 'نصب نیرو', 'CCB برپایی داربست', '2025-09-18', 'removed', '2025-09-18', '2026-06-24', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-11', v_company_id, 'Md1-NN-SC-11', v_nn_id, 'نصب نیرو', 'Forwarding', '2025-09-14', 'tag_issued', '2025-09-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-12', v_company_id, 'Md1-NN-SC-12', v_nn_id, 'نصب نیرو', 'Unloading', '2025-09-14', 'tag_issued', '2025-09-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-13', v_company_id, 'Md1-NN-SC-13', v_nn_id, 'نصب نیرو', 'Raw water', '2025-08-23', 'removed', '2025-08-23', '2025-10-04', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-14', v_company_id, 'Md1-NN-SC-14', v_nn_id, 'نصب نیرو', 'Oily Seperatorبرپایی داربست', '2025-09-14', 'tag_issued', '2025-09-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-15', v_company_id, 'Md1-NN-SC-15', v_nn_id, 'نصب نیرو', 'Gate House', '2025-08-23', 'tag_issued', '2025-08-23', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-16', v_company_id, 'Md1-NN-SC-16', v_nn_id, 'نصب نیرو', 'شرق و غرب دیفیوزر', '2025-09-15', 'removed', '2025-09-15', '2026-08-08', '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-17', v_company_id, 'Md1-AG-SC-17', v_ag_id, 'امیرگسترخرم هونام', 'اطراف مخزن (شمال و غرب و شرق)', '2025-09-13', 'removed', '2025-09-13', '2025-10-09', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-19', v_company_id, 'Md1-AG-SC-19', v_ag_id, 'امیرگسترخرم هونام', 'اطراف مخزن (جنوب و غرب)', '2025-09-03', 'removed', '2025-09-03', '2025-10-09', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-20', v_company_id, 'Md1-NN-SC-20', v_nn_id, 'نصب نیرو', 'شمال و شرق Oily Seperator', '2025-08-23', 'removed', '2025-08-23', '2025-10-03', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-21', v_company_id, 'Md1-NN-SC-21', v_nn_id, 'نصب نیرو', 'داخل لود گیربکس ضلع سمت توربین', '2025-09-20', 'removed', '2025-09-20', '2025-10-18', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-22', v_company_id, 'Md1-NN-SC-22', v_nn_id, 'نصب نیرو', 'برچیدن داربست ضلع شمال ایرنتیک سطح پاگرد اول ضلع شمال غرب', '2025-08-23', 'removed', '2025-08-23', '2025-09-20', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-23', v_company_id, 'Md1-NN-SC-23', v_nn_id, 'نصب نیرو', 'نصب لایف لاین سقف فورواردینگ', '2025-08-23', 'removed', '2025-08-23', '2025-10-12', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-24', v_company_id, 'Md1-NN-SC-24', v_nn_id, 'نصب نیرو', 'ورودی ادمین', '2025-09-20', 'tag_issued', '2025-09-20', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-25', v_company_id, 'Md1-NN-SC-25', v_nn_id, 'نصب نیرو', 'برچیدن داربست باس داکت', '2025-08-23', 'removed', '2025-08-23', '2025-09-22', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-26', v_company_id, 'Md1-NN-SC-26', v_nn_id, 'نصب نیرو', 'برپایی داربست کولینگ توربین', '2025-09-27', 'tag_issued', '2025-09-27', null, 'چهارپایه', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-27', v_company_id, 'Md1-NN-SC-27', v_nn_id, 'نصب نیرو', 'برپایی داربست کولینگ ژنراتور', '2025-09-27', 'tag_issued', '2025-09-27', null, 'چهارپایه', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-28', v_company_id, 'Md1-NN-SC-28', v_nn_id, 'نصب نیرو', 'ضلع شرق دیواره مخزن سوخت', '2025-08-23', 'removed', '2025-08-23', '2025-10-12', '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-29', v_company_id, 'Md1-AG-SC-29', v_ag_id, 'امیرگسترخرم هونام', 'داخل فورواردینگ', '2025-09-19', 'tag_issued', '2025-09-19', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-30', v_company_id, 'Md1-NN-SC-30', v_nn_id, 'نصب نیرو', 'باز کردن داربست داخل دایورتر باکس', '2025-10-20', 'removed', '2025-10-20', '2025-10-23', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-31', v_company_id, 'Md1-NN-SC-31', v_nn_id, 'نصب نیرو', 'فوم استیشن', '2025-10-30', 'tag_issued', '2025-10-30', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-32', v_company_id, 'Md1-AG-SC-32', v_ag_id, 'امیرگسترخرم هونام', 'داربست بندی شمال و جنوب مخزن', '2025-11-05', 'tag_issued', '2025-11-05', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-33', v_company_id, 'Md1-AG-SC-33', v_ag_id, 'امیرگسترخرم هونام', 'ساختمان فورواردینگ (جنوب و شرق)', '2025-11-10', 'tag_issued', '2025-11-10', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-34', v_company_id, 'Md1-AG-SC-34', v_ag_id, 'امیرگسترخرم هونام', 'شمال دایک وال', '2025-11-27', 'tag_issued', '2025-11-27', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-35', v_company_id, 'Md1-NN-SC-35', v_nn_id, 'نصب نیرو', 'داربست RAW WATER', '2025-11-29', 'tag_issued', '2025-11-29', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-36', v_company_id, 'Md1-NN-SC-36', v_nn_id, 'نصب نیرو', 'داربست فوم استیشن', '2025-11-30', 'tag_issued', '2025-11-30', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-37', v_company_id, 'Md1-NN-SC-37', v_nn_id, 'نصب نیرو', 'داربست Unloading(داخل اتاقک)', '2025-12-01', 'tag_issued', '2025-12-01', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-38', v_company_id, 'Md1-NN-SC-38', v_nn_id, 'نصب نیرو', 'سقف پیت Oily', '2025-12-01', 'tag_issued', '2025-12-01', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-40', v_company_id, 'Md1-NN-SC-40', v_nn_id, 'نصب نیرو', 'شرق استک', '2025-12-03', 'tag_issued', '2025-12-03', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-41', v_company_id, 'Md1-AG-SC-41', v_ag_id, 'امیرگسترخرم هونام', 'غرب و جنوب مخزن گازوئیل', '2025-12-27', 'tag_issued', '2025-12-27', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-42', v_company_id, 'Md1-NN-SC-42', v_nn_id, 'نصب نیرو', 'اتاق استراحت رانندگان آنلودینگ', '2025-12-28', 'removed', '2025-12-28', '2025-12-31', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-43', v_company_id, 'Md1-NN-SC-43', v_nn_id, 'نصب نیرو', 'راه پله CCB', '2025-12-28', 'tag_issued', '2025-12-28', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-44', v_company_id, 'Md1-NN-SC-44', v_nn_id, 'نصب نیرو', 'زیر ایراینتک', '2025-12-31', 'tag_issued', '2025-12-31', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-45', v_company_id, 'Md1-NN-SC-45', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق الکتریکال روم ادمین', '2025-12-31', 'removed', '2025-12-31', '2026-01-06', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-46', v_company_id, 'Md1-NN-SC-46', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق آفیس روم ادمین (جنوب شرقی)', '2026-01-01', 'removed', '2026-01-01', '2026-01-06', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-47', v_company_id, 'Md1-NN-SC-47', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق آفیس روم ادمین (جنوب غربی)', '2026-01-01', 'tag_issued', '2026-01-01', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-48', v_company_id, 'Md1-NN-SC-48', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق آرشیو روم ادمین', '2026-01-01', 'tag_issued', '2026-01-01', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-49', v_company_id, 'Md1-NN-SC-49', v_nn_id, 'نصب نیرو', 'زیر سقف و داخل مخزنOily', '2025-12-31', 'tag_issued', '2025-12-31', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-50', v_company_id, 'Md1-NN-SC-50', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق  Heating area  در ادمین', '2026-01-06', 'tag_issued', '2026-01-06', null, 'ادامه کار با مجوز دیگر', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-51', v_company_id, 'Md1-NN-SC-51', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق  Pantry  در ادمین', '2026-01-06', 'removed', '2026-01-06', '2026-01-11', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-52', v_company_id, 'Md1-NN-SC-52', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق  Prayer room  در ادمین', '2026-01-06', 'tag_issued', '2026-01-06', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-53', v_company_id, 'Md1-NN-SC-53', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق Conference hall  در ادمین', '2026-01-06', 'removed', '2026-01-06', '2026-01-06', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-54', v_company_id, 'Md1-NN-SC-54', v_nn_id, 'نصب نیرو', 'جنوب انکلوژر', '2026-01-11', 'tag_issued', '2026-01-11', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-55', v_company_id, 'Md1-NN-SC-55', v_nn_id, 'نصب نیرو', 'داربست entrance در ادمین', '2026-01-07', 'tag_issued', '2026-01-07', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-56', v_company_id, 'Md1-NN-SC-56', v_nn_id, 'نصب نیرو', 'داربست اتاق manager secretary  در ادمین', '2026-01-07', 'tag_issued', '2026-01-07', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-57', v_company_id, 'Md1-NN-SC-57', v_nn_id, 'نصب نیرو', 'داربست Manager Office در ادمین', '2026-01-07', 'removed', '2026-01-07', '2026-01-15', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-58', v_company_id, 'Md1-NN-SC-58', v_nn_id, 'نصب نیرو', 'داربست اتاق manager rest room در ادمین', '2026-01-07', 'removed', '2026-01-07', '2026-01-11', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-59', v_company_id, 'Md1-NN-SC-59', v_nn_id, 'نصب نیرو', 'برپایی داربست پلتفرم دوم ایراینتک ضلع شمال', '2026-01-09', 'removed', '2026-01-09', '2026-01-11', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-60', v_company_id, 'Md1-NN-SC-60', v_nn_id, 'نصب نیرو', 'برپایی داربست SKADA CCB', '2026-01-20', 'tag_issued', '2026-01-20', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-61', v_company_id, 'Md1-NN-SC-61', v_nn_id, 'نصب نیرو', 'برپایی داربست مین ترانس جهت طرح اصلاحی باس داکت', '2026-02-03', 'tag_issued', '2026-02-03', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-62', v_company_id, 'Md1-AG-SC-62', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست جهت فیتاپ اپرینکلر آتش نشانی Cable Gallery', '2026-02-10', 'tag_issued', '2026-02-10', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-63', v_company_id, 'Md1-NN-SC-63', v_nn_id, 'نصب نیرو', 'بویلر کمکی', '2026-02-24', 'tag_issued', '2026-02-24', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-64', v_company_id, 'Md1-AG-SC-64', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست داخل ساختمان آنلودینگ جهت فایرفایتینگ', '2026-02-25', 'removed', '2026-02-25', '2026-04-20', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-65', v_company_id, 'Md1-AG-SC-65', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست شرق مخزن گازوئیل جهت نصب خط کش مخزن', '2026-04-20', 'removed', '2026-04-20', '2026-04-26', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-66', v_company_id, 'Md1-AG-SC-66', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست اسکادا داخل CCB', '2026-04-26', 'removed', '2026-04-26', '2026-07-13', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-67', v_company_id, 'Md1-AG-SC-67', v_ag_id, 'امیرگسترخرم هونام', 'برچیدن داربست ساختمان فورواردینگ', '2026-05-07', 'removed', '2026-05-07', '2026-05-10', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-68', v_company_id, 'Md1-AG-SC-68', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست شمال و جنوب مخزن جهت نصب چمبر لاین فوم', '2026-05-11', 'removed', '2026-05-11', '2026-07-05', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-69', v_company_id, 'Md1-NN-SC-69', v_nn_id, 'نصب نیرو', 'برپایی داربست Raw water جهت معماری دیوار آن', '2026-05-13', 'tag_issued', '2026-05-13', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-70', v_company_id, 'Md1-NN-SC-70', v_nn_id, 'نصب نیرو', 'Oily Seperatorبرپایی داربست', null, 'pending_installation', null, null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-71', v_company_id, 'Md1-NN-SC-71', v_nn_id, 'نصب نیرو', 'برپایی داربست Aux. Boiler', '2026-06-13', 'tag_issued', '2026-06-13', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-72', v_company_id, 'Md1-NN-SC-72', v_nn_id, 'نصب نیرو', 'برپایی داربست جنوب Fin Fan Turbine', '2026-06-14', 'tag_issued', '2026-06-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-73', v_company_id, 'Md1-NN-SC-73', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق ES ساختمان CCB', '2026-07-06', 'removed', '2026-07-06', '2026-07-17', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-74', v_company_id, 'Md1-NN-SC-74', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق CCR ساختمان CCB', '2026-07-06', 'removed', '2026-07-06', '2026-07-17', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-75', v_company_id, 'Md1-NN-SC-75', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق های ادمین', '2026-07-06', 'tag_issued', '2026-07-06', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-76', v_company_id, 'Md1-AG-SC-76', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست دورمخزن گازوئیل', '2026-07-11', 'removed', '2026-07-11', '2026-07-14', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-AG-SC-77', v_company_id, 'Md1-AG-SC-77', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست اتاق های اداری CCB', '2026-07-20', 'tag_issued', '2026-07-20', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-78', v_company_id, 'Md1-NN-SC-78', v_nn_id, 'نصب نیرو', 'برپایی داربست ورودی به پشت بام Admin', '2026-07-20', 'removed', '2026-07-20', '2026-07-22', '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-79', v_company_id, 'Md1-AG-SC-79', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست در Admin نصب خطوط آتش نشانی', '2026-07-23', 'tag_issued', '2026-07-23', null, '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-80', v_company_id, 'Md1-NN-SC-80', v_nn_id, 'نصب نیرو', 'برپایی داربست شمال ایراینتک جهت عایقکاری', '2026-07-23', 'removed', '2026-07-23', '2026-08-08', '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-81', v_company_id, 'Md1-NN-SC-81', v_nn_id, 'نصب نیرو', 'برپایی داربست اتاق فرمان CCB', '2026-07-25', 'tag_issued', '2026-07-25', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-82', v_company_id, 'Md1-NN-SC-82', v_nn_id, 'نصب نیرو', 'زیر ایراینتک جهت کاورسینی', '2026-08-08', 'removed', '2026-08-08', '2026-08-13', '', 'نصب نیرو'),
    ('scaffold-import-Md1-AG-SC-83', v_company_id, 'Md1-AG-SC-83', v_ag_id, 'امیرگسترخرم هونام', 'برپایی داربست بیرون اتاق اسکادا در CCB جهت هیدروتست', '2026-08-12', 'removed', '2026-08-12', '2026-08-14', '', 'امیرگسترخرم هونام'),
    ('scaffold-import-Md1-NN-SC-84', v_company_id, 'Md1-NN-SC-84', v_nn_id, 'نصب نیرو', 'برپایی داربست داخل ساختمان ادمین جهت گچکاری', '2026-08-14', 'tag_issued', '2026-08-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-85', v_company_id, 'Md1-NN-SC-85', v_nn_id, 'نصب نیرو', 'برپایی داربست داخل ساختمان فورواردینگ جهت نصب پنجره', '2026-08-14', 'tag_issued', '2026-08-14', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-86', v_company_id, 'Md1-NN-SC-86', v_nn_id, 'نصب نیرو', 'برپایی داربست داخل اتاق اسکادا جهت سینی کاری', '2026-08-15', 'tag_issued', '2026-08-15', null, '', 'نصب نیرو'),
    ('scaffold-import-Md1-NN-SC-87', v_company_id, 'Md1-NN-SC-87', v_nn_id, 'نصب نیرو', 'برپایی داربست جهت فعالیت نصب پنجره و سندتراپ اطراف ساختمان فوروواردینگ', '2026-09-02', 'removed', '2026-09-02', '2026-09-15', '', 'نصب نیرو')
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  raise notice 'تگ‌هایِ داربستِ واقعاً درج‌شده: % از ۸۵', v_inserted;
end $$;
