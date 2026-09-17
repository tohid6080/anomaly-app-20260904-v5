-- نامِ ماژول/خدمت به انگلیسی و آلمانی — pricingApi.js/mpFromRow و
-- svcFromRow این ستون‌ها را می‌خوانند؛ خالی بودن یعنی همان الگوی
-- translate() (زبانِ خواسته‌شده → انگلیسی → فارسی) به فارسیِ موجود
-- برمی‌گردد، پس تا وقتی ادمین پرشان نکند هیچ رگرسیونی رخ نمی‌دهد.
ALTER TABLE module_prices
  ADD COLUMN IF NOT EXISTS label_en text,
  ADD COLUMN IF NOT EXISTS label_de text;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_de text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_de text;

-- payments (رسیدهای کارت‌به‌کارت + پرداختِ آنلاین): ایمیل/نامِ شرکتِ
-- اعلام‌شده توسطِ واریزکننده (اختیاری، فقط برایِ نمایش به ادمین)، و ارزی
-- که مبلغ با آن ثبت شده (پیش‌فرض 'irr' برایِ ردیف‌های قدیمی).
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS payer_company_name text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'irr';

ALTER TABLE guest_purchase_requests
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'irr';
