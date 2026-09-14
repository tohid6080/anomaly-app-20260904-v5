-- =============================================================================
-- Module-Based Subscriptions — جدولِ اصلیِ ماژول‌های فعالِ هر شرکت
-- =============================================================================
-- هدف: جایگزینیِ آرایه‌ی تختِ companies.module_overrides (بدون تاریخ) با یک
-- رکوردِ واقعی به‌ازای هر «شرکت + ماژول» که تاریخ+ساعتِ دقیقِ شروع/پایان دارد.
-- companies.plan_id / module_overrides و جدولِ plans دست‌نخورده می‌مانند
-- (برای یکپارچگیِ سوابقِ payments/company_subscription_history) — فقط دیگر
-- در مسیرِ جدیدِ گیتِ دسترسی خوانده نمی‌شوند. کاملاً افزودنی و برگشت‌پذیر.
-- =============================================================================

create table if not exists public.company_modules (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  module_key    text not null,                        -- همان کلیدِ PLAN_FEATURES / isModuleInPlan
  is_active     boolean not null default true,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,                           -- NULL = بدونِ انقضا
  price_monthly numeric not null default 0,            -- قیمتِ لحظه‌ای‌ثبت‌شده هنگامِ فروش (سابقه‌ی تاریخی)
  price_yearly  numeric not null default 0,
  source        text not null default 'admin_grant' check (source in ('purchase', 'admin_grant')),
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, module_key)
);
comment on table public.company_modules is
  'ماژول‌های فعالِ هر شرکت، ماژول‌به‌ماژول با تاریخ+ساعتِ دقیقِ شروع/پایان — جایگزینِ Module-Based برای companies.plan_id/module_overrides.';

create index if not exists company_modules_company_idx on public.company_modules(company_id);

-- =============================================================================
-- RLS — همان قراردادِ پروژه: خواندنِ خودِ شرکت + نوشتنِ فقط Super Admin
-- =============================================================================
alter table public.company_modules enable row level security;

drop policy if exists "read own company modules" on public.company_modules;
create policy "read own company modules" on public.company_modules for select
  using (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists "super admin write company modules" on public.company_modules;
create policy "super admin write company modules" on public.company_modules for all
  using (is_current_user_super_admin()) with check (is_current_user_super_admin());
