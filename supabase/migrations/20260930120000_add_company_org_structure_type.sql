-- ساختار سازمانیِ شرکت — انتخابی که بازدیدکننده هنگامِ ثبت‌نامِ خودسرویس
-- (submit-trial-signup) بینِ سه گزینه می‌کند:
--   employer_contractor      کارفرما/چند پیمانکار — همان مدلِ فعلی و پیش‌فرضِ IHMS
--   standalone_no_project    شرکتِ مستقل، بدونِ پروژه
--   standalone_multi_project شرکتِ مستقل، چند پروژه
--
-- این ستون صرفاً یک برچسبِ ذخیره‌شده است؛ در این فاز هیچ جدول/CRUD/منطقِ
-- جدیدی برایِ «پروژه» ساخته نمی‌شود و هیچ ماژولِ دیگری project_id
-- دریافت نمی‌کند (طبقِ تصمیمِ صریح) — فقط زمینه برایِ توسعه‌ی آینده.
--
-- default = 'employer_contractor' یعنی همه‌ی شرکت‌های قبلی (که این انتخاب
-- برایشان هرگز مطرح نبوده) دقیقاً همان چیزی محسوب می‌شوند که همیشه بوده‌اند
-- — بدونِ نیازِ به backfill جداگانه، بدونِ تغییرِ رفتار.
alter table public.companies
  add column if not exists org_structure_type text not null default 'employer_contractor';

alter table public.companies
  drop constraint if exists companies_org_structure_type_check;
alter table public.companies
  add constraint companies_org_structure_type_check
  check (org_structure_type in ('standalone_no_project', 'standalone_multi_project', 'employer_contractor'));
