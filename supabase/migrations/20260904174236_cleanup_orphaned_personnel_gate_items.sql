-- پاک‌سازی یک‌بارهی رکوردهای گیت یتیمِ پرسنل — همان مشکل ماشین‌آلات/آنومالی
-- (migration قبلی 20260904172051) اینجا هم پیدا شد، چون کشف اینکه پرسنل هم
-- از hse_gate_items استفاده می‌کند بعد از آن migration اتفاق افتاد. فقط
-- رکوردهایی حذف می‌شوند که پرسنلِ اصلی‌شان دیگر واقعاً در دیتابیس وجود ندارد.

delete from public.hse_gate_items
where module_key = 'personnelAccess'
  and record_id::text not in (select id::text from public.personnel);
