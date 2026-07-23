-- Verification purpose: make the member badge mean the member's own business.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260723b_verification_purpose.sql
--
-- PROBE FIRST (docs/platform/APPLY-PENDING.md). Confirm the shape before running:
--
--   select column_name from information_schema.columns
--    where table_name = 'verifications' order by 1;
--   select column_name from information_schema.columns
--    where table_name = 'profiles' and column_name = 'business_verification_id';
--
-- ---------------------------------------------------------------------------
-- Why this migration exists (brief §3)
-- ---------------------------------------------------------------------------
-- A successful Level 2 check grants the REQUESTER a Business Verified badge,
-- whatever company they checked, so a member can check an unrelated company and
-- be badged. Block B splits the intent into two purposes and only lets a
-- member-business verification touch the member's own account.
--
-- Additive and idempotent: two new columns, nothing renamed or dropped.

-- ===========================================================================
-- 1. verifications.purpose
-- ===========================================================================
-- Nullable, no default, ON PURPOSE. The seven existing rows stay NULL, which
-- the code reads as "unclassified" and treats as a counterparty check: it never
-- grants a badge. Backfilling them to a purpose would be guessing at intent the
-- row never recorded; the existing-badge review (§3.4) is a human step, not a
-- default. New rows are written with an explicit purpose by the application.
alter table verifications
  add column if not exists purpose text
  check (purpose is null or purpose in ('member_business', 'counterparty_check'));

comment on column verifications.purpose is
  'member_business = the member verifying their own business (may grant the badge); counterparty_check = checking someone else (never grants). Null = legacy/unclassified, treated as counterparty_check. Never inferred from page copy.';

-- ===========================================================================
-- 2. profiles.business_verification_id
-- ===========================================================================
-- Binds the public member badge to the one member-business verification that
-- earned it (brief §3.3). Set when a member-business case passes; null for a
-- member with no own-business verification. on delete set null so removing a
-- verification record cannot leave a dangling badge reference.
alter table profiles
  add column if not exists business_verification_id uuid
  references verifications (id) on delete set null;

comment on column profiles.business_verification_id is
  'The member-business verification that the public badge rests on. Null means the member has no accepted own-business verification, whatever other checks they have run.';
