-- علتِ «ماژول PSSR نمایش داده نمی‌شود»: isModuleInPlan() در shared.js وقتی
-- planFeatures شرکت null نباشد، فقط ماژول‌هایی را نشان می‌دهد که در آرایه‌ی
-- features همان پلن باشند. ماژول جدید pssrManagement در هیچ‌کدام از پلن‌های
-- موجود نبود (نه فقط module_prices — که فقط برای کنسولِ قیمت‌گذاری است، نه
-- فیلترِ واقعیِ سایدبار). این مایگریشن آن را به همه‌ی پلن‌های فعلی اضافه
-- می‌کند تا ماژول بلافاصله برای همه‌ی شرکت‌ها قابل مشاهده شود.
update public.plans
   set features = (
     select jsonb_agg(distinct e)
     from jsonb_array_elements(features || '["pssrManagement"]'::jsonb) e
   )
 where not (features ? 'pssrManagement');
