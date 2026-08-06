-- Record the member-business attestation, so Ponte can show what a member
-- declared and when (Block B acceptance correction).
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260723c_verification_attestation.sql
--
-- PROBE FIRST. Confirm the columns are absent before running:
--   select column_name from information_schema.columns
--    where table_name = 'verifications' and column_name in ('attested_at','attestation_version');
--
-- ---------------------------------------------------------------------------
-- Why (Block B, §3)
-- ---------------------------------------------------------------------------
-- The badge rests on a member declaring "This is the business I represent on
-- Ponte". That attestation was only enforced in the browser. It is now required
-- server-side, and recorded here in an auditable form: when it was accepted and
-- which version of the wording, so an acceptance can always be reconstructed.
--
-- Both columns are null for a counterparty check (which needs no attestation)
-- and for the legacy rows, which pre-date the attestation. Additive and
-- idempotent.

alter table verifications
  add column if not exists attested_at timestamptz;

alter table verifications
  add column if not exists attestation_version text;

comment on column verifications.attested_at is
  'When the member accepted the member-business attestation. Server-stamped, never client-supplied. Null for a counterparty check and for legacy rows.';
comment on column verifications.attestation_version is
  'Which version of the attestation wording the member accepted (see MEMBER_BUSINESS_ATTESTATION in lib/verification/purpose.ts). Null when no attestation was made.';
