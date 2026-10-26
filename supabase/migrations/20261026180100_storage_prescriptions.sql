-- Private bucket for prescription PDFs. Path rule: {user_id}/{uuid}.pdf, max 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner can only touch objects under their own folder, with the exact path shape.
create policy "prescriptions: owner can select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "prescriptions: owner can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

create policy "prescriptions: owner can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
  );

create policy "prescriptions: owner can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
