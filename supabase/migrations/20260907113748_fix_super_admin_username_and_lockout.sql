-- بازگرداندن نام‌کاربری حساب اصلی Super Admin که اشتباهاً از «admin» به
-- «adm» تغییر کرده بود، به مقدار درست «admin». محافظت با NOT EXISTS تا اگر
-- به هر دلیلی از قبل ردیفی با username='admin' وجود داشت، این UPDATE با
-- خطای نقض یکتایی متوقف نشود و بی‌سروصدا رد شود.
update super_admins
set username = 'admin'
where username = 'adm'
  and not exists (select 1 from super_admins where username = 'admin');

-- رفع قفل ورود سمت سرور (جدول login_attempts، مستقل از super_admins) برای
-- هر دو نام‌کاربری admin/adm — چون تلاش‌های ناموفق ممکن است زیر هرکدام از
-- این دو ثبت شده باشند.
update login_attempts
set failed_count = 0, locked_until = null
where username in ('admin', 'adm');
