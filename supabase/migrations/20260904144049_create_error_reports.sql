-- گزارش خطای سامانه — قابلیت عمومی «گزارش خطا»: هر کاربر (ادمین/کارفرما/
-- سرپرست HSE/پیمانکار) هنگام مشاهده‌ی خطا می‌تواند آن را به SuperAdmin
-- گزارش کند. SuperAdmin در پنل خودش همه‌ی گزارش‌ها (از همه‌ی شرکت‌ها) را
-- می‌بیند و پیگیری (تغییر وضعیت/یادداشت) می‌کند.
--
-- الگوی RLS دقیقاً مطابق بقیه‌ی جدول‌های پروژه: توکن سفارشی (نه Supabase
-- Auth بومی) که با APP_JWT_SECRET امضا می‌شود و claims آن (company_id،
-- is_super_admin، username، app_role) از طریق auth.jwt() در دسترس است.

create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  reported_by_username text not null default '',
  reported_by_name text not null default '',
  reported_by_role text not null default '',
  module_key text not null default '',
  page_label text not null default '',
  description text not null default '',
  technical_message text not null default '',
  technical_stack text not null default '',
  user_agent text not null default '',
  status text not null default 'open', -- open | reviewed | resolved
  admin_note text not null default '',
  resolved_by text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists error_reports_company_id_idx on public.error_reports (company_id);
create index if not exists error_reports_status_idx on public.error_reports (status);
create index if not exists error_reports_created_at_idx on public.error_reports (created_at desc);

alter table public.error_reports enable row level security;

-- هر کاربر واردشده‌ی یک شرکت می‌تواند برای همان شرکتِ خودش گزارش خطا ثبت کند
drop policy if exists "error_reports_insert_own_company" on public.error_reports;
create policy "error_reports_insert_own_company" on public.error_reports
  for insert
  with check (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    and auth.jwt() ->> 'company_id' is not null
  );

-- فقط SuperAdmin می‌تواند گزارش‌ها را ببیند/پیگیری کند (طبق خواسته‌ی صریح:
-- «در پنل SuperAdmin قابل مشاهده و پیگیری باشد»)
drop policy if exists "error_reports_select_super_admin" on public.error_reports;
create policy "error_reports_select_super_admin" on public.error_reports
  for select
  using (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true);

drop policy if exists "error_reports_update_super_admin" on public.error_reports;
create policy "error_reports_update_super_admin" on public.error_reports
  for update
  using (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true)
  with check (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true);
