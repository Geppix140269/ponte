-- LB-008. Make the Deal Room function ACL explicit, and stop relying on
-- Supabase's default privileges to be what the schema assumed.
--
-- ## What went wrong
--
-- `20260729b_deal_room_rls.sql` says, at its grant block:
--
--   `authenticated` only. `anon` is granted execute on nothing. The event logger
--   is revoked from everyone: a member who could call it directly could forge
--   history, which is the whole reason the other commands write it for them.
--
-- and implements the second sentence as:
--
--   revoke all on function public.deal_room_log_event(...) from public;
--
-- That statement works. `PUBLIC` is absent from the logger's ACL in production.
-- But `PUBLIC` was the wrong grantee. Supabase ships
-- `alter default privileges ... grant execute on functions to anon,
-- authenticated, service_role`, so every new function in `public` is created
-- with those three grants written into its ACL **by name**. Revoking from
-- `PUBLIC` does not touch an explicit role grant.
--
-- Production after `20260729b`: all 23 `deal_room_*` functions executable by
-- `anon`. Proved through the public API, not inferred from the catalogue - an
-- anon-key RPC call to the logger returned `23503`, a foreign-key violation
-- naming the room id passed in, which means the body ran. Recorded in
-- `docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` section 7.
--
-- It matters for `deal_room_log_event()` above all, because that function has no
-- authorisation check of its own **by design**: the twenty commands call it on the
-- member's behalf after doing their own checks. The grant was its only
-- protection. It inserts whatever it is given into `deal_room_activity_events`,
-- which is append-only, so a forged row could never afterwards be removed.
--
-- ## Why a new file
--
-- `20260729b` is applied to production and its SHA-256
-- (`b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153`) is in the
-- ledger. An applied file is immutable; editing it would make the ledger lie.
--
-- ## What this file does, and does not
--
-- Grants and revokes only. **No function body, table, column, constraint, RLS
-- policy, trigger, index or row is touched, and no project-wide `alter default
-- privileges` is issued** - the defaults stay as Supabase ships them, and this
-- file states the Deal Room's own contract explicitly instead of depending on
-- them. Nothing outside the `deal_room_*` namespace is named.
--
-- `service_role` is deliberately left alone. It bypasses RLS by design, the
-- negative-access fixture needs it for setup and teardown, and narrowing it is a
-- separate decision from closing an anonymous path.
--
-- ## The `authenticated` allowlist, and where it comes from
--
-- Derived from production rather than copied from the old grant block. Two
-- sources, and nothing else is granted:
--
-- 1. **The four helpers that RLS policy expressions call.** A function invoked
--    inside a policy expression is privilege-checked against the querying role,
--    so `authenticated` must hold EXECUTE or every member read fails. Taken from
--    `pg_policies` on the 14 Deal Room policies:
--
--      deal_room_can_administer            11 policies
--      deal_room_is_sub_room_participant    7 policies
--      deal_room_is_master_participant      6 policies
--      deal_room_can_read_evidence          2 policies
--
-- 2. **The fifteen member commands the application calls.** Taken from the
--    `.rpc("deal_room_*")` call sites under `app/` and `lib/`. That list and the
--    fifteen `grant execute ... to authenticated` lines in `20260729b` agree
--    exactly, derived independently, which is what makes the allowlist a finding
--    rather than a restatement.
--
-- Four functions are therefore executable by no member role at all:
--
--   deal_room_log_event            the logger. Called only from inside SECURITY
--                                  DEFINER commands, which run as their owner, so
--                                  no member needs it. Explicitly revoked from
--                                  `authenticated` as well, and never granted
--                                  back anywhere below.
--   deal_room_is_writable          called only inside command bodies; appears in
--                                  no policy expression.
--   deal_room_uuid_or_null         declared in `20260729a` and called nowhere -
--                                  no policy, constraint, index, default or
--                                  generated column references it.
--   deal_room_events_append_only   a trigger function. Postgres checks EXECUTE at
--                                  `create trigger`, not per row, so revoking it
--                                  does not weaken the append-only guard.
--
-- Every signature below is written out in full, because Postgres identifies a
-- function by name and argument types and a wrong arity is the `42883` that
-- aborted `20260729b` on its first attempt (LB-005).
--
-- Regression test: `lib/deal-room/__tests__/function-acl.test.ts`.

begin;

-- ---------------------------------------------------------------------
-- 1. No `deal_room_*` function is executable by PUBLIC or by `anon`
-- ---------------------------------------------------------------------
--
-- All 23. `PUBLIC` and `anon` in one statement each, so a function cannot be
-- closed to one and left open to the other.

revoke execute on function public.deal_room_accept_agreement(uuid, text) from public, anon;
revoke execute on function public.deal_room_accept_evidence_for_procedure(uuid) from public, anon;
revoke execute on function public.deal_room_accept_invitation(text) from public, anon;
revoke execute on function public.deal_room_admit_participant(uuid) from public, anon;
revoke execute on function public.deal_room_answer_clarification(uuid, text, text, text, bigint, text, text) from public, anon;
revoke execute on function public.deal_room_approve_procedure(uuid) from public, anon;
revoke execute on function public.deal_room_can_administer(uuid) from public, anon;
revoke execute on function public.deal_room_can_read_evidence(uuid) from public, anon;
revoke execute on function public.deal_room_declare_participation(uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.deal_room_events_append_only() from public, anon;
revoke execute on function public.deal_room_invite(uuid, text, timestamptz) from public, anon;
revoke execute on function public.deal_room_is_master_participant(uuid) from public, anon;
revoke execute on function public.deal_room_is_sub_room_participant(uuid) from public, anon;
revoke execute on function public.deal_room_is_writable(uuid) from public, anon;
revoke execute on function public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb) from public, anon;
revoke execute on function public.deal_room_open_blocker(uuid, uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.deal_room_propose(uuid, uuid, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.deal_room_propose_procedure(uuid, uuid, text, text, jsonb) from public, anon;
revoke execute on function public.deal_room_request_clarification(uuid, text) from public, anon;
revoke execute on function public.deal_room_resolve_blocker(uuid, text) from public, anon;
revoke execute on function public.deal_room_set_read_only(uuid) from public, anon;
revoke execute on function public.deal_room_submit_evidence(uuid, text, text, text, text, text, text, bigint, text, text) from public, anon;
revoke execute on function public.deal_room_uuid_or_null(text) from public, anon;

-- ---------------------------------------------------------------------
-- 2. The event logger is executable by no member role
-- ---------------------------------------------------------------------
--
-- This is the statement `20260729b` meant to write. `authenticated` is named
-- explicitly, because that is the grant Supabase's default privileges created and
-- the one a `from public` revoke leaves standing. A member who could call this
-- directly could forge the append-only history the whole Deal Room is audited
-- against. It is never granted back below - assert that, do not assume it.

revoke execute on function public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. The four helpers that RLS policy expressions require
-- ---------------------------------------------------------------------
--
-- Re-asserted rather than assumed. If `authenticated` loses these, every member
-- read through the 14 policies fails, so they are stated here as part of the
-- contract instead of surviving by accident of the project defaults.

grant execute on function public.deal_room_can_administer(uuid) to authenticated;
grant execute on function public.deal_room_can_read_evidence(uuid) to authenticated;
grant execute on function public.deal_room_is_master_participant(uuid) to authenticated;
grant execute on function public.deal_room_is_sub_room_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. The fifteen member commands
-- ---------------------------------------------------------------------
--
-- Exactly the set the application calls by RPC. Each granted once.

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
-- Rollback
-- ---------------------------------------------------------------------
--
-- There is nothing to roll back to that is worth restoring: the prior state is
-- the LB-008 defect. If this file has to be undone, the honest reversal is to
-- re-grant what Supabase's defaults had granted, which re-opens the anonymous
-- path, and it should not be done without a fresh owner decision:
--
--   grant execute on function public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb) to anon, authenticated;
--   -- and, per function, `to anon` for the remaining 22.
