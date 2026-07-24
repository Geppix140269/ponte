-- Market Signals import: the columns the external-signal seed needs.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260724a_desk_radar_signal_import.sql
--
-- PROBE FIRST. The migration chain is not evidence of the live schema (see
-- docs/platform/APPLY-PENDING.md). Confirm the table shape before running:
--
--   select column_name from information_schema.columns
--    where table_name = 'desk_radar' order by 1;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- The go4WorldBusiness seed (PONTE_MARKET_SIGNALS_FINAL_UPLOAD_v2, ~6,441 rows)
-- populates the Market Signals lane of the Find journey. Importing it onto the
-- existing desk_radar table needs four additive columns:
--
--   1. canonical_signal_id  the stable PUBLIC reference (e.g. EXT-G4WB-000001).
--                           Preserved end to end so a signal keeps one identity
--                           across dedupe and re-import. It names the signal,
--                           never its source, so it is safe to expose.
--   2. indexable            whether this signal MAY be search-indexable. Honored
--                           as data now; no crawler surface is enabled this
--                           release (signal detail pages stay robots:noindex).
--   3. import_batch         tags every row a given import wrote, so the whole
--                           batch can be disabled or deleted in one statement.
--                           This is the rollback handle.
--   4. import_meta (jsonb)  every provenance/scoring field the source carries
--                           (source_name, source_url, source_ids, raw_description,
--                           match_method, match_confidence, quality_score,
--                           dup_count, review_reason, ...). It lands HERE, never
--                           in a public column, and no public read selects it.
--
-- Additive and idempotent: every column uses `add column if not exists`, the
-- unique index uses `if not exists`, and re-running writes nothing. No row is
-- touched; the import script (scripts/import-market-signals.mjs) fills these.
--
-- ROLLBACK / SAFE-DISABLE:
--   delete from desk_radar where import_batch = '<batch>';   -- remove the seed
--   alter table desk_radar drop column if exists import_meta;
--   alter table desk_radar drop column if exists import_batch;
--   alter table desk_radar drop column if exists indexable;
--   alter table desk_radar drop column if exists canonical_signal_id;

alter table desk_radar add column if not exists canonical_signal_id text;
alter table desk_radar add column if not exists indexable boolean not null default false;
alter table desk_radar add column if not exists import_batch text;
alter table desk_radar add column if not exists import_meta jsonb;

-- One row per canonical id. A plain (non-partial) unique index: Postgres treats
-- NULLs as distinct, so the desk-originated rows that predate the import keep a
-- null canonical id and coexist freely, while the imported set can never
-- duplicate one. It must be non-partial because it is also the conflict target
-- the import upserts on (ON CONFLICT (canonical_signal_id)), and Postgres cannot
-- infer a partial index from a bare column list.
create unique index if not exists desk_radar_canonical_signal_id_key
  on desk_radar (canonical_signal_id);

-- The Find signal lane filters approved rows by product; support that scan.
create index if not exists desk_radar_product_idx
  on desk_radar (product)
  where status = 'approved_signal';

comment on column desk_radar.canonical_signal_id is
  'Stable PUBLIC reference for an imported external signal (e.g. EXT-G4WB-000001). Names the signal, not its source; safe to expose.';
comment on column desk_radar.indexable is
  'Whether this signal MAY be search-indexable. Honored as data; no crawler surface is enabled yet.';
comment on column desk_radar.import_batch is
  'Tag identifying the import that wrote this row. The rollback handle: delete where import_batch = ''<batch>''.';
comment on column desk_radar.import_meta is
  'All source provenance and scoring for an imported signal. Never selected by a public read; the public payload uses the safe columns only.';
