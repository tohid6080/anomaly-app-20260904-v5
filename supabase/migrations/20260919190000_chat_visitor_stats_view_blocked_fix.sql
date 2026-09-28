-- ریشه‌ی واقعیِ «بلاک ثابت نمی‌ماند»: ویوی chat_visitor_conversations_with_stats
-- با select c.*, ... زمانی ساخته شد که ستون‌های blocked/blocked_at/blocked_by
-- هنوز روی جدولِ پایه وجود نداشتند. در Postgres، c.* در لحظه‌ی CREATE VIEW به
-- یک فهرستِ ستونِ ثابت باز می‌شود — بعداً اضافه‌کردنِ ستون به جدولِ پایه
-- (ALTER TABLE ADD COLUMN) خودکار در ویوهایِ از قبل ساخته‌شده منعکس نمی‌شود.
-- یعنی PATCH روی خودِ جدول کاملاً موفق می‌شد، ولی loadLiveChatConversations()
-- که از این ویو می‌خواند همیشه blocked=undefined می‌گرفت — بدونِ هیچ خطایی
-- در مسیرِ نوشتن، چون مشکل فقط در مسیرِ خواندن (از ویوی قدیمی) بود.
--
-- CREATE OR REPLACE VIEW این‌جا کار نمی‌کند: ستون‌های جدید باید در وسطِ
-- فهرستِ خروجی (بینِ آخرین ستونِ c.* قدیمی و admin_unread_count) قرار
-- بگیرند، نه انتهای آن — Postgres با خطای ۴۲P16 (cannot change name of
-- view column) رد می‌کند، دقیقاً همان مشکلی که کامنتِ خودِ migration
-- اصلی (20260917190000) قبلاً مستند کرده. پس drop+create، نه replace.
drop view if exists public.chat_visitor_conversations_with_stats;
create view public.chat_visitor_conversations_with_stats
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
