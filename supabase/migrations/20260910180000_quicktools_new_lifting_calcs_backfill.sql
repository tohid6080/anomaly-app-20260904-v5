-- ۱۱ ابزارِ محاسباتیِ جدیدِ لیفتینگ/ریگینگ به quickToolsData.jsx اضافه شد
-- (کلیدها دقیقاً برابر id هر ابزار: sling-angle-geo, sling-tension,
-- shackle-load, load-weight, load-cg, crane-radius-capacity,
-- ground-pressure, jack-load, lift-point-load, rigging-wll-util,
-- lift-risk-checklist). طبق همان منطقِ migrationِ قبلی
-- (20260910120000_quicktools_plan_backfill.sql): این‌ها هم به همان شکلِ
-- ابزارهای قبلی «رایگان برای همه» بودند تا امروز، پس بدون این backfill
-- هیچ پلنِ موجودی آن‌ها را نمی‌بیند و کاربر اصلاً نمی‌تواند برای تصمیمِ
-- «کدام‌ها را نگه دارم» امتحانشان کند.

update public.plans
set features = (
  select jsonb_agg(distinct elem)
  from jsonb_array_elements_text(
    features || '["sling-angle-geo","sling-tension","shackle-load","load-weight","load-cg","crane-radius-capacity","ground-pressure","jack-load","lift-point-load","rigging-wll-util","lift-risk-checklist"]'::jsonb
  ) as elem
)
where features is not null
  and jsonb_typeof(features) = 'array';
