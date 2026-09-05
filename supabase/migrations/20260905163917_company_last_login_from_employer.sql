-- «آخرین ورود» هر شرکت در پنل SuperAdmin → شرکت‌ها. طبق خواسته‌ی صریح،
-- ملاک، آخرین ورودِ «کارفرما»ی همان شرکت است (نقش EMPLOYER؛ نه پیمانکار،
-- نه سرپرست HSE، نه ادمین).
--
-- رویدادهای ورود از قبل در جدول user_activity ثبت می‌شوند
-- (event_type = 'login'، به‌همراه role و company_id). این مهاجرت فقط
-- ستون companies.last_login_at را هم‌زمان با هر ورودِ کارفرما به‌روز نگه
-- می‌دارد، تا نمایش در پنل بدون کوئری تجمیعیِ سرِ هر بار انجام شود.

alter table public.companies
  add column if not exists last_login_at timestamptz;

create or replace function public.sync_company_last_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'login'
     and lower(coalesce(new.role, '')) = 'employer'
     and new.company_id is not null then
    update public.companies
      set last_login_at = coalesce(new.created_at, now())
      where id = new.company_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_company_last_login on public.user_activity;
create trigger trg_sync_company_last_login
  after insert on public.user_activity
  for each row execute function public.sync_company_last_login();

-- backfill — مقدار فعلی را از روی رویدادهای ورودِ کارفرمای ثبت‌شده‌ی
-- موجود پر می‌کند تا شرکت‌ها بلافاصله (نه فقط بعد از ورود بعدی) مقدار
-- «آخرین ورود» داشته باشند.
update public.companies c
set last_login_at = sub.last_login
from (
  select company_id, max(created_at) as last_login
  from public.user_activity
  where event_type = 'login'
    and lower(coalesce(role, '')) = 'employer'
    and company_id is not null
  group by company_id
) sub
where sub.company_id = c.id;
