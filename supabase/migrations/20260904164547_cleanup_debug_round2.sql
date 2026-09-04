-- پاک‌سازی توابع تشخیصی موقتِ راند دوم (دیگر لازم نیستند — علت واقعی
-- 42501 پیدا شد: تعامل INSERT+RETURNING با policy انتخاب؛ رفع شد در
-- کد سمت کلاینت با return=minimal، نه با تغییر policy).
drop function if exists public.debug_list_policies2();
drop function if exists public.debug_grants();
drop function if exists public.debug_company_check(uuid);
