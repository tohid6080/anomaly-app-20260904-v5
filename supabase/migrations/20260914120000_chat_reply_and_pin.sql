-- ارتقای ماژول چت: پاسخ به یک پیامِ خاص (Reply/Quote) و پین‌کردنِ یک پیامِ
-- مهم در هر مکالمه — طبق تصمیمِ صریحِ کاربر. reply_to_id روی خودِ پیام
-- (اختیاری، ارجاع به پیامِ دیگری در همان مکالمه؛ متنِ پیامِ ارجاع‌شده سمتِ
-- کلاینت از پیام‌هایِ همان مکالمه که از قبل لود شده‌اند خوانده می‌شود، بدون
-- کوئریِ اضافه یا denormalize). pinned_message_id روی خودِ مکالمه — فقط یک
-- پیامِ پین‌شده در هر لحظه (ساده‌تر از فهرستِ چندتایی، کافی برای اطلاعیه‌ی
-- مهمِ فعلی). هر دو ستون با on delete set null: اگر پیامِ مرجع هر دلیلی
-- حذف شود، فقط ارجاع پاک می‌شود، نه خودِ رکورد.

alter table public.chat_messages
  add column if not exists reply_to_id uuid
    references public.chat_messages(id) on delete set null;

alter table public.chat_conversations
  add column if not exists pinned_message_id uuid
    references public.chat_messages(id) on delete set null;

create index if not exists chat_messages_reply_to_idx on public.chat_messages (reply_to_id);
