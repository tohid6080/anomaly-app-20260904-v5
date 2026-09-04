-- رفع خطای 23514: payments_status_check فقط چهار مقدار قدیمی
-- ('pending','paid','failed','cancelled') را مجاز می‌کرد — دو مقدار جدید
-- ('awaiting_review','rejected') که در migration 20260904175716 برای
-- گردش‌کار کارت‌به‌کارت اضافه شده بودند، هنوز به این قید افزوده نشده
-- بودند. هیچ مقدار قدیمی حذف نمی‌شود — فقط دو مقدار جدید اضافه می‌شود،
-- پس منطق پرداخت آنلاین زرین‌پال کاملاً دست‌نخورده می‌ماند.
alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status = any (array['pending', 'paid', 'failed', 'cancelled', 'awaiting_review', 'rejected']));

drop function if exists public.debug_check_constraints();
