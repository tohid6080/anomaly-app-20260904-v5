-- =============================================================================
-- قیمت‌گذاریِ Backup به‌ازای دوره، برای هر پلن
-- =============================================================================
-- هر پلن می‌تواند برای هر سه دوره‌ی Backup (هفتگی / ماهیانه / سالیانه) یک
-- قیمتِ جداگانه داشته باشد. هنگام خرید/تخصیصِ پلن، خریدار یک دوره را انتخاب
-- می‌کند و قیمتِ همان دوره به مبلغِ نهاییِ پلن اضافه می‌شود؛ و
-- companies.backup_frequency روی همان دوره تنظیم می‌شود تا Job روزانه از
-- آن استفاده کند.
--
-- ستونِ payments.backup_period دوره‌ی انتخاب‌شده را در پرداختِ آنلاین/کارت‌به‌کارت
-- نگه می‌دارد تا هنگام تأیید/فعال‌سازی در دسترس باشد.
-- =============================================================================

alter table public.plans
  add column if not exists backup_price_weekly  numeric not null default 0,
  add column if not exists backup_price_monthly numeric not null default 0,
  add column if not exists backup_price_yearly  numeric not null default 0;

comment on column public.plans.backup_price_weekly  is 'قیمتِ افزودنیِ Backup هفتگی (تومان) هنگام خرید این پلن';
comment on column public.plans.backup_price_monthly is 'قیمتِ افزودنیِ Backup ماهیانه (تومان) هنگام خرید این پلن';
comment on column public.plans.backup_price_yearly  is 'قیمتِ افزودنیِ Backup سالیانه (تومان) هنگام خرید این پلن';

alter table public.payments
  add column if not exists backup_period text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payments_backup_period_check') then
    alter table public.payments add constraint payments_backup_period_check
      check (backup_period is null or backup_period in ('none','weekly','monthly','yearly'));
  end if;
end $$;

comment on column public.payments.backup_period is 'دوره‌ی Backup انتخاب‌شده هنگام این خرید (none|weekly|monthly|yearly)';
