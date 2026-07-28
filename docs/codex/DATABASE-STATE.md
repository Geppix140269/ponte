# Database state

**Reconciled:** 28 July 2026

This file is a guardrail, not a complete schema dump. Codex must inspect the live production record and repository migrations before proposing database work.

## Known production-aligned changes

- Blocks A-F migrations dated `20260723a` through `20260723f` were reported applied to production and verified during the founding-launch work.
- Journey 1 added the desk-radar signal-import mapping and Ponte-managed Qualified Opportunity seed migrations dated `20260724a` and `20260724b`.
- PR #20 aligned the repository with two defects already corrected in production:
  - `desk_radar.canonical_signal_id` requires a full unique index to support `ON CONFLICT (canonical_signal_id)`.
  - the Journey seed must use the text verification enum `company_verified`, not integer `2`, and must check the profile-bind error.

- `20260726a_investigation_kind.sql` was applied to production by hand on 26 July 2026 with owner approval, using `scripts/db-query.mjs`, and probe-verified afterwards. It adds `request_kind` (not null, default `'investigate'`), `capability`, `contact_phone` and `contact_language` to `signal_investigations`, adds the `signal_investigations_kind_check` constraint, and replaces the `(signal_id, requester_id)` unique constraint with `(signal_id, requester_id, request_kind)`. Verified: the four columns exist with the stated nullability and default, both constraints are present in `pg_constraint`, the old two-part constraint is gone, and the single pre-existing row backfilled to `request_kind = 'investigate'`. It was applied by hand because the automatic chain aborts at its first file (see below), so a merge does not apply anything.

## Written but NOT applied

`20260728c_automated_listing_publication.sql` implements ADR-0012. It has **not**
been applied to production and has not been probe-verified. It is additive and
idempotent throughout.

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
