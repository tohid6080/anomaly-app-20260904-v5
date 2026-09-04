-- امکان ارجاع اقدام اصلاحی Tripod Beta به یک پیمانکار مشخص جهت پیگیری —
-- دقیقاً همان نوع ستون و همان مرجع (contractors.id) که corrective_actions
-- از قبل برای همین منظور استفاده می‌کند.
alter table tripod_corrective_actions
  add column if not exists responsible_contractor_id uuid references contractors(id),
  add column if not exists responsible_contractor_name text;
