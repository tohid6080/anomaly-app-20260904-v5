-- قابلیتِ «بلاک» برای گفتگوهایِ بازدیدکننده — به‌جایِ حذفِ کاملِ گفتگو
-- (که اصلاً هیچ policy/عملیاتی برایش وجود ندارد)، ادمین می‌تواند بازدیدکننده
-- را از ارسالِ پیامِ جدید محروم کند و تاریخچه‌ی گفتگو باقی می‌ماند.
-- بررسیِ blocked در action="send"یِ Edge Function chat-visitor انجام می‌شود؛
-- هیچ policy جدیدی لازم نیست چون UPDATE برایِ super_admin از قبل روی کلِ
-- جدول مجاز است، و ویوِ chat_visitor_conversations_with_stats با c.* کار
-- می‌کند پس ستونِ جدید خودکار در آن هم در دسترس است.
alter table public.chat_visitor_conversations
  add column if not exists blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by text;
