-- Fuente de Storage; instalación completa: SUPABASE_COMPLETO.sql

begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'raffle-media', 'raffle-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "raffle_media_public_read" on storage.objects;
create policy "raffle_media_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'raffle-media');

drop policy if exists "raffle_media_admin_insert" on storage.objects;
create policy "raffle_media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'raffle-media' and public.is_admin());

drop policy if exists "raffle_media_admin_delete" on storage.objects;
create policy "raffle_media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'raffle-media' and public.is_admin());

drop policy if exists "raffle_media_admin_update" on storage.objects;
create policy "raffle_media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'raffle-media' and public.is_admin())
  with check (bucket_id = 'raffle-media' and public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts', 'payment-receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Elimina la política antigua que permitía leer/listar comprobantes ajenos.
drop policy if exists "payment_receipts_public_read" on storage.objects;
drop policy if exists "payment_receipts_owner_read" on storage.objects;
create policy "payment_receipts_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "payment_receipts_authenticated_insert" on storage.objects;
create policy "payment_receipts_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users where id = auth.uid() and status <> 'blocked')
  );

drop policy if exists "payment_receipts_admin_delete" on storage.objects;
create policy "payment_receipts_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-receipts' and public.is_admin());
commit;
