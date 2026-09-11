-- باکتِ Storage برایِ لوگوی برندینگِ قالبِ مجوز کار — همان الگویِ
-- lifting-plan-docs (migration 20260909120000): عمومی/خواندنی، درجِ آزاد
-- (کلیدِ anon)، مطابقِ بقیه‌ی آپلودهایِ این پروژه که از سمتِ کلاینت انجام
-- می‌شوند.

insert into storage.buckets (id, name, public)
values ('permit-branding', 'permit-branding', true)
on conflict (id) do update set public = true;

drop policy if exists "permit-branding read" on storage.objects;
create policy "permit-branding read" on storage.objects
  for select using (bucket_id = 'permit-branding');

drop policy if exists "permit-branding insert" on storage.objects;
create policy "permit-branding insert" on storage.objects
  for insert with check (bucket_id = 'permit-branding');
