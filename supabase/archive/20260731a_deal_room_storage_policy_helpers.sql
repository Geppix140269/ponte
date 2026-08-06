-- Give `authenticated` back the two helpers the Storage upload policy calls.
--
-- MUST be applied BEFORE, or in the same approval as, `20260729c_deal_room_storage.sql`.
-- Never after. A window in which that policy exists without these grants is a
-- window in which every member evidence upload fails.
--
-- ## What went wrong, and it was not the Storage file
--
-- `20260730c` revoked `authenticated` EXECUTE on four functions, on the stated
-- ground that none was reachable by a member: the event logger, the append-only
-- trigger function, `deal_room_is_writable` and `deal_room_uuid_or_null`. For the
-- first two that is permanently true. For the last two it was true only of the
-- schema **as applied at that moment**.
--
-- `20260729c_deal_room_storage.sql` has been in the repository, unapplied, since
-- 29 July. Its upload policy reads:
--
--   with check (
--     bucket_id = 'deal-room-evidence'
--     and public.deal_room_is_sub_room_participant(
--           public.deal_room_uuid_or_null((storage.foldername(name))[2]))
--     and exists (select 1 from public.deal_room_sub_rooms s
--                  where s.id = public.deal_room_uuid_or_null((storage.foldername(name))[2])
--                    and public.deal_room_is_writable(s.room_id)))
--
-- A function invoked inside a policy expression is privilege-checked against the
-- **querying** role, so `authenticated` must hold EXECUTE on both or the policy
-- raises `42501` for every upload. `20260730c` had taken both away.
--
-- ## Why the allowlist missed it
--
-- The `authenticated` allowlist was derived from live production with
-- `pg_policies where tablename like 'deal_room%'`. That query has two blind spots
-- and this defect sat in both:
--
--   1. it matches Deal Room tables in `public`, and these are policies on
--      `storage.objects`;
--   2. it can only see policies that **exist**, and this one lives in an
--      unapplied migration.
--
-- So `20260730c` recorded "appears in no policy expression" and "called nowhere".
-- Both statements were true of the applied database and false of the repository.
-- That is LB-008's shape one turn further out: a question asked of the catalogue
-- whose answer also depends on code not yet applied. The catalogue is the only
-- witness to what production **holds**; it is not a witness to what production
-- will **need**.
--
-- ## This is not a rollback of LB-008
--
-- The forgery path stays closed. `deal_room_log_event` remains executable by
-- neither member role, and `deal_room_events_append_only` likewise. Only the two
-- helpers a real policy demonstrably needs come back, and each is read-only:
-- `deal_room_is_writable(uuid)` returns a boolean from `deal_room_entitlements`
-- and room state; `deal_room_uuid_or_null(text)` is pure text-to-uuid coercion
-- that touches no table. Neither writes, and neither can forge history.
--
-- After this file, `authenticated` holds EXECUTE on **21**: four RLS policy
-- helpers, two Storage policy helpers, fifteen member commands.
--
-- ## Verification
--
--   node scripts/deal-room-acl-verify.mjs
--
-- reads `pg_proc.proacl` and requires exactly that 21, `anon` 0, `PUBLIC` 0,
-- `service_role` 23 unchanged, and the two genuinely internal functions reachable
-- by `service_role` alone.

begin;

-- Called by the `deal room evidence upload` policy in `20260729c`, to resolve the
-- sub-room segment of the object path without raising on a crafted name.
grant execute on function public.deal_room_uuid_or_null(text) to authenticated;

-- Called by the same policy, to refuse uploads into a room that is read-only or
-- out of entitlement.
grant execute on function public.deal_room_is_writable(uuid) to authenticated;

commit;

-- ## Rollback
--
-- Only safe while `20260729c` is unapplied. Once the Storage policies exist,
-- revoking these breaks member uploads:
--
--   revoke execute on function public.deal_room_uuid_or_null(text) from authenticated;
--   revoke execute on function public.deal_room_is_writable(uuid) from authenticated;
