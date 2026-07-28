-- Family commercial terms: the facts a Trade Service and a Distribution
-- opportunity actually have, downstream of their classification.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260728d_family_commercial_terms.sql
--
-- NOT APPLIED. This file is written and reviewed; it has not been run against
-- production and must not be until the owner approves it. A merge to `main`
-- applies nothing in this repository (see docs/codex/DATABASE-STATE.md: the
-- historical chain aborts on its first file), so every schema change is applied
-- by hand. The application code tolerates these columns being absent and
-- retries the write without them, exactly as it already does for the market
-- classification columns, so nothing breaks in the meantime and nothing is
-- silently lost: the terms also travel in `details` as sentences.
--
-- Depends on 20260728a_market_classification.sql, which adds `market_family`.
-- Apply that first: the CHECK constraints below reference it.
--
-- ---------------------------------------------------------------------------
-- Why jsonb here, when the classification columns are typed
-- ---------------------------------------------------------------------------
-- The opposite reasoning to that file, and for the opposite reason. The
-- classification columns are typed because they are FILTERED on: a member
-- searching for ocean forwarders covering Spain queries them, so each needs a
-- btree index and a CHECK.
--
-- These are read WITH a record, not searched across it. A member does not filter
-- by "engagement basis is a retainer"; they read the record they found and see
-- how it is charged for. Fourteen sparse columns on `listings` to store what one
-- document is read as would cost a column per answer for no query that uses it,
-- and every new conditioned question would then be another migration.
--
-- The two fields inside these documents that a market WOULD plausibly be
-- filtered by are the ones already promoted to typed columns by the earlier
-- migration: `service_category_key` / `service_subcategory_keys` for what the
-- service is, and `coverage_scope_key` / `territory_codes` for where a
-- distribution arrangement applies. If a later requirement needs, say,
-- transport mode as a facet, the honest move is to promote that one key to its
-- own indexed column rather than to index a jsonb path.
--
-- ---------------------------------------------------------------------------
-- Additive throughout
-- ---------------------------------------------------------------------------
-- Both columns are new and nullable. Nothing existing is renamed, dropped or
-- rewritten, every existing row stays exactly as it is and stays readable, and
-- no product listing is affected in any way: a products record stores null in
-- both, which is what it already effectively stores today.
--
-- RLS is untouched. `listings` keeps the policies it has; a new column on an
-- existing table inherits them, and neither column is exposed to anonymous
-- readers by any policy this file changes, because this file changes none.
-- The public listing surfaces read through the same row-level rules they
-- already read `details` through.

-- ===========================================================================
-- 1. Trade service terms
-- ===========================================================================
-- Scope, engagement, coverage countries, trade lanes, specialisation keys,
-- capability, pricing basis and availability. Written only by the services
-- procedure; see lib/structure/procedures/services.ts and the validation in
-- lib/listings/classification.ts, which refuses a specialisation the chosen
-- service category does not offer.
alter table listings add column if not exists service_terms jsonb;

-- ===========================================================================
-- 2. Distribution and representation terms
-- ===========================================================================
-- Objective, product or sector scope, channel keys, capability keys,
-- commercial expectations and timing.
--
-- `commercial_expectations` is where an opening order, a sales target or a
-- marketing commitment is stated. It is deliberately NOT `quantity`: an opening
-- order is a term of a relationship, and storing it in the shipment quantity
-- would put it on the board as goods for sale.
alter table listings add column if not exists distribution_terms jsonb;

-- ===========================================================================
-- 3. The cross-family rule, enforced by the database
-- ===========================================================================
-- The same rule the composer applies, the draft sanitiser applies and the API
-- refuses, stated once more where it cannot be bypassed. A mis-filed record is
-- worse than a missing one because every filter, count and match downstream
-- trusts it.
--
-- Both constraints permit a null `market_family`, because rows created before
-- the family entrances shipped have none and must stay valid.
alter table listings drop constraint if exists listings_service_terms_family;
alter table listings add constraint listings_service_terms_family check (
  service_terms is null or market_family is null or market_family = 'services'
);

alter table listings drop constraint if exists listings_distribution_terms_family;
alter table listings add constraint listings_distribution_terms_family check (
  distribution_terms is null or market_family is null or market_family = 'distribution'
);

-- A trade service and a distribution arrangement have no shipped quantity, no
-- unit and no customs classification. This is the requirement's central
-- negative assertion, and the database is the last place it can be guaranteed.
--
-- Stated as a constraint on NEW writes only in effect: it is added NOT VALID so
-- that applying it cannot fail on a historical row that predates the family
-- split and happens to carry one of these. Validate it separately, after
-- inspecting any rows it reports, with:
--
--   alter table listings validate constraint listings_product_fields_family;
--
alter table listings drop constraint if exists listings_product_fields_family;
alter table listings add constraint listings_product_fields_family check (
  market_family is null
  or market_family = 'products'
  or (quantity is null and quantity_min is null and quantity_max is null
      and unit is null and incoterm is null and hs_code is null)
) not valid;

-- ===========================================================================
-- Rollback
-- ===========================================================================
-- Drop the constraints first, then the columns. Dropping the columns discards
-- the terms members stated, so take a copy of both columns before rolling back
-- if any non-product record has been created since this was applied:
--
--   create table listings_family_terms_backup as
--     select id, ref, market_family, service_terms, distribution_terms
--     from listings
--     where service_terms is not null or distribution_terms is not null;
--
--   alter table listings drop constraint if exists listings_product_fields_family;
--   alter table listings drop constraint if exists listings_distribution_terms_family;
--   alter table listings drop constraint if exists listings_service_terms_family;
--   alter table listings drop column if exists distribution_terms;
--   alter table listings drop column if exists service_terms;
--
-- The application keeps working after a rollback: the submit route already
-- retries the write without these columns, and the terms still reach the record
-- through the synthesised `details`.
