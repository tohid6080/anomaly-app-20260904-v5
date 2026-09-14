-- توکنِ دستگاه برای اعلانِ Push واقعی (FCM) — وقتی کاربر روی اپِ Android
-- (Capacitor) اجازه‌ی اعلان بدهد، توکنِ دستگاهش این‌جا ذخیره می‌شود تا
-- Edge Function جدید send-chat-push بتواند حتی وقتی اپ بسته است برایش
-- پیام بفرستد. هر کاربر می‌تواند چند دستگاه/نصب داشته باشد؛ ثبتِ دوباره‌ی
-- همان توکن فقط updated_at را تازه می‌کند (upsert بر اساسِ token که unique
-- است). RLS دقیقاً هم‌الگویِ fleet_fuel_* (20260911120000): دسترسیِ
-- خواندن/نوشتن بر اساسِ company_id در auth.jwt()، همان الگویی که همه‌ی
-- جدول‌های Company-scoped این پروژه از آن استفاده می‌کنند.

create table if not exists public.chat_push_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  username text not null,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_push_tokens_username_idx on public.chat_push_tokens (username);

comment on table public.chat_push_tokens is
  'توکنِ دستگاهِ هر کاربر برای ارسالِ Push واقعی از send-chat-push — یک ردیف به‌ازای هر دستگاه/نصب.';

alter table public.chat_push_tokens enable row level security;

drop policy if exists chat_push_tokens_company_rw on public.chat_push_tokens;
create policy chat_push_tokens_company_rw on public.chat_push_tokens
  for all
  using (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  )
  with check (
    coalesce(company_id::text, '') = coalesce(auth.jwt() ->> 'company_id', '')
    or coalesce((auth.jwt() ->> 'is_super_admin')::boolean, false) = true
  );
