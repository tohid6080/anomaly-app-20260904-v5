-- شرکت‌هایِ «مستقل/بدون پروژه» و «مستقل/چند پروژه» هیچ پیمانکاری ندارند،
-- پس مسئولِ یک اقدامِ اصلاحی برایِ آن‌ها باید بتواند یک «کارشناس»
-- (employer_accounts با role='employer') باشد، نه فقط یک پیمانکار.
--
-- همان الگویِ دقیقِ pssr_action_items که این مشکل را از قبل حل کرده:
-- آن جدول هم responsible_contractor_id و هم responsible_employer_account_id
-- دارد. این‌جا همان شکل تکرار می‌شود — نه یک معماریِ تازه.
--
-- افزایشی و کاملاً بی‌خطر برایِ ساختارِ «کارفرما/چند پیمانکار»: این دو
-- ستون همیشه null می‌مانند، چون فرمِ مسئولیت برایِ آن ساختار دقیقاً همان
-- dropdownِ پیمانکارِ موجود را نشان می‌دهد و هرگز این ستون‌هایِ تازه را
-- پر نمی‌کند.
alter table public.corrective_actions
  add column if not exists responsible_employer_account_id uuid references public.employer_accounts(id),
  add column if not exists responsible_employer_account_name text;

create index if not exists corrective_actions_resp_employer_account_id_idx
  on public.corrective_actions (responsible_employer_account_id);
