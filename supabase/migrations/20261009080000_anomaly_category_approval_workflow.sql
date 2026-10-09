-- گردشِ کارِ تاییدِ دسته‌بندیِ «سایر» در فرمِ ثبتِ آنومالی — عیناً الگویِ
-- 20260915100000_survey_approval_workflow.sql، فقط رویِ anomaly_categories
-- (که همچنان بدونِ uid()/offlineWrite و با sb() خام ویرایش می‌شود — دقیقاً
-- همان کلاسِ job_positions/training_courses/training_requirements).
alter table public.anomaly_categories
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending_review', 'rejected')),
  add column if not exists proposed_by text not null default '',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

create index if not exists anomaly_categories_status_idx on public.anomaly_categories (status);
