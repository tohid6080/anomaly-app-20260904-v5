-- بازطراحی «مدیریت ماژول‌های داشبورد مدیریتی» در پنل SuperAdmin: علاوه بر
-- نمایش/پنهان، ترتیبِ پنل‌ها هم قابل‌مدیریت می‌شود. روی همان جدول موجودِ
-- system_dashboard_widgets، فقط یک ستونِ افزودنی.

alter table public.system_dashboard_widgets
  add column if not exists sort_order integer;

-- upsert سمت‌کلاینت (PostgREST on_conflict=widget_key) و INSERT ... ON
-- CONFLICT پایین به یک ایندکس یکتا روی widget_key نیاز دارند.
create unique index if not exists system_dashboard_widgets_widget_key_uidx
  on public.system_dashboard_widgets (widget_key);

-- مجموعه‌ی کاملِ پنل‌های داشبورد (شامل پنل‌های جدید) با ترتیبِ پایه درج/
-- به‌روزرسانی می‌شود. نمایشِ فعلیِ ردیف‌های موجود دست‌نخورده می‌ماند
-- (is_visible در on conflict به‌روزرسانی نمی‌شود)؛ فقط sort_orderِ خالی پر
-- و کلیدهای جدید اضافه می‌شوند.
insert into public.system_dashboard_widgets (widget_key, is_visible, sort_order) values
  ('kpiStrip', true, 1),
  ('contractorHse', true, 2),
  ('contractorPerformance', true, 3),
  ('correctiveActionPerf', true, 4),
  ('urgentAlerts', true, 5),
  ('smartInsights', true, 6),
  ('incidentSafety', true, 7),
  ('rcaStatus', true, 8),
  ('proactiveScores', true, 9),
  ('anomalyTrend', true, 10),
  ('healthStatus', true, 11),
  ('machineryStatus', true, 12),
  ('anomalyByRisk', true, 13)
on conflict (widget_key) do update
  set sort_order = coalesce(public.system_dashboard_widgets.sort_order, excluded.sort_order);
