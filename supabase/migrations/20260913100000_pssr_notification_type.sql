-- ثبتِ نوعِ اعلانِ «Action باز PSSR» در رجیستریِ system_notification_types
-- (همان الگویِ permit_pending_review/... در 20260911184116) تا هم زنگوله‌ی
-- سراسری (classifyNotificationKey در App.jsx) و هم صفحه‌ی «مدیریتِ اعلان‌ها»یِ
-- SuperAdmin آن را بشناسند.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'system_notification_types') then
    insert into public.system_notification_types (type_key, label, description, is_enabled, target_role, priority, warning_days, owner_module_key)
    select 'pssr_action_open', 'Actionِ باز PSSR', 'اعلانِ Actionِ بازِ PSSR که مسئولِ آن Discipline هستید (به‌ویژه CAT A/B).', true, 'all', 'high', null, 'pssrManagement'
    where not exists (select 1 from public.system_notification_types where type_key = 'pssr_action_open');
  end if;
end $$;
