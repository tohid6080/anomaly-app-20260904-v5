-- سرنخ‌هایِ فرمِ عمومیِ «پرپوزال تبلیغاتیِ IHMS» (مسیرِ مستقلِ
-- public/proposal/، بدونِ احرازِ هویت). دقیقاً همان الگویِ امنیتیِ
-- trial_requests/guest_purchase_requests: RLS فعال است اما هیچ policy ای
-- برایِ anon/authenticated تعریف نشده (پیش‌فرض deny-all)؛ تنها مسیرِ
-- نوشتن، Edge Function عمومیِ submit-proposal-lead (با service_role)
-- است. SuperAdmin مثلِ بقیه‌ی جدول‌ها با scope خودش می‌خواند/تغییر می‌دهد.
-- برخلافِ trial_requests (که بلافاصله یک شرکت/حساب واقعی می‌سازد)، این
-- جدول صرفاً یک صفِ سرنخِ فروش است — هیچ شرکت/حسابی از رویِ آن ساخته
-- نمی‌شود؛ بررسیِ آن فعلاً از طریقِ دشبوردِ خودِ Supabase انجام می‌شود،
-- نه یک پنلِ تازه در SuperAdmin (طبقِ خواسته‌ی عدمِ افزودنِ وابستگی/ماژولِ
-- غیرضروری).

create table if not exists public.proposal_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  "position" text not null default '',
  phone text not null,
  email text not null default '',
  audience_type text not null default '', -- employer | contractor | standalone | hse_expert | '' (مشخص نشده)
  request_type text not null default '', -- consultation | partnership | pricing
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  reviewed_by text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists proposal_leads_status_idx on public.proposal_leads (status);
create index if not exists proposal_leads_created_at_idx on public.proposal_leads (created_at desc);

alter table public.proposal_leads enable row level security;

drop policy if exists "super admin select proposal leads" on public.proposal_leads;
create policy "super admin select proposal leads" on public.proposal_leads
  for select using (is_current_user_super_admin());

drop policy if exists "super admin update proposal leads" on public.proposal_leads;
create policy "super admin update proposal leads" on public.proposal_leads
  for update using (is_current_user_super_admin()) with check (is_current_user_super_admin());
