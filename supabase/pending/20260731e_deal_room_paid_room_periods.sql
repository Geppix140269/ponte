-- Paid room periods and billing events: the records a Deal Room charge needs.
--
-- Authority: PT-COMMERCIAL-2026-07-31-01, the Deal Room-Only Pricing Authority,
-- recorded by ADR-0020. Stage 3 of
-- docs/plans/active/deal-room-transaction-pricing.md.
--
-- =======================================================================
-- WRITTEN AND NOT APPLIED. Applying this file is a separate owner approval
-- under AGENTS.md and authority section 20. Nothing in the application reads
-- or writes these tables, and no charge exists anywhere in the repository.
-- =======================================================================
--
-- ## What was missing
--
-- `deal_room_entitlements` was built for a launch scope of "Starter and
-- authorised waiver" and says so in its own comment: "No price, no currency, no
-- Stripe identifier, no invoice." Its `kind` CHECK admits `starter`,
-- `sponsored` and `waived` and would reject `paid` outright. So a room could be
-- entitled but never bought.
--
-- ## What this file adds
--
-- 1. `paid` as a fourth entitlement kind.
-- 2. `deal_room_room_periods` - one row per purchased 30-day period.
-- 3. `deal_room_billing_events` - the append-only record of what was charged.
--
-- ## Three invariants are enforced by the database, not only by code
--
-- The pricing engine in `lib/deal-room/pricing.ts` is pure and well tested, and
-- that is still application code. These three properties are worth a constraint
-- because getting them wrong takes money from a member incorrectly.
--
-- **The price must match the capacity it was charged for.** `period_price_cents`
-- is CHECKed against the authority's own formula, so a row whose price does not
-- follow from its purchased capacity cannot be written at all - not by a bug,
-- not by an admin console, not by a hand-typed INSERT.
--
-- **The $199 cap is a database fact.** It falls out of the same CHECK, and is
-- also asserted independently so the intent survives a future edit to the
-- formula.
--
-- **A room cannot hold two active periods at once.** A partial unique index, so
-- a retry, a double-submitted checkout or a race cannot bill one room twice for
-- the same window.
--
-- ## The launch-partner waiver keeps its value anchor
--
-- Authority section 17 requires a 100% promotional waiver to read
--
--   Ponte Deal Room      $79 USD
--   Launch partner credit -$79 USD
--   Amount due             $0 USD
--
-- rather than silently recording a free room. So `period_price_cents` always
-- holds the list price and stays bound to the capacity formula, `discount_cents`
-- holds the waiver, and `amount_due_cents` is a stored generated column that
-- cannot drift from the two.
--
-- ## Who may read a bill
--
-- Authority section 11: "Only authorised Master Deal Room administrators may
-- view the complete active-branch count, purchased capacity and total room
-- billing breakdown." And section 4 forbids a participant inferring branch count
-- - naming "a total billing amount where that amount would reveal branch count"
-- as a thing that must not leak.
--
-- `purchased_branch_capacity` is exactly such a number. So the SELECT policy on
-- both tables is `deal_room_can_administer(room_id)`, matching the existing
-- `entitlement read` policy rather than the broader participant policies. **A
-- room participant cannot read these tables at all.**
--
-- ## Grants, and the LB-008 lesson
--
-- LB-008: Supabase `alter default privileges` grants explicitly to `anon` and
-- `authenticated` on every new object in `public`, and `revoke ... from public`
-- does not touch an explicit role grant. RLS would still refuse a non-admin, but
-- a billing table should not be reachable by `anon` at the privilege layer
-- either. Both are revoked explicitly and `authenticated` keeps SELECT only.
--
-- =======================================================================
-- ROLLBACK
--
--   drop trigger if exists deal_room_billing_events_append_only on public.deal_room_billing_events;
--   drop table if exists public.deal_room_billing_events;
--   drop index if exists public.deal_room_room_periods_one_active;
--   alter table public.deal_room_entitlements drop column if exists current_period_id;
--   drop table if exists public.deal_room_room_periods;
--   drop function if exists public.deal_room_billing_append_only();
--   alter table public.deal_room_entitlements drop constraint if exists deal_room_entitlements_kind_check;
--   alter table public.deal_room_entitlements add constraint deal_room_entitlements_kind_check
--     check (kind in ('starter','sponsored','waived'));
--
-- The last two restore the pre-existing CHECK. They fail if any row already
-- carries kind = 'paid', which is correct: a paid room must not be silently
-- downgraded to satisfy a rollback.
-- =======================================================================

set lock_timeout = '5s';

begin;

-- ---------------------------------------------------------------------
-- 0. Append-only guard for the billing record
-- ---------------------------------------------------------------------
--
-- Mirrors `deal_room_events_append_only`, and for the same reason: this refuses
-- UPDATE and DELETE to the table OWNER as well, which RLS never can. A billing
-- history the owning role can silently rewrite is not a billing history.
--
-- Names its own table through `tg_table_name` rather than hard-coding one, so
-- the message stays true if it is ever reused.

create or replace function public.deal_room_billing_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception '%.% is append-only: % is not permitted',
    tg_table_schema, tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

-- Internal. Nothing calls it directly; the trigger fires it. Revoked from every
-- member-reachable role, per 20260730c.
revoke all on function public.deal_room_billing_append_only() from public;
revoke all on function public.deal_room_billing_append_only() from anon;
revoke all on function public.deal_room_billing_append_only() from authenticated;

-- ---------------------------------------------------------------------
-- 1. `paid` becomes a valid entitlement kind
-- ---------------------------------------------------------------------
--
-- Additive: the three existing values are preserved, so no existing row is
-- affected and no backfill is required. `starter` is retained deliberately -
-- authority section 8 permits historical Starter-compatible values to remain
-- "for safe migration and audit purposes", and production holds no Deal Room
-- rows at all today.

alter table public.deal_room_entitlements
  drop constraint if exists deal_room_entitlements_kind_check;

alter table public.deal_room_entitlements
  add constraint deal_room_entitlements_kind_check
  check (kind in ('starter', 'sponsored', 'waived', 'paid'));

-- ---------------------------------------------------------------------
-- 2. deal_room_room_periods
-- ---------------------------------------------------------------------
--
-- One row per purchased 30-day active period. A reactivation after expiry is a
-- new row, never an edit of the old one: authority section 12 makes
-- reactivation "a new paid 30-day period", and the previous period is the
-- durable record of what was bought then.

create table if not exists public.deal_room_room_periods (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.deal_rooms(id) on delete cascade,

  -- USD only. Authority section 6 and section 13; no conversion anywhere.
  currency      text not null default 'usd' check (currency = 'usd'),

  -- Concurrently active principal-counterparty branches this period paid for.
  -- Never below the five the base price includes.
  purchased_branch_capacity integer not null default 5
                  check (purchased_branch_capacity >= 5),

  -- The LIST price, in integer cents, bound to the capacity by the authority's
  -- own formula. Authority section 6:
  --   min(19900, 7900 + max(0, branches - 5) * 1500)
  period_price_cents integer not null
                  check (period_price_cents = least(
                    19900,
                    7900 + greatest(0, purchased_branch_capacity - 5) * 1500
                  )),

  -- Stated independently so the ceiling survives an edit to the formula above.
  constraint deal_room_room_periods_price_cap
                  check (period_price_cents between 0 and 19900),

  -- Authority section 17. A promotional waiver reduces the amount due and
  -- leaves the list price visible.
  discount_cents integer not null default 0 check (discount_cents >= 0),
  constraint deal_room_room_periods_discount_within_price
                  check (discount_cents <= period_price_cents),

  amount_due_cents integer
                  generated always as (period_price_cents - discount_cents) stored,

  period_start  timestamptz not null,
  period_end    timestamptz not null,
  constraint deal_room_room_periods_period_ordered
                  check (period_end > period_start),

  state         text not null default 'pending'
                  check (state in ('pending', 'active', 'expired', 'cancelled')),

  -- Set only by the fulfilment path, never by a browser return. Authority
  -- section 9: "A browser return from a payment provider is not authoritative."
  confirmed_at  timestamptz,
  constraint deal_room_room_periods_active_is_confirmed
                  check (state <> 'active' or confirmed_at is not null),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.deal_room_room_periods is
  'One purchased 30-day Deal Room period. Readable only by a room administrator: purchased_branch_capacity would otherwise disclose branch count (PT-COMMERCIAL-2026-07-31-01 sections 4 and 11).';

comment on column public.deal_room_room_periods.period_price_cents is
  'List price in integer cents, CHECKed against the authority formula. The waiver lives in discount_cents so the value anchor in section 17 is preserved.';

create index if not exists deal_room_room_periods_room_idx
  on public.deal_room_room_periods (room_id);

-- A room may hold at most one active period. Prevents a retry, a
-- double-submitted checkout or a race from billing one room twice for one
-- window.
create unique index if not exists deal_room_room_periods_one_active
  on public.deal_room_room_periods (room_id)
  where state = 'active';

drop trigger if exists touch_deal_room_room_periods on public.deal_room_room_periods;
create trigger touch_deal_room_room_periods
  before update on public.deal_room_room_periods
  for each row execute function public.touch_updated_at();

-- The entitlement points at the period funding it, where one exists.
alter table public.deal_room_entitlements
  add column if not exists current_period_id uuid
  references public.deal_room_room_periods(id) on delete set null;

-- ---------------------------------------------------------------------
-- 3. deal_room_billing_events
-- ---------------------------------------------------------------------
--
-- Append-only. Every charge, waiver and capacity increase leaves one row, and
-- no row is ever edited or removed.
--
-- `provider_event_id` is the idempotency key and is UNIQUE where present, so a
-- replayed Stripe webhook cannot bill twice. That is the property the existing
-- credit webhook gets from `credit_purchases.stripe_session_id`, and it is
-- designed in here rather than added after the first double charge.

create table if not exists public.deal_room_billing_events (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.deal_rooms(id) on delete cascade,
  period_id     uuid references public.deal_room_room_periods(id) on delete restrict,

  kind          text not null
                  check (kind in ('room_activation', 'additional_branch',
                                  'reactivation', 'waiver')),

  amount_cents  integer not null check (amount_cents >= 0 and amount_cents <= 19900),
  currency      text not null default 'usd' check (currency = 'usd'),

  provider      text not null default 'stripe'
                  check (provider in ('stripe', 'ponte_waiver')),

  -- The idempotency key. Unique where present; see the index below.
  provider_event_id   text,
  provider_session_id text,

  -- What the charge bought, for the administrator-only breakdown. Never shown
  -- to a branch participant.
  branch_capacity_before integer check (branch_capacity_before >= 0),
  branch_capacity_after  integer check (branch_capacity_after >= 0),

  occurred_at   timestamptz not null,
  recorded_at   timestamptz not null default now()
);

comment on table public.deal_room_billing_events is
  'Append-only record of Deal Room charges and waivers. Readable only by a room administrator. provider_event_id is the replay-safety key.';

create unique index if not exists deal_room_billing_events_provider_event_idx
  on public.deal_room_billing_events (provider_event_id)
  where provider_event_id is not null;

create index if not exists deal_room_billing_events_room_idx
  on public.deal_room_billing_events (room_id, occurred_at desc);

drop trigger if exists deal_room_billing_events_append_only on public.deal_room_billing_events;
create trigger deal_room_billing_events_append_only
  before update or delete on public.deal_room_billing_events
  for each row execute function public.deal_room_billing_append_only();

-- ---------------------------------------------------------------------
-- 4. Row level security
-- ---------------------------------------------------------------------
--
-- Administrator-only, on both tables. Not "participant", which every other
-- member-facing Deal Room table uses: purchased capacity and a total amount
-- are branch-count disclosures under authority section 4.
--
-- SELECT only. No INSERT, UPDATE or DELETE policy exists for any member, so
-- writes can only ever arrive through a SECURITY DEFINER command - which is a
-- later stage and is not in this file.

alter table public.deal_room_room_periods   enable row level security;
alter table public.deal_room_billing_events enable row level security;

drop policy if exists "room period read" on public.deal_room_room_periods;
create policy "room period read" on public.deal_room_room_periods
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

drop policy if exists "billing event read" on public.deal_room_billing_events;
create policy "billing event read" on public.deal_room_billing_events
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Privileges
-- ---------------------------------------------------------------------
--
-- The LB-008 lesson: Supabase default privileges grant explicitly to `anon` and
-- `authenticated`, and revoking from PUBLIC does not remove an explicit role
-- grant. RLS would refuse a non-administrator anyway; this refuses `anon` a
-- privilege it should never have held, and leaves `authenticated` with SELECT
-- and nothing else.

revoke all on table public.deal_room_room_periods   from anon;
revoke all on table public.deal_room_billing_events from anon;

revoke all on table public.deal_room_room_periods   from authenticated;
revoke all on table public.deal_room_billing_events from authenticated;

grant select on table public.deal_room_room_periods   to authenticated;
grant select on table public.deal_room_billing_events to authenticated;

commit;
