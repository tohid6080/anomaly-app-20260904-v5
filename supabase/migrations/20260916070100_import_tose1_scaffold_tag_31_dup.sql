-- ادامه‌ی 20260916070000_import_tose1_scaffold_tags.sql: ردیفِ نگه‌داشته‌شده
-- =============================================================================
-- در فایلِ منبع، هم ردیفِ ۳۰ و هم ردیفِ ۳۱ شماره‌تگِ «Md1-NN-SC-31» را
-- داشتند (اولی «فوم استیشن»، ایمپورت‌شده در migration قبلی؛ دومی «برچیدن
-- تخته‌های کفِ LCC»، همین‌جا). طبقِ تصمیمِ کاربر، این یکی شماره‌ی بعدی از
-- انتهای توالیِ واقعی را می‌گیرد: Md1-NN-SC-89.
--
-- یادداشت: تاریخِ برچیدنِ همین ردیف در فایلِ اصلی (۱۴۰۴/۰۸/۱۰) یک روز قبل
-- از تاریخِ برپایی‌اش (۱۴۰۴/۰۸/۱۱) است — به همین شکل از فایلِ منبع کپی شد؛
-- اگر واقعیت غیرِ این است، بعداً از داخلِ خودِ اپ قابلِ اصلاح است.
--
-- idempotent — همان on conflict do nothing.

do $$
declare
  v_company_id public.companies.id%type;
  v_company_count int;
  v_nn_id public.contractors.id%type;
  v_inserted int;
begin
  select count(*) into v_company_count from public.companies where name ilike '%توسعه%';
  if v_company_count <> 1 then
    raise exception 'انتظار می‌رفت دقیقاً یک شرکت با نام شاملِ «توسعه» پیدا شود، % پیدا شد.', v_company_count;
  end if;

  select id into v_company_id from public.companies where name ilike '%توسعه%';

  select id into v_nn_id from public.contractors where company_id = v_company_id and name = 'نصب نیرو';
  if v_nn_id is null then
    raise exception 'پیمانکارِ «نصب نیرو» زیرِ این شرکت پیدا نشد.';
  end if;

  insert into public.scaffold_tags
    (id, company_id, tag_number, contractor_id, contractor_name, location, erection_date, status, issue_date, removal_date, purpose, created_by)
  values
    ('scaffold-import-Md1-NN-SC-89', v_company_id, 'Md1-NN-SC-89', v_nn_id, 'نصب نیرو', 'برچیدن تخته های کف LCC', '2025-11-02', 'removed', '2025-11-02', '2025-11-01', '', 'نصب نیرو')
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  raise notice 'تگِ داربستِ Md1-NN-SC-89 واقعاً درج‌شده: %', v_inserted;
end $$;
