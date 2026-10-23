-- R3 Riders: storage buckets, size/MIME limits and policies.
-- Path conventions:
--   public-media     <area>/<file>                      (site images, product images)
--   member-avatars   <profile_id>/<file>                (private; viewed through signed URLs)
--   payment-proofs   <profile_id>/<file> or guest/<id>  (private; guest uploads go through server code)
--   documents        <file>                              (private; access mirrors the `documents` table)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media',   'public-media',   true,  5242880,  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('member-avatars', 'member-avatars', false, 2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880,  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents',      'documents',      false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- public-media: world-readable (bucket is public); only officers/admins write.
create policy public_media_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'public-media');
create policy public_media_write on storage.objects
  for insert to authenticated with check (bucket_id = 'public-media' and public.is_officer());
create policy public_media_update on storage.objects
  for update to authenticated using (bucket_id = 'public-media' and public.is_officer());
create policy public_media_delete on storage.objects
  for delete to authenticated using (bucket_id = 'public-media' and public.is_officer());

-- member-avatars: members read all (directory), write only inside their own folder.
create policy avatars_read on storage.objects
  for select to authenticated using (bucket_id = 'member-avatars' and public.is_member());
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- payment-proofs: a member reads/writes their own folder; officers read everything.
create policy proofs_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy proofs_read_officer on storage.objects
  for select to authenticated using (bucket_id = 'payment-proofs' and public.is_officer());
create policy proofs_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- documents: read mirrors the `documents` table policy; officers write.
create policy documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.documents d where d.storage_path = name)
  );
create policy documents_write on storage.objects
  for insert to authenticated with check (bucket_id = 'documents' and public.is_officer());
create policy documents_update on storage.objects
  for update to authenticated using (bucket_id = 'documents' and public.is_officer());
create policy documents_delete on storage.objects
  for delete to authenticated using (bucket_id = 'documents' and public.is_officer());
