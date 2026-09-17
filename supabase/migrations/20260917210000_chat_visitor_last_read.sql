-- شمارشِ «خوانده‌نشده» سمتِ بازدیدکننده (پیام‌هایِ ادمین که هنوز ندیده) —
-- برای نشانگرِ قرمزِ زنده روی دکمه‌ی شناورِ ویجتِ سایت وقتی بسته است.
-- دقیقاً همان الگویِ admin_last_read_at که برای سمتِ سوپرادمین قبلاً اضافه
-- شد: یک timestamp، نه یک شمارنده‌ی افزایشی — بدونِ رِیس‌کاندیشن.
alter table public.chat_visitor_conversations
  add column if not exists visitor_last_read_at timestamptz;
