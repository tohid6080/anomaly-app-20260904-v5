-- اصلاح: کلیدِ ماژول در module_prices باید دقیقاً همان key در HSE_MODULES
-- باشد (مثلِ incidentManagement/hseSurvey) تا isModuleInPlan() و کنسولِ
-- قیمت‌گذاری روی همان چیزی کار کنند که سایدبار فیلتر می‌کند. مایگریشنِ قبلی
-- به‌اشتباه 'pssr' درج کرده بود؛ کلیدِ درست 'pssrManagement' است.
update public.module_prices set module_key = 'pssrManagement' where module_key = 'pssr';
