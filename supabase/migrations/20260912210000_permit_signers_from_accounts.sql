-- «لیستِ امضاهایِ مجاز»: نام و شغلِ هر امضاکننده دیگر آزادانه تایپ نمی‌شود؛
-- همیشه از همان حساب پیمانکاری که در SuperAdmin ← مدیریتِ حساب‌ها ثبت شده
-- «خوانده» می‌شود (contractors.contact_person_name / job_positions.title از
-- طریق contractor_id) — دقیقاً طبقِ خواسته‌ی صریحِ کاربر. این هم امنیت را
-- بالا می‌برد (امضاکننده فقط می‌تواند یکی از حساب‌های واقعاً ثبت‌شده باشد،
-- نه هر اسمی) و هم از دوباره‌کاری/ناهم‌خوانیِ داده جلوگیری می‌کند.
alter table public.permit_authorized_signers drop column if exists full_name;
alter table public.permit_authorized_signers drop column if exists job_title;

-- هر حساب پیمانکاری حداکثر یک‌بار در فهرستِ امضاهای مجاز — از ثبتِ
-- تکراریِ همان امضاکننده جلوگیری می‌کند.
create unique index if not exists permit_authorized_signers_contractor_uidx
  on public.permit_authorized_signers (contractor_id);

comment on table public.permit_authorized_signers is
  'فهرستِ امضاکنندگانِ مجازِ Permit — هر ردیف یک حسابِ پیمانکاریِ واقعی (contractor_id) که در SuperAdmin ثبت شده؛ نام/شغل هنگامِ خواندن از همان حساب join می‌شود.';
