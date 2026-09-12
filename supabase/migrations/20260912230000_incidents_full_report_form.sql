-- جایگزینیِ فرمِ ثبتِ حادثه با «فرم گزارش حادثه» رسمیِ شرکت (کدِ فرم
-- MD1QM-FSW22/01-01، پیوستِ کاربر). فقط column اضافه می‌شود — هیچ‌کدام از
-- ستون‌های قراردادیِ Tripod Beta (بخشِ ۲ TRIPOD_BETA_INTEGRATION.md:
-- incident_no, occurred_at, location, incident_type, is_disabling,
-- injured_person_name, lost_days, financial_cost, description,
-- employer_org, contractor_org) تغییر/حذف نمی‌شود — incidentSource.js
-- و tripodAnalysesApi.js دقیقاً همان‌ها را می‌خوانند.
alter table public.incidents
  -- ۱- مشخصات کارگاه/شرکت
  add column if not exists workplace_name text not null default '',
  add column if not exists occurred_phase text not null default '',
  add column if not exists employer_manager_name text not null default '',
  add column if not exists activity_type text not null default '',
  add column if not exists workers_count integer,
  add column if not exists workplace_address_phone text not null default '',
  -- ۲- طبقه‌بندیِ حوادث (انسانی/تجهیزاتی-ساختمانی/محیط‌زیست)
  add column if not exists incident_category jsonb not null default '[]'::jsonb,
  -- ۳- مشخصاتِ حادثه (تاریخ = همان occurred_at موجود؛ محلِ دقیق = همان location موجود)
  add column if not exists occurred_time text not null default '',
  -- ۳-۱ حوادثِ انسانی
  add column if not exists injured_age integer,
  add column if not exists injured_job_title text not null default '',
  add column if not exists injured_education text not null default '',
  add column if not exists injured_work_experience text not null default '',
  add column if not exists rest_duration text not null default '',
  add column if not exists injured_body_parts jsonb not null default '[]'::jsonb,
  add column if not exists human_notes text not null default '',
  -- ۳-۲ حوادثِ تجهیزاتی (میزانِ خسارتِ مالی = همان financial_cost موجود)
  add column if not exists equipment_damaged text not null default '',
  add column if not exists equipment_downtime text not null default '',
  add column if not exists delay_duration text not null default '',
  -- ۳-۳ حوادثِ زیست‌محیطی
  add column if not exists environmental_impact text not null default '',
  -- ۴- عللِ بروزِ حادثه
  add column if not exists causes jsonb not null default '[]'::jsonb,
  add column if not exists causes_notes text not null default '',
  -- ۵- شرحِ حادثه = همان description موجود (قراردادِ Tripod)
  -- ۶- نوعِ حادثه (مکانیزم رویداد — مستقل از incident_type فعلی که شدت/پیامد است)
  add column if not exists incident_mechanism jsonb not null default '[]'::jsonb,
  add column if not exists incident_mechanism_notes text not null default '',
  -- ۷- پیامدِ حادثه (نوعِ آسیب)
  add column if not exists consequences jsonb not null default '[]'::jsonb,
  -- ۸- لوازمِ حفاظتِ فردی
  add column if not exists ppe_used jsonb not null default '[]'::jsonb,
  add column if not exists ppe_notes text not null default '',
  -- ۹- پیشنهادات جهتِ پیشگیری
  add column if not exists prevention_suggestions text not null default '',
  -- ۱۰- شهودِ حادثه — [{ name, date }]
  add column if not exists witnesses jsonb not null default '[]'::jsonb,
  -- ۱۱- اقداماتِ انجام‌شده (متنِ همین فرم، نه ماژولِ اقداماتِ اصلاحی)
  add column if not exists actions_taken text not null default '',
  -- ۱۲- کروکیِ محلِ حادثه + تأییدِ سرپرستان
  add column if not exists sketch_image_url text not null default '',
  add column if not exists contractor_supervisor_name text not null default '',
  add column if not exists contractor_supervisor_date date,
  add column if not exists hse_supervisor_name text not null default '',
  add column if not exists hse_supervisor_date date,
  add column if not exists form_code text not null default 'MD1QM-FSW22/01-01';

comment on column public.incidents.incident_category is 'آرایه‌ی رشته‌ای: انسانی/تجهیزاتی-ساختمانی/محیط‌زیست';
comment on column public.incidents.injured_body_parts is 'آرایه‌ی رشته‌ایِ اعضایِ بدنِ آسیب‌دیده (۲۸ گزینه‌ی فرم)';
comment on column public.incidents.causes is 'آرایه‌ی رشته‌ایِ عللِ بروزِ حادثه (۱۲ گزینه‌ی فرم)';
comment on column public.incidents.incident_mechanism is 'آرایه‌ی رشته‌ایِ مکانیزمِ رویداد: سقوط/برق‌گرفتگی/... (۱۳ گزینه‌ی فرم)';
comment on column public.incidents.consequences is 'آرایه‌ی رشته‌ایِ نوعِ آسیب/پیامد (۲۰ گزینه‌ی فرم)';
comment on column public.incidents.ppe_used is 'آرایه‌ی رشته‌ایِ لوازمِ حفاظتِ فردیِ استفاده‌شده (۹ گزینه‌ی فرم)';
comment on column public.incidents.witnesses is 'آرایه‌ی [{name, date}] — شهودِ حادثه';

-- باکتِ Storage برایِ کروکیِ محلِ حادثه (بخشِ ۱۲ فرم) — همان الگویِ
-- permit-branding/lifting-plan-docs: عمومی/خواندنی، درجِ آزاد با کلیدِ anon.
insert into storage.buckets (id, name, public)
values ('incident-sketches', 'incident-sketches', true)
on conflict (id) do update set public = true;

drop policy if exists "incident-sketches read" on storage.objects;
create policy "incident-sketches read" on storage.objects
  for select using (bucket_id = 'incident-sketches');

drop policy if exists "incident-sketches insert" on storage.objects;
create policy "incident-sketches insert" on storage.objects
  for insert with check (bucket_id = 'incident-sketches');
