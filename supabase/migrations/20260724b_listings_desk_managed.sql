-- Ponte-managed opportunities: a truthful flag for desk-brokered listings.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260724b_listings_desk_managed.sql
--
-- PROBE FIRST (see docs/platform/APPLY-PENDING.md):
--   select column_name from information_schema.columns
--    where table_name = 'listings' order by 1;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- The Find journey needs at least one Qualified Opportunity to demonstrate the
-- open -> request-introduction path while the member board is still filling.
-- Those seeded opportunities are GENUINE Ponte-desk opportunities (Ponte brokers
-- them), not fabricated third-party members, and the page must be able to say so
-- truthfully rather than dressing a desk row up as a member's.
--
-- lib/listings/public-labels.ts deliberately refuses to emit a "Ponte-managed"
-- label without a data model behind it. This column IS that data model: a
-- single boolean, set true ONLY on real desk-owned listings, so the affordance
-- is a stored fact and never an inference.
--
-- Additive, idempotent, default false: every existing and future member listing
-- is unaffected and reads as not desk-managed.
--
-- ROLLBACK: alter table listings drop column if exists desk_managed;

alter table listings add column if not exists desk_managed boolean not null default false;

comment on column listings.desk_managed is
  'True only for genuine Ponte-desk-brokered opportunities. The stored basis for the "Ponte-managed" affordance; never inferred.';
