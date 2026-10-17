-- =============================================================================
-- رفعِ Policyِ RLSِ cranelift_trial_users: استفاده از تابعِ کمکیِ استانداردِ
-- پروژه به‌جایِ چکِ خامِ auth.jwt()
-- =============================================================================
-- طبقِ 20260916110000_normalize_rls_to_helper_functions.sql، همه‌ی
-- Policyهایِ «فقط SuperAdmin» این پروژه باید از is_current_user_super_admin()
-- استفاده کنند (دقیقاً همان الگویِ platform_survey_responses که شکلِ
-- یکسانی با این جدول دارد: درجِ عمومی فقط از Edge Function با
-- service_role، خواندن/حذف/به‌روزرسانی فقط SuperAdmin). نسخه‌ی اولِ این
-- جدول (20261017090000) به‌اشتباه از الگویِ خامِ
-- coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) استفاده کرده
-- بود که در عمل برایِ پنلِ واقعیِ SuperAdmin نتیجه‌ی خالی برمی‌گرداند.
-- =============================================================================

drop policy if exists cranelift_trial_users_super_admin_rw on public.cranelift_trial_users;
create policy cranelift_trial_users_super_admin_rw on public.cranelift_trial_users
  for all
  using (is_current_user_super_admin())
  with check (is_current_user_super_admin());
