-- جانشینِ ازپیش‌تعیین‌شده‌ی سرپرست برایِ تأییدِ مجوزِ کار — فقط برایِ
-- شرکت‌هایِ «مستقل/بدونِ پروژه» (که اصلاً نقشِ CONTRACTOR ندارند، پس
-- canPerformStep فعلی که فقط «غیرِپیمانکار» را بررسی می‌کند برایِ این نوع
-- شرکت به‌تنهایی کافی نیست). روی خودِ ردیفِ سرپرست پر می‌شود: «وقتی من
-- نبودم، این کارشناس به‌جایِ من تأیید می‌کند» — طبقِ تأییدِ صریحِ کاربر، نه
-- یک جانشینِ خودکار و نه چیزی که SuperAdmin تعیین کند.
alter table public.employer_accounts
  add column if not exists permit_substitute_approver_id uuid references public.employer_accounts(id);

create index if not exists employer_accounts_permit_substitute_idx
  on public.employer_accounts (permit_substitute_approver_id);
