# Deal Room Gate C production preflight

**Run:** 29 July 2026, against production project `cptglsmjmzcfpjndqfmc`
**Repository state:** `main` at `d184c1c`
**Method:** read-only `select` through `scripts/db-query.mjs`. **No SQL was
applied, no object created, no policy changed, no flag set, nothing deployed.**
**Outcome:** two findings must be settled before the migrations are applied.

Gate C's four approvals are unchanged and none has been taken: apply the three
migrations; create the bucket and its two policies; run
`npm run deal-room:negative-access`; only on a clean pass, set the flag and
deploy. This document is the evidence for the first of those decisions.

---

## 1. The database is ready to receive the migrations

Everything the three files assume is present, and nothing they create already
exists.

| Check | Expected | Found |
|---|---|---|
| `deal_room_*` tables | 0 | **0** |
| `deal_room_*` functions | 0 | **0** |
| `deal_room_*` policies, types, indexes, triggers | 0 | **0** |
| `deal_room_uuid_or_null` name collision | none | **none** |
| `deal-room-evidence` bucket | absent | **absent** (6 buckets, none named it) |
| `20260729a/b/c` in `schema_migrations` | not recorded | **not recorded** |
| `profiles` columns the commands read | 5 of 5 | **5 of 5** |
| `organizations` columns | 4 of 4 | **4 of 4** |
| `listings` columns | 17 of 17 | **17 of 17** |
| `profiles.organization_id → organizations.id` FK | present | **present** (needed by the PostgREST embed on the invitation surface) |
| `gen_random_uuid()` | resolvable | **`pg_catalog`**, so the pinned `search_path = public, pg_temp` still resolves it |
| Public tables | — | 53 |

The legacy Deal-era cluster is untouched and still empty: `deals`,
`deal_documents`, `deal_events`, `deal_status_history`, `messages`,
`settlements`, `settlement_milestones`, `settlement_events` all hold **0 rows**,
and `is_deal_participant()` is unaltered. `ponte-deal-docs` still has 0 objects
and 0 policies (PL-006); `verification-docs` still has 0 policies (PL-007).

Checksums of the three files as they stand at `d184c1c`, to be recorded in
`public.schema_migrations` at the moment each is applied:

| File | SHA-256 |
|---|---|
| `20260729a_deal_room_core.sql` | `24932e4a429eb4ea7b19f2a7c5423101c1bbc61a628be941f546412258a78c8a` |
| `20260729b_deal_room_rls.sql` | `64f4686091d4c7fed14c0223956164402bab9dc56cd2bdd52f67fdb8a52d75f7` |
| `20260729c_deal_room_storage.sql` | `94629e5dec518439687f0ecf0583aaed15caed0f0839e87bf42c941c7fe29972` |

## 2. Finding A — the Integrity pre-flight reads a column production does not have

**`app/[locale]/deal-rooms/[roomId]/invitation/page.tsx:71` selects `type` from
`verifications`. There is no `type` column.** The table has 24 columns; the one
every other reader in the codebase uses for this purpose is `purpose`
(`admin/listings/actions.ts`, `marketplace/actions.ts`,
`marketplace/l/[ref]/page.tsx`, `opportunities/page.tsx` all select `purpose`).

PostgREST refuses an unknown column, so `evidenceRows` is null, `rows` is `[]`,
and **"What Ponte has checked" renders "Nothing has been checked against an
external source" for every member, including a fully verified one.**

This is the same defect class as the one the first owner review caught in this
file: that query filtered on a `profile_id` that does not exist on
`verifications`. The filter was corrected to `user_id`; the select list was not
re-checked against production. A local test cannot catch either, because there
is no non-production database to run against (PL-002).

**It is not a fail-open.** The band under-reports rather than over-reports, and
the sanctions gate is unaffected: it lives in `deal_room_invite()`, which reads
`sanctions_hits`, `rescreened_at`, `created_at` and `user_id` directly, all of
which exist. Nothing is admitted that should not be.

**But it makes a named acceptance criterion of #97 inert on first activation.**
The fix is one word, `type` → `purpose`, plus the `kind:` mapping beside it. It
is a code change, not SQL, so it does not touch the approvals this gate is
about. Recorded as **LB-004** with classification requested, because the owner,
not the agent, decides whether an inert Integrity band blocks activation.

## 3. Finding B — a migration was applied to production with no repository record

`20260728e_family_commercial_terms.sql` is recorded in `public.schema_migrations`
as **applied at 15:44:45 UTC on 29 July 2026**. `listings.service_terms` and
`listings.distribution_terms` exist, and the constraints landed exactly as the
file specifies: `listings_service_terms_family` and
`listings_distribution_terms_family` validated, `listings_product_fields_family`
`NOT VALID` as designed. **0 existing rows would violate it**, so the owner can
validate it separately whenever convenient.

The application itself is sound. Two things about it are not.

**The repository says the opposite, in five places.** `DATABASE-STATE.md`
carries it under a heading reading "Written and NOT applied"; `CURRENT-STATE.md`
row 74, ADR-0014's Status of implementation, the PR #100 description and three
`OPERATIONS_LOG.md` entries all state it is unapplied. I wrote several of those
sentences earlier today, and they were true when written.

**The ledger checksum does not match the file on `main`.** The ledger holds
`4224fa274291…`; `main`'s file hashes to `226faa772430…`. I traced it: the
applied bytes are the copy on branch `claude/family-procedure-followup-clean`
(commit `4563683`), which renamed `20260728d_` → `20260728e_` independently of
the rename that reached `main` through PR #98 (`228b532`). **The difference is
entirely comments** — one hunk, seven added comment lines, zero non-comment
changes, verified by diff. The executed SQL is byte-identical in substance.

This matters here because `GATE-C-TEST-PLAN.md` §4.8 requires every applied file
to be recorded "with a SHA-256 matching the file byte for byte". That invariant
is false on `main` today, for a reason unrelated to the Deal Room, and the same
check will be run against the Deal Room migrations in a few minutes' time. It
should be settled first so a real mismatch is never mistaken for this one.

I have **not** corrected the five records, and that is deliberate rather than
cautious. Writing "applied on 29 July 2026" into `DATABASE-STATE.md` asserts
that the application was authorised, and by whom. I do not know who ran it or
under what approval; per `AGENTS.md` that is the owner's statement to make, not
mine to infer. Recorded as **PL-014** with the correction drafted and unapplied.

## 4. Finding C — no existing Deal can enter a Deal Room

All 5 production listings carry `market_family = null`, including both approved
ones. `deal_room_propose()` requires a family and refuses without one: *"This
Deal carries no market family, so no procedure applies."*

Nothing is broken. The composer has set `market_family` since ADR-0011, and
these five predate it — the newest is 28 July. But it means **Gate C cannot be
validated against existing production data.** The allowlisted pilot must publish
a fresh Deal through the composer first, and the propose surface will show an
empty eligible list until somebody does.

This is stated so the first activation is not read as a failure.

## 5. Pre-existing ledger note

`20260722b_hs_codes.sql` carries the literal string `applied-via-management-api`
in its `sha256` column instead of a digest. One row of 43, predating all of this
work, and outside Gate C's scope. Noted so that a future audit of §4.8 does not
treat it as new.

## 6. What Gate C should do next

1. **Owner decides LB-004** — fix `type` → `purpose` before activation, or
   accept an inert Integrity band for the pilot.
2. **Owner states the authorisation for `20260728e`** so PL-014's record
   correction can be written truthfully, and decides whether the ledger row is
   re-recorded against `main`'s checksum or the comment difference is documented
   in place.
3. **Then, and only then, the first Gate C approval:** apply `20260729a`, `b`,
   `c` in order, each recorded in `public.schema_migrations` with the SHA-256
   above.

Steps 2 and 3 of Gate C — the bucket and its policies, then
`npm run deal-room:negative-access` — are unchanged and remain separate
approvals. The feature flag stays unset, the access wall stays in place, and
nothing is deployed.
