-- 商店設定頁需要的欄位：描述 / Slogan、賣場 Logo（大頭貼）
-- 執行於 Supabase SQL Editor（或 supabase db push）

alter table public.stores
  add column if not exists description text;

alter table public.stores
  add column if not exists logo_url text;

comment on column public.stores.description is '商店描述 / Slogan，顯示於賣場 SEO 與 About';
comment on column public.stores.logo_url is '賣場 Logo / 大頭貼公開 URL';

-- 賣場 Logo 上傳用 storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-logos',
  'store-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "public_read_store_logos" on storage.objects;
create policy "public_read_store_logos"
  on storage.objects for select
  using (bucket_id = 'store-logos');

drop policy if exists "partner_upload_store_logos" on storage.objects;
create policy "partner_upload_store_logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-logos'
    and auth.role() = 'authenticated'
  );

drop policy if exists "partner_update_store_logos" on storage.objects;
create policy "partner_update_store_logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'store-logos' and auth.role() = 'authenticated');

drop policy if exists "partner_delete_store_logos" on storage.objects;
create policy "partner_delete_store_logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'store-logos' and auth.role() = 'authenticated');
