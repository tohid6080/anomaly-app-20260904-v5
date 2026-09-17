-- قیمتِ دلاری/یورویی برای هر ماژول، جدا از تومانِ موجود (price_monthly/
-- price_yearly) — برای «انتخابِ ارزِ پرداخت» در صفحه‌ی خریدِ ماژول.
-- pricingApi.js/mpFromRow و saveModulePrice این چهار ستون را می‌خوانند/
-- می‌نویسند؛ پیش‌فرضِ صفر یعنی ماژول‌های موجود تا وقتی ادمین قیمتِ ارزی
-- برایشان تنظیم نکند، در تبِ دلار/یورو صفر نشان داده می‌شوند (نه خطا).
ALTER TABLE module_prices
  ADD COLUMN IF NOT EXISTS price_monthly_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_monthly_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_eur numeric NOT NULL DEFAULT 0;
