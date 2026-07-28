-- Make profiles.verification_level a constrained, canonical, semantic column.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260728d_verification_level_canonical.sql
--
-- PROBE FIRST, and expect exactly this:
--   select coalesce(verification_level,'<NULL>') as v, count(*)
--     from profiles group by 1 order by 2 desc;
--   -- unverified 7 | company_verified 1 | <NULL> 1
--
-- Authority: issue #86. Analysis: docs/proposals/verification-level-remediation.md.
--
-- ---------------------------------------------------------------------------
-- WHY
-- ---------------------------------------------------------------------------
-- 20260721g declared this column `int not null default 0`. The column already
-- existed as `text`, so `add column if not exists` did nothing and the
-- migration reported success while changing nothing. Three writers then
-- disagreed into one column (the pipeline wrote 2, the re-screen wrote 1, the
-- seed wrote 'company_verified') and twelve readers compared it with Number().
-- Number('company_verified') is NaN, and NaN < 2 is false, so the publication
-- floor never fired for any stored value.
--
-- The application side of the repair makes the vocabulary semantic end to end.
-- This is the database half: it fixes the one null, forbids everything outside
-- the canonical set, and makes the column say what it has always actually held.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS CHANGES, EXACTLY
-- ---------------------------------------------------------------------------
--   * ONE row: the single profile whose verification_level is NULL becomes
--     'unverified'. That is the whole of the data change.
--   * The column default, already 'unverified', is restated so it survives.
--   * NOT NULL, which it could not carry while a null existed.
--   * A CHECK constraint over the three canonical values.
--
-- It does NOT touch: any verification record, any listing, any other column,
-- any other table, any grant, any policy, or the seven rows already holding
-- 'unverified' and the one holding 'company_verified'.
--
-- No verification is re-evaluated, promoted, demoted, approved or rejected by
-- this file. `verifications` is not referenced at all.
--
-- Additive and idempotent: safe to run twice.

begin;

-- Fail fast rather than queueing. Steps 2 to 4 each take ACCESS EXCLUSIVE on
-- profiles, and at nine rows the work itself is instantaneous, so any delay
-- would be contention with an unexpected reader rather than this migration
-- doing anything slow. Waiting behind that lock would block every write to
-- profiles for as long as the other query runs; failing after five seconds
-- leaves production exactly as it was and can simply be retried.
set lock_timeout = '5s';

-- 1. The single null. `unverified` is the truthful reading of a profile that
--    has never been through a check, and it is already the column default, so
--    this row simply catches up with every row written since that default.
update profiles
   set verification_level = 'unverified'
 where verification_level is null;

-- 2. Restate the default explicitly rather than relying on it still being set.
alter table profiles
  alter column verification_level set default 'unverified';

-- 3. Now that no null remains, the column can say so. An absent level is not a
--    level, and the application ranks null below `unverified` anyway; this stops
--    the ambiguity being expressible at all.
alter table profiles
  alter column verification_level set not null;

-- 4. The canonical set. This is the database half of fail-closed: after it, an
--    invalid value cannot be STORED, not merely refused when read.
--
--    email_verified and phone_verified are deliberately absent. Email and phone
--    verification are independent account attributes, not points on a
--    business-verification scale, and belong in their own columns
--    (email_verified_at, phone_verified_at) in a separate change. Putting them
--    here would imply that confirming a phone number is progress towards
--    confirming a company.
alter table profiles
  drop constraint if exists profiles_verification_level_check;

alter table profiles
  add constraint profiles_verification_level_check check (
    verification_level in ('unverified', 'identity_verified', 'company_verified')
  );

comment on column profiles.verification_level is
  'Canonical member verification level: unverified | identity_verified | company_verified. '
  'Semantic, never numeric. company_verified is the publication floor for '
  'member-business listings. Ranked in lib/verification/level.ts, where an '
  'unrecognised value ranks -1 and fails closed.';

commit;

-- ---------------------------------------------------------------------------
-- VERIFY AFTER APPLYING
-- ---------------------------------------------------------------------------
--   select verification_level, count(*) from profiles group by 1 order by 2 desc;
--   -- expect: unverified 8 | company_verified 1, and no null
--
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'profiles'::regclass
--      and conname = 'profiles_verification_level_check';
--
--   select is_nullable, column_default from information_schema.columns
--    where table_name = 'profiles' and column_name = 'verification_level';
--   -- expect: NO | 'unverified'::text
--
--   select status, count(*) from verifications group by 1;
--   -- expect UNCHANGED from the preflight: nothing here touches verifications
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
-- Reverting the application code is a plain `git revert` and needs none of the
-- below: the column type never changes, so no read can break.
--
-- To undo the schema half:
--
--   alter table profiles drop constraint if exists profiles_verification_level_check;
--   alter table profiles alter column verification_level drop not null;
--   alter table profiles alter column verification_level set default 'unverified';
--
-- The row that became 'unverified' is NOT restored to null, deliberately:
-- 'unverified' is a truthful description of it, and reintroducing a null would
-- restore an ambiguity rather than a fact. If that exact row must come back as
-- null, capture its id from the preflight first:
--
--   select id from profiles where verification_level is null;
--   -- then, to restore: update profiles set verification_level = null where id = '<id>';
