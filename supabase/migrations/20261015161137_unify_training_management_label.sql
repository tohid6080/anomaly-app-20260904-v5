-- یکسان‌سازیِ نام‌گذاریِ ماژولِ trainingManagement
-- =============================================================================
-- پنلِ سوپرادمین (کاتالوگِ module_prices) این ماژول را «مدیریت آموزش»
-- می‌نامید، درحالی‌که خودِ صفحه‌ی واقعی در سایدبار (subTraining/trainingTitle
-- در translations.js) همیشه «مدیریت آموزش‌های تخصصی» بوده — دو برچسبِ متفاوت
-- برایِ یک ماژولِ واحد. هماهنگ‌سازی با برچسبِ واقعی‌ای که کاربرِ نهایی در اپ
-- می‌بیند.

update public.module_prices
set label = 'مدیریت آموزش‌های تخصصی',
    label_en = 'Specialized Training Management',
    label_de = 'Spezialisierte Schulungsverwaltung'
where module_key = 'trainingManagement';
