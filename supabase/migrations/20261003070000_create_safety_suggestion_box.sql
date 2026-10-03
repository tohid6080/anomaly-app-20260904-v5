-- صندوقِ پیشنهاداتِ ایمنی — کارکنان ایده ثبت می‌کنند، همکاران رأی می‌دهند،
-- سرپرست/کارفرما اقدام یا رد می‌کند. الگویِ شمارشِ رأی عیناً همانِ
-- summarizeQuestion در survey است: یک ردیف به‌ازایِ هر رأی، شمارش در
-- زمانِ خواندن — نه یک ستونِ شمارنده‌یِ اتمیک.
create table if not exists public.safety_suggestions (
  id text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  category text not null default '',
  author_account_type text not null default 'employer' check (author_account_type in ('employer', 'contractor')),
  author_account_id text,
  author_name text not null default '',
  status text not null default 'open' check (status in ('open', 'actioned', 'done', 'rejected')),
  action_note text not null default '',
  actioned_by text,
  actioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- unique(suggestion_id, voter_account_id) یک تضمینِ واقعیِ سطحِ‌دیتابیس
-- برایِ جلوگیری از رأیِ تکراری است، صرف‌نظر از رفتارِ UI.
create table if not exists public.safety_suggestion_votes (
  id text primary key,
  suggestion_id text not null references public.safety_suggestions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  voter_account_type text not null check (voter_account_type in ('employer', 'contractor')),
  voter_account_id text not null,
  created_at timestamptz not null default now(),
  unique (suggestion_id, voter_account_id)
);
create index if not exists safety_suggestion_votes_suggestion_idx on public.safety_suggestion_votes (suggestion_id);
create index if not exists safety_suggestions_company_idx on public.safety_suggestions (company_id);

alter table public.safety_suggestions enable row level security;
alter table public.safety_suggestion_votes enable row level security;

drop policy if exists safety_suggestions_company_rw on public.safety_suggestions;
create policy safety_suggestions_company_rw on public.safety_suggestions for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

drop policy if exists safety_suggestion_votes_company_rw on public.safety_suggestion_votes;
create policy safety_suggestion_votes_company_rw on public.safety_suggestion_votes for all
  using (company_id = current_company_id() or is_current_user_super_admin())
  with check (company_id = current_company_id() or is_current_user_super_admin());

-- اجتنابِ از N+1 هنگامِ نمایشِ فهرست — همان الگویِ
-- chat_visitor_conversations_with_stats.
drop view if exists public.safety_suggestions_with_vote_count;
create view public.safety_suggestions_with_vote_count
  with (security_invoker = true) as
select s.*, (select count(*) from public.safety_suggestion_votes v where v.suggestion_id = s.id) as vote_count
from public.safety_suggestions s;

-- ---------- قیمت‌گذاری ----------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'module_prices') then
    insert into public.module_prices (module_key, label, price_monthly, price_yearly, is_free, sort_order)
    values ('safetySuggestionBox', 'صندوق پیشنهادات ایمنی', 0, 0, false, 61)
    on conflict (module_key) do nothing;
  end if;
end $$;

-- پلن‌هایی که «نظرسنجی HSE» را دارند، «صندوق پیشنهادات» را هم بگیرند
update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["safetySuggestionBox"]'::jsonb) e
   )
 where features ? 'hseSurvey'
   and not (features ? 'safetySuggestionBox');
