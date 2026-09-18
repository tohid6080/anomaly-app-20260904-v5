-- ویجتِ گفتگویِ زنده با بازدیدکنندگانِ سایت — بازدیدکننده هنوز حساب ندارد
-- (دقیقاً همان موقعیتِ trial_requests/guest_purchase_requests)، پس همان
-- الگویِ امنیتی: RLS هیچ policy ای برای anon/authenticated ندارد
-- (پیش‌فرض deny-all)؛ تنها مسیرِ نوشتن/خواندنِ بازدیدکننده Edge Function
-- عمومیِ chat-visitor (با service_role) است که مالکیتِ هر گفتگو را با
-- visitor_token (تصادفی، در localStorage مرورگرِ بازدیدکننده نگه داشته
-- می‌شود) تأیید می‌کند. SuperAdmin مثل بقیه‌ی جدول‌ها با scope خودش
-- می‌خواند/پاسخ می‌دهد.
--
-- شمارشِ «خوانده‌نشده» به‌جای ستونِ ذخیره‌شده (که نیاز به افزایشِ اتمیک دارد
-- و مستعدِ رِیس‌کاندیشن است)، از رویِ admin_last_read_at محاسبه می‌شود —
-- همیشه صحیح، بدونِ نیاز به قفل یا RPC.

create table if not exists public.chat_visitor_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  visitor_email text not null default '',
  visitor_phone text not null,
  visitor_token text not null unique,
  last_message_at timestamptz not null default now(),
  admin_last_read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_visitor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_visitor_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'admin')),
  sender_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_visitor_conversations_last_message_idx on public.chat_visitor_conversations (last_message_at desc);
create index if not exists chat_visitor_messages_conversation_idx on public.chat_visitor_messages (conversation_id, created_at);

alter table public.chat_visitor_conversations enable row level security;
alter table public.chat_visitor_messages enable row level security;

drop policy if exists "super admin select chat visitor conversations" on public.chat_visitor_conversations;
create policy "super admin select chat visitor conversations" on public.chat_visitor_conversations
  for select using (is_current_user_super_admin());

drop policy if exists "super admin update chat visitor conversations" on public.chat_visitor_conversations;
create policy "super admin update chat visitor conversations" on public.chat_visitor_conversations
  for update using (is_current_user_super_admin()) with check (is_current_user_super_admin());

drop policy if exists "super admin select chat visitor messages" on public.chat_visitor_messages;
create policy "super admin select chat visitor messages" on public.chat_visitor_messages
  for select using (is_current_user_super_admin());

drop policy if exists "super admin insert chat visitor messages" on public.chat_visitor_messages;
create policy "super admin insert chat visitor messages" on public.chat_visitor_messages
  for insert with check (is_current_user_super_admin() and sender = 'admin');

-- فهرستِ گفتگوها برایِ سوپرادمین — تعدادِ خوانده‌نشده و آخرین پیام را
-- همین‌جا محاسبه می‌کند تا LiveChatAdminDock مجبور به کوئریِ جداگانه به‌ازایِ
-- هر ردیف نباشد. security_invoker یعنی همان RLS بالا (نه صاحبِ ویو) اعمال
-- می‌شود — دقیقاً همان دسترسیِ جدول‌هایِ زیرین.
create or replace view public.chat_visitor_conversations_with_stats
with (security_invoker = true) as
select
  c.*,
  (
    select count(*) from public.chat_visitor_messages m
    where m.conversation_id = c.id
      and m.sender = 'visitor'
      and m.created_at > coalesce(c.admin_last_read_at, '-infinity'::timestamptz)
  ) as admin_unread_count,
  (
    select m2.body from public.chat_visitor_messages m2
    where m2.conversation_id = c.id
    order by m2.created_at desc
    limit 1
  ) as last_message_preview
from public.chat_visitor_conversations c;
