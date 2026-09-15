-- گردشِ کارِ «درخواست/تاییدِ» نظرسنجی و آزمون:
-- طبقِ خواسته‌ی صریح، پیمانکار دیگر همه‌ی نظرسنجی‌ها/آزمون‌های شرکت را
-- نمی‌بیند (فقط آن‌هایی که کارفرما Active کرده)، و برای پیشنهادِ یک
-- آزمون/نظرسنجیِ جدید باید از کارفرما اجازه بگیرد. این ماژول به همان
-- الگویِ رایجِ سامانه (hse_gate_items / trial_requests) وضعیتِ جدید و
-- ستون‌هایِ بازبینی اضافه می‌کند — بدونِ لمسِ ردیف‌های موجود.
alter table public.surveys
  add column if not exists origin text not null default 'employer' check (origin in ('employer', 'contractor')),
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_by text not null default '',
  add column if not exists reviewed_at timestamptz;

comment on column public.surveys.origin is
  'چه کسی این نظرسنجی/آزمون را ساخته — employer (کارفرما، مسیرِ قدیمی/پیش‌فرض) یا contractor (درخواستِ پیمانکار، نیازمندِ تاییدِ کارفرما قبل از فعال‌شدن).';
comment on column public.surveys.reviewed_by is 'کارفرمایی که این درخواست را تایید/رد کرده.';

-- افزودنِ pending_approval (درخواستِ پیمانکار، در انتظارِ تاییدِ کارفرما) و
-- rejected به فهرستِ مجازِ status — بدونِ حدس‌زدنِ نامِ constraint قبلی
-- (که ممکن است دستی یا با نامِ متفاوت ساخته شده باشد)، پیدا و جایگزین می‌شود.
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    where rel.relname = 'surveys' and c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.surveys drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.surveys add constraint surveys_status_check
  check (status in ('draft', 'pending_approval', 'active', 'closed', 'rejected'));
