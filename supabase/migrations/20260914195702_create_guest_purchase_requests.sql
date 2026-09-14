-- درخواست‌های «خرید مستقیم توسطِ بازدیدکننده» — روی صفحه‌ی عمومیِ «مشاهده
-- پلن‌ها برای خرید» (پیش از ورود)، بازدیدکننده می‌تواند بدونِ داشتنِ حساب،
-- ماژول/خدمات را انتخاب کند، رسیدِ کارت‌به‌کارت را آپلود کند و اطلاعاتِ
-- تماس/شرکتش را ثبت کند. چون هنوز هیچ شرکتی وجود ندارد (submitCardTransferReceipt
-- به company_id نیاز دارد)، این یک جدولِ جداست — دقیقاً همان الگوی امنیتیِ
-- trial_requests: RLS هیچ policy‌ای برای anon/authenticated ندارد (پیش‌فرض
-- deny-all)، تنها مسیرِ نوشتن Edge Function عمومیِ submit-guest-purchase-request
-- (با service_role) است. SuperAdmin درخواست را بررسی می‌کند، شرکت/حساب را
-- می‌سازد و رسید را از همان‌جا (بخشِ «پرداخت‌های کارت‌به‌کارت») تأیید می‌کند —
-- این جدول صرفاً محلِ ثبتِ درخواست و رسید پیش از وجودِ شرکت است.

create table if not exists public.guest_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  company_name text not null,
  email text not null default '',
  selected_modules jsonb not null default '[]'::jsonb,
  selected_services jsonb not null default '[]'::jsonb,
  billing_cycle text not null default 'yearly',
  amount numeric not null default 0,
  payer_name text not null default '',
  payer_phone text not null default '',
  tracking_number text not null default '',
  receipt_image text,
  status text not null default 'pending', -- pending | approved | rejected
  admin_note text not null default '',
  reviewed_by text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guest_purchase_requests_status_idx on public.guest_purchase_requests (status);
create index if not exists guest_purchase_requests_created_at_idx on public.guest_purchase_requests (created_at desc);

alter table public.guest_purchase_requests enable row level security;

drop policy if exists "super admin select guest purchase requests" on public.guest_purchase_requests;
create policy "super admin select guest purchase requests" on public.guest_purchase_requests
  for select using (is_current_user_super_admin());

drop policy if exists "super admin update guest purchase requests" on public.guest_purchase_requests;
create policy "super admin update guest purchase requests" on public.guest_purchase_requests
  for update using (is_current_user_super_admin()) with check (is_current_user_super_admin());
