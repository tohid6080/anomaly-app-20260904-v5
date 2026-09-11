-- ثبتِ سه نوعِ اعلانِ جدید برای «صدور مجوز کار» در رجیستریِ
-- system_notification_types (همان جدولی که SuperAdmin → مدیریتِ اعلان‌ها
-- را تغذیه می‌کند و filterSmartItemsByConfig در App.jsx با آن هماهنگ
-- می‌شود). این جدول پیش‌تر (خارج از migrationها) ساخته شده؛ اینجا فقط اگر
-- وجود داشته باشد و ردیف‌ها نبودند، آن‌ها را idempotent درج می‌کنیم.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'system_notification_types') then

    insert into public.system_notification_types (type_key, label, description, is_enabled, target_role, priority, warning_days, owner_module_key)
    select 'permit_pending_review', 'مجوزهای کار در انتظار بررسی', 'اعلان مجوزهای کاری که ارسال یا آماده‌ی تصمیم‌گیری‌اند.', true, 'employer', 'high', null, 'permitToWork'
    where not exists (select 1 from public.system_notification_types where type_key = 'permit_pending_review');

    insert into public.system_notification_types (type_key, label, description, is_enabled, target_role, priority, warning_days, owner_module_key)
    select 'permit_rejected', 'مجوزهای کار ردشده', 'اعلان مجوزهای کاری که رد شده و نیاز به اصلاح دارند.', true, 'contractor', 'high', null, 'permitToWork'
    where not exists (select 1 from public.system_notification_types where type_key = 'permit_rejected');

    insert into public.system_notification_types (type_key, label, description, is_enabled, target_role, priority, warning_days, owner_module_key)
    select 'permit_expiring', 'نزدیک به انقضای مجوز کار', 'هشدار نزدیک‌شدنِ مجوز کار فعال به پایانِ اعتبار.', true, 'all', 'medium', 3, 'permitToWork'
    where not exists (select 1 from public.system_notification_types where type_key = 'permit_expiring');

  end if;
end $$;
