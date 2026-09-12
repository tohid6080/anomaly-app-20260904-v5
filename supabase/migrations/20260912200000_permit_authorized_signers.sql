-- «لیست امضاهای مجاز» ماژول صدور مجوز کار — امنیت امضای پیمانکار.
-- هر ردیف یک شخصِ مجاز به امضای «امضای مجری» (فیلدِ signerRole=contractor
-- در schema قالب) از طرفِ یک پیمانکارِ مشخص است. وضعیت active/leave را
-- سرپرست HSE کارفرما مدیریت می‌کند؛ وقتی یک نفر leave می‌شود، از فهرستِ
-- انتخاب‌گرِ امضا (سمتِ کلاینت، فیلترِ status=active) حذف می‌شود و جانشینِ
-- او (که خودش یک ردیفِ active جداگانه است) جایگزین می‌شود — بدونِ نیاز به
-- منطقِ resolve پیچیده، چون جانشین از قبل در همان فهرست با هویتِ خودش هست.
-- الگوی جدول/RLS دقیقاً مثلِ سایرِ جداولِ ماژولِ permit (permit_renewals و ...).

create table if not exists public.permit_authorized_signers (
  id             text primary key,
  company_id     uuid not null references public.companies(id) on delete cascade,
  contractor_id  uuid not null references public.contractors(id) on delete cascade,
  full_name      text not null default '',
  job_title      text not null default '',
  status         text not null default 'active' check (status in ('active','leave')),
  substitute_id  text references public.permit_authorized_signers(id) on delete set null,
  created_by     text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists permit_authorized_signers_contractor_idx
  on public.permit_authorized_signers (contractor_id, status);
create index if not exists permit_authorized_signers_company_idx
  on public.permit_authorized_signers (company_id);
comment on table public.permit_authorized_signers is
  'فهرستِ امضاکنندگانِ مجازِ هر پیمانکار برایِ فیلدِ امضایِ مجریِ Permit — احرازِ هویت با بیومتریکِ موبایل در لحظه‌ی امضا.';

alter table public.permit_authorized_signers enable row level security;

drop policy if exists permit_authorized_signers_company_rw on public.permit_authorized_signers;
create policy permit_authorized_signers_company_rw on public.permit_authorized_signers for all
  using (
    coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  )
  with check (
    coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  );

-- برچسبِ فیلدِ «امضای مجری» در قالبِ سیستمی: signerRole=contractor یعنی این
-- فیلد فقط از موبایل و فقط با انتخاب از فهرستِ امضاهای مجاز + تأیید بیومتریک
-- قابلِ تکمیل است (نگاه کنید به PermitRuntime.jsx). قالب‌های شرکتی موجود را
-- دست نمی‌زنیم — سازنده‌ی قالب (PermitTemplateBuilder) این گزینه را برایِ
-- فیلدهای signature جدید/موجود به‌صورتِ دستی قابلِ فعال‌سازی می‌کند. به‌جایِ
-- دستکاریِ jsonb تودرتو (شکننده در برابرِ تغییرِ ساختار)، مستقیم روی sig_performer
-- که آدرسِ ثابتش را از migration ایجادِ ماژول می‌دانیم set می‌کنیم.
update public.permit_templates
   set schema = jsonb_set(
     schema,
     '{sections,3,rows,0,cells,0,field,config}',
     coalesce(schema #> '{sections,3,rows,0,cells,0,field,config}', '{}'::jsonb) || '{"signerRole":"contractor"}'::jsonb,
     true
   )
 where id = 'ptpl-system-general-v1'
   and schema #>> '{sections,3,rows,0,cells,0,field,id}' = 'sig_performer';
