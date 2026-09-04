-- قابلیت «پرداخت کارت‌به‌کارت» — بدون هیچ تغییری در منطق فعلی پلن‌ها/
-- پرداخت آنلاین زرین‌پال؛ فقط یک مسیر دومِ اضافه روی همان جدول payments
-- موجود (تا تاریخچه‌ی پرداخت هر شرکت، آنلاین و کارت‌به‌کارت، یکجا و
-- یکپارچه بماند)، دقیقاً با همان قرارداد RLS پروژه (current_company_id،
-- is_current_user_super_admin — طبق inspect مستقیم انجام‌شده روی
-- policyهای واقعی، نه حدس).
--
-- تا امروز payments هیچ INSERT/UPDATE policy ای نداشت (چون همه‌ی
-- نوشتن‌ها فقط از طریق Edge Function زرین‌پال با service_role انجام
-- می‌شد) — این دو policy کاملاً جدید و افزودنی‌اند.

alter table public.payments
  add column if not exists method text not null default 'online',
  add column if not exists payer_name text,
  add column if not exists payer_phone text,
  add column if not exists tracking_number text,
  add column if not exists receipt_image text,
  add column if not exists admin_note text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

-- هر کاربر شرکت می‌تواند برای شرکت خودش یک رسید کارت‌به‌کارت ثبت کند —
-- فقط با وضعیت اولیه‌ی «در انتظار تأیید»، نه هیچ وضعیت دیگری (جلوگیری
-- از جعل status=paid توسط کلاینت).
drop policy if exists "insert own company card transfer" on public.payments;
create policy "insert own company card transfer" on public.payments
  for insert
  with check (
    company_id = current_company_id()
    and method = 'card_transfer'
    and status = 'awaiting_review'
  );

-- فقط SuperAdmin می‌تواند رسید را تأیید/رد کند (UPDATE) — کاربر عادی
-- هیچ مسیر ویرایشی روی رکورد پرداخت خودش ندارد.
drop policy if exists "super admin update payments" on public.payments;
create policy "super admin update payments" on public.payments
  for update
  using (is_current_user_super_admin())
  with check (is_current_user_super_admin());

-- پاک‌سازی توابع تشخیصی موقت
drop function if exists public.debug_payments_schema();
drop function if exists public.debug_payments_policies();
