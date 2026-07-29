-- Deal Room launch slice: private evidence storage.
--
-- Run AFTER 20260729a and 20260729b:
--   node scripts/db-query.mjs --file supabase/migrations/20260729c_deal_room_storage.sql
--
-- NOT APPLIED. No production bucket or storage policy has been created or
-- changed by the Gate B work. Applying this file is a separate, explicit Gate C
-- owner decision, listed in issue #97 among the actions that require one.
--
-- ========================= WHY A NEW BUCKET ============================
--
-- Production already has a private bucket called `ponte-deal-docs`, created
-- 5 June 2026. The Gate A preflight established it holds zero objects, is named
-- by zero storage policies, and is referenced by no application code. It
-- predates every accepted Deal Room authority, and its name collides
-- conceptually with the legacy `deal_documents` table.
--
-- The owner accepted the disposition on 29 July 2026: leave it untouched, and
-- create a new, precisely named bucket instead. Attaching an access model to an
-- object of undocumented intent would inherit that ambiguity permanently.
-- `ponte-deal-docs` is not modified, not dropped and not referenced here;
-- classifying it is post-launch ticket PL-006.
--
-- ============================== THE RULE ===============================
--
-- Evidence bytes are private, and the boundary is the database, not the
-- interface. The SELECT policy joins from the object's name to
-- `deal_room_evidence_versions.storage_path` - a unique-indexed column - and on
-- to the evidence row, then asks `deal_room_can_read_evidence()`.
--
-- It joins rather than parsing the path on purpose. A policy that trusts path
-- segments trusts a string the uploader chose. A guessed or crafted object name
-- has no matching version row, so it grants nothing at all.
--
-- Serving is belt and braces: this policy AND short-lived signed URLs issued by
-- a server route that re-checks permission before signing. Bytes are never
-- public, never proxied through a public bucket, and never embedded in email.
--
-- ================================ ROLLBACK =============================
--
--   drop policy if exists "deal room evidence read"   on storage.objects;
--   drop policy if exists "deal room evidence upload" on storage.objects;
--   delete from storage.buckets where id = 'deal-room-evidence';
--
-- The delete succeeds only while the bucket is empty. Once a member has
-- uploaded evidence, removal is a retention decision and an owner action, not a
-- rollback step. No other bucket and no other storage policy is touched in
-- either direction.
-- =======================================================================

set lock_timeout = '5s';

begin;

-- The bucket. Private, size-limited, and restricted to the document and image
-- types trade evidence actually arrives as. `on conflict do nothing` so a
-- second run is a no-op rather than an error.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deal-room-evidence',
  'deal-room-evidence',
  false,
  26214400, -- 25 MiB, matching verification-docs
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Path convention, enforced by the application when it writes
-- `deal_room_evidence_versions.storage_path`:
--
--   {room_id}/{sub_room_id}/{evidence_id}/{version}/{filename}
--
-- The policies below do not depend on it for authorisation - the join does -
-- but the upload policy uses segment 2 to establish which workspace an object
-- is being written into, before any row exists to join to.

drop policy if exists "deal room evidence read" on storage.objects;
create policy "deal room evidence read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deal-room-evidence'
    and exists (
      select 1
      from public.deal_room_evidence_versions v
      where v.storage_path = storage.objects.name
        and public.deal_room_can_read_evidence(v.evidence_id)
    )
  );

drop policy if exists "deal room evidence upload" on storage.objects;
create policy "deal room evidence upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'deal-room-evidence'
    -- `deal_room_uuid_or_null` rather than a bare cast. Casting a malformed
    -- segment to uuid raises 22P02, and Postgres does not guarantee AND
    -- evaluation order, so a regex guard placed first would not reliably run
    -- first. A raising policy turns a crafted object name into a broken query
    -- instead of a refused one; this returns null, and a null workspace denies.
    and public.deal_room_is_sub_room_participant(
      public.deal_room_uuid_or_null((storage.foldername(name))[2])
    )
    and exists (
      select 1
      from public.deal_room_sub_rooms s
      where s.id = public.deal_room_uuid_or_null((storage.foldername(name))[2])
        and public.deal_room_is_writable(s.room_id)
    )
  );

-- No UPDATE policy and no DELETE policy, deliberately.
--
-- An evidence version is immutable: a correction is a new version at a new
-- path, which is what lets "the version the reviewer accepted" mean something.
-- Removing an object is a retention action for the service role under a
-- separately approved procedure, not something a participant does.
--
-- `anon` is granted nothing here, and no policy in this file names it.

commit;
