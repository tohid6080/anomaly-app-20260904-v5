-- ماژولِ «مدیریتِ نظرسنجی‌ها»یِ SuperAdmin — کاملاً مستقل و موازیِ ماژولِ
-- موجودِ survey/ (کلیدِ hseSurvey، مختصِ هر شرکت، company_id NOT NULL) و
-- HSE Climate — هیچ جدول/کامپوننتِ موجودی تغییر نمی‌کند. این‌جا SuperAdmin
-- یک نظرسنجی می‌سازد که سراسریِ پلتفرم پخش می‌شود، در سه kind کاملاً
-- جدا: public (بازدیدکنندهٔ ناشناسِ پیش از ورود)، welcome (کاربرِ
-- واردشده، بلافاصله بعدِ لاگین)، event (بعدِ یک اقدامِ واقعیِ کاربر —
-- فعلاً permit_closed/corrective_action_approved).
--
-- سه‌kind بودن با یک ستونِ تفکیک‌کننده روی یک جدول، دقیقاً همان الگویی
-- که جدولِ payments با ستونِ method دارد — نه سه جدولِ جدا.

create table if not exists public.platform_surveys (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('public', 'welcome', 'event')),
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  -- [{id, type, label, options: [...], required: bool, order: int}]
  -- type یکی از: single_choice | multi_choice | text | yes_no | rating | dropdown
  questions jsonb not null default '[]'::jsonb,
  -- فقط برایِ kind='event'
  trigger_module text,
  trigger_event text,
  display_delay_seconds integer not null default 0,
  max_display_count integer not null default 1,
  -- برایِ kind='welcome' و 'event' — آرایه‌ی خالی یعنی همه؛ 'public' هیچ‌وقت هدف‌گذاری نمی‌شود (بازدیدکننده ناشناس است)
  target_roles jsonb not null default '[]'::jsonb,
  target_job_position_ids jsonb not null default '[]'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.platform_surveys(id) on delete cascade,
  respondent_username text,
  respondent_role text,
  respondent_company_id uuid,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

-- شمارشِ دفعاتِ نمایش/رد‌شدن — فقط برایِ کاربرانِ واردشده (بازدیدکننده‌ی
-- ناشناسِ public هیچ شناسه‌ی پایداری ندارد؛ «دیگر نشان نده» برایِ آن‌ها
-- صرفاً سمتِ کلاینت با localStorage نگه داشته می‌شود).
create table if not exists public.platform_survey_impressions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.platform_surveys(id) on delete cascade,
  username text not null,
  shown_count integer not null default 0,
  dismissed boolean not null default false,
  last_shown_at timestamptz not null default now(),
  unique (survey_id, username)
);

create index if not exists platform_surveys_kind_status_idx on public.platform_surveys (kind, status);
create index if not exists platform_survey_responses_survey_idx on public.platform_survey_responses (survey_id);
create index if not exists platform_survey_impressions_survey_idx on public.platform_survey_impressions (survey_id, username);

alter table public.platform_surveys enable row level security;
alter table public.platform_survey_responses enable row level security;
alter table public.platform_survey_impressions enable row level security;

-- محتوایِ سؤال‌ها حساس نیست (برخلافِ کلیدِ پاسخِ آزمون در ماژولِ survey/) —
-- پس خواندنِ نظرسنجیِ فعال مستقیماً مجاز است، بدونِ نیاز به Edge Function.
drop policy if exists "anyone can read active platform surveys" on public.platform_surveys;
create policy "anyone can read active platform surveys" on public.platform_surveys
  for select using (status = 'active');

drop policy if exists "super admin full access platform surveys" on public.platform_surveys;
create policy "super admin full access platform surveys" on public.platform_surveys
  for all using (is_current_user_super_admin()) with check (is_current_user_super_admin());

-- نوشتن (پاسخ/impression) فقط از طریقِ Edge Function عمومیِ
-- submit-platform-survey-response با service_role — دقیقاً همان الگویِ
-- trial_requests/chat_visitor_*. SuperAdmin فقط می‌خواند (داشبوردِ نتایج).
drop policy if exists "super admin select platform survey responses" on public.platform_survey_responses;
create policy "super admin select platform survey responses" on public.platform_survey_responses
  for select using (is_current_user_super_admin());

drop policy if exists "super admin delete platform survey responses" on public.platform_survey_responses;
create policy "super admin delete platform survey responses" on public.platform_survey_responses
  for delete using (is_current_user_super_admin());

drop policy if exists "super admin select platform survey impressions" on public.platform_survey_impressions;
create policy "super admin select platform survey impressions" on public.platform_survey_impressions
  for select using (is_current_user_super_admin());
