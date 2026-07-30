# Deal Room Gate C production preflight

**Run:** 29 July 2026, against production project `cptglsmjmzcfpjndqfmc`
**Repository state:** `main` at `d184c1c`
**Method:** read-only `select` through `scripts/db-query.mjs`. **No SQL was
applied, no object created, no policy changed, no flag set, nothing deployed.**
**Outcome:** two findings, both now settled. LB-004 is fixed on this branch; the
production-record discrepancy is reconciled by PR #106, merged.

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
| `20260729b_deal_room_rls.sql` | ~~`64f4686091d4c7fed14c0223956164402bab9dc56cd2bdd52f67fdb8a52d75f7`~~ **superseded - see below** |
| `20260729c_deal_room_storage.sql` | `94629e5dec518439687f0ecf0583aaed15caed0f0839e87bf42c941c7fe29972` |

**`20260729b` has been corrected since this preflight ran, and its checksum has
changed.** Gate C Approval 1 applied `20260729a` and then Postgres refused `b`
outright: it granted execute on `deal_room_invite(uuid, text, text, text,
timestamptz)`, a signature the same file drops. That is **LB-005**, and the
correction is one line - the grant now names `(uuid, text, timestamptz)`, which
is what the file declares.

The value above is left visible because it was correct on 29 July and the
Approval 1 record verified against it. **The value Gate C must apply and record
from now on is:**

| File | SHA-256 |
|---|---|
| `20260729b_deal_room_rls.sql` | `b379f869f320e6ea36bdb00e07555079adf6373ff14848d20633afb6cfea3153` |

Nothing else in the file changed: the diff is one line, one insertion, one
deletion. `20260729a`'s and `20260729c`'s checksums are unaffected.

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
The owner classified **LB-004 a Launch Blocker on 29 July 2026** and authorised
the correction on this branch. It is fixed: the select list is now the exported
constant `VERIFICATION_EVIDENCE_COLUMNS` in `lib/deal-room/integrity.ts`, naming
`purpose`, and the `kind:` mapping reads `row.purpose`.

The constant exists so that a test can reach the defect at all.
`integrity.test.ts` checks that every column it names appears in
`VERIFICATIONS_COLUMNS` - the production table exactly as section 1 observed it -
that it asks for `purpose` and never `type`, and that the surface selects through
the constant rather than a literal of its own. Reintroducing `type` fails two of
those assertions, which was confirmed by doing it rather than assumed. Nothing
else about verification was touched.

## 3. Finding B — settled by PR #106

The preflight observed that `20260728e_family_commercial_terms.sql` was recorded
as applied at 15:44:45 UTC on 29 July 2026 while five repository records said it
was unapplied, and that the ledger checksum did not match `main`'s copy of the
file. It stopped short of correcting those records, because stating that an
application was authorised is not an agent's inference to make.

**PR #106 made that statement and merged.** It records that both
`20260728c_automated_listing_publication.sql` (15:42:54 UTC, ledger 41 to 42) and
`20260728e_family_commercial_terms.sql` (15:44:45 UTC, ledger 42 to 43) were
applied to production **with explicit owner authorisation**, through
`node scripts/db-query.mjs --file` against `cptglsmjmzcfpjndqfmc`, with the
preflight state, the post-application probes, the security-policy verification
and the rolled-back functional tests all recorded in `DATABASE-STATE.md`.

It also removed the divergence rather than documenting it. `main`'s copy of
`20260728e` had gained a seven-line comment block about its rename **after** the
file was applied; comment or not, that changed its SHA-256. PR #106 restored the
applied bytes and preserved the block's content in `DATABASE-STATE.md` instead.
`main` now hashes to
`4224fa274291f074d1ef0c948c52ba9afbeaa5378111b4686c05cebde9f18fa8`, identical to
the live ledger row, which I re-verified after merging.

So the invariant §4.8 asserts holds for every row that carries a digest, and the
Deal Room migrations can be checked against it without ambiguity. **This
preflight raises no ticket for it**, per the owner decision: the discrepancy is
resolved, not deferred. One row still carries no digest at all, which is
section 5.

## 4. Finding C — no existing Deal can enter a Deal Room

All 5 production listings carry `market_family = null`, including both approved
ones. `deal_room_propose()` requires a family and refuses without one: *"This
Deal carries no market family, so no procedure applies."*

Nothing is broken. The composer has set `market_family` since ADR-0011, and
these five predate it — the newest is 28 July. But it means **Gate C cannot be
validated against existing production data.** The allowlisted pilot must publish
a fresh Deal through the composer first, and the propose surface will show an
empty eligible list until somebody does.

**Owner decision, 29 July 2026:** this is not a Launch Blocker, and the five
legacy listings must **not** be backfilled to manufacture a test. Gate C
validation will publish one fresh, family-classified pilot Deal through the
current journey and use that Deal for the protected-room test.

## 5. Pre-existing ledger note

`20260722b_hs_codes.sql` carries the literal string `applied-via-management-api`
in its `sha256` column instead of a digest. One row of 43, predating all of this
work. Every other row carries a real hash and, after PR #106, every one of those
matches its file byte for byte - so this is the single exception to §4.8, and an
audit finding it without context could read it as a fresh mismatch.

Indexed as **PL-015** and deliberately not repaired here, per the owner decision:
it is not a Deal Room blocker.

## 6. What Gate C should do next

Both preflight findings are settled. LB-004 is fixed and proved on this branch;
the production record is reconciled by PR #106.

The first Gate C approval is therefore the next thing to happen, and it has not
been given: **apply `20260729a`, `b` and `c` in order**, each recorded in
`public.schema_migrations` with the SHA-256 in section 1. Steps 2 and 3 - the
`deal-room-evidence` bucket with its two policies, then
`npm run deal-room:negative-access` - remain separate approvals after it, and the
flag is set only on a clean pass of that fixture.

The pilot Deal of section 4 must be published before the fixture can exercise a
real room, since no existing listing can enter one.

The feature flag stays unset, the access wall stays in place, and nothing is
deployed until each approval has been given.
