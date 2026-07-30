-- LB-008, residual half: take the three internal functions away from
-- `authenticated` as well.
--
-- ## What 20260730c fixes, and why 20260730b did not
--
-- `20260730b` closed the anonymous path completely and provably: `anon` and
-- `PUBLIC` hold EXECUTE on nothing, and a real anon-key RPC to
-- `deal_room_log_event` returns `42501` where it previously returned `23503`.
--
-- It left `authenticated` holding EXECUTE on **22** functions rather than the
-- intended 19. It revoked `authenticated` on the logger and granted the 19, but
-- Supabase's `alter default privileges` had already granted `authenticated` on all
-- 23, and **granting 19 cannot remove a grant that already exists on the other
-- three**. So these survived:
--
--   deal_room_is_writable(uuid)
--   deal_room_uuid_or_null(text)
--   deal_room_events_append_only()
--
-- Nothing about them is a live hole. All three are closed to `anon`. None writes:
-- `is_writable` is a read-only boolean predicate, `uuid_or_null` is pure text
-- coercion touching no table, and `events_append_only` raises if called outside a
-- trigger because it dereferences `OLD`/`NEW`. The forgery path -
-- `deal_room_log_event` - was already closed to both member roles.
--
-- This file exists because the ACL should be what it says it is. An allowlist that
-- is nearly right is a document nobody can rely on later.
--
-- ## The deeper reason this took two files
--
-- The test written to catch LB-008 asserted "`authenticated` should end with
-- execute on exactly 19", and it passed - because it counted `grant` statements in
-- the file. LB-008 was a file asserting something about itself; the test asserted
-- something about that file. **A text scan cannot see a privilege the file never
-- mentions.** Three functions granted by Supabase's defaults and named nowhere in
-- `20260730b` were invisible to it, and the catalogue was not consulted until after
-- that migration had been applied.
--
-- So this correction ships with two instruments instead of one:
--
--   - `lib/deal-room/__tests__/function-acl.test.ts` proves only what the migration
--     text can prove, and now says so in its own assertion messages;
--   - `scripts/deal-room-acl-verify.mjs` reads `pg_proc.proacl` from production and
--     proves the final ACL state, which is the only thing that can.
--
-- ## What this file does, and does not
--
-- Three revokes and nineteen idempotent grants. **No function body, table, column,
-- constraint, RLS policy, trigger or index is touched. No `alter default
-- privileges` is issued. `service_role` is not named. Nothing outside the
-- `deal_room_*` namespace appears.**
--
-- The nineteen grants are re-asserted rather than assumed. They are already in
-- place, so each is a no-op, and that is the point: after this file the intended
-- `authenticated` contract is stated once, completely, in one place, instead of
-- being the residue of two migrations and a set of platform defaults.
--
-- `deal_room_log_event` appears nowhere below. It was revoked from `PUBLIC`, `anon`
-- and `authenticated` by `20260730b` and must never be granted to a member role;
-- the regression suite asserts its absence from this file rather than trusting it.

begin;

-- ---------------------------------------------------------------------
-- 1. The three internal functions: no member role, including authenticated
-- ---------------------------------------------------------------------
--
-- `anon` and `PUBLIC` were already revoked by `20260730b`. This names
-- `authenticated` alone, because that is the grant Supabase's default privileges
-- created and the one `20260730b` did not remove.

revoke execute on function public.deal_room_is_writable(uuid) from authenticated;
revoke execute on function public.deal_room_uuid_or_null(text) from authenticated;
revoke execute on function public.deal_room_events_append_only() from authenticated;

-- ---------------------------------------------------------------------
-- 2. The four helpers RLS policy expressions require
-- ---------------------------------------------------------------------
--
-- A function called inside a policy expression is privilege-checked against the
-- querying role. Without these, every member read through the 14 policies fails.
-- Re-asserted so that the contract is stated in full here.

grant execute on function public.deal_room_can_administer(uuid) to authenticated;
grant execute on function public.deal_room_can_read_evidence(uuid) to authenticated;
grant execute on function public.deal_room_is_master_participant(uuid) to authenticated;
grant execute on function public.deal_room_is_sub_room_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. The fifteen member commands
-- ---------------------------------------------------------------------
--
-- Exactly the set the application calls by RPC, verified against those call sites
-- and against `20260729b`'s grant list independently.

grant execute on function public.deal_room_propose(uuid, uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_invite(uuid, text, timestamptz) to authenticated;
grant execute on function public.deal_room_accept_invitation(text) to authenticated;
grant execute on function public.deal_room_declare_participation(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_accept_agreement(uuid, text) to authenticated;
grant execute on function public.deal_room_admit_participant(uuid) to authenticated;
grant execute on function public.deal_room_propose_procedure(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.deal_room_approve_procedure(uuid) to authenticated;
grant execute on function public.deal_room_submit_evidence(uuid, text, text, text, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.deal_room_request_clarification(uuid, text) to authenticated;
grant execute on function public.deal_room_answer_clarification(uuid, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.deal_room_accept_evidence_for_procedure(uuid) to authenticated;
grant execute on function public.deal_room_open_blocker(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_resolve_blocker(uuid, text) to authenticated;
grant execute on function public.deal_room_set_read_only(uuid) to authenticated;

commit;

-- ---------------------------------------------------------------------
-- Verification, which this file cannot perform on itself
-- ---------------------------------------------------------------------
--
--   node scripts/deal-room-acl-verify.mjs
--
-- reads `pg_proc.proacl` from production and requires: `anon` 0 of 23, `PUBLIC` 0,
-- `authenticated` exactly the 19 named above, `service_role` 23, and the four
-- internal functions unreachable by either member role. Run it after applying, and
-- treat its output rather than this file's text as the record of what production
-- holds.
--
-- ## Rollback
--
-- Restores the LB-008 residue and should not be run without a fresh decision:
--
--   grant execute on function public.deal_room_is_writable(uuid) to authenticated;
--   grant execute on function public.deal_room_uuid_or_null(text) to authenticated;
--   grant execute on function public.deal_room_events_append_only() to authenticated;
