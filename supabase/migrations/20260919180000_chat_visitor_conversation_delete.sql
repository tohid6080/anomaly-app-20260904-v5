-- دکمه‌ی «حذف» برای گفتگوهای بازدیدکننده در کادرِ سوپرادمین — تا امروز این
-- دو جدول فقط SELECT/UPDATE (و INSERT برای پیام‌ها) برای super_admin
-- داشتند؛ DELETE هرگز لازم نبود، پس هیچ policy ای برایش نبود (پیش‌فرض
-- deny). دقیقاً همان الگوی super_admin_delete_policies.sql.
--
-- policy حذف روی خودِ chat_visitor_messages هم لازم است، نه فقط
-- conversations: چون RLS سطحِ ردیف است، حذفِ cascade‌ایِ پیام‌ها (از طریق
-- on delete cascade روی conversation_id) هم زیرِ همان نقشِ فراخواننده و
-- همان policy های همین جدول اجرا می‌شود — بدون policy حذف روی پیام‌ها،
-- ردیف‌های پیام برای آن نقش نامرئی می‌مانند و cascade چیزی پاک نمی‌کند.
drop policy if exists "super admin delete chat visitor conversations" on public.chat_visitor_conversations;
create policy "super admin delete chat visitor conversations" on public.chat_visitor_conversations
  for delete using (is_current_user_super_admin());

drop policy if exists "super admin delete chat visitor messages" on public.chat_visitor_messages;
create policy "super admin delete chat visitor messages" on public.chat_visitor_messages
  for delete using (is_current_user_super_admin());
