-- یکپارچه‌سازیِ Policyهایِ RLS با قراردادِ استانداردِ پروژه
-- =============================================================================
-- کشف‌شده در ممیزیِ فنیِ ۱۶ شهریور ۱۴۰۵: از ۹ سپتامبر به بعد (ماژول‌هایِ
-- لیفتینگ‌پلن، Excavation، Energy، Fleet-fuel، Survey، Permit (+ Signers)،
-- PSSR، chat_push_tokens) به‌جایِ توابعِ کمکیِ استانداردِ پروژه
-- (current_company_id()/is_current_user_super_admin() — که در
-- 20260904160232 برایِ error_reports هم همین اصلاح انجام شده بود) مستقیماً
-- از الگویِ خامِ زیر استفاده شده بود:
--   coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
--   or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
--
-- بررسیِ مستقیمِ تعریفِ واقعیِ current_company_id()/is_current_user_super_admin()
-- (با درخواستِ کاربر از SQL Editor) تأیید کرد این دو الگو از نظرِ منطقی
-- کاملاً معادل‌اند (هر دو current_setting('request.jwt.claims', true) را
-- می‌خوانند) — این تغییر فقط یکپارچگیِ سبک/قرارداد است، نه رفعِ یک نشتیِ
-- امنیتیِ واقعی. تأیید شد که هیچ کدِ اپلیکیشنی به نامِ این Policyها یا به
-- جزئیاتِ متنِ SQLشان وابسته نیست — فقط رفتارِ RLS برایِ کلاینت اهمیت دارد
-- که اینجا کاملاً حفظ می‌شود.
--
-- بخشِ ۱: جدول‌هایی که company_id در آن‌ها NOT NULL است — مقایسه‌ی مستقیمِ
-- uuid=uuid (بدونِ نیاز به coalesce/cast متنی، چون current_company_id()
-- خودش uuid برمی‌گرداند).
do $$
declare t text;
begin
  foreach t in array array[
    'lifting_plans','lifting_plan_revisions','lifting_plan_audit','lifting_crane_models','lifting_rigging_items',
    'excavation_assessments','excavation_audit',
    'energy_assessments','energy_audit',
    'fleet_fuel_assessments','fleet_fuel_audit',
    'permits','permit_renewals',
    'pssr_checklist_templates','pssr_requirement_templates','pssrs','pssr_team_members',
    'pssr_meetings','pssr_checklist_responses','pssr_action_items','pssr_action_history','pssr_notifications',
    'chat_push_tokens'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_company_rw', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using (company_id = current_company_id() or is_current_user_super_admin())
        with check (company_id = current_company_id() or is_current_user_super_admin())
    $f$, t || '_company_rw', t);
  end loop;
end $$;

-- بخشِ ۲: جدول‌هایِ «قالبِ سیستمی» — company_id قابل‌تهی است (null یعنی
-- ردیفِ سیستمی/پیش‌فرض، برایِ همه خواندنی)؛ نوشتنِ ردیفِ سیستمی فقط
-- Super Admin، ردیفِ شرکتی مثلِ بقیه.
do $$
declare t text;
begin
  foreach t in array array[
    'lifting_acceptance_criteria','excavation_standard_profiles',
    'energy_tariffs','energy_equipment_bank','fleet_vehicle_bank','permit_templates'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format($f$
      create policy %I on public.%I
        for select
        using (company_id is null or company_id = current_company_id() or is_current_user_super_admin())
    $f$, t || '_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format($f$
      create policy %I on public.%I
        for all
        using ((company_id is not null and company_id = current_company_id()) or is_current_user_super_admin())
        with check ((company_id is not null and company_id = current_company_id()) or is_current_user_super_admin())
    $f$, t || '_write', t);
  end loop;
end $$;

-- بخشِ ۳: Survey — پاسخ‌ها فقط خواندن/حذف (درج صرفاً با service_role از
-- Edge Function، عمداً بدون Policyِ INSERT — همان‌طور که کامنتِ اصلی هم
-- تصریح کرده بود؛ اینجا دست‌نخورده می‌ماند).
drop policy if exists surveys_company_rw on public.surveys;
create policy surveys_company_rw on public.surveys
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists survey_responses_company_read on public.survey_responses;
create policy survey_responses_company_read on public.survey_responses
  for select using (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists survey_responses_company_delete on public.survey_responses;
create policy survey_responses_company_delete on public.survey_responses
  for delete using (company_id = current_company_id() or is_current_user_super_admin());

-- بخشِ ۴: Permit Audit — تغییرناپذیر (فقط SELECT/INSERT، بدونِ UPDATE/DELETE،
-- دست‌نخورده می‌ماند).
drop policy if exists permit_audit_read on public.permit_audit;
create policy permit_audit_read on public.permit_audit
  for select using (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists permit_audit_insert on public.permit_audit;
create policy permit_audit_insert on public.permit_audit
  for insert with check (company_id = current_company_id() or is_current_user_super_admin());

-- بخشِ ۵: امضاکنندگانِ مجازِ مجوزِ کار
drop policy if exists permit_authorized_signers_company_rw on public.permit_authorized_signers;
create policy permit_authorized_signers_company_rw on public.permit_authorized_signers
  for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- بخشِ ۶: contractor_companies — بدونِ company_id (لیستِ متنیِ سراسری)،
-- فقط Super Admin می‌نویسد/می‌خواند.
drop policy if exists contractor_companies_super_admin_all on public.contractor_companies;
create policy contractor_companies_super_admin_all on public.contractor_companies
  for all
  using (is_current_user_super_admin())
  with check (is_current_user_super_admin());
