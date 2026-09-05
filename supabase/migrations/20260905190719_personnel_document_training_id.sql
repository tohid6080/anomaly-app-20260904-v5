-- «آموزش‌های تخصصی موردنیاز» در پرونده‌ی پرسنل: به‌جای سقفِ ثابتِ ۳ پیوستِ
-- بی‌ارتباط، حالا برای هر دوره‌ی آموزشیِ الزامیِ عنوان شغلی یک مدرکِ جدا
-- بارگذاری می‌شود. این ستونِ افزودنی، سندِ نوعِ specialized_safety_training
-- را به یک دوره‌ی مشخص (training_courses.id) گره می‌زند. رکوردهای موجود با
-- training_id = NULL می‌مانند و مثل قبل رفتار می‌کنند.

alter table public.personnel_documents
  add column if not exists training_id uuid
    references public.training_courses(id) on delete set null;
