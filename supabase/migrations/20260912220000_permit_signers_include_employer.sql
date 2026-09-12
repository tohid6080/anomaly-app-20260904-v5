-- «لیستِ امضاهایِ مجاز» تا امروز فقط حساب‌هایِ پیمانکاری را می‌پذیرفت؛ طبقِ
-- خواسته‌ی صریح، حساب‌هایِ کارفرما (نقشِ employer و hse_supervisor، همان
-- جدولِ employer_accounts) هم باید بتوانند در همین فهرست باشند — سرپرستِ
-- کارفرما بتواند جانشینِ خودش را معرفی کند، و همین‌طور برایِ بقیه‌ی
-- کارشناسانِ کارفرما. هر ردیف حالا دقیقاً یکی از این دو را دارد:
-- contractor_id یا employer_account_id (نه هر دو، نه هیچ‌کدام).
alter table public.permit_authorized_signers
  alter column contractor_id drop not null;

alter table public.permit_authorized_signers
  add column if not exists employer_account_id uuid references public.employer_accounts(id) on delete cascade;

alter table public.permit_authorized_signers
  drop constraint if exists permit_authorized_signers_account_xor;
alter table public.permit_authorized_signers
  add constraint permit_authorized_signers_account_xor
  check (
    (contractor_id is not null and employer_account_id is null)
    or (contractor_id is null and employer_account_id is not null)
  );

-- هر حسابِ کارفرما هم حداکثر یک‌بار امضاکننده — یکتاییِ contractor_id از
-- migrationِ قبلی از قبل هست؛ این‌جا معادلش برایِ employer_account_id.
create unique index if not exists permit_authorized_signers_employer_account_uidx
  on public.permit_authorized_signers (employer_account_id);

comment on table public.permit_authorized_signers is
  'فهرستِ امضاکنندگانِ مجازِ Permit — هر ردیف یا یک حسابِ پیمانکاری (contractor_id) یا یک حسابِ کارفرما/سرپرستِ HSE (employer_account_id) است؛ نام/شغل هنگامِ خواندن از همان حساب join می‌شود.';
