-- دکمه‌ی «حذف» برای ۴ فهرستِ سوپرادمین (گزارش‌های خطا، رسیدهای پرداخت
-- کارت‌به‌کارت + درخواست‌های خریدِ مستقیمِ بازدیدکننده — هردو در همان صفحه‌ی
-- ادغام‌شده، درخواست‌های پلن آزمایشی، و گزارشِ تغییراتِ حساب‌ها/گزارشِ
-- فعالیت). تا امروز این ۵ جدول فقط SELECT/UPDATE (و بعضاً INSERT) برای
-- is_current_user_super_admin() داشتند — DELETE هرگز لازم نبود، پس هیچ
-- policy ای برایش وجود نداشت (یعنی پیش‌فرض deny). دامنه‌ی هرکدام دقیقاً
-- همان دامنه‌ی UPDATE policy موجودِ همان جدول است (مثلاً payments بدون
-- محدودیتِ method، چون همان الگو برای UPDATE هم از قبل برقرار است).

drop policy if exists "super admin delete error reports" on public.error_reports;
create policy "super admin delete error reports" on public.error_reports
  for delete using (is_current_user_super_admin());

drop policy if exists "super admin delete payments" on public.payments;
create policy "super admin delete payments" on public.payments
  for delete using (is_current_user_super_admin());

drop policy if exists "super admin delete guest purchase requests" on public.guest_purchase_requests;
create policy "super admin delete guest purchase requests" on public.guest_purchase_requests
  for delete using (is_current_user_super_admin());

drop policy if exists "super admin delete trial requests" on public.trial_requests;
create policy "super admin delete trial requests" on public.trial_requests
  for delete using (is_current_user_super_admin());

-- admin_audit_log migration ای در این ریپو ندارد (جدول از قبل، بیرون از
-- فایل‌های migration، ساخته شده) — برای اطمینان RLS را هم (بی‌اثر اگر از
-- قبل فعال بود) دوباره enable می‌کنیم.
alter table public.admin_audit_log enable row level security;

drop policy if exists "super admin delete audit log" on public.admin_audit_log;
create policy "super admin delete audit log" on public.admin_audit_log
  for delete using (is_current_user_super_admin());
