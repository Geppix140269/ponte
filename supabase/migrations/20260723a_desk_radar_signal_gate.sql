-- Desk Radar becomes Market Signals: the publication gate.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260723a_desk_radar_signal_gate.sql
--
-- PROBE FIRST. The migration chain is not evidence of the live schema (see
-- docs/platform/APPLY-PENDING.md). Before running this, confirm the table and
-- its current status values actually exist in production:
--
--   select column_name from information_schema.columns
--    where table_name = 'desk_radar' order by 1;
--   select status, count(*) from desk_radar group by status;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- The Definitive 1 August brief (Block A, section 5.4) separates Qualified
-- Opportunities from Market Signals. desk_radar is reused as the Market Signal
-- source table, but three things must change before a signal may be public:
--
--   1. Nothing is public on import. The default status becomes 'private'.
--   2. A signal is public ONLY after an individual admin approval, which is a
--      distinct state ('approved_signal') carrying who approved it and when.
--   3. A signal leaves the public board automatically 90 days after its
--      original signal date, via public_expires_at set at approval.
--
-- Additive and idempotent throughout: every column uses `add column if not
-- exists`, and the status remap only rewrites values that exist, so re-running
-- is a no-op. No row is deleted; provenance is preserved for review.

-- ===========================================================================
-- 1. Approval, expiry and promotion columns
-- ===========================================================================
-- Who approved this signal for publication, and when. approved_by is the
-- admin's profile id; a public read never selects it.
alter table desk_radar add column if not exists approved_by uuid references profiles on delete set null;
alter table desk_radar add column if not exists approved_at timestamptz;

-- When the signal first went public, and when it must leave the public board.
-- public_expires_at is set at approval to spotted_at + 90 days (brief 5.4).
alter table desk_radar add column if not exists published_at timestamptz;
alter table desk_radar add column if not exists public_expires_at timestamptz;

-- When a signal is confirmed and promoted, it does NOT inherit a badge: a
-- normal member listing is created and linked here. See brief 5.4 and P19.
alter table desk_radar add column if not exists promoted_listing_id uuid references listings on delete set null;

-- Investigation requests counted privately (Block D fills this; the column is
-- added here so the lifecycle is complete and the count never leaks per-request
-- identity to the public payload).
alter table desk_radar add column if not exists investigation_count integer not null default 0;

-- ===========================================================================
-- 2. The Market Signal status vocabulary
-- ===========================================================================
-- Old vocabulary: live, under_pursuit, graduated, expired, removed.
-- New vocabulary (brief 5.4): private, approved_signal, under_investigation,
-- confirmed, unavailable, expired, withdrawn.
--
-- Remap before re-constraining, so existing rows stay valid. The mapping keeps
-- meaning: an imported 'live' row was never individually approved, so it
-- becomes 'private' rather than public. Nothing is public until an admin says
-- so, which is the whole point of Block A.
alter table desk_radar drop constraint if exists desk_radar_status_check;

update desk_radar set status = case status
  when 'live'          then 'private'
  when 'under_pursuit' then 'under_investigation'
  when 'graduated'     then 'confirmed'
  when 'removed'       then 'withdrawn'
  else status                       -- 'expired' and any already-new value stay
end
where status in ('live', 'under_pursuit', 'graduated', 'removed');

alter table desk_radar alter column status set default 'private';

alter table desk_radar add constraint desk_radar_status_check check (
  status in (
    'private', 'approved_signal', 'under_investigation',
    'confirmed', 'unavailable', 'expired', 'withdrawn'
  )
);

-- ===========================================================================
-- 3. Index the public board actually uses
-- ===========================================================================
-- The public board reads approved, unexpired signals newest-spotted first.
create index if not exists desk_radar_public_idx
  on desk_radar (status, public_expires_at, spotted_at desc)
  where status = 'approved_signal';

comment on column desk_radar.approved_by is
  'Admin profile id that approved this signal for public display. Never selected by a public read.';
comment on column desk_radar.public_expires_at is
  'When the signal leaves the public board. Set at approval to spotted_at + 90 days (brief 5.4).';
comment on column desk_radar.promoted_listing_id is
  'The member listing created when this signal was confirmed. Promotion creates a normal listing; a signal never inherits a Qualified badge.';
