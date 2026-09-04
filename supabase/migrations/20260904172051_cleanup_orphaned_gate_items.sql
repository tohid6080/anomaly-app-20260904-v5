-- پاک‌سازی یک‌بارهی رکوردهای گیت یتیم — طبق گزارش صریح: یک ماشین حذف‌شده
-- (کمپکتور، پلاک ۲۵۶ل۴۵ ایران۶۸) همچنان به‌عنوان «در انتظار تأیید» در
-- «کارهای در دست اقدام من» نمایش داده می‌شد، چون hse_gate_items هیچ قید
-- foreign key واقعی به جدول‌های ماژول‌ها ندارد. فقط رکوردهایی حذف می‌شوند
-- که رکورد اصلی‌شان (ماشین یا آنومالی) دیگر واقعاً در دیتابیس وجود ندارد
-- — هیچ داده‌ی معتبر دیگری دست‌نخورده می‌ماند. جلوگیری از تکرار این
-- مشکل در کد (deleteGateItemsForRecord) قبلاً انجام شده؛ این فقط
-- پاک‌سازی یتیم‌های موجودِ قبل از آن رفع است.

delete from public.hse_gate_items
where module_key = 'machineryManagement'
  and record_id::text not in (select id::text from public.machinery);

delete from public.hse_gate_items
where module_key = 'anomalyReport'
  and record_id::text not in (select id::text from public.anomalies);
