-- ماژول «نظرسنجی HSE» — پرسشنامه‌سازِ عمومی با لینکِ عمومیِ بدونِ ورود.
-- همان الگوی hse_climate_campaigns: ساختارِ پرسشنامه در surveys.questions (jsonb)
-- ذخیره می‌شود؛ پاسخ‌ها فقط از طریقِ Edge Function (service_role) درج می‌شوند و
-- صاحبِ شرکت آن‌ها را می‌خواند. PKها TEXT (uid کلاینت)، company_id از نوعِ uuid.

create extension if not exists pgcrypto;

-- ---------- پرسشنامه‌ها ----------
create table if not exists public.surveys (
  id             text primary key,
  company_id     uuid not null references public.companies(id) on delete cascade,
  title          text not null default '',
  description    text not null default '',
  status         text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  questions      jsonb not null default '[]'::jsonb,   -- آرایه‌ی سؤال‌ها (data-driven، مثلِ scene در Lifting)
  settings       jsonb not null default '{}'::jsonb,   -- anonymous / بازه‌ی زمانی / سقفِ پاسخ / متنِ تشکر / فیلدهای پاسخ‌دهنده
  public_token   uuid not null default gen_random_uuid(),
  response_count integer not null default 0,
  created_by     text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists surveys_public_token_idx on public.surveys (public_token);
create index if not exists surveys_company_idx on public.surveys (company_id, status);
comment on table public.surveys is
  'پرسشنامه‌های HSE ساخته‌شده توسطِ کاربر. questions ساختارِ فرم است؛ پاسخ‌ها در survey_responses.';

-- ---------- پاسخ‌ها ----------
create table if not exists public.survey_responses (
  id              text primary key,
  survey_id       text not null references public.surveys(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  answers         jsonb not null default '{}'::jsonb,        -- { questionId: value }
  respondent_meta jsonb not null default '{}'::jsonb,        -- نام/واحد/سمت (اگر پرسشنامه غیرِناشناس باشد)
  source          text not null default 'link',             -- link | qr | preview
  submitted_at    timestamptz not null default now()
);
create index if not exists survey_responses_survey_idx on public.survey_responses (survey_id);
create index if not exists survey_responses_company_idx on public.survey_responses (company_id);

-- شمارنده‌ی پاسخ روی خودِ پرسشنامه (تا فهرست بدونِ count سنگین باشد)
create or replace function public.bump_survey_response_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.surveys
     set response_count = response_count + 1, updated_at = now()
   where id = new.survey_id;
  return new;
end $$;
drop trigger if exists survey_responses_bump on public.survey_responses;
create trigger survey_responses_bump
  after insert on public.survey_responses
  for each row execute function public.bump_survey_response_count();

-- ---------- RLS ----------
alter table public.surveys           enable row level security;
alter table public.survey_responses  enable row level security;

drop policy if exists surveys_company_rw on public.surveys;
create policy surveys_company_rw on public.surveys
  for all using (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  ) with check (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

-- پاسخ‌ها: صاحبِ شرکت فقط می‌خواند و حذف می‌کند. هیچ policy ای برای INSERT
-- از anon/authenticated وجود ندارد → درج فقط با service_role (Edge Function).
drop policy if exists survey_responses_company_read on public.survey_responses;
create policy survey_responses_company_read on public.survey_responses
  for select using (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );
drop policy if exists survey_responses_company_delete on public.survey_responses;
create policy survey_responses_company_delete on public.survey_responses
  for delete using (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );

-- ---------- قیمت‌گذاری ----------
-- ردیفِ ماژول در کنسولِ «قیمت‌گذاری و پلن‌ها» (اگر جدولش موجود باشد)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('hseSurvey', 'نظرسنجی HSE', 0, 0, false, 60)
    on conflict (module_key) do nothing;
  end if;
end $$;

-- پلن‌هایی که «شاخص‌های Proactive HSE» را دارند، «نظرسنجی HSE» را هم بگیرند
update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["hseSurvey"]'::jsonb) e
   )
 where features ? 'proactiveIndicators'
   and not (features ? 'hseSurvey');
