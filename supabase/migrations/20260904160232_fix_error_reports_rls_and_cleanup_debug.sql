-- رفع error_reports: policyهای اولیه از auth.jwt() ->> 'company_id' مستقیم
-- استفاده می‌کردند که با قرارداد واقعی این پروژه ناسازگار بود — تمام
-- جدول‌های موجود (anomalies، hse_gate_items، employer_accounts) از توابع
-- کمکی current_company_id() و is_current_user_super_admin() استفاده
-- می‌کنند (تأیید شد با inspect مستقیم pg_policies). همان الگو اینجا هم
-- اعمال می‌شود.

drop policy if exists "error_reports_insert_own_company" on public.error_reports;
create policy "error_reports_insert_own_company" on public.error_reports
  for insert
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists "error_reports_select_super_admin" on public.error_reports;
create policy "error_reports_select_super_admin" on public.error_reports
  for select
  using (is_current_user_super_admin());

drop policy if exists "error_reports_update_super_admin" on public.error_reports;
create policy "error_reports_update_super_admin" on public.error_reports
  for update
  using (is_current_user_super_admin())
  with check (is_current_user_super_admin());

-- پاک‌سازی توابع تشخیصی موقت (دیگر لازم نیستند)
drop function if exists public.debug_list_policies();
drop function if exists public.debug_current_claims();
