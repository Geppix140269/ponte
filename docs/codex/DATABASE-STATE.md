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
`schema_migrations` with SHA-256
`745453c9...aabf11c4`, matching the file byte for byte. Ledger 41 to 42.

It is additive and idempotent throughout.

**Preflight, recorded before applying:** none of the eleven columns existed,
`listing_events` was absent, `listings` held 5 rows (approved 2, draft 1,
submitted 2), 4 of them carried a quantity, `listings_status_check1` was absent
so the defensive drop was a no-op, and the three policy names the file replaces
existed under exactly those names, so no orphan or duplicate policy could
survive. `is_admin()`, `gen_random_uuid()` and `auth.users` were all present.

**Verified in production afterwards:** 11 columns present with the stated types,
all nullable except `quantity_extracted` which is `NOT NULL DEFAULT false`; the
status CHECK now carries all 13 values; the five new CHECK constraints present;
no duplicate `listings_status_check1`; `listing_events` created with RLS
**enabled**; all five indexes present.

**Data effects, exactly as predicted:** still 5 listings, still approved 2 /
draft 1 / submitted 2 — **nothing was published**; 4 rows backfilled to
`quantity_mode = 'exact'` and the one row without a quantity left null; 2
lifecycle events seeded, one per already-approved listing, as
`listing_published / admin / legacy_desk_approval`; zero orphan events.

**Security verified.** Seven policies on `listings`, no duplicates. No member
policy permits writing `approved`, `flagged`, `suspended`, `validating` or
`needs_information`: the widened update policy allows only
`draft | submitted | withdrawn`, and the new withdrawal policy allows only
`approved -> approved | withdrawn`. **No anonymous SELECT policy exists on
`listings`**, so nothing was broadened for anonymous readers. `listing_events`
has SELECT-only policies and **no INSERT policy at all**, so a member cannot
forge a `listing_published` event.

**Functional probes, run inside a transaction that was rolled back so no test
row reached production:** the widened vocabulary accepts `validating`; an
invented status is refused; an inverted range 500-to-200 is refused; a valid
range 200-to-500 is accepted; a completeness score of 101 is refused; an
unrecognised `quantity_mode` is refused; a lifecycle event inserts; an
unrecognised `actor_type` is refused. Eight of eight. The rollback was confirmed
held afterwards: statuses unchanged, 2 events, no test rows, no `range` mode.

> **This gap cost members their submissions, and is now closed.** From the
> deployment of the automated-publication branch until 29 July 2026, `POST
> /api/marketplace/submit` sent `quantity_mode`, `quantity_min`, `quantity_max`,
> `quantity_extracted`, `quantity_confirmed_at` and (once the declaration was
> accepted) `declaration_accepted_at` and `declaration_version` on **every**
> write, and none of them existed in production. PostgREST refused the insert,
> the route's retry dropped only the family-terms and classification groups, and
> both Submit and Save draft answered 500 for every member and every family.
>
> Two things fixed it, in this order. `lib/listings/write-fallback.ts` drops
> whatever column the database actually names, so a submission stores instead of
> failing — a bridge, and it still stands for any future unapplied column. Then
> this file was applied on 29 July 2026, so the columns now exist: an accepted
> declaration IS recordable, and the validator CAN write `validating`,
> `needs_information` and `flagged`. The bridge is now dormant for these seven
> columns rather than load-bearing.

What it changed on `listings`: widened the status check constraint to add
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

## APPLIED to production, 29 July 2026: family commercial terms

`supabase/migrations/20260728e_family_commercial_terms.sql` (ADR-0014, accepted
by the owner on 29 July 2026).

**Applied to production on 29 July 2026 at 15:44:45 UTC** with explicit owner
authorisation, via `node scripts/db-query.mjs --file`, against project
`cptglsmjmzcfpjndqfmc`, immediately after `20260728c` had been fully verified.
Recorded in `schema_migrations` with SHA-256 `4224fa27...de9f18fa8`, matching
the file byte for byte. Ledger 42 to 43.

Applied second because it depends on `20260728c`: its
`listings_product_fields_family` constraint references `quantity_min` and
`quantity_max`, which that file creates.

**Verified in production:** `service_terms` and `distribution_terms` present,
both `jsonb` and both nullable; `listings_service_terms_family` and
`listings_distribution_terms_family` present and **valid**;
`listings_product_fields_family` present and **NOT VALID**, which is exactly
what the file deploys.

**Data effects:** none. Still 5 listings, still approved 2 / draft 1 /
submitted 2, zero rows carrying either terms column. Nothing was backfilled and
nothing could be: no record carries a canonical family yet.

**Functional probes, rolled back:** a services record written the way the
composer writes one — product fields cleared — accepts `service_terms`; a
services record that keeps a quantity is refused; a distribution record accepts
`distribution_terms`; service terms on a distribution record are refused;
distribution terms on a products record are refused; a legacy row with a null
`market_family` is still allowed to hold terms, so nothing created before the
family entrances becomes invalid.

**`listings_product_fields_family` is still NOT VALID, deliberately.** Zero
existing rows would violate it, surveyed directly. Validating it is a separate
owner decision and was NOT taken here, because the migration deploys the
constraint `NOT VALID` and validating it would make the deployed object differ
from the file. When the owner wants it enforced against existing rows:

```sql
alter table listings validate constraint listings_product_fields_family;
```

**Renamed on 29 July 2026, from `20260728d_family_commercial_terms.sql`.** Two
pull requests each merged a migration claiming the `20260728d` identifier, which
failed `scripts/check-migrations.mjs` and therefore failed the whole of
`npm run verify` for every task on `main`.

This file was the one renamed because it is the one that has **never been
applied**. `20260728d_verification_level_canonical.sql` was applied to
production on 28 July and is recorded in `schema_migrations` with a SHA-256 that
matches it byte for byte, so renaming *that* file would have desynchronised the
ledger from production. This file has no such record and nothing depends on its
name.

An operator instruction issued before this date may still name the old
`20260728d_family_commercial_terms.sql`. It is the same file, unchanged except
for the identifier, and the command below is the current one.

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
## Written but NOT applied

`20260728c_automated_listing_publication.sql` implements ADR-0013. It has **not**
been applied to production and has not been probe-verified. It is additive and
idempotent throughout.

What it changed on `listings`: widened the status check constraint to add
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
