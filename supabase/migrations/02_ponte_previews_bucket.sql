-- Migration 02: Create the public ponte-previews Storage bucket.
-- Run this in the Supabase SQL Editor AFTER migration 01.

-- Create the bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ponte-previews', 'ponte-previews', true, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- Storage RLS policies
create policy "Public read ponte-previews"
  on storage.objects for select
  using (bucket_id = 'ponte-previews');

create policy "Admin insert ponte-previews"
  on storage.objects for insert
  with check (bucket_id = 'ponte-previews' and (select is_admin()));

create policy "Admin update ponte-previews"
  on storage.objects for update
  using (bucket_id = 'ponte-previews' and (select is_admin()));

create policy "Admin delete ponte-previews"
  on storage.objects for delete
  using (bucket_id = 'ponte-previews' and (select is_admin()));
