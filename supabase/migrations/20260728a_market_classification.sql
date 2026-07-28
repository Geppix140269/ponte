-- Market classification: the structured category fields the three families
-- need, so a record states what it IS in stored keys rather than in prose.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260728a_market_classification.sql
--
-- NOT APPLIED. This file is written and reviewed; it has not been run against
-- production and must not be until the owner approves it. A merge to `main`
-- applies nothing in this repository (see docs/codex/DATABASE-STATE.md: the
-- historical chain aborts on its first file), so every schema change is applied
-- by hand. The application code tolerates these columns being absent and
-- retries the write without them, so nothing breaks in the meantime and nothing
-- is silently lost: the classification also travels in `details`.
--
-- ---------------------------------------------------------------------------
-- Why these columns and not one jsonb blob
-- ---------------------------------------------------------------------------
-- Because they are filtered on. `flexibility` is jsonb because nothing queries
-- it; these decide which records a member sees. A btree index on a text column
-- answers "every ocean-freight offer covering Spain" cheaply and an index on a
-- jsonb path does not, and a typed column is also the only place a CHECK can
-- state the cross-family rule.
--
-- ---------------------------------------------------------------------------
-- Additive throughout
-- ---------------------------------------------------------------------------
-- Every column is new and nullable. Nothing existing is renamed, dropped or
-- rewritten, every existing row stays exactly as it is and stays readable, and
-- `type`, `product`, `hs_code` and `details` keep their present meaning. The
-- legacy `listings.type` mapping is untouched and remains supported.

-- ===========================================================================
-- 1. The canonical pair
-- ===========================================================================
-- Carried by the composer since the family entrances shipped, and until now
-- discarded at this boundary because there was nowhere to put it. `type` could
-- only ever say offer / requirement / service, which cannot express
-- distribution at all and cannot tell a service request from a service offer.
alter table listings add column if not exists market_family text
  check (market_family is null or market_family in ('products', 'services', 'distribution'));

alter table listings add column if not exists market_intent text
  check (market_intent is null or market_intent in (
    'source_product',
    'offer_product',
    'seek_trade_service',
    'offer_trade_service',
    'seek_distribution_partner',
    'offer_distribution_or_representation',
    'seek_brands_or_products_to_represent'
  ));

-- ===========================================================================
-- 2. Trade services
-- ===========================================================================
-- Stable keys from lib/taxonomy/services.ts. The values are NOT constrained to
-- an enumeration here on purpose: the subcategory tree runs to well over a
-- hundred entries and will grow, and a CHECK listing them would turn every
-- taxonomy addition into a production migration. The application validates
-- every key against the taxonomy before it writes, and the test suite pins the
-- taxonomy itself.
alter table listings add column if not exists service_category_key text;
alter table listings add column if not exists service_subcategory_keys text[];

-- ===========================================================================
-- 3. Distribution and representation
-- ===========================================================================
-- Three separate concepts in three separate columns. They were one flat list
-- of ten values in which `distributor` (a partner), `regional` (coverage) and
-- `exclusive` (a relationship term) sat side by side as if they answered the
-- same question. They do not, which is why a member could not ask for an
-- exclusive distributor in Italy and nothing could be filtered afterwards.
alter table listings add column if not exists distribution_partner_type_key text;
alter table listings add column if not exists distribution_relationship_terms text[];
alter table listings add column if not exists coverage_scope_key text;

-- ISO-2 codes, so a territory can be matched rather than only read. The text
-- description of the territory, where the member gave one, stays in
-- `additional_details`.
alter table listings add column if not exists territory_codes text[];

-- ===========================================================================
-- 4. Product sector, shared by two families
-- ===========================================================================
-- A products record classifies to HS as it always has. A distribution record
-- attaches to what is being distributed, which is a sector and often not a
-- specific product, so the sector is its own column rather than an inference
-- from an HS code that a distribution arrangement does not have.
alter table listings add column if not exists product_sector_key text;

-- ===========================================================================
-- 5. Custom wording, kept apart from the keys
-- ===========================================================================
-- A member who chose Other still carries a canonical key and remains countable
-- alongside every other record. Their wording lives here, separately, so it can
-- be searched without ever standing in for a classification.
--
-- The keys are `unlisted` for a trade service and `other` for a distribution
-- arrangement. They differ deliberately. The earlier ten-key service list
-- already used `other`, and it meant "Other trade-enabling services": a real
-- category with real subcategories, now stored as `enabling`. Reusing `other`
-- for the escape route would have made every stored service value ambiguous.
-- The label a member sees is "Other" in both cases; only the stored key differs,
-- which is what stable keys are for. See docs/schemas/market-category-taxonomy.md.
alter table listings add column if not exists custom_category_label text
  check (custom_category_label is null or length(custom_category_label) <= 200);

-- Optional context gathered AFTER the structured selection: route, volume,
-- timing, certifications, target customer, commercial conditions. Never the
-- classification mechanism, and never required to submit.
alter table listings add column if not exists additional_details text
  check (additional_details is null or length(additional_details) <= 2000);

-- ===========================================================================
-- 6. The cross-family rule, at the database
-- ===========================================================================
-- The application refuses a mis-filed classification, and so does this. Two
-- guards rather than one because the application is not the only thing that
-- can write a row: an admin tool, a backfill or a future import can too, and a
-- record filed under the wrong family would be trusted by every filter and
-- count downstream.
--
-- Rows written before this migration have every classification column null, so
-- the first clause of each check is satisfied and nothing existing is
-- invalidated.
--
-- Read each one as an implication: IF a family-specific field is set THEN that
-- family must be the record's family.
--
-- Two drafts of this were wrong, in the same place, for two different reasons.
--
-- The first opened `market_family is null or ...`, which exempted a record with
-- no family outright.
--
-- The second removed that clause and still let the same row through, because
-- SQL is three-valued and a CHECK accepts both TRUE and NULL. With a service
-- category set and no family, `(false) or market_family = 'services'` is
-- `false or null`, which is NULL, which passes. The hole was invisible in the
-- constraint text: it read as a correct implication and behaved as an
-- exemption.
--
-- So the family test is stated explicitly: `market_family is not null and
-- market_family = 'services'`. `is not null` is always boolean, so the whole
-- expression is FALSE rather than NULL for the row that must be refused. The
-- test in lib/listings/__tests__/classification.test.ts evaluates these
-- expressions under three-valued logic rather than reading them, because
-- reading them is exactly what missed this.
alter table listings drop constraint if exists listings_service_family_coherent;
alter table listings add constraint listings_service_family_coherent check (
  (service_category_key is null and service_subcategory_keys is null)
  or (market_family is not null and market_family = 'services')
);

alter table listings drop constraint if exists listings_distribution_family_coherent;
alter table listings add constraint listings_distribution_family_coherent check (
  (
    distribution_partner_type_key is null
    and distribution_relationship_terms is null
    and coverage_scope_key is null
  )
  or (market_family is not null and market_family = 'distribution')
);

-- An intent without a family is the same hole one level up: the seven intents
-- each belong to exactly one family, so an intent with no family names a
-- record that cannot be placed. The full intent-to-family pairing is enforced
-- in the application (`isIntentForFamily`); expressing all seven here would be
-- a CASE that has to be edited every time the taxonomy grows, and this catches
-- the case a bad writer actually produces.
alter table listings drop constraint if exists listings_intent_needs_family;
alter table listings add constraint listings_intent_needs_family check (
  market_intent is null or market_family is not null
);

-- `product_sector_key` and `territory_codes` are deliberately NOT constrained
-- to a family. A sector belongs to a products record and to a distribution
-- record that names what is being distributed; a territory belongs to any
-- record that has one. Constraining them would refuse legitimate rows.

-- ===========================================================================
-- 7. Indexes for the filters these columns exist to serve
-- ===========================================================================
-- Partial on the key being present: the overwhelming majority of existing rows
-- have none, and there is no reason to index the nulls.
create index if not exists listings_market_family_idx
  on listings (market_family) where market_family is not null;

create index if not exists listings_service_category_idx
  on listings (service_category_key) where service_category_key is not null;

create index if not exists listings_partner_type_idx
  on listings (distribution_partner_type_key) where distribution_partner_type_key is not null;

create index if not exists listings_product_sector_idx
  on listings (product_sector_key) where product_sector_key is not null;

-- Array containment, for "every record whose service detail includes ocean
-- freight" and "every record covering ES".
create index if not exists listings_service_subcategories_idx
  on listings using gin (service_subcategory_keys);

create index if not exists listings_territory_codes_idx
  on listings using gin (territory_codes);

-- ===========================================================================
-- 8. The same classification on Market Signals
-- ===========================================================================
-- desk_radar carries externally observed signals, and every one of them today
-- is a product signal: the table has `side` and `category` and nothing that can
-- say a signal is a request for ocean freight. Without these columns a
-- category search of the complete inventory can only ever return products,
-- which is a silent partial answer to a question a member asked in full.
--
-- Added here so the search contract is the same across both record classes.
-- Nothing is backfilled: no existing signal has been classified into this
-- taxonomy, and writing a guess into these columns would invent a finding.
alter table desk_radar add column if not exists market_family text
  check (market_family is null or market_family in ('products', 'services', 'distribution'));
alter table desk_radar add column if not exists service_category_key text;
alter table desk_radar add column if not exists service_subcategory_keys text[];
alter table desk_radar add column if not exists distribution_partner_type_key text;
alter table desk_radar add column if not exists product_sector_key text;
alter table desk_radar add column if not exists territory_codes text[];

-- The same family-coherence rule as `listings`, and it matters MORE here.
--
-- A member listing is written by one route, `/api/marketplace/submit`, which
-- validates every key against the taxonomy before it writes. A Market Signal is
-- not: it arrives through `scripts/import-desk-radar.mjs`, through an admin
-- action, and through whatever backfill classifies the existing inventory
-- later. None of those goes through the member API, so none of them inherits
-- its cross-family check.
--
-- The database is the only place that sees every writer. Without these, a
-- backfill could file a freight category on a distribution signal and nothing
-- would object until a member filtered on it and got the wrong answer.
alter table desk_radar drop constraint if exists desk_radar_service_family_coherent;
alter table desk_radar add constraint desk_radar_service_family_coherent check (
  (service_category_key is null and service_subcategory_keys is null)
  or (market_family is not null and market_family = 'services')
);

alter table desk_radar drop constraint if exists desk_radar_distribution_family_coherent;
alter table desk_radar add constraint desk_radar_distribution_family_coherent check (
  distribution_partner_type_key is null
  or (market_family is not null and market_family = 'distribution')
);

create index if not exists desk_radar_market_family_idx
  on desk_radar (market_family) where market_family is not null;
create index if not exists desk_radar_service_category_idx
  on desk_radar (service_category_key) where service_category_key is not null;
create index if not exists desk_radar_product_sector_idx
  on desk_radar (product_sector_key) where product_sector_key is not null;

-- ===========================================================================
-- Rollback
-- ===========================================================================
-- Every statement above is additive, so the rollback is to drop what was
-- added. It is written out rather than assumed, because "additive so it is
-- safe" is only true if somebody has actually established what undoing it
-- means. Dropping these columns loses the classifications entered since the
-- migration ran and nothing else; every pre-existing column is untouched.
--
--   alter table listings drop constraint if exists listings_service_family_coherent;
--   alter table listings drop constraint if exists listings_distribution_family_coherent;
--   alter table listings drop constraint if exists listings_intent_needs_family;
--   drop index if exists listings_market_family_idx;
--   drop index if exists listings_service_category_idx;
--   drop index if exists listings_partner_type_idx;
--   drop index if exists listings_product_sector_idx;
--   drop index if exists listings_service_subcategories_idx;
--   drop index if exists listings_territory_codes_idx;
--   alter table listings
--     drop column if exists market_family,
--     drop column if exists market_intent,
--     drop column if exists service_category_key,
--     drop column if exists service_subcategory_keys,
--     drop column if exists distribution_partner_type_key,
--     drop column if exists distribution_relationship_terms,
--     drop column if exists coverage_scope_key,
--     drop column if exists territory_codes,
--     drop column if exists product_sector_key,
--     drop column if exists custom_category_label,
--     drop column if exists additional_details;
--   alter table desk_radar drop constraint if exists desk_radar_service_family_coherent;
--   alter table desk_radar drop constraint if exists desk_radar_distribution_family_coherent;
--   drop index if exists desk_radar_market_family_idx;
--   drop index if exists desk_radar_service_category_idx;
--   drop index if exists desk_radar_product_sector_idx;
--   alter table desk_radar
--     drop column if exists market_family,
--     drop column if exists service_category_key,
--     drop column if exists service_subcategory_keys,
--     drop column if exists distribution_partner_type_key,
--     drop column if exists product_sector_key,
--     drop column if exists territory_codes;
