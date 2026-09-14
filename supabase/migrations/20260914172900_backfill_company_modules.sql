-- =============================================================================
-- Backfill دیتای موجود به company_modules
-- =============================================================================
-- برای هر شرکت، همان مجموعه‌ی ماژولی که امروز loadCurrentCompanyPlanFeatures()
-- محاسبه می‌کند (اول module_overrides، وگرنه plans.features) را به رکوردهای
-- واقعیِ company_modules تبدیل می‌کند، با تاریخ+ساعتِ شروع/پایانِ برگرفته از
-- وضعیتِ فعلیِ اشتراکِ همان شرکت. Idempotent (on conflict do nothing) — اجرای
-- دوباره خطا/تکرار نمی‌سازد.
-- =============================================================================

do $$
declare
  co record;
  mod_key text;
  keys jsonb;
  s_at timestamptz;
  e_at timestamptz;
begin
  for co in select id, plan_id, module_overrides, subscription_type, subscription_start_date, subscription_end_date, trial_start, trial_end from public.companies
  loop
    -- ۱) مجموعه‌ی ماژول‌ها: اول module_overrides، وگرنه features همان پلن
    if jsonb_typeof(co.module_overrides) = 'array' then
      keys := co.module_overrides;
    elsif co.plan_id is not null then
      select features into keys from public.plans where id = co.plan_id;
    else
      keys := null;
    end if;
    if keys is null or jsonb_typeof(keys) <> 'array' then
      continue;
    end if;

    -- ۲) بازه‌ی زمانی: بر اساسِ نوعِ اشتراکِ فعلیِ همان شرکت
    if co.subscription_type = 'trial' then
      s_at := coalesce(co.trial_start, now());
      e_at := co.trial_end;
    elsif co.subscription_type = 'permanent' then
      s_at := coalesce(co.subscription_start_date, now());
      e_at := null;
    else
      s_at := coalesce(co.subscription_start_date, now());
      e_at := co.subscription_end_date;
    end if;

    -- ۳) یک ردیف به‌ازای هر کلیدِ ماژول، با قیمتِ لحظه‌ایِ ثبت‌شده از module_prices (اگر موجود بود)
    for mod_key in select jsonb_array_elements_text(keys)
    loop
      insert into public.company_modules (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      select co.id, mod_key, true, s_at, e_at,
             coalesce(mp.price_monthly, 0), coalesce(mp.price_yearly, 0),
             'admin_grant', 'backfill'
      from (select 1) x
      left join public.module_prices mp on mp.module_key = mod_key
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;
end $$;
