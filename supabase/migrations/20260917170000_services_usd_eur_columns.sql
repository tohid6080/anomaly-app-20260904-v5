-- قیمتِ دلاری/یورویی برای هر خدمت، جدا از تومانِ موجود — دقیقاً همان
-- الگوی price_monthly_usd/eur که قبلاً روی module_prices اضافه شد،
-- اینجا برایِ هر سه دوره‌ی خدمات (هفتگی/ماهانه/سالانه). pricingApi.js/
-- svcFromRow و upsertService این ستون‌ها را می‌خوانند/می‌نویسند؛ پیش‌فرضِ
-- صفر یعنی خدماتِ موجود تا وقتی ادمین قیمتِ ارزی تنظیم نکند، در تبِ
-- دلار/یورو صفر نشان داده می‌شوند (نه خطا).
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS price_weekly_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_monthly_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_weekly_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_monthly_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_eur numeric NOT NULL DEFAULT 0;
