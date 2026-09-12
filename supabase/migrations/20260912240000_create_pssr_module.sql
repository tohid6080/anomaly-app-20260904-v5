-- ماژول PSSR (Pre-Startup Safety Review). ساختار طبق فایل مرجع
-- «PSSR Report -Rev00.xlsx»: تیم → PSSR → جلسات → ۹ چک‌لیست تخصصی →
-- Requirementها (Yes/No/N.A + CAT/Punch) → Action Plan خودکار برای No →
-- History. چک‌لیست‌های مرجع (Master) نگارش‌دار هستند تا ویرایش آینده،
-- سوابق PSSRهای قبلی را دست‌نخورده نگه دارد (هر PSSR به یک requirement_template_id
-- ثابت/نگارش‌مشخص وصل است، نه به «آخرین نگارش»).
--
-- الگوی جدول/RLS دقیقاً مثل ماژول‌های اخیر (survey/permit): PK از نوع text
-- (uid کلاینت)، company_id uuid + policy یکسان، افزودن به module_prices.

-- ---------- ۱. چک‌لیست‌های مرجع (Master, نگارش‌دار) ----------
create table if not exists public.pssr_checklist_templates (
  id           text primary key,
  company_id   uuid not null references public.companies(id) on delete cascade,
  code         text not null,
  discipline   text not null,
  title        text not null default '',
  version      integer not null default 1,
  is_current   boolean not null default true,
  created_by   text not null default '',
  created_at   timestamptz not null default now()
);
create unique index if not exists pssr_checklist_templates_version_idx
  on public.pssr_checklist_templates (company_id, code, version);
create index if not exists pssr_checklist_templates_company_idx
  on public.pssr_checklist_templates (company_id, is_current);
comment on table public.pssr_checklist_templates is
  'چک‌لیست‌های مرجع PSSR (۹ عنوان تخصصی)، نگارش‌دار — ویرایش، نگارش جدید می‌سازد و نگارش قبلی را دست‌نخورده نگه می‌دارد.';

-- ---------- ۲. Requirementهای هر چک‌لیست ----------
create table if not exists public.pssr_requirement_templates (
  id                     text primary key,
  checklist_template_id  text not null references public.pssr_checklist_templates(id) on delete cascade,
  company_id             uuid not null references public.companies(id) on delete cascade,
  req_no                 text not null default '',
  group_title            text,
  requirement_text       text not null default '',
  order_index            integer not null default 0,
  created_at             timestamptz not null default now()
);
create index if not exists pssr_requirement_templates_checklist_idx
  on public.pssr_requirement_templates (checklist_template_id, order_index);
create index if not exists pssr_requirement_templates_company_idx
  on public.pssr_requirement_templates (company_id);

-- ---------- ۳. خودِ PSSR ----------
create table if not exists public.pssrs (
  id                    text primary key,
  company_id            uuid not null references public.companies(id) on delete cascade,
  report_no             text not null default '',
  revision_no           text not null default '00',
  report_date           date,
  company_organization  text not null default '',
  unit_train            text not null default '',
  system_no             text not null default '',
  subsystem_no          text not null default '',
  status                text not null default 'draft' check (status in ('draft','in_progress','closed')),
  created_by            text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists pssrs_company_idx on public.pssrs (company_id, status);

-- ---------- ۴. تیم PSSR ----------
-- هر عضو دقیقاً به یکی از contractors یا employer_accounts وصل است (همان
-- الگوی XOR که در permit_authorized_signers برای همین دو نوع حساب جواب داد).
create table if not exists public.pssr_team_members (
  id                    text primary key,
  pssr_id               text not null references public.pssrs(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  discipline            text not null check (discipline in (
    'leader','hse_fifi_env_health','piping_process','instrument','electrical',
    'telecom','control_system','mechanic_fix','mechanic_rotary','civil','coordinator'
  )),
  org_role              text not null default 'employer' check (org_role in ('employer','contractor','consultant')),
  contractor_id         uuid references public.contractors(id) on delete cascade,
  employer_account_id   uuid references public.employer_accounts(id) on delete cascade,
  is_responsible        boolean not null default false,
  created_at            timestamptz not null default now(),
  check ((contractor_id is not null)::int + (employer_account_id is not null)::int = 1)
);
create index if not exists pssr_team_members_pssr_idx on public.pssr_team_members (pssr_id, discipline);
create index if not exists pssr_team_members_company_idx on public.pssr_team_members (company_id);

-- ---------- ۵. جلسات ----------
create table if not exists public.pssr_meetings (
  id            text primary key,
  pssr_id       text not null references public.pssrs(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  meeting_no    integer not null,
  meeting_date  date,
  notes         text not null default '',
  status        text not null default 'open' check (status in ('open','closed')),
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);
create unique index if not exists pssr_meetings_no_idx on public.pssr_meetings (pssr_id, meeting_no);
create index if not exists pssr_meetings_company_idx on public.pssr_meetings (company_id);

-- ---------- ۶. پاسخ‌های چک‌لیست (append-only؛ هر جلسه یک سطر جدید) ----------
create table if not exists public.pssr_checklist_responses (
  id                       text primary key,
  pssr_id                  text not null references public.pssrs(id) on delete cascade,
  meeting_id               text not null references public.pssr_meetings(id) on delete cascade,
  requirement_template_id  text not null references public.pssr_requirement_templates(id) on delete cascade,
  company_id               uuid not null references public.companies(id) on delete cascade,
  status                   text not null check (status in ('yes','no','na')),
  comment                  text not null default '',
  action_by_text           text not null default '',
  cat                      text check (cat in ('CAT_A','CAT_B','CAT_C')),
  deadline                 date,
  created_by               text not null default '',
  created_at               timestamptz not null default now()
);
create index if not exists pssr_checklist_responses_meeting_idx on public.pssr_checklist_responses (meeting_id);
create index if not exists pssr_checklist_responses_req_idx on public.pssr_checklist_responses (pssr_id, requirement_template_id, created_at desc);
create index if not exists pssr_checklist_responses_company_idx on public.pssr_checklist_responses (company_id);

-- ---------- ۷. Action Plan (یکتا به‌ازای هر Requirement در هر PSSR) ----------
create table if not exists public.pssr_action_items (
  id                                text primary key,
  pssr_id                           text not null references public.pssrs(id) on delete cascade,
  requirement_template_id           text not null references public.pssr_requirement_templates(id) on delete cascade,
  company_id                        uuid not null references public.companies(id) on delete cascade,
  discipline                        text not null,
  req_no                            text not null default '',
  requirement_text                  text not null default '',
  cat                               text check (cat in ('CAT_A','CAT_B','CAT_C')),
  action_comment                    text not null default '',
  responsible_account_type          text check (responsible_account_type in ('contractor','employer')),
  responsible_contractor_id         uuid references public.contractors(id) on delete set null,
  responsible_employer_account_id   uuid references public.employer_accounts(id) on delete set null,
  accountable                       text not null default '',
  informed                          text not null default '',
  due_date                          date,
  status                            text not null default 'open' check (status in ('open','in_progress','closed')),
  origin_meeting_id                 text references public.pssr_meetings(id) on delete set null,
  last_meeting_id                   text references public.pssr_meetings(id) on delete set null,
  closed_at                         timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);
create unique index if not exists pssr_action_items_unique_req_idx
  on public.pssr_action_items (pssr_id, requirement_template_id);
create index if not exists pssr_action_items_company_idx on public.pssr_action_items (company_id, status);

-- ---------- ۸. تاریخچه‌ی هر Action (به‌ازای هر جلسه‌ای که دوباره بررسی شد) ----------
create table if not exists public.pssr_action_history (
  id               text primary key,
  action_item_id   text not null references public.pssr_action_items(id) on delete cascade,
  meeting_id       text references public.pssr_meetings(id) on delete set null,
  company_id       uuid not null references public.companies(id) on delete cascade,
  previous_status  text not null default '',
  new_status       text not null default '',
  cat              text,
  comment          text not null default '',
  person           text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists pssr_action_history_item_idx on public.pssr_action_history (action_item_id, created_at);

-- ---------- ۹. اعلان‌ها (همان الگوی personnel_notifications) ----------
create table if not exists public.pssr_notifications (
  id                              text primary key,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  pssr_id                         text references public.pssrs(id) on delete cascade,
  meeting_id                      text references public.pssr_meetings(id) on delete set null,
  action_item_id                  text references public.pssr_action_items(id) on delete set null,
  recipient_account_type          text check (recipient_account_type in ('contractor','employer')),
  recipient_contractor_id         uuid references public.contractors(id) on delete cascade,
  recipient_employer_account_id   uuid references public.employer_accounts(id) on delete cascade,
  type                            text not null default '',
  message                         text not null default '',
  is_read                         boolean not null default false,
  created_at                      timestamptz not null default now()
);
create index if not exists pssr_notifications_recipient_idx
  on public.pssr_notifications (recipient_account_type, recipient_contractor_id, recipient_employer_account_id, is_read);
create index if not exists pssr_notifications_company_idx on public.pssr_notifications (company_id);

-- ================================================================
-- RLS — همان الگوی company isolation که در survey/permit استفاده شد
-- ================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'pssr_checklist_templates','pssr_requirement_templates','pssrs','pssr_team_members',
    'pssr_meetings','pssr_checklist_responses','pssr_action_items','pssr_action_history','pssr_notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_company_rw on public.%I', t, t);
    execute format(
      'create policy %I_company_rw on public.%I for all using (
         coalesce(company_id::text, %L) = coalesce(auth.jwt() ->> %L, %L)
         or coalesce((auth.jwt() ->> %L)::boolean, false) = true
       ) with check (
         coalesce(company_id::text, %L) = coalesce(auth.jwt() ->> %L, %L)
         or coalesce((auth.jwt() ->> %L)::boolean, false) = true
       )',
      t, t, '', 'company_id', '', 'is_super_admin', '', 'company_id', '', 'is_super_admin'
    );
  end loop;
end $$;

-- ---------- قیمت‌گذاری ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('pssr', 'بازبینی ایمنی پیش از راه‌اندازی (PSSR)', 0, 0, false, 65)
    on conflict (module_key) do nothing;
  end if;
end $$;
