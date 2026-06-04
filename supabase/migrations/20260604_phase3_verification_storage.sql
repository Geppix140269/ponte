-- ponte.trade — Phase 3: verification document storage
-- Date: 2026-06-04
-- Private bucket for verification documents (registration certs, VAT records,
-- ID, trade references). Object path convention: <profile_id>/<verification_id>/<filename>
-- so the owner-id is the first path segment, which the RLS policies key on.
-- Idempotent.

-- ============================================================ BUCKET

insert into storage.buckets (id, name, public)
values ('ponte-verification', 'ponte-verification', false)
on conflict (id) do nothing;

-- ============================================================ STORAGE RLS
-- storage.objects already has RLS enabled by Supabase. We add scoped policies.

-- Owner can upload into their own folder (first path segment = their uid).
drop policy if exists "verification upload own" on storage.objects;
create policy "verification upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ponte-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can read their own documents; admins can read all.
drop policy if exists "verification read own" on storage.objects;
create policy "verification read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ponte-verification'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- Owner can delete their own documents (e.g. re-upload); admins can delete all.
drop policy if exists "verification delete own" on storage.objects;
create policy "verification delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ponte-verification'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

-- ============================================================ DONE
