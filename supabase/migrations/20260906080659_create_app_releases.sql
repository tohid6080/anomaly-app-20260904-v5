-- مدیریت انتشار به‌روزرسانی اپلیکیشن موبایل (APK).
--
-- هر ردیف یک «نسخه‌ی منتشرشده» است: شماره‌ی نمایشی (version مثل 1.2.0)،
-- یک version_code عددیِ صعودی که مبنای تشخیص «نسخه‌ی جدید» در اپ موبایل
-- است، Release Notes، و آدرس APK (چه در Supabase Storage آپلود شده باشد،
-- چه یک لینک بیرونی مثل GitHub Release).
--
-- امنیت:
--   * SELECT عمومی است — اپ موبایل (حتی پیش از ورود) و پنل «درباره IHMS»
--     باید بتوانند آخرین نسخه‌ی منتشرشده را بخوانند.
--   * INSERT/UPDATE/DELETE فقط برای Super Admin (همان الگوی trial_requests).

create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  version_code integer not null,
  release_notes text not null default '',
  apk_url text not null default '',       -- آدرس عمومیِ APK اگر در Storage آپلود شده باشد
  apk_path text not null default '',      -- مسیر داخل باکت app-releases (برای حذف بعدی)
  download_url text not null default '',  -- لینک دانلود بیرونی (جایگزینِ آپلود مستقیم)
  is_published boolean not null default false,
  published_by text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists app_releases_version_code_key on public.app_releases (version_code);
create index if not exists app_releases_published_idx on public.app_releases (is_published, version_code desc);
create index if not exists app_releases_created_at_idx on public.app_releases (created_at desc);

alter table public.app_releases enable row level security;

drop policy if exists "app_releases public read" on public.app_releases;
create policy "app_releases public read" on public.app_releases
  for select using (true);

drop policy if exists "app_releases super admin insert" on public.app_releases;
create policy "app_releases super admin insert" on public.app_releases
  for insert with check (is_current_user_super_admin());

drop policy if exists "app_releases super admin update" on public.app_releases;
create policy "app_releases super admin update" on public.app_releases
  for update using (is_current_user_super_admin()) with check (is_current_user_super_admin());

drop policy if exists "app_releases super admin delete" on public.app_releases;
create policy "app_releases super admin delete" on public.app_releases
  for delete using (is_current_user_super_admin());

-- باکت Storage برای فایل‌های APK — عمومی (public) تا لینک دانلود مستقیم
-- بدون توکن کار کند. آپلود از پنل Super Admin با کلید anon انجام می‌شود
-- (همان روشی که بقیه‌ی باکت‌های پروژه دارند)، پس policyهای storage.objects
-- برای این باکت به anon/authenticated اجازه‌ی نوشتن می‌دهند؛ گیت واقعی روی
-- خودِ جدول app_releases است (که orphan APK بدون ردیف بی‌اثر است).
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = true;

drop policy if exists "app-releases read" on storage.objects;
create policy "app-releases read" on storage.objects
  for select using (bucket_id = 'app-releases');

drop policy if exists "app-releases insert" on storage.objects;
create policy "app-releases insert" on storage.objects
  for insert with check (bucket_id = 'app-releases');

drop policy if exists "app-releases update" on storage.objects;
create policy "app-releases update" on storage.objects
  for update using (bucket_id = 'app-releases') with check (bucket_id = 'app-releases');

drop policy if exists "app-releases delete" on storage.objects;
create policy "app-releases delete" on storage.objects
  for delete using (bucket_id = 'app-releases');
