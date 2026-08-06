-- Block D: structured expressions of interest, and Market Signal
-- investigation requests.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260723d_investigation_and_interest.sql
--
-- PROBE FIRST. The migration chain is not evidence of the live schema (see
-- docs/platform/APPLY-PENDING.md). Before running this, confirm the shape:
--
--   select column_name from information_schema.columns
--    where table_name = 'listing_connections' order by 1;
--   select to_regclass('public.signal_investigations');
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- The Definitive 1 August brief (Block D) requires two things the current
-- schema cannot carry:
--
--   1. An expression of interest must be a MEANINGFUL, structured request, not
--      a bare "someone wants to connect". The interested business, its role,
--      the target quantity/timing or supply capability, the geography and a
--      short reason for fit travel to the listing owner so the owner can decide
--      on substance. These are additive columns on the existing
--      listing_connections table: the connection architecture is EXTENDED, not
--      replaced (brief: "Keep the existing connection architecture").
--
--   2. An "Ask Ponte to investigate" request on a Market Signal must enter an
--      admin investigation queue and NEVER contact or reveal a third party.
--      That request is its own record, keyed to the signal, holding what the
--      requester tells us about themselves and what they want Ponte to
--      establish. It is a new table, service-role only, so a request can never
--      travel to a public payload.
--
-- Additive and idempotent throughout: every column uses `add column if not
-- exists`, the table uses `create table if not exists`, and every policy is
-- dropped-then-created. No row is deleted; re-running is a no-op.
--
-- Rollback: drop the five listing_connections columns and drop the
-- signal_investigations table. Existing connection rows are unaffected by the
-- added nullable columns, so the drop loses only Block D data.

-- ===========================================================================
-- 1. Structured expression of interest on a member connection
-- ===========================================================================
-- All nullable text: existing rows created before Block D simply carry nulls,
-- and the owner display treats a null field as "not stated" rather than a gap
-- in the request.
alter table listing_connections add column if not exists interested_business text;
alter table listing_connections add column if not exists interest_role text;
alter table listing_connections add column if not exists interest_target text;
alter table listing_connections add column if not exists interest_geography text;
alter table listing_connections add column if not exists interest_reason text;

-- The role is a closed set (brief: buyer, seller, distributor or intermediary).
-- Null is allowed so pre-Block-D rows stay valid; the API requires it going
-- forward.
alter table listing_connections drop constraint if exists listing_connections_role_check;
alter table listing_connections add constraint listing_connections_role_check check (
  interest_role is null
  or interest_role in ('buyer', 'seller', 'distributor', 'intermediary')
);

comment on column listing_connections.interest_role is
  'The interested party''s declared role on this connection: buyer, seller, distributor or intermediary. Shown to the listing owner so a decision is made on substance (brief Block D).';

-- ===========================================================================
-- 2. Market Signal investigation requests
-- ===========================================================================
-- One row per "Ask Ponte to investigate" submission. requester_id is the
-- authenticated member (the account gate confirms the email before this row is
-- written). Nothing here references or exposes the third party behind the
-- signal: the request is about the REQUESTER and what they want established.
create table if not exists signal_investigations (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references desk_radar(id) on delete cascade,
  requester_id uuid not null,
  -- What the requester tells us about themselves and the ask (brief Block D).
  requesting_business text,
  requester_type text,
  establish_goal text,
  indicative text,
  geography text,
  evidence text,
  wants_intro boolean not null default false,
  -- The request's own lifecycle. The SIGNAL's status (desk_radar.status) is
  -- what the admin drives; this is just whether the desk has actioned the item.
  status text not null default 'new' check (status in ('new', 'actioned', 'withdrawn')),
  created_at timestamptz not null default now()
);

-- The requester type is a closed set (brief: potential supplier, buyer,
-- intermediary or adviser). Null allowed defensively; the API requires it.
alter table signal_investigations drop constraint if exists signal_investigations_requester_type_check;
alter table signal_investigations add constraint signal_investigations_requester_type_check check (
  requester_type is null
  or requester_type in ('supplier', 'buyer', 'intermediary', 'adviser')
);

alter table signal_investigations enable row level security;

-- A member creates their own request; the account gate guarantees an
-- authenticated session by this point.
drop policy if exists "Members create investigation requests" on signal_investigations;
create policy "Members create investigation requests"
  on signal_investigations for insert to authenticated
  with check (auth.uid() = requester_id);

-- A member may read their own requests back. Nobody reads another member's,
-- and no anon read exists at all: the queue is served with the service role.
drop policy if exists "Members read own investigation requests" on signal_investigations;
create policy "Members read own investigation requests"
  on signal_investigations for select to authenticated
  using (auth.uid() = requester_id);

create index if not exists signal_investigations_signal_idx
  on signal_investigations (signal_id, created_at desc);

comment on table signal_investigations is
  'Ask Ponte to investigate requests on Market Signals. Service-role only for the admin queue; never reaches a public payload and never reveals or contacts the third party behind the signal (brief Block D).';
