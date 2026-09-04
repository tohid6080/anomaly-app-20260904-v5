-- درخواست‌های «ارزیابی و پلن آزمایشی» — فرم عمومیِ صفحه‌ی ورود (بدون
-- نیاز به احراز هویت). دقیقاً همان الگوی امنیتیِ hse_climate_responses:
-- RLS هیچ policy ای برای anon/authenticated ندارد (پیش‌فرض deny-all)،
-- تنها مسیر نوشتن Edge Function عمومی submit-trial-request (با
-- service_role) است. SuperAdmin مثل بقیه‌ی جدول‌ها با scope خودش
-- می‌خواند/تغییر می‌دهد.

create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  company_name text not null,
  position text not null default '',
  industry text not null default '',
  personnel_count integer,
  project_name text not null default '',
  project_city text not null default '',
  email text not null default '',
  desired_modules jsonb not null default '[]'::jsonb,
  description text not null default '',
  status text not null default 'pending', -- pending | approved | rejected
  approved_trial_days integer,
  admin_note text not null default '',
  reviewed_by text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trial_requests_status_idx on public.trial_requests (status);
create index if not exists trial_requests_created_at_idx on public.trial_requests (created_at desc);

alter table public.trial_requests enable row level security;

drop policy if exists "super admin select trial requests" on public.trial_requests;
create policy "super admin select trial requests" on public.trial_requests
  for select using (is_current_user_super_admin());

drop policy if exists "super admin update trial requests" on public.trial_requests;
create policy "super admin update trial requests" on public.trial_requests
  for update using (is_current_user_super_admin()) with check (is_current_user_super_admin());
