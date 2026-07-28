# Database state

**Reconciled:** 26 July 2026

This file is a guardrail, not a complete schema dump. Codex must inspect the live production record and repository migrations before proposing database work.

## Known production-aligned changes

- Blocks A-F migrations dated `20260723a` through `20260723f` were reported applied to production and verified during the founding-launch work.
- Journey 1 added the desk-radar signal-import mapping and Ponte-managed Qualified Opportunity seed migrations dated `20260724a` and `20260724b`.
- PR #20 aligned the repository with two defects already corrected in production:
  - `desk_radar.canonical_signal_id` requires a full unique index to support `ON CONFLICT (canonical_signal_id)`.
  - the Journey seed must use the text verification enum `company_verified`, not integer `2`, and must check the profile-bind error.

- `20260726a_investigation_kind.sql` was applied to production by hand on 26 July 2026 with owner approval, using `scripts/db-query.mjs`, and probe-verified afterwards. It adds `request_kind` (not null, default `'investigate'`), `capability`, `contact_phone` and `contact_language` to `signal_investigations`, adds the `signal_investigations_kind_check` constraint, and replaces the `(signal_id, requester_id)` unique constraint with `(signal_id, requester_id, request_kind)`. Verified: the four columns exist with the stated nullability and default, both constraints are present in `pg_constraint`, the old two-part constraint is gone, and the single pre-existing row backfilled to `request_kind = 'investigate'`. It was applied by hand because the automatic chain aborts at its first file (see below), so a merge does not apply anything.

## Written and NOT applied

- `20260728a_market_classification.sql` (28 July 2026). Adds the market
  classification columns: 11 nullable columns, 3 CHECK constraints and 6 indexes
  on `listings`; 6 nullable columns, 2 CHECK constraints and 3 indexes on
  `desk_radar`. Seventeen columns, five constraints, nine indexes. Additive
  throughout; nothing is renamed, dropped or rewritten, every existing row stays
  readable and the legacy `listings.type` mapping is untouched. The rollback is
  written out in the file itself.

  **It has not been run against production and must not be until the owner
  approves it.** The pre-migration report below is satisfied by ADR-0012 and by
  the file's own commentary.

  The application does not depend on it having run. `readClassification`
  validates every key before a write; `isMissingColumnError` recognises
  PostgREST's `PGRST204` and Postgres's `42703`, and the submit route retries
  the write without the classification columns when it sees one. In that window
  the classification still reaches the record through the synthesised `details`,
  which is where it travelled before these columns were proposed. Once the
  migration is applied the retry never fires.

  **Nothing is backfilled.** No existing listing or signal carries a canonical
  category, and writing a guess into these columns would invent a finding. Every
  category filter reports "not yet classified" until records genuinely carry
  keys.

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
