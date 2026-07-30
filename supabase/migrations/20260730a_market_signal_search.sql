-- Market Signal free-text search: the indexes that serve it.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260730a_market_signal_search.sql
--
-- NOT APPLIED. Written and reviewed; not run against production, and it must
-- not be until the owner approves it. A merge to `main` applies nothing in this
-- repository (docs/codex/DATABASE-STATE.md: the historical chain aborts on its
-- first file), so every schema change is applied by hand.
--
-- ---------------------------------------------------------------------------
-- THE SEARCH DOES NOT DEPEND ON THIS FILE
-- ---------------------------------------------------------------------------
-- Read that again before changing anything here, because it is the single most
-- important fact about this migration and it drove the design of the feature.
--
-- Merging does not apply SQL in this repository. So a search built on a new
-- column, a generated tsvector, a materialised search document or an RPC would
-- have shipped as a P0 fix that did nothing at all in production until somebody
-- separately ran a file. That is not an acceptable way to close a launch
-- blocker.
--
-- The search is therefore built on columns that already exist in production
-- (verified applied 28 July 2026 via `20260728a_market_classification.sql`) and
-- on `ilike`, which needs no schema change to be CORRECT. This file only makes
-- it FAST. Applying it changes no result, no ordering, no count and no row: the
-- same query returns the same records, planned differently.
--
-- ---------------------------------------------------------------------------
-- What is slow without it, and how slow
-- ---------------------------------------------------------------------------
-- `ilike '%gas oil%'` cannot use a btree index: a btree orders by prefix and
-- the pattern is unanchored, so the planner falls back to a sequential scan
-- with a filter. `desk_radar` held 6,735 rows at the 28 July reconciliation, of
-- which 3,458 were eligible for the public board on 30 July 2026.
--
-- Measured, not estimated. `npx tsx scripts/verify-signal-search.ts` ran the
-- real predicates against production (`cptglsmjmzcfpjndqfmc`, 3,458 eligible)
-- on 30 July 2026, with none of these indexes applied. Wall-clock round trips
-- from a developer machine to eu-west-1: 184 to 525 ms, the slowest being a
-- five-variant alias group across nine columns. That figure includes network
-- latency, TLS and PostgREST parsing and cannot be decomposed from the client,
-- so it is an upper bound on the database work rather than a measurement of it.
--
-- An earlier draft of this header said single-digit milliseconds. That was the
-- sequential-scan cost reasoned from the row count, not anything a member
-- waits for, and it was never measured. Corrected rather than quietly dropped.
--
-- The point stands and is the reason this file exists: the scan is linear in
-- the eligible row count, so whatever share of that half-second is Postgres
-- grows with the inventory, and the requirement is explicit that the design
-- must not assume 3,100 records.
--
-- pg_trgm fixes exactly this. A GIN index over trigrams answers an unanchored
-- `ILIKE '%...%'` directly, which is the one thing a btree cannot do.
--
-- ---------------------------------------------------------------------------
-- Additive throughout
-- ---------------------------------------------------------------------------
-- No column is added, renamed, dropped or rewritten. No constraint, policy,
-- trigger, function or default changes. No row is read, written or
-- reclassified. RLS on `desk_radar` is untouched and stays deny-all; every
-- public read still goes through the service role naming the public columns.
--
-- There is no backfill because there is nothing to backfill: an index is
-- derived from the rows that are already there.

-- ===========================================================================
-- 1. The extension
-- ===========================================================================
-- Supabase provisions extensions into the `extensions` schema, which is on the
-- default search_path. Created here rather than assumed because a missing
-- extension makes every statement below fail, and failing on line one with a
-- clear message beats failing halfway through.
create extension if not exists pg_trgm with schema extensions;

-- ===========================================================================
-- 2. Trigram indexes on the searched public columns
-- ===========================================================================
-- One per column in `SEARCHABLE_COLUMNS` (lib/search/signal-search.ts) that
-- carries enough text for a trigram to mean anything. A test asserts that the
-- searched set is a subset of `PUBLIC_SIGNAL_COLUMNS`; this file is the other
-- half of that contract, and the two lists must be changed together.
--
-- Every index is PARTIAL on `status = 'approved_signal'`. Every public search
-- carries that predicate, so indexing the rest would be paying to index rows
-- no public query can ever return: at the 28 July counts that is 6,735 rows
-- indexed to serve 3,491. The public-expiry clause is deliberately NOT in the
-- predicate — it compares against `now()`, which is not immutable, so an index
-- predicate cannot contain it.
--
-- `gin_trgm_ops` rather than `gist_trgm_ops`: GIN is larger and slower to
-- write, and this table is written by a periodic import rather than by members,
-- so read speed is the right thing to buy.

create index if not exists desk_radar_product_trgm_idx
  on desk_radar using gin (product extensions.gin_trgm_ops)
  where status = 'approved_signal';

create index if not exists desk_radar_summary_trgm_idx
  on desk_radar using gin (summary_line extensions.gin_trgm_ops)
  where status = 'approved_signal';

-- The desk's own paraphrase. Never the source's prose: `raw_description` is
-- internal, is not in the public read contract, is not searched, and is not
-- indexed here.
create index if not exists desk_radar_ai_description_trgm_idx
  on desk_radar using gin (ai_description extensions.gin_trgm_ops)
  where status = 'approved_signal';

create index if not exists desk_radar_category_trgm_idx
  on desk_radar using gin (category extensions.gin_trgm_ops)
  where status = 'approved_signal';

create index if not exists desk_radar_origin_trgm_idx
  on desk_radar using gin (origin extensions.gin_trgm_ops)
  where status = 'approved_signal';

create index if not exists desk_radar_destination_trgm_idx
  on desk_radar using gin (destination extensions.gin_trgm_ops)
  where status = 'approved_signal';

-- HS codes are short and are searched both exactly ("1701.99") and as a prefix
-- ("1701"). A trigram index serves both, and serves the dotted and undotted
-- forms the sources actually stored without the application having to know
-- which form a given row used.
create index if not exists desk_radar_hs_code_trgm_idx
  on desk_radar using gin (hs_code extensions.gin_trgm_ops)
  where status = 'approved_signal';

-- The public reference, e.g. "EXT-G4WB-000001". A member quoting a signal back
-- to the desk types this, and it is a reference to the signal, never to a
-- source or a party.
create index if not exists desk_radar_canonical_id_trgm_idx
  on desk_radar using gin (canonical_signal_id extensions.gin_trgm_ops)
  where status = 'approved_signal';

-- ===========================================================================
-- 3. The ordering index
-- ===========================================================================
-- `desk_radar_live_idx` is `(status, spotted_at desc)` and is one column short
-- of what the board now needs. `spotted_at` is not a total order here — the
-- import stamps whole dates, so hundreds of rows share a value — so the board
-- orders by `spotted_at desc, id desc` to make offset pagination stable. Adding
-- `id` lets that whole ordering be read from the index instead of being sorted
-- after the fact on every page.
--
-- The existing index is left in place. It is not redundant for every query, and
-- dropping an index that production has been planning against is not something
-- to do in passing.
create index if not exists desk_radar_public_order_idx
  on desk_radar (spotted_at desc, id desc)
  where status = 'approved_signal';

-- ===========================================================================
-- 4. What this does NOT do
-- ===========================================================================
-- It does not create a search document, a tsvector column or a trigger to
-- maintain one. Full-text search would rank better than trigram matching and
-- would tokenise better, and it is the right next step if the inventory grows
-- by an order of magnitude. It is not this change, for two reasons worth
-- recording rather than rediscovering:
--
--   1. A generated column changes the table and would have to be backfilled
--      over every row, which is a production write, which is an owner
--      decision. Indexes are derived and can be built concurrently later
--      without touching a single row.
--   2. A tsvector search cannot be expressed through PostgREST's filter
--      grammar the way `ilike` can, so it needs an RPC — and an RPC that has
--      not been applied is a search that returns nothing. See the header.
--
-- Recorded as a follow-up in docs/launch/POST-LAUNCH-BACKLOG.md rather than
-- implied to be someone's problem.

-- ===========================================================================
-- Rollback
-- ===========================================================================
-- Every statement above is additive, so the rollback is to drop what was
-- added. Written out rather than assumed. Dropping these indexes restores the
-- previous plans exactly; it loses no data, because an index holds none.
--
--   drop index if exists desk_radar_product_trgm_idx;
--   drop index if exists desk_radar_summary_trgm_idx;
--   drop index if exists desk_radar_ai_description_trgm_idx;
--   drop index if exists desk_radar_category_trgm_idx;
--   drop index if exists desk_radar_origin_trgm_idx;
--   drop index if exists desk_radar_destination_trgm_idx;
--   drop index if exists desk_radar_hs_code_trgm_idx;
--   drop index if exists desk_radar_canonical_id_trgm_idx;
--   drop index if exists desk_radar_public_order_idx;
--
-- `pg_trgm` is deliberately NOT dropped by the rollback. Other objects may come
-- to depend on it, and dropping an extension is not the reverse of creating one
-- when something else has since started using it.
