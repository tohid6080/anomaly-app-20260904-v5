-- ماژول «صدور مجوز کار (Permit to Work)» — فاز ۱: هسته‌ی استاندارد.
-- لایه‌ی استاندارد (permits + ماشینِ حالت + شماره‌ی یکتا) در کد و دیتابیس ثابت
-- است؛ لایه‌ی پویا (permit_templates.schema jsonb، مدلِ Section→Row→Cell) برای
-- هر شرکت قابلِ سفارشی‌سازی است. PKها TEXT (uid کلاینت)؛ company_id از نوعِ uuid.
-- الگوی RLS: company-scoped + بایپسِ سوپرادمین — دقیقاً مثلِ سایرِ ماژول‌ها.

create extension if not exists pgcrypto;

-- ---------- قالب‌ها (نسخه‌دار؛ company_id null = قالبِ سیستمی) ----------
create table if not exists public.permit_templates (
  id            text primary key,
  company_id    uuid references public.companies(id) on delete cascade,   -- null → قالبِ سیستمی
  permit_type   text not null default 'general',
  name          text not null default '',
  version       integer not null default 1,
  is_active     boolean not null default true,
  schema        jsonb not null default '{}'::jsonb,   -- { sections:[{ id,title,locked?,rows:[{ id, cells:[{ span, kind, field? }] }] }] }
  workflow      jsonb not null default '{}'::jsonb,   -- { parties:[{ id,name,steps:[{ id, role, action }] }] }
  branding      jsonb not null default '{}'::jsonb,   -- { logos:[], color, formCode, header }
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists permit_templates_company_idx on public.permit_templates (company_id, permit_type, is_active);
comment on table public.permit_templates is
  'قالبِ فرمِ مجوز کار. schema همان چیزی است که Renderer می‌سازد؛ ردیفِ company_id=null قالبِ سیستمیِ عمومی است.';

-- ---------- شمارنده‌ی شماره‌ی مجوز به‌ازای هر شرکت ----------
create table if not exists public.permit_counters (
  company_id uuid primary key references public.companies(id) on delete cascade,
  last_no    integer not null default 0
);
create or replace function public.next_permit_no(p_company uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  insert into public.permit_counters (company_id, last_no) values (p_company, 1)
    on conflict (company_id) do update set last_no = public.permit_counters.last_no + 1
    returning last_no into v;
  return v;
end $$;

-- ---------- مجوزهای صادرشده / در جریان ----------
create table if not exists public.permits (
  id               text primary key,
  company_id       uuid not null references public.companies(id) on delete cascade,
  permit_no        text not null default '',                 -- WP-<year>-<seq>، هنگامِ صدور پر می‌شود
  template_id      text references public.permit_templates(id) on delete set null,
  template_version integer,
  permit_type      text not null default 'general',
  title            text not null default '',
  work_location    text not null default '',
  work_description text not null default '',
  applicant_id     text not null default '',
  applicant_name   text not null default '',
  issuer_id        text not null default '',
  issuer_name      text not null default '',
  performer_id     text not null default '',
  performer_name   text not null default '',
  start_at         timestamptz,
  end_at           timestamptz,                              -- پیش‌بینیِ خاتمه
  risk_ref         text not null default '',                 -- پیوند به ارزیابیِ ریسک
  status           text not null default 'draft'
                   check (status in ('draft','submitted','under_review','rejected','issued','active','suspended','closed','expired')),
  form_data        jsonb not null default '{}'::jsonb,        -- { fieldId: value } برای فیلدهای پویا
  workflow_state   jsonb not null default '{}'::jsonb,        -- { stepId: { by, at, decision, note } }
  valid_until      date,                                     -- سقفِ اعتبارِ فعلی (تمدیدِ روزانه جلو می‌برد)
  closed_reason    text not null default '',
  closed_at        timestamptz,
  created_by       text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists permits_company_idx on public.permits (company_id, status);
create unique index if not exists permits_no_idx on public.permits (company_id, permit_no) where permit_no <> '';

-- ---------- تمدیدِ روزانه ----------
create table if not exists public.permit_renewals (
  id              text primary key,
  permit_id       text not null references public.permits(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  day_no          integer not null default 1,
  renewed_for     date,
  renewed_at      timestamptz not null default now(),
  contractor_hse  text not null default '',
  employer_hse    text not null default '',
  note            text not null default '',
  created_by      text not null default ''
);
create index if not exists permit_renewals_permit_idx on public.permit_renewals (permit_id);

-- ---------- ممیزی (append-only) ----------
create table if not exists public.permit_audit (
  id         text primary key,
  permit_id  text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  action     text not null default '',
  actor      text not null default '',
  detail     text not null default '',
  at         timestamptz not null default now()
);
create index if not exists permit_audit_permit_idx on public.permit_audit (permit_id, at);

-- ---------- RLS ----------
alter table public.permit_templates enable row level security;
alter table public.permits          enable row level security;
alter table public.permit_renewals  enable row level security;
alter table public.permit_audit     enable row level security;

-- قالب‌ها: ردیفِ سیستمی برای همه خواندنی؛ نوشتن فقط برای همان شرکت یا سوپرادمین
drop policy if exists permit_templates_read on public.permit_templates;
create policy permit_templates_read on public.permit_templates
  for select using (
    company_id is null
    or coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  );
drop policy if exists permit_templates_write on public.permit_templates;
create policy permit_templates_write on public.permit_templates
  for all using (
    (company_id is not null and coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id',''))
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  ) with check (
    (company_id is not null and coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id',''))
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  );

do $$
declare t text;
begin
  foreach t in array array['permits','permit_renewals'] loop
    execute format('drop policy if exists %I on public.%I', t || '_company_rw', t);
    execute format($f$
      create policy %I on public.%I for all
        using (
          coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
        )
        with check (
          coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
          or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
        )
    $f$, t || '_company_rw', t);
  end loop;
end $$;

-- ممیزی: خواندن و درجِ شرکت‌محور؛ بدونِ update/delete → تغییرناپذیر
drop policy if exists permit_audit_read on public.permit_audit;
create policy permit_audit_read on public.permit_audit
  for select using (
    coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  );
drop policy if exists permit_audit_insert on public.permit_audit;
create policy permit_audit_insert on public.permit_audit
  for insert with check (
    coalesce(company_id::text,'') = coalesce(auth.jwt() ->> 'company_id','')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean,false) = true
  );

-- ---------- قالبِ سیستمیِ «مجوز کار عمومی» ----------
insert into public.permit_templates (id, company_id, permit_type, name, version, is_active, schema, workflow, branding, created_by)
select 'ptpl-system-general-v1', null, 'general', 'مجوز کار عمومی', 1, true,
$json${
  "sections": [
    { "id": "s_work", "title": "شرح کار", "locked": false, "rows": [
      { "id": "r1", "cells": [
        { "span": 4, "kind": "field", "field": { "id": "work_type", "type": "checkgroup", "label": "نوع عملیات", "required": true, "config": { "options": ["ساختمان","مکانیک","برق","ابزاردقیق","تست و بازرسی","راه‌اندازی"] } } },
        { "span": 5, "kind": "field", "field": { "id": "work_location", "type": "text", "label": "محل انجام عملیات", "required": true, "bindTo": "workLocation" } },
        { "span": 3, "kind": "field", "field": { "id": "risk_ref", "type": "text", "label": "شماره ارزیابی ریسک مرتبط", "bindTo": "riskRef" } }
      ] },
      { "id": "r2", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "work_description", "type": "long_text", "label": "شرح عملیات", "required": true, "bindTo": "workDescription" } }
      ] }
    ] },
    { "id": "s_people", "title": "نفرات و تجهیزات", "rows": [
      { "id": "r1", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "key_people", "type": "table", "label": "فهرست نفرات کلیدی", "required": true, "config": { "columns": [ { "id": "c1", "label": "نام و نام خانوادگی" }, { "id": "c2", "label": "سمت" }, { "id": "c3", "label": "کد پرسنلی" } ] } } }
      ] },
      { "id": "r2", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "equipment", "type": "table", "label": "ماشین‌آلات و تجهیزات", "config": { "columns": [ { "id": "c1", "label": "عنوان" }, { "id": "c2", "label": "کد / پلاک" }, { "id": "c3", "label": "گواهی معتبر" } ] } } }
      ] }
    ] },
    { "id": "s_hse", "title": "کنترل‌های ویژه HSE", "rows": [
      { "id": "r1", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "special_hse", "type": "checkgroup", "label": "مجوزها و کنترل‌های ویژه", "config": { "options": ["پرتونگاری","داربست‌بندی","گودبرداری","جابجایی / باربرداری سنگین","کار در فضای محدود (کنترل گازها)","ایزولاسیون الکتریکی / مکانیکی","کار در ارتفاع","کار گرم"] } } }
      ] },
      { "id": "r2", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "hse_note", "type": "long_text", "label": "کنترل ریسک‌های HSE در حد قابل قبول است — توضیحات" } }
      ] }
    ] },
    { "id": "s_sign", "title": "امضاها", "rows": [
      { "id": "r1", "cells": [
        { "span": 4, "kind": "field", "field": { "id": "sig_performer", "type": "signature", "label": "امضای مجری" } },
        { "span": 4, "kind": "field", "field": { "id": "sig_hse", "type": "signature", "label": "امضای سرپرست HSE" } },
        { "span": 4, "kind": "field", "field": { "id": "sig_issuer", "type": "signature", "label": "امضای صادرکننده" } }
      ] }
    ] },
    { "id": "s_terms", "title": "توضیحات", "rows": [
      { "id": "r1", "cells": [
        { "span": 12, "kind": "field", "field": { "id": "terms", "type": "terms", "label": "شرایط و توضیحات", "config": { "text": "۱- این مجوز باید تا خاتمه‌ی فعالیت همراه مسئول اجراکننده در محل باشد و همه‌ی افراد درگیر از آن مطلع باشند.\n۲- مجوز باید فاقد هرگونه خط‌خوردگی باشد؛ در صورت عودت، مجوز جدید با شماره‌ی جدید صادر شود.\n۳- مسئولیت عواقب ناشی از عدم رعایت الزامات HSE بر عهده‌ی پیمانکار اجرایی است.\n۴- تمدید این مجوز روزانه است و باید پیش از شروع کارِ هر روز امضا شود." } } }
      ] }
    ] }
  ]
}$json$::jsonb,
$json${
  "parties": [
    { "id": "requester", "name": "درخواست‌کننده", "steps": [ { "id": "request", "role": "performer", "action": "request" } ] },
    { "id": "hse", "name": "HSE", "steps": [ { "id": "hse_review", "role": "hse", "action": "review" } ] },
    { "id": "issuer", "name": "صادرکننده", "steps": [ { "id": "issue", "role": "issuer", "action": "issue" }, { "id": "close", "role": "issuer", "action": "close" } ] }
  ]
}$json$::jsonb,
'{}'::jsonb, 'system'
where not exists (select 1 from public.permit_templates where id = 'ptpl-system-general-v1');

-- ---------- قیمت‌گذاری و پلن ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('permitToWork', 'صدور مجوز کار', 0, 0, false, 30)
    on conflict (module_key) do nothing;
  end if;
end $$;

update public.plans
   set features = (select jsonb_agg(distinct e) from jsonb_array_elements(features || '["permitToWork"]'::jsonb) e)
 where features ? 'scaffoldManagement' and not (features ? 'permitToWork');
