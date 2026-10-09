-- گیتِ تاییدِ کارفرما/سرپرست برای گزارش‌هایِ شبه‌حادثه (near_miss) که توسطِ
-- پیمانکار ثبت می‌شوند — دقیقاً الگویِ ستونِ status در hcms_risk_assessments
-- (active/pending_review) + approveHcmsAssessment، نه الگویِ survey (رکوردِ
-- خودش gate می‌خورد، نه یک درخواستِ جداگانه).
-- فقط برایِ incident_type='near_miss' معنادار است؛ سایرِ انواعِ حادثه با
-- پیش‌فرضِ 'active' کاملاً دست‌نخورده می‌مانند (رفتارِ فعلیِ بدونِ گیت).
alter table public.incidents
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending_review', 'rejected')),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text not null default '';

create index if not exists incidents_status_idx on public.incidents (status);
