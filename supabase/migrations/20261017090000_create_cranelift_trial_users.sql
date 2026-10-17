-- =============================================================================
-- کاربرانِ آزمایشیِ IHMS CraneLift 3D (دسترسیِ وبِ عمومی از طریقِ صفحه‌ی
-- sapp/cranelift روی سایتِ IHMS)
-- =============================================================================
-- این جدول کاملاً مستقل از مدلِ چندشرکتیِ اصلیِ IHMS (companies/
-- employer_accounts/...) است — فقط برایِ ردیابیِ بازدیدکنندگانِ عمومی‌ای
-- که از صفحه‌ی تبلیغاتیِ IHMS، نسخه‌ی وبِ CraneLift 3D را امتحان می‌کنند.
-- دوره‌ی آزمایشی ۱ روزه و بدونِ رمزِ عبور است (فقط برایِ شناساییِ بازدیدکننده،
-- نه یک حسابِ کاربریِ امن). داده‌هایِ خودِ لیفت‌پلن هرگز این‌جا ذخیره
-- نمی‌شوند — فقط آفلاین/محلی در مرورگرِ کاربر می‌مانند.
--
-- نوشتن: فقط از طریقِ Edge Function (submit-cranelift-trial-signup، با
-- service_role) — هیچ Policyِ INSERT برایِ anon تعریف نشده، عمداً، تا این
-- جدول هرگز مستقیماً از کلاینت (با کلیدِ عمومی) قابلِ‌نوشتن نباشد.
-- خواندن/حذف/غیرفعال‌سازی: فقط SuperAdmin (پنلِ «لیفتینگ پلن»).
-- =============================================================================

create table if not exists public.cranelift_trial_users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  mobile text not null,
  company_name text not null default '',
  trial_started_at timestamptz not null default now(),
  trial_expires_at timestamptz not null default (now() + interval '1 day'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cranelift_trial_users_mobile_idx on public.cranelift_trial_users (mobile);
create index if not exists cranelift_trial_users_created_idx on public.cranelift_trial_users (created_at desc);

comment on table public.cranelift_trial_users is
  'بازدیدکنندگانِ عمومی‌ای که از صفحه‌ی وبِ IHMS CraneLift 3D، دوره‌ی آزمایشیِ ۱ روزه را فعال کرده‌اند. مستقل از مدلِ چندشرکتیِ IHMS.';

alter table public.cranelift_trial_users enable row level security;

-- بدونِ هیچ Policyِ public/anon — فقط service_role (Edge Function) و
-- کلاینت‌هایِ با توکنِ super_admin (از طریقِ claim مشابهِ بقیه‌ی جدول‌هایِ
-- این پروژه) دسترسی دارند.
drop policy if exists cranelift_trial_users_super_admin_rw on public.cranelift_trial_users;
create policy cranelift_trial_users_super_admin_rw on public.cranelift_trial_users
  for all
  using (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true)
  with check (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true);
