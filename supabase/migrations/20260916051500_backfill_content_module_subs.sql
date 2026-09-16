-- Backfillِ زیرماژول‌ها برای شرکت‌هایی که والدشان از قبل فعال است
-- =============================================================================
-- تا امروز isModuleInPlan فقط برایِ زیرماژول‌هایِ «مدیریتِ سیستم»/«ابزارهایِ
-- سریع»/بخشی از «شاخص‌هایِ پراکتیو» تک‌تک چک می‌شد؛ برایِ بقیه‌ی ماژول‌ها
-- (آنومالی، ارزیابیِ ریسک، پرسنل، ماشین‌آلات، داربست، حوادث، PSSR) فقط
-- خودِ کلیدِ والد چک می‌شد. حالا که این‌ها هم مثلِ مدیریتِ سیستم زیرماژول‌به‌
-- زیرماژول گیت می‌شوند (ر.ک. filterSubByPlan در shared.js)، هر شرکتی که
-- امروز فقط والد را در company_modules دارد — نه هیچ‌کدام از زیرماژول‌هایش
-- را، چون تا الان زیرماژول اصلاً چک نمی‌شد — بلافاصله دسترسیِ آن زیرماژول‌ها
-- را از دست می‌داد (مثلاً «ثبت آنومالی»/«لیست آنومالی‌ها» ناپدید می‌شدند
-- برایِ هر شرکتی که «anomalyReport» دارد ولی هیچ‌وقت «anomalyForm»/
-- «anomalyList» را جداگانه نگرفته).
--
-- این migration دقیقاً همان شکافِ backfillِ 20260914172900 را برایِ این
-- زیرماژول‌هایِ تازه می‌بندد: برایِ هر ردیفِ company_modules که is_active
-- است و کلیدش یکی از والدهایِ زیر است، یک ردیفِ فعالِ جدید به‌ازای هر
-- زیرماژولش می‌سازد (idempotent، on conflict do nothing — دوباره‌اجرا
-- بی‌خطر است و هیچ انتخابِ آینده‌ی ادمین را بازنویسی نمی‌کند).
--
-- قیمتِ این ردیف‌هایِ زیرماژول عمداً صفر است — زیرماژول بخشی از همان
-- قراردادِ فعلیِ والد حساب می‌شود، نه یک خطِ فاکتورِ جداگانه؛ غیرِاین‌طور
-- moduleTotals در SuperAdminPanel مبلغِ قرارداد را دوبرابر محاسبه می‌کرد
-- (چون الان هم والد هم هر زیرماژول قیمتِ خودشان را به جمع اضافه می‌کنند).

do $$
declare
  parent_row  record;
  sub_key     text;
  parent_to_subs jsonb := '{
    "anomalyReport": ["anomalyForm", "anomalyList", "correctiveActionsList"],
    "riskAssessment": ["bowtieDashboard", "hcmsDashboard", "riskKnowledgeManagement"],
    "personnelAccess": ["personnelForm", "personnelDashboard"],
    "machineryManagement": ["machineryDashboard"],
    "scaffoldManagement": ["scaffoldDashboard"],
    "incidentManagement": ["incidentsList"],
    "pssrManagement": ["pssrList"]
  }'::jsonb;
begin
  for parent_row in
    select company_id, module_key, starts_at, ends_at
    from public.company_modules
    where is_active = true
      and module_key in (select jsonb_object_keys(parent_to_subs))
  loop
    for sub_key in select jsonb_array_elements_text(parent_to_subs -> parent_row.module_key)
    loop
      insert into public.company_modules
        (company_id, module_key, is_active, starts_at, ends_at, price_monthly, price_yearly, source, created_by)
      values
        (parent_row.company_id, sub_key, true, parent_row.starts_at, parent_row.ends_at, 0, 0, 'admin_grant', 'backfill_sub_modules')
      on conflict (company_id, module_key) do nothing;
    end loop;
  end loop;
end $$;
