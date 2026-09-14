-- چک‌لیست‌های مرجعِ PSSR از فایلِ اکسلِ رسمی عیناً انگلیسی‌اند (نه فارسی).
-- طبق درخواستِ کاربر، هر Requirement (و سرتیترِ گروهش) حالا یک نسخه‌ی
-- فارسی هم دارد تا وقتی زبانِ سامانه فارسی است، فارسی نشان داده شود و
-- در حالتِ انگلیسی، همان متنِ اصلیِ مرجع. ستون‌های انگلیسیِ موجود
-- (title/group_title/requirement_text) دست‌نخورده می‌مانند — فقط یک ستونِ
-- افزودنیِ «_fa» در کنارشان اضافه می‌شود، دقیقاً هم‌الگوی افزودنیِ
-- display_label_en در 20260906102626 (فقط برعکس، چون اینجا پایه انگلیسی
-- است نه فارسی). requirement_text_fa روی pssr_action_items هم لازم است
-- چون هر Action Plan یک عکسِ لحظه‌ای (snapshot) از متنِ Requirement را در
-- زمانِ ثبتِ «No» نگه می‌دارد (نه ارجاع زنده به template).

alter table public.pssr_requirement_templates
  add column if not exists group_title_fa text,
  add column if not exists requirement_text_fa text not null default '';

alter table public.pssr_action_items
  add column if not exists requirement_text_fa text not null default '';
