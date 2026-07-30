# Database state

**Reconciled:** 28 July 2026

This file is a guardrail, not a complete schema dump. Codex must inspect the live production record and repository migrations before proposing database work.

## Full reconciliation, 28 July 2026

Every file in `supabase/migrations/` was verified object by object against
production (`cptglsmjmzcfpjndqfmc`): 260 assertions across columns, constraints,
indexes, functions, triggers, policies, RLS state, storage buckets and data
backfills. Full evidence:
`docs/codex/audits/2026-07-28-production-migration-reconciliation.md`. Read it
before proposing database work; the summary here is not a substitute.

**No repository migration was missing from production.** The concern that
prompted the audit was inverted: 26 of the 40 files audited had been applied by
hand and never recorded, so the ledger, not the schema, was the broken thing.

| Status at audit time | Count |
|---|---|
| `applied_recorded` | 13 |
| `applied_unrecorded` | 25 |
| `partially_applied` | 1 |
| `missing` | **0** |
| `superseded` | 0 |
| `unsafe_or_ambiguous` | 1 |

- **The ledger was repaired**, from 12 rows to 39, recording every
  verified-applied migration. INSERT-only; no schema and no application data was
  touched. Evidence and rollback:
  `docs/codex/audits/2026-07-28-ledger-repair.sql`. One `UPDATE` aligned
  `20260724a`'s stale hash, whose file was corrected in `9fa0aa6` after it was
  applied; production was verified to match the corrected file.
- **There are two ledgers.** `supabase_migrations.schema_migrations` holds one
  row (`01`) and has not advanced. `public.schema_migrations` is the
  hand-maintained record and is the one to keep current.
- **`20260725a_verification_needs_selection.sql` must never be applied.** It
  drops `verified` and `rejected` from the `verifications` status constraint;
  production holds rows in both, so it fails outright, and removing `verified`
  would make the publication gate unpassable. It is redundant: `20260721i`
  already put `needs_selection` in force. Owner direction of 28 July 2026 is to
  exclude it permanently and keep it out of any automated chain; that change
  ships separately from this record.
- **`20260721g` is partially applied.** `profiles.verification_level` is live as
  `text`, not the `int` the migration declares, because the column pre-existed
  and `if not exists` no-opped. This is the recorded R-01 defect. **No mapping
  has been guessed.** A separate remediation proposal is required before any
  change, covering every live value, every application reference, the proposed
  canonical type, the exact mapping and rollback, and whether the column should
  exist at all.
- **The repository cannot rebuild production.** 21 tables and 8 functions exist
  in production that no repository file creates. Treated as a separate
  workstream; no schema dump is to be generated or applied without review.

## Written but NOT applied: Market Signal search indexes

`supabase/migrations/20260730a_market_signal_search.sql` (LB-007).

**Not executed anywhere.** Index-only and additive: it creates the `pg_trgm`
extension, eight partial GIN trigram indexes on `desk_radar` over the public
columns the search reads (`product`, `summary_line`, `ai_description`,
`category`, `origin`, `destination`, `hs_code`, `canonical_signal_id`), each
scoped `where status = 'approved_signal'`, and one btree
`(spotted_at desc, id desc)` for the board's paging order.

**No column, constraint, policy, trigger, function or default is added or
changed, and no row is read, written or reclassified.** RLS on `desk_radar` is
untouched and stays deny-all. There is no backfill: an index is derived from the
rows already present.

**The search does not depend on it, deliberately.** A merge applies no SQL in
this repository, so a search built on a new column, a generated `tsvector` or an
RPC would have shipped as a launch-blocker fix that returned nothing in
production until somebody separately ran a file. The search is therefore built
on `ilike` over columns that already exist (verified applied 28 July 2026 via
`20260728a_market_classification.sql`). This migration only changes the plan:
applying it changes no result, no ordering, no count and no row.

**Why it matters anyway.** `ilike '%...%'` is unanchored, so no btree can serve
it and Postgres plans a sequential scan. `pg_trgm` is the one thing that makes
an unanchored `ILIKE` indexable.

**Measured with none of these indexes applied.**
`npx tsx scripts/verify-signal-search.ts` ran the real predicates against
production on 30 July 2026 (3,458 eligible signals). Wall-clock round trips
from a developer machine to eu-west-1 were **198 to 1,037 ms** across two runs,
the slowest being a five-variant alias group across nine columns on a cold
connection. That includes network latency,
TLS and PostgREST parsing, so it is an upper bound on the database work and
cannot be decomposed client-side. Evidence:
`docs/codex/audits/market-signals-search/2026-07-30-postgrest-verification.txt`.

An earlier version of this section said single-digit milliseconds. That was
reasoned from the row count and never measured; it is corrected here rather
than removed. The scan is linear in the eligible row count either way, which
is what makes the indexes worth applying before the inventory grows.

Rollback is written out in the file: drop the nine indexes. `pg_trgm` is
deliberately not dropped, because other objects may come to depend on it.

Follow-up: PL-016 in `docs/launch/POST-LAUNCH-BACKLOG.md`.

## APPLIED to production, 30 July 2026: the Deal Room function ACL correction (LB-008)

`supabase/migrations/20260730b_deal_room_function_acl.sql`.

| | |
|---|---|
| SHA-256 | `15f488d87705e5a88def6e1c25e0b006daceda9d3316747eb8bbe87b3f542b31` |
| Size | 11,672 bytes, no BOM; raw-byte and utf8-string hashes identical |
| Status | **APPLIED 2026-07-30 07:59:45.928 UTC**, one transaction, exit 0, no ambiguous transport response. Recorded as exactly one ledger row, **45 → 46**, checksum matching byte for byte |

**The anonymous execution path is closed, and proved closed through a real
client.** `anon` now holds EXECUTE on **0 of 23** `deal_room_*` functions, down
from 23; `PUBLIC` holds 0; and `deal_room_log_event` is reachable by `postgres`
and `service_role` only. An anon-key RPC to the logger returns
**`401 / 42501 permission denied for function deal_room_log_event`** where the same
call returned `409 / 23503` before — an FK violation, which is how LB-008 was
proved, because it meant the body had executed. It no longer executes.

Nothing else moved. All nine before/after md5 fingerprints are identical: function
bodies, policy definitions, triggers, indexes, constraints, columns, RLS state and
`pg_default_acl` (24 rows). `service_role` unchanged at 23. 14 policies, 4
agreement documents, 0 rooms, 0 activity rows.

**LB-008 nevertheless stays ACTIVE, because one probe failed.** `authenticated`
holds EXECUTE on **22** functions, not the specified 19: the 19 intended plus
`deal_room_is_writable`, `deal_room_uuid_or_null` and
`deal_room_events_append_only`. The migration revokes `authenticated` only on the
logger, and re-granting the 19 cannot remove grants Supabase's default privileges
had already created on all 23. The three are closed to `anon`; none of them
writes; the forgery path itself is closed. So the material security objective is
met and the ACL contract as specified is not.

`lib/deal-room/__tests__/function-acl.test.ts` asserts "`authenticated` should end
with execute on exactly 19" and passes — **because it counts grant statements in
the file.** A file-text test cannot see a privilege the file never mentions. That
is the LB-008 error one level up: LB-008 was a file asserting something about
itself, and the test written to catch it asserts something about that file. Only
the catalogue could answer it. Full probe-by-probe record:
`docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md` sections 11 to 16.

**Probe 6 is pending, not passed.** A real authenticated direct RPC needs a member
JWT and there are no authorised test credentials; production's 9 confirmed users
are real member accounts, and minting a session for one to satisfy a probe is not a
test credential. Probes 8 and 9 are catalogue-verified and behaviourally pending
for the same reason.

**Why a new file rather than an edit.** `20260729b` is applied and its checksum
`b379f869…fea3153` is in `public.schema_migrations`. An applied file is immutable;
editing it would make the ledger describe bytes that no longer exist. The
regression suite asserts that `20260729b` still hashes to its recorded value, so
the branch cannot quietly edit it.

**What it does.** Grants and revokes only — 24 revoke statements and 19 grants,
inside one transaction. It revokes EXECUTE from `PUBLIC` and `anon` on all 23
`deal_room_*` functions by exact signature, revokes the event logger from
`PUBLIC`, `anon` **and** `authenticated`, and re-asserts `authenticated` EXECUTE on
exactly the 19 that members need. **No function body, table, column, constraint,
RLS policy, trigger, index or row is touched, no project-wide `alter default
privileges` is issued, and no name outside `deal_room_*` appears.** `service_role`
is left alone deliberately: it bypasses RLS by design and the negative-access
fixture needs it, so narrowing it is a separate decision.

**The `authenticated` allowlist, derived rather than copied.** Two sources, and
they were checked against each other rather than assumed:

| Kind | Count | Derived from |
|---|---|---|
| RLS policy helpers | **4** | the function calls inside the 14 policy expressions in `pg_policies`: `deal_room_can_administer` (11 policies), `deal_room_is_sub_room_participant` (7), `deal_room_is_master_participant` (6), `deal_room_can_read_evidence` (2). A function called in a policy expression is privilege-checked against the querying role, so without these every member read fails |
| Member commands | **15** | the `.rpc("deal_room_*")` call sites under `app/` and `lib/`. That list and the 15 `grant ... to authenticated` lines in `20260729b` agree **exactly**, derived independently |

4 + 15 = **19**. The remaining four are executable by no member role:
`deal_room_log_event` (called only from inside SECURITY DEFINER commands, which
run as their owner), `deal_room_is_writable` (command bodies only, in no policy),
`deal_room_uuid_or_null` (declared in `20260729a` and called nowhere — no policy,
constraint, index, default or generated column references it), and
`deal_room_events_append_only` (a trigger function; Postgres checks EXECUTE at
`create trigger`, not per row, so revoking it does not weaken the append-only
guard).

### Production probes this migration must pass before LB-008 closes

Read-only, against production, immediately after it is applied. **None has been
run: the migration is not applied.**

| # | Probe | Required result |
|---|---|---|
| 1 | Catalogue: count `deal_room_*` functions where `has_function_privilege('anon', oid, 'execute')` | **0**, against 23 today |
| 2 | Catalogue: `has_function_privilege('authenticated', ...)` on `deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb)` | **false** |
| 3 | Real anonymous RPC to `deal_room_log_event` with an anon-key client | **permission denied (`42501`)** — and specifically **not** the `23503` foreign-key violation it returns today, which is the proof the body ran |
| 4 | Real authenticated direct RPC to `deal_room_log_event`, as a signed-in member | **permission denied (`42501`)** |
| 5 | Catalogue: `has_function_privilege('authenticated', ...)` for each of the 4 RLS helpers and the 15 member commands | **true for all 19**, so the correction closes the anonymous path without breaking a member journey |

Probe 3 is the one that matters. Today the same call returns `23503`, which is
what proved LB-008; after this migration it must fail before the body runs at all.
Probes 3 and 4 need real API clients, not catalogue inspection, for the reason
`GATE-C-TEST-PLAN.md` section 0 gives: a privilege can be present in the catalogue
and still not be what PostgREST enforces.

Regression suite: `lib/deal-room/__tests__/function-acl.test.ts`, **22
assertions**, which proves the file is complete and internally consistent but
cannot observe a Supabase project's default privileges — that is what the probes
are for.

Six of those 22 check the command allowlist against a **third, independent
source**: a recursive scan of production `.ts`/`.tsx` under `app/` and `lib/` for
`.rpc("deal_room_*")` and the single-quoted form, excluding tests, mocks,
fixtures, `.d.ts`, generated output, `scripts/`, `supabase/` and `docs/`. Each
discovered name is resolved to its unique declared signature. Three sets are then
required to be identical — **what the application calls, what `20260729b` grants,
what `20260730b` grants** — because any two agreeing proves little when one is
derived from the other. All three agree on the same **15** commands.

## Deal Room launch slice: `20260729a` and `20260729b` APPLIED, `c` NOT applied

**Gate C Approval 1, executed 30 July 2026 against `cptglsmjmzcfpjndqfmc`.**
`20260729a` applied from `main` at `7f979e0`; the corrected `20260729b` applied
from `main` at `23637d3` under the Approval 1 continuation of 30 July 2026. Full
record with every probe result:
`docs/codex/audits/deal-room/GATE-C-APPROVAL-1-2026-07-30.md`.

**Verification did not fully pass.** `anon` holds EXECUTE on all 23
`deal_room_*` functions, including `deal_room_log_event()`, which has no
authorisation check of its own. That is **LB-008**, and it contradicts both the
migration's own stated intent and `GATE-C-TEST-PLAN.md` section 4.2. Details
below and in the audit.

### `20260729a_deal_room_core.sql` — APPLIED

Recorded in `public.schema_migrations` with SHA-256
`24932e4a429eb4ea7b19f2a7c5423101c1bbc61a628be941f546412258a78c8a`, matching the
repository file byte for byte. **Ledger 43 to 44.**

The row's `applied_at` is `2026-07-30 03:39:20 UTC`, which is when the row was
written rather than when the DDL ran. `db-query.mjs` returned an HTML **502 Bad
gateway** from `api.supabase.com`; the transaction had committed and only the
reply was lost, but the script exits before its ledger write on a failed call, so
the row was written explicitly afterwards. Execution was a few minutes earlier in
the same session and the exact instant is unrecoverable.

**Verified in production:** 15 tables, 34 CHECK constraints, 52 foreign keys, 54
indexes, 9 non-internal triggers, and 2 functions - `deal_room_uuid_or_null(text)`
and `deal_room_events_append_only()`. Public tables 53 to 68, exactly +15. The
`deal_room_activity_append_only` trigger is present on
`deal_room_activity_events`. The agreement authority is seeded with all four
documents at `v1-2026-07-29`, each `current` and carrying its checksum.

**RLS is enabled on all 15 tables with zero policies, and that state was not
created by the approved files.** Migration `a` does not enable RLS - `b` does -
so between the two, production held 15 tables with `relrowsecurity = false` while
Supabase's default privileges granted `anon` and `authenticated` SELECT, INSERT
and UPDATE on every one of them. An anonymous caller could have written to all
fifteen through PostgREST. The tables were empty and no write was attempted while
the gap was open. It was closed with `alter table ... enable row level security`
on the 15 tables and nothing else: no policy created, nothing granted, nothing
revoked. RLS on with no policy is fail-closed, and it is a prefix of what `b`
does, so it conflicts with nothing. Proved with an anon-key client: SELECT
returns `200 []`, INSERT returns `401 / 42501`. **This is a production change
outside the approved files and awaits owner confirmation.**

### `20260729b_deal_room_rls.sql` — APPLIED, with one defect found on verification

First attempt, 30 July 2026: Postgres refused it and rolled the whole file back —
`ERROR: 42883: function public.deal_room_invite(uuid, text, text, text, timestamp
with time zone) does not exist`. The file granted execute on a signature it had
itself dropped, because the owner's final trust review took `deal_room_invite()`
from five arguments to three. One broken grant line; all 21 declared functions
were audited programmatically and no other arity disagreed. That was **LB-005**,
now resolved.

**Applied 30 July 2026 at `05:59:43 UTC`**, cleanly and in one transaction, with
no ambiguous transport response. Recorded in `public.schema_migrations`, **ledger
44 to 45**, with the checksum below matching the repository file byte for byte —
verified both as raw bytes and as the utf8 string `db-query.mjs` hashes, which are
identical for this file.

| File | SHA-256 applied and recorded |
|---|---|
| `20260729b_deal_room_rls.sql` | `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153` |

The superseded value `64f4686091d4c7fed14c0223956164402bab9dc56cd2bdd52f67fdb8a52d75f7`
appears in the Gate C preflight and Approval 1 records, where it was correct at
the time; both point here. `20260729a`'s and `20260729c`'s checksums are
unaffected.

**Verified in production.** 23 `deal_room_*` functions, 21 of them SECURITY
DEFINER, every one carrying `search_path = public, pg_temp`. `deal_room_invite`
exists on `(uuid, text, timestamp with time zone)` and only that; the
five-argument form that took `p_role` and `p_class` does not exist. 14 policies,
exactly one per member-facing table, **every one SELECT, every one scoped to
`authenticated`** — zero INSERT, UPDATE or DELETE policies anywhere, and no policy
names `anon`. `deal_room_agreement_documents` carries no policy at all and is
revoked outright from both member roles: an anon-key read returns `401 / 42501
permission denied`. The `deal_room_activity_append_only` trigger fires `BEFORE
DELETE OR UPDATE`, so no role — including `service_role` — can rewrite history.

**One verification failed, and it is LB-008.** `anon` holds EXECUTE on all 23
`deal_room_*` functions. The file intends the opposite and says so at its grant
block: "`anon` is granted execute on nothing. The event logger is revoked from
everyone." The revoke it performs is
`revoke all on function public.deal_room_log_event(...) from public`, which
removes the PUBLIC grant — and PUBLIC's grant is indeed gone from that function's
ACL. But Supabase's `alter default privileges` grants EXECUTE **explicitly to
`anon`, `authenticated` and `service_role`** on every new function in `public`,
and revoking from PUBLIC does not touch an explicit role grant. So the ACL reads
`postgres=X | anon=X | authenticated=X | service_role=X`.

That matters most for `deal_room_log_event()`, because it is the one function in
the file with no authorisation check of its own — by design, since the other
commands call it on the member's behalf. Its only intended protection was the
grant. Proved through the public API rather than inferred from the catalogue: an
anon-key RPC call returned `409 / 23503`, a foreign-key violation naming the
`room_id` passed in, which means the function body **executed**. Nothing was
written, because `room_id` references `deal_rooms` and production has zero rooms.

**Production is fail-closed today and is not exposed.** The FK to `deal_rooms`
blocks every forged activity row while no room exists, member reads return zero
rows, the flag is unset and nothing is deployed. The exposure becomes real the
moment a room exists, which is Gate C Approval 3 or 4 — and because the activity
record is append-only, a forged row could never afterwards be removed by anyone.
**LB-008 must therefore be fixed before any Deal Room is created.** No fix was
applied here: none was authorised, and there is no live hole to contain.

This is the same defect class as the RLS gap recorded above: Supabase's default
privileges grant more than the migration expects, and a `revoke ... from public`
does not undo them.

### `20260729c_deal_room_storage.sql` — NOT applied, not attempted

Its three executable statements create the `deal-room-evidence` bucket and its
two `storage.objects` policies, which `GATE-C-TEST-PLAN.md` treats as Gate C
**Approval 2**. `deal-room-evidence` does not exist; `ponte-deal-docs` still holds
0 objects and 0 policies.

### Unchanged by all of this

The legacy Deal-era cluster, re-measured after `20260729b`: **4 tables** —
`deals`, `deal_documents`, `deal_events`, `deal_status_history` — RLS enabled on
all four, policies intact (3 on `deals`, 1 on each of the others), `deals` holding
0 rows. `is_deal_participant()` is unaltered; `20260729b` references it exactly
once, in a comment saying it is not touched.

The Approval 1 record of earlier the same day reported **8** tables for this
cluster. Re-measuring with `relname like 'deal%' and relname not like
'deal_room%'` returns 4, and a broader search including `%offer%` and
`%negotiation%` returns the same 4. The earlier figure cannot be reproduced and is
recorded here as unreconciled rather than restated. Nothing was dropped: the
migration contains no statement that could remove a table, and the Management API
ran it as one transaction that either committed whole or not at all.

`ponte-deal-docs`: 0 objects, 0 policies. `deal-room-evidence`: does not exist.
`listings`: 5 rows. `NEXT_PUBLIC_DEAL_ROOM` unset, allowlist unchanged, nothing
deployed, access wall untouched. The Deal Room is unreachable by any member.

### The original plan, for reference

Three files, additive throughout, idempotent, in this order:

- `supabase/migrations/20260729a_deal_room_core.sql` — 14 `deal_room_*` tables, their constraints, indexes and triggers, plus `deal_room_uuid_or_null()` and the append-only guard `deal_room_events_append_only()`.
- `supabase/migrations/20260729b_deal_room_rls.sql` — RLS on all 14, four SECURITY DEFINER helper predicates, **read-only policies for members**, and fifteen authorised command functions covering the whole loop.

  Rewritten on 29 July 2026 after the owner review of PR #98 closed five
  fail-open paths in the first draft: a `deal_rooms` INSERT policy that let any
  authenticated member open a room against another member's Deal with a snapshot
  of their choosing; a member-writable entitlement table; `deal_room_is_writable()`
  treating a missing entitlement row as permission; direct member DML that
  bypassed the commands and their atomic activity events; and a `selected`
  evidence visibility evaluated as ordinary sub-room visibility, so a label
  promising restriction delivered none. The file names and drops the earlier
  policies explicitly, so a database that received the first draft is corrected
  by running it rather than by being rebuilt.
- `supabase/migrations/20260729c_deal_room_storage.sql` — the private `deal-room-evidence` bucket and its two `storage.objects` policies.

**None has been executed anywhere.** There is no non-production database to run
them against (PL-002), and applying SQL to production is a separate explicit
owner decision. They have been read and reviewed, not run: treat their behaviour
as unproven until Gate C verification.

**Nothing existing is touched.** No existing table, column, constraint, index,
policy, function, trigger or bucket is altered in any of the three files. The
legacy Deal-era cluster — `deals`, `deal_documents`, `deal_events`,
`deal_status_history`, `messages`, `settlements`, `settlement_milestones`,
`settlement_events` and `is_deal_participant()` — is left exactly as it is, and
so is the orphan `ponte-deal-docs` bucket. `is_admin()` and `touch_updated_at()`
are reused, not redefined.
`lib/deal-room/__tests__/rls-contract.test.ts` asserts all of that on every run.

**Backfill: none.** All 14 tables begin empty and no existing row is read,
written or reclassified.

**Rollback.** The rollback of record is the feature flag: unset
`NEXT_PUBLIC_DEAL_ROOM` and redeploy, which removes the slice in one deploy
cycle with no database action. If the schema itself must be withdrawn, each file
carries its own reverse-order drop list. That is clean only while the tables are
empty: once a member has uploaded evidence, withdrawal becomes a retention
decision and an owner action, not a rollback step.

Authority: issue #97; ADR-0009 as accepted 29 July 2026;
`docs/codex/audits/2026-07-29-deal-room-preflight.md`;
`docs/plans/active/deal-room-launch-slice.md`.

## Known production-aligned changes

- Blocks A-F migrations dated `20260723a` through `20260723f` were reported applied to production and verified during the founding-launch work.
- Journey 1 added the desk-radar signal-import mapping and Ponte-managed Qualified Opportunity seed migrations dated `20260724a` and `20260724b`.
- PR #20 aligned the repository with two defects already corrected in production:
  - `desk_radar.canonical_signal_id` requires a full unique index to support `ON CONFLICT (canonical_signal_id)`.
  - the Journey seed must use the text verification enum `company_verified`, not integer `2`, and must check the profile-bind error.

- `20260726a_investigation_kind.sql` was applied to production by hand on 26 July 2026 with owner approval, using `scripts/db-query.mjs`, and probe-verified afterwards. It adds `request_kind` (not null, default `'investigate'`), `capability`, `contact_phone` and `contact_language` to `signal_investigations`, adds the `signal_investigations_kind_check` constraint, and replaces the `(signal_id, requester_id)` unique constraint with `(signal_id, requester_id, request_kind)`. Verified: the four columns exist with the stated nullability and default, both constraints are present in `pg_constraint`, the old two-part constraint is gone, and the single pre-existing row backfilled to `request_kind = 'investigate'`. It was applied by hand because the automatic chain aborts at its first file (see below), so a merge does not apply anything.

## APPLIED to production, 29 July 2026: automated listing publication

`20260728c_automated_listing_publication.sql` implements ADR-0013. It was
**applied to production on 29 July 2026 at 15:42:54 UTC** with explicit owner
authorisation, via `node scripts/db-query.mjs --file`, against project
`cptglsmjmzcfpjndqfmc`, and probe-verified immediately afterwards. Recorded in
`public.schema_migrations` with SHA-256
`745453c93b8d88614fe45dd2a75639c70760325a4e25ed64c2b06236aabf11c4`, matching the
file byte for byte. **Ledger 41 to 42.**

It is additive and idempotent throughout.

**Preflight, recorded before applying.** None of the eleven columns existed;
`listing_events` was absent; `listings` held 5 rows (approved 2, draft 1,
submitted 2), 4 of them carrying a quantity; `listings_status_check1` was absent,
so the defensive drop was a no-op; the three policy names the file replaces
existed under exactly those names, so no orphan or duplicate policy could
survive; `is_admin()`, `gen_random_uuid()` and `auth.users` were all present.

**Verified in production afterwards.** 11 columns present with the stated types,
all nullable except `quantity_extracted`, which is `NOT NULL DEFAULT false`; the
status CHECK carries all 13 values; the five new CHECK constraints are present;
no duplicate `listings_status_check1`; `listing_events` created with RLS
**enabled**; all five indexes present.

**Data effects, exactly as predicted.** Still 5 listings, still approved 2 /
draft 1 / submitted 2 — **nothing was published**. 4 rows backfilled to
`quantity_mode = 'exact'`, and the one row without a quantity left null. 2
lifecycle events seeded, one per already-approved listing, as
`listing_published / admin / legacy_desk_approval`. Zero orphan events.

**Security verified, not assumed.** Seven policies on `listings`, no duplicates.
No member policy permits writing `approved`, `flagged`, `suspended`,
`validating` or `needs_information`: the widened update policy allows only
`draft | submitted | withdrawn`, and the new withdrawal policy only
`approved -> approved | withdrawn`. **No anonymous SELECT policy exists on
`listings`**, so nothing was broadened for anonymous readers. `listing_events`
has SELECT-only policies and **no INSERT policy at all**, so a member cannot
forge a `listing_published` event.

**Functional probes, run inside a transaction that was rolled back so no test
row reached production.** The widened vocabulary accepts `validating`; an
invented status is refused; an inverted range 500-to-200 is refused; a valid
range 200-to-500 is accepted; a completeness score of 101 is refused; an
unrecognised `quantity_mode` is refused; a lifecycle event inserts; an
unrecognised `actor_type` is refused. Eight of eight. The rollback was confirmed
held afterwards: statuses unchanged, 2 events, no test rows, no `range` mode.

**Private-site gate confirmed intact** after the work: `https://ponte.trade/`
answers `401` with `WWW-Authenticate: Basic realm="Ponte Trade"`, and
`middleware.ts` is unchanged.


> **This gap has already cost members their submissions.** From the deployment of
> the automated-publication branch until 29 July 2026, `POST
> /api/marketplace/submit` sent `quantity_mode`, `quantity_min`, `quantity_max`,
> `quantity_extracted`, `quantity_confirmed_at` and (once the declaration was
> accepted) `declaration_accepted_at` and `declaration_version` on **every**
> write. None of them existed in production at the time. PostgREST refused the insert, the
> route's retry dropped only the family-terms and classification groups, and both
> Submit and Save draft answered 500 for every member and every family.
> `lib/listings/write-fallback.ts` drops whatever column the database actually
> names, so a submission stores instead of failing. **That bridge is now dormant
> for these seven columns:** this file was applied on 29 July 2026, so an
> accepted declaration IS recordable and the validator CAN write `validating`,
> `needs_information` and `flagged`. The fallback remains in place for any
> future unapplied column.

What it changes on `listings`: widens the status check constraint to add
`validating`, `needs_information`, `flagged` and `suspended` (every state
already in use is preserved, and `approved` remains the stored value for a
public listing, so no index, RLS policy or public read path changes meaning);
adds `quantity_mode`, `quantity_min`, `quantity_max` with range-ordering and
positivity constraints; adds `quantity_extracted`, `quantity_confirmed_at`,
`declaration_accepted_at`, `declaration_version`, `safety_flags`, `flag_reason`,
`flag_severity` and `completeness_score`; adds three partial indexes.

New table: `listing_events` — the lifecycle audit trail, RLS-enabled, readable
by the listing owner and by admins, and **written only under the service role**
so a member cannot forge a publication event.

RLS restated on `listings`: the member insert and update policies are rewritten
to cover the new states explicitly, and a separate withdraw-own-live-listing
policy is added. A member still cannot write `approved`, `flagged`,
`suspended`, `validating` or `needs_information`, and cannot clear
`safety_flags`.

**It publishes nothing.** There is no bulk UPDATE moving `submitted` rows to
`approved`. Publication needs the submitter's live verification state, adjacent
media/document counts and the safety pass, none of which SQL can evaluate, so
legacy rows stay in `submitted` and re-validate through the application when
next touched. It does backfill one `listing_published` event per already-public
listing with `actor_type = 'admin'`, so the audit trail does not begin with a
gap and does not misattribute historic desk approvals to the validator.

Note the pre-existing duplicate-constraint hazard recorded under
`20260722c_listings_v4.sql`: a stale `listings_status_check1` once coexisted
with the visible constraint and silently rejected permitted values. This
migration drops both names before adding its own.
## Applied to production by hand

- `20260728d_verification_level_canonical.sql` was applied to production on 28
  July 2026 at **17:04:50 UTC** with explicit owner authorisation, via
  `node scripts/db-query.mjs --file`, and verified immediately afterwards.
  Recorded in `schema_migrations` with SHA-256
  `262e96b7...714a9930`, matching the file byte for byte. Ledger 40 to 41.

  **It resolved a Launch Blocker.** Production carried a five-value CHECK
  constraint on `profiles.verification_level`. The verification pipeline wrote
  the integer `2`, which coerced to `'2'` and was refused by that constraint
  with SQLSTATE 23514, and the update result was never checked, so the write
  failed **silently every time**. No member could reach `company_verified`
  through the intended pipeline; the only profile holding it was seed-written.

  Changes: one row backfilled from `NULL` to `'unverified'`; the five-value
  constraint replaced with `unverified | identity_verified | company_verified`
  (safe as a narrowing, zero rows held a retired value); the `'unverified'`
  default restated; the column set `NOT NULL`. `set lock_timeout = '5s'` inside
  the transaction so contention fails fast rather than blocking every write to
  `profiles`.

  **Verified in production:** `unverified` 8, `company_verified` 1, zero nulls,
  zero invalid values, `is_nullable = NO`, the three-value constraint present,
  and `verifications` unchanged at review 4, rejected 2, pending 2, verified 1.
  The migration never references `verifications`.



- `20260728a_market_classification.sql` was applied to production on 28 July
  2026 at 13:25:11 UTC with explicit owner authorisation, using
  `node scripts/db-query.mjs --file ...` against project
  `cptglsmjmzcfpjndqfmc` ("Ponte Trade", eu-west-1, ACTIVE_HEALTHY), and
  verified directly against production afterwards. Recorded in
  `schema_migrations` with SHA-256 `8e9d0e72...c661aa5f`, which matches the
  file byte for byte.

  It adds **17 nullable columns, 5 CHECK constraints and 9 indexes**: 11 columns,
  3 constraints and 6 indexes on `listings`; 6 columns, 2 constraints and 3
  indexes on `desk_radar`. Additive throughout; nothing was renamed, dropped or
  rewritten, every existing row stays readable and the legacy `listings.type`
  mapping is untouched. The rollback is written out in the file itself.

  **Verified in production:** all 17 columns present and nullable with the
  stated types; all 5 family-coherence constraints present, plus the 5
  column-level CHECKs, so no statement applied partially; all 9 indexes present;
  the board still reads (3,491 eligible signals at
  `https://ponte.trade/market-signals`); the three write paths accept their
  structured fields, proved inside a transaction that was rolled back so no test
  row reached production; and a category filter now returns `nothing_classified`
  rather than `columns_absent`, printing "3,491 signals are live on the board,
  and none of them carries a category".

  **The three-valued-logic fix is confirmed live.** An insert carrying
  `service_category_key` with a null `market_family` is refused by
  `listings_service_family_coherent` with SQLSTATE 23514. Evaluated in
  production Postgres, the predicate returns `false` rather than `null` for
  every row that must be refused, which is the whole point of the explicit
  `market_family is not null and market_family = '...'` form: a CHECK accepts
  TRUE **and NULL**, so the shorter `false or null` version passed the row it
  existed to refuse.

  **Nothing is backfilled, deliberately.** No existing listing or signal carries
  a canonical category. `listings` holds 5 rows, 0 classified; `desk_radar`
  holds 6,735 rows, 0 classified. Applying the SQL created columns and
  classified nothing, so every category filter reports `nothing_classified`
  until something classifies the inventory. Writing a guess into these columns
  would invent a finding.

  It was applied by hand because the automatic chain aborts at its first file
  (see below), so a merge does not apply anything.

## The migration ledger was publicly readable and writable, and is now closed

> **CLOSED — RESOLVED, 28 July 2026.** Repaired by
> [PR #76](https://github.com/Geppix140269/ponte/pull/76)
> (`20260728b_schema_migrations_rls.sql`), applied to production at
> **14:07:35 UTC** and recorded in the ledger it protects.
>
> Independently re-verified on 28 July 2026 for the migration reconciliation
> ([PR #82](https://github.com/Geppix140269/ponte/pull/82), §6.4):
>
> | Check | Before | After |
> |---|---|---|
> | anon `GET /rest/v1/schema_migrations` | `200` with real rows | **`401`, SQLSTATE `42501`** |
> | `pg_class.relrowsecurity` | `false` | **`true`** |
> | `anon` / `authenticated` privileges | all seven each | **none** |
> | `postgres` / `service_role` privileges | all seven | **all seven, unchanged** |
> | Ledger readable by `scripts/db-query.mjs` | yes | **yes, 40 rows** |
>
> Both write paths are unaffected, which was the condition for closing this:
> `postgres` owns the table and an owner bypasses RLS unless FORCE is set, which
> the migration deliberately does not set, and `service_role` has
> `rolbypassrls`. No application code reads or writes this table.
>
> **No further action.** The narrative below is retained as the record of what
> was wrong and why. There was no GitHub issue for this item; it was tracked in
> this file and in the audit report, and is closed here.

`public.schema_migrations` had row level security **disabled**, and `anon` and
`authenticated` each held all seven table privileges: SELECT, INSERT, UPDATE,
DELETE, TRUNCATE, REFERENCES and TRIGGER. The anon key is shipped to every
browser, so anyone at all could read the migration history, forge a row into it,
rewrite one, or empty the table.

Confirmed live over the public internet on 28 July 2026, using nothing but the
publishable key: `GET /rest/v1/schema_migrations` returned `HTTP 200` with real
rows. That is the part that matters most. This table is the only record of what
has been applied to production, so a table anybody can write is not evidence,
and every audit that read it was reading something unauthenticated callers could
have edited.

**The cause was not a mistake in any migration.** The table is created by
`scripts/db-query.mjs` and `scripts/apply-migration.mjs` with a plain
`create table if not exists`, and Supabase's default privileges grant every new
table in `public` to `anon` and `authenticated`. Every table this project
declares deliberately is protected; this one was created by tooling, in passing,
and so never was. It stood that way from its first row until the repair.

**Repaired by `20260728b_schema_migrations_rls.sql`**, applied to production on
28 July 2026 with owner authorisation via `scripts/db-query.mjs`. It enables RLS
with no policy, revokes all privileges from `anon` and `authenticated`, and
states the `service_role` grant explicitly. Both scripts now re-assert the same
three statements on every run, so a ledger created fresh in another project is
protected from its first row.

**Verified afterwards, from outside:** with the anon key, SELECT, INSERT, UPDATE
and DELETE all return `HTTP 401` with SQLSTATE `42501`. The control in the same
run, `desk_radar`, still returns `HTTP 200` with `[]`, so the denial is specific
to this table and not a bad key or a bad URL. Server side: `relrowsecurity` is
true, zero policies (deny-all, matching the eleven other tables held that way),
and the only grantees left are `postgres` and `service_role`. Both write paths
are unaffected: `postgres` owns the table and an owner bypasses RLS unless FORCE
is set, which this migration does not set, and `service_role` has `rolbypassrls`.
No application code reads or writes this table. Running the file a second time
changes nothing.

**Nothing else was touched.** No row was edited, no other table's grants were
changed, and no credential was rotated.

## `scripts/apply-migration.mjs` cannot connect

The `DATABASE_URL` in `.env.local` fails authentication against
`aws-0-eu-west-1.pooler.supabase.com` as `postgres.cptglsmjmzcfpjndqfmc`:
`FATAL 28P01, password authentication failed`. It fails at `client.connect()`,
before any SQL runs, so `--list` and every apply through that script are dead.

This is why migrations are applied with `scripts/db-query.mjs`, which goes
through the Management API and works. Recorded rather than fixed, because the
repair is a credential and credentials are an owner action.

## The CI Supabase Preview integration points at a project this account cannot see

Found on 28 July 2026 while establishing which project to apply
`20260728a_market_classification.sql` to, and worth recording because it has
been silently wrong for a long time.

- The **production** project is `cptglsmjmzcfpjndqfmc` ("Ponte Trade",
  eu-west-1, ACTIVE_HEALTHY). It is what `.env.local` configures, what the
  deployed site reads, and what the 26 July probe measured.
- The GitHub **"Supabase Preview"** check on every pull request links to
  `https://supabase.com/dashboard/project/kltuzbxnldtmdfhakphv`.
- `kltuzbxnldtmdfhakphv` **is not in this Supabase account at all.** Listing the
  projects the owner's access token can reach returns four, and that reference
  is not among them.

So the check is not a broken preview of production; it is a link to a project
that either belongs to a different account or no longer exists. That is the
better explanation for why it has failed on every run, and it means the failure
was never evidence about the migration chain.

**Two red checks on every PR, with different causes.** `Supabase Preview` is
this misconfiguration. `import-package` is the retired Bridge fetch workflow.
Neither has ever passed, and neither says anything about the change under
review. A check that always fails teaches people to ignore red, which is how a
real failure gets missed.

Nothing here has been changed. Repairing the integration touches repository
settings and possibly a Supabase project, and both are owner decisions.

### Update, 30 July 2026: it fails on exactly the PRs that add a migration

Observed while opening PR #117. The check is no longer red on every PR — it is
**`SKIPPED` on a PR that adds no migration file and `FAILURE` on one that does**:

| PR | Adds a migration | Supabase Preview |
|---|---|---|
| #113 | no, records only | `SKIPPED` |
| #116 | no | `SKIPPED` |
| #107 | yes, `20260730a` | **`FAILURE`** — and it was merged anyway |
| #117 | yes, `20260730b` | **`FAILURE`** |

So a red `Supabase Preview` on a migration PR is **the integration, not the SQL**.
PR #107 is the control: same failure, same cause, merged on the owner's decision
without incident.

The project reference has also moved. This section recorded
`kltuzbxnldtmdfhakphv`; the check on PR #117 links to
**`pyplitspfeeqwzdimltf`**. Neither is production (`cptglsmjmzcfpjndqfmc`) and
neither is reachable by the owner's access token, so the conclusion above is
unchanged and now has a second unreachable reference behind it.

**This is worse than a check that always fails, not better.** A check that is red
on every PR is obviously noise. One that is green or skipped most of the time and
red precisely when a migration is proposed looks exactly like a migration gate,
and it is not one — it says nothing about whether the SQL is correct. The next
person to open a migration PR will either be alarmed by it or, worse, reassured by
the ones it skips. Repairing or removing it remains an owner decision and is not
touched here.

## APPLIED to production, 29 July 2026: family commercial terms

`supabase/migrations/20260728e_family_commercial_terms.sql` (ADR-0014, accepted
by the owner on 29 July 2026).

**Applied to production on 29 July 2026 at 15:44:45 UTC** with explicit owner
authorisation, via `node scripts/db-query.mjs --file`, against project
`cptglsmjmzcfpjndqfmc`, immediately after `20260728c` had been fully verified.
Recorded in `public.schema_migrations` with SHA-256
`4224fa274291f074d1ef0c948c52ba9afbeaa5378111b4686c05cebde9f18fa8`, matching the
file byte for byte. **Ledger 42 to 43.**

Applied second because it depends on `20260728c`: its
`listings_product_fields_family` constraint references `quantity_min` and
`quantity_max`, which that file creates.

Renamed from `20260728d_` on 29 July 2026 (issue #97, PL-004). It shared the
identifier `20260728d` with `20260728d_verification_level_canonical.sql`, which
was already applied to production and recorded in the ledger under that exact
name with its SHA-256, so the applied file kept its identity and the then-unapplied
one moved. The SQL is unchanged by the rename.

**Verified in production.** `service_terms` and `distribution_terms` present,
both `jsonb` and both nullable; `listings_service_terms_family` and
`listings_distribution_terms_family` present and **valid**;
`listings_product_fields_family` present and **NOT VALID**, which is exactly
what the file deploys.

**Data effects: none.** Still 5 listings, still approved 2 / draft 1 /
submitted 2, zero rows carrying either terms column. Nothing was backfilled and
nothing could be: no record carries a canonical family yet.

**Functional probes, rolled back.** A services record written the way the
composer writes one, with product fields cleared, accepts `service_terms`; a
services record that keeps a quantity is refused; a distribution record accepts
`distribution_terms`; service terms on a distribution record are refused;
distribution terms on a products record are refused; a legacy row with a null
`market_family` is still allowed to hold terms, so nothing created before the
family entrances became invalid.

**`listings_product_fields_family` is still NOT VALID, deliberately.** Zero
existing rows would violate it, surveyed directly. Validating it is a separate
owner decision and was not taken, because the migration deploys the constraint
`NOT VALID` and validating it would make the deployed object differ from the
file. When the owner wants it enforced against existing rows:

```sql
alter table listings validate constraint listings_product_fields_family;
```

### This file is now immutable, and its own header is stale

The bytes of this migration are what production ran, and the SHA-256 above is
the proof. Two consequences follow, and both are deliberate:

- **The `NOT APPLIED` comment inside the SQL file is now historically wrong and
  is left exactly as it is.** Correcting it would change the file's bytes and
  break the match with `schema_migrations`. What is applied is recorded here,
  not in the migration's own header.
- **A seven-line comment block describing the rename, added to this file on
  `main` by the Deal Room branch, was removed** to restore the applied bytes.
  Its content is preserved in the paragraph above instead. Nothing inside the
  SQL statements changed; the block was comment text only.

An operator instruction issued before 29 July may still name the old
`20260728d_family_commercial_terms.sql`. It is the same SQL, and the current
filename is the one above.

Adds two nullable jsonb columns to `listings`, `service_terms` and
`distribution_terms`, plus three CHECK constraints stating the cross-family
rule: service terms only on a services record, distribution terms only on a
distribution record, and no quantity, unit, Incoterm or HS code on a
non-products record. The last is added `not valid` so applying it cannot fail
on a historical row; validate it separately after inspecting whatever it
reports.

Depends on `20260728a_market_classification.sql`, which is already applied in
production (28 July 2026) and supplies `market_family`.

Nothing existing is renamed, dropped or rewritten. Every existing row stays as
it is. No RLS policy is added, removed or altered: both columns are new columns
on an existing table and inherit the policies `listings` already has.

The application does not require it. The submit route retries the write without
these columns when they are absent, exactly as it already does for the
classification columns, and the terms also reach the record through the
synthesised `details`. The branch is therefore safe to deploy before this is
run.

Rollback is documented in the file itself, including the backup query to take
first if any non-product record has been created since it was applied.
## APPLIED to production, 29 July 2026 (duplicate section)

`20260728c_automated_listing_publication.sql` implements ADR-0013. **It was
applied on 29 July 2026 at 15:42:54 UTC**; the timestamp, hash, ledger
transition and every probe are recorded in the section of the same name above,
which is the authoritative one. This heading is a duplicate that predates the
application and is corrected rather than deleted, so a reader arriving at either
copy is told the same true thing.

What it changes on `listings`: widens the status check constraint to add
`validating`, `needs_information`, `flagged` and `suspended` (every state
already in use is preserved, and `approved` remains the stored value for a
public listing, so no index, RLS policy or public read path changes meaning);
adds `quantity_mode`, `quantity_min`, `quantity_max` with range-ordering and
positivity constraints; adds `quantity_extracted`, `quantity_confirmed_at`,
`declaration_accepted_at`, `declaration_version`, `safety_flags`, `flag_reason`,
`flag_severity` and `completeness_score`; adds three partial indexes.

New table: `listing_events` — the lifecycle audit trail, RLS-enabled, readable
by the listing owner and by admins, and **written only under the service role**
so a member cannot forge a publication event.

RLS restated on `listings`: the member insert and update policies are rewritten
to cover the new states explicitly, and a separate withdraw-own-live-listing
policy is added. A member still cannot write `approved`, `flagged`,
`suspended`, `validating` or `needs_information`, and cannot clear
`safety_flags`.

**It publishes nothing.** There is no bulk UPDATE moving `submitted` rows to
`approved`. Publication needs the submitter's live verification state, adjacent
media/document counts and the safety pass, none of which SQL can evaluate, so
legacy rows stay in `submitted` and re-validate through the application when
next touched. It does backfill one `listing_published` event per already-public
listing with `actor_type = 'admin'`, so the audit trail does not begin with a
gap and does not misattribute historic desk approvals to the validator.

Note the pre-existing duplicate-constraint hazard recorded under
`20260722c_listings_v4.sql`: a stale `listings_status_check1` once coexisted
with the visible constraint and silently rejected permitted values. This
migration drops both names before adding its own.
## Known risk

The historical numbered migration chain is not a reliable proof that a fresh Supabase preview recreates production. A Supabase Preview failure has been treated as pre-existing. Do not repair, squash, rename or replay migrations without a dedicated migration-reconciliation plan and explicit approval.

The failure was diagnosed on 26 July 2026 and the required plan now exists at `docs/plans/active/migration-chain-reconciliation.md`. It is a plan, not an approval, and nothing in it has been executed. Two findings belong here because they change what the repair is:

- The chain aborts on its first file, `01_catalogue_fields.sql`, with `relation "products" does not exist`. Seven shop-era files depend on tables the July 2026 shop removal dropped.
- Removing those seven does not fix it. `02_ponte_previews_bucket.sql` calls `is_admin()`, which only `supabase/schema.sql` creates, and the integration does not run `schema.sql`. The base schema is not in the chain at all.

Until the chain is reconciled, **a merge to `main` applies nothing**: every new migration must be applied by hand, with owner approval, and recorded above.

## Required pre-migration report

Before any new schema change, record:

1. target user outcome;
2. current production tables, columns, constraints, indexes, functions, triggers and RLS relevant to the change;
3. matching repository migrations;
4. any drift or manual SQL;
5. forward migration;
6. rollback or safe-disable path;
7. data backfill and idempotency;
8. privacy and disclosure effects;
9. tests and production verification steps.

## Prohibited automatic actions

Codex must not, without explicit approval:

- apply SQL to production;
- use a Supabase service-role key against production;
- disable RLS;
- broaden anonymous reads;
- rewrite migration history;
- delete production data;
- infer production state solely from migration filenames.
