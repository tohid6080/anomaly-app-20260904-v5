-- فهرستِ نامِ «شرکت‌های پیمانکاریِ زیرمجموعه» هر شرکت (کارفرما) — کاملاً
-- مستقل از جدولِ contractors (که خودِ حساب‌های کاربری/ورودِ پیمانکار است).
-- طبقِ خواسته‌ی صریح: سوپرادمین اول این فهرست را برای هر شرکت تعریف
-- می‌کند؛ بعد، هنگامِ ساختِ حسابِ پیمانکار، فیلدِ «نام شرکت پیمانکار»
-- به‌جای تایپِ آزاد، از همین فهرست انتخاب می‌شود — تا یک اشتباهِ تایپی
-- (مثلاً یک فاصله‌ی جااُفتاده) باعثِ ثبتِ ناخواسته‌ی یک شرکتِ کاملاً
-- متفاوت نشود. فقط سوپرادمین به این جدول دسترسی دارد — هیچ کاربرِ عادیِ
-- کارفرما/پیمانکار/ادمین هرگز آن را نمی‌بیند (دقیقاً مثلِ companies و
-- contractors، هیچ نقشِ داخلِ‌برنامه‌ای این جدول را لمس نمی‌کند).
create extension if not exists pgcrypto;

create table if not exists public.contractor_companies (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  created_by  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists contractor_companies_company_idx on public.contractor_companies (company_id, is_active);
comment on table public.contractor_companies is
  'فهرستِ نامِ شرکت‌های پیمانکاریِ زیرمجموعه‌ی هر شرکت (کارفرما) — فقط سوپرادمین می‌سازد/می‌بیند؛ منبعِ انتخاب برای فیلدِ نامِ شرکت هنگامِ ساختِ حسابِ پیمانکار در contractors.';

alter table public.contractor_companies enable row level security;

create policy contractor_companies_super_admin_all on public.contractor_companies
  for all
  using (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true)
  with check (coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true);
