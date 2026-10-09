-- تاریخِ انقضایِ مدرکِ آموزشِ تخصصی — تا امروز personnel_documents چنین
-- ستونی نداشت (تأییدشده مستقیم از رویِ کد). بدونِ آن، ماتریسِ آموزشِ
-- الزامی نمی‌تواند بینِ «ناقص» و «منقضی‌شده» تمایز بگذارد (ر.ک.
-- gatherTrainingMetrics در contractorEvalApi.js). افزایشی و nullable —
-- فقط برایِ doc_type='specialized_safety_training' معنادار است؛ سایرِ
-- انواعِ مدرک این فیلد را همیشه خالی می‌گذارند.
alter table public.personnel_documents
  add column if not exists expiry_date date;
