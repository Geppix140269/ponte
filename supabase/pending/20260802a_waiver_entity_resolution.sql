-- The first-activation waiver: entity resolution, the claim, and the allowance.
--
-- **WRITTEN AND NOT APPLIED.** Target-schema work under `WO-6.4`.
--
-- It may not be applied to production until `DECISION-20` steps 3, 4 and 5 are
-- complete and the second reviewer required by `DECISION-24` has seen both this
-- file and the rehearsal evidence. Nothing here is authorised by being merged.
--
-- Authority: `ADR-0029`, and `docs/ponte/PONTE-WAIVER-ENTITY-RESOLUTION-SPEC.md`
-- accepted 2 August 2026.
--
-- ======================================================================
-- WHAT THIS EXTENDS, AND WHAT IT LEAVES ALONE
-- ======================================================================
--
-- `20260731e_deal_room_paid_room_periods.sql` is **extended, not replaced**.
-- Its capacity-bound `period_price_cents` CHECK, its independent $199 cap, its
-- `discount_cents`, its generated `amount_due_cents`, its one-active-period
-- partial unique index, its append-only billing trigger and its
-- administrator-only RLS all serve this model unchanged. That file already
-- anticipated the waiver: `deal_room_billing_events.kind` admits `'waiver'` and
-- `provider` admits `'ponte_waiver'`.
--
-- Nothing in it is dropped, altered or rewritten here.
--
-- ======================================================================
-- THE ONE THING THE EXISTING TABLE CANNOT EXPRESS
-- ======================================================================
--
-- Under the waiver the list price stays $79 **with five branches priced in**,
-- while **one** branch is permitted. Those are two different numbers and
-- `deal_room_room_periods` has one:
--
--   purchased_branch_capacity integer not null default 5 check (>= 5)
--
-- It is bound by CHECK to the price formula, so it cannot be lowered to 1
-- without breaking the price. That binding is correct and is kept. What is
-- added is a **separate allowance**: what the room may actually open, as
-- against what its price paid for.
--
-- ======================================================================
-- WHY A RESOLVED ENTITY AND NOT AN ORGANISATION
-- ======================================================================
--
-- `public.organizations` has exactly one unique constraint, its primary key.
-- `registration_number`, `vat_number`, `name_normalized` and `domain_normalized`
-- are all nullable and all non-unique, so "one waiver per organisation" has no
-- subject: the same company can exist as two rows and draw two waivers.
--
-- So identity is resolved from **externally verified** evidence instead, and
-- the resolved entity carries **many identifiers** rather than one identifier
-- acting as the key. That is what closes the leak the specification names:
--
--   an entity verifies with a registry number and claims its waiver;
--   it later obtains an LEI, re-verifies, resolves to a DIFFERENT key
--   under any priority rule, and claims a SECOND waiver.
--
-- With many identifiers per entity, the later LEI attaches to the entity that
-- already exists and its claim is already spent.
--
-- **`verifications` gets no uniqueness.** It is a log - re-verification,
-- rescreening, an upgraded level, a periodic refresh are all legitimate history,
-- which is why it carries `rescreened_at` and `level_requested`. Uniqueness
-- belongs on the claim, never on the evidence.
--
-- ======================================================================
-- ROLLBACK
-- ======================================================================
--
--   drop table if exists public.waiver_claim;
--   drop table if exists public.waiver_entity_identifier;
--   drop table if exists public.waiver_entity;
--   alter table public.deal_room_room_periods
--     drop constraint if exists deal_room_room_periods_allowance_within_capacity,
--     drop constraint if exists deal_room_room_periods_waived_allowance,
--     drop constraint if exists deal_room_room_periods_waived_discount_cap,
--     drop column if exists branch_allowance,
--     drop column if exists is_waived;
--
-- Clean while no waiver has been claimed. Once one has, dropping `waiver_claim`
-- destroys the record that a concession was spent, and that is a retention
-- decision and an owner action rather than a rollback step.
-- ======================================================================

-- ---------------------------------------------------------------------
-- 1. The resolved legal entity
-- ---------------------------------------------------------------------

create table if not exists public.waiver_entity (
  id          uuid primary key default gen_random_uuid(),

  -- Administrative reading ONLY. Never used to match, never compared, never
  -- normalised into a key. The whole point of this table is that identity does
  -- not come from typed text, and a name column is the obvious place for that
  -- discipline to erode - so it is documented here rather than assumed.
  display_name text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.waiver_entity is
  'One resolved legal entity for the first-activation waiver (ADR-0029). Identity comes from waiver_entity_identifier, never from display_name.';
comment on column public.waiver_entity.display_name is
  'Administrative reading only. MUST NOT be used to match or resolve identity.';

-- ---------------------------------------------------------------------
-- 2. Its identifiers, each globally unique
-- ---------------------------------------------------------------------

create table if not exists public.waiver_entity_identifier (
  id        uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.waiver_entity(id) on delete restrict,

  -- Constrained, and extensible by design: further schemes are anticipated.
  scheme    text not null check (scheme in ('lei', 'registry')),

  /*
    NULL for `lei`, which is global by construction. REQUIRED for `registry`.

    Registries are frequently subnational or plural - Delaware and California
    issue independently, Germany issues HRB numbers through many local
    Amtsgerichte, each UAE free zone keeps its own register - so a bare
    registration number collides across them. Country is NOT sufficient and is
    deliberately not what this holds.
  */
  authority text,

  value_normalised text not null check (length(trim(value_normalised)) > 0),

  -- Provenance. `restrict`, because the evidence for an identity must not be
  -- deletable while the identity stands on it.
  first_seen_verification_id uuid references public.verifications(id) on delete restrict,

  created_at timestamptz not null default now(),

  -- An LEI is global; a registry number without its issuing authority is not an
  -- identity at all. Enforced rather than left to the application.
  constraint waiver_entity_identifier_authority_by_scheme check (
    (scheme = 'lei'      and authority is null) or
    (scheme = 'registry' and authority is not null and length(trim(authority)) > 0)
  ),

  -- Normalised on the way in, so NULL and '' can never both exist for one
  -- scheme and slip a duplicate past the unique index below.
  constraint waiver_entity_identifier_authority_normalised check (
    authority is null or authority = upper(trim(authority))
  ),
  constraint waiver_entity_identifier_value_normalised check (
    value_normalised = upper(trim(value_normalised))
  )
);

/*
  THE constraint. Globally unique, across every entity.

  `coalesce(authority, '')` because NULL is not equal to NULL in a unique index,
  so two `lei` rows with the same value and a NULL authority would both be
  admitted - which is precisely the duplicate this is meant to stop. The CHECK
  above already forbids an empty-string authority, so the sentinel cannot
  collide with a real one.
*/
create unique index if not exists waiver_entity_identifier_unique
  on public.waiver_entity_identifier (scheme, coalesce(authority, ''), value_normalised);

create index if not exists waiver_entity_identifier_entity_idx
  on public.waiver_entity_identifier (entity_id);

comment on table public.waiver_entity_identifier is
  'Identifiers held by one resolved entity. An entity carries many; each is globally unique. This is what stops a later LEI resolving to a second entity and drawing a second waiver.';

-- ---------------------------------------------------------------------
-- 3. The claim: at most one per entity, once and forever
-- ---------------------------------------------------------------------

create table if not exists public.waiver_claim (
  id        uuid primary key default gen_random_uuid(),

  /*
    UNIQUE, not a partial index.

    The claim survives expiry, closure and reactivation: it is consumed once and
    forever. A partial index over "active" rows would release the waiver the
    moment the room lapsed, which is the opposite of the rule.
  */
  entity_id uuid not null unique references public.waiver_entity(id) on delete restrict,

  -- What it was spent on.
  room_id   uuid not null references public.deal_rooms(id) on delete restrict,
  period_id uuid references public.deal_room_room_periods(id) on delete restrict,

  -- The verification that established eligibility, kept as evidence.
  verification_id uuid references public.verifications(id) on delete restrict,

  /*
    NOT NULL, and NOT `on delete set null`.

    `deal_room_entitlements.org_id` is nullable with `ON DELETE SET NULL`, so
    deleting an organisation would release a consumed waiver. `restrict` here
    means a spent concession keeps its subject: an organisation with a claim
    against it cannot simply be deleted.
  */
  org_id    uuid not null references public.organizations(id) on delete restrict,

  claimed_at timestamptz not null default now()
);

comment on table public.waiver_claim is
  'At most one first-activation waiver per resolved entity, consumed once and forever. Survives expiry, closure and reactivation by design.';

-- ---------------------------------------------------------------------
-- 4. The allowance, distinct from the priced capacity
-- ---------------------------------------------------------------------

alter table public.deal_room_room_periods
  add column if not exists is_waived boolean not null default false,
  -- What the room may OPEN. `purchased_branch_capacity` stays what the price
  -- PAID FOR, still bound to the authority formula by its existing CHECK.
  add column if not exists branch_allowance integer;

-- Backfill before the constraints, so an existing row cannot fail them. There
-- are no rows today - this table is unapplied - and it is written anyway,
-- because a migration that only works on an empty table is a migration that
-- fails the first time it matters.
update public.deal_room_room_periods
   set branch_allowance = purchased_branch_capacity
 where branch_allowance is null;

alter table public.deal_room_room_periods
  alter column branch_allowance set not null;

do $$
begin
  -- A waived period permits exactly one branch. Any other period permits what
  -- it paid for. Stated as one constraint so the two cannot drift.
  if not exists (select 1 from pg_constraint where conname = 'deal_room_room_periods_waived_allowance') then
    alter table public.deal_room_room_periods
      add constraint deal_room_room_periods_waived_allowance check (
        (is_waived and branch_allowance = 1) or
        (not is_waived and branch_allowance = purchased_branch_capacity)
      );
  end if;

  -- An allowance may never exceed what was paid for.
  if not exists (select 1 from pg_constraint where conname = 'deal_room_room_periods_allowance_within_capacity') then
    alter table public.deal_room_room_periods
      add constraint deal_room_room_periods_allowance_within_capacity check (
        branch_allowance >= 1 and branch_allowance <= purchased_branch_capacity
      );
  end if;

  /*
    A waived period discounts the WHOLE base fee and never a part of it, and a
    period that is not waived discounts nothing.

    This is what makes the $120 additional-branch cap fall out rather than being
    typed: the discount is fixed at $79, `period_price_cents` is already capped
    at $199 by its own CHECK, so additional charges inside a waived period can
    never exceed $199 - $79 = $120. The cap is a consequence of two existing
    constraints instead of a third number that could disagree with them.
  */
  if not exists (select 1 from pg_constraint where conname = 'deal_room_room_periods_waived_discount_cap') then
    alter table public.deal_room_room_periods
      add constraint deal_room_room_periods_waived_discount_cap check (
        (is_waived and discount_cents = 7900) or
        (not is_waived and discount_cents = 0)
      );
  end if;
end $$;

comment on column public.deal_room_room_periods.branch_allowance is
  'What this period may OPEN. Distinct from purchased_branch_capacity, which is what its price paid for. 1 while waived.';
comment on column public.deal_room_room_periods.is_waived is
  'True while the first-activation waiver applies. Set false on lapse; the period row is NOT closed and the 30 calendar days do not restart.';

-- ---------------------------------------------------------------------
-- 5. Row level security, matching the tables this extends
-- ---------------------------------------------------------------------
--
-- Deny-all to `anon` and `authenticated`. No policy is created, deliberately:
-- an entity identifier and a claim are commercial facts about a member's legal
-- identity, and nothing in the member-facing product needs to read them. Both
-- reach the interface, if ever, through a `SECURITY DEFINER` command.
--
-- RLS enabled with no policy is the same shape as the thirteen public tables
-- the WO-2 reconciliation found already in that state, and it is deliberate
-- here rather than an omission.

alter table public.waiver_entity            enable row level security;
alter table public.waiver_entity_identifier enable row level security;
alter table public.waiver_claim             enable row level security;

-- ---------------------------------------------------------------------
-- 6. What is deliberately NOT in this file
-- ---------------------------------------------------------------------
--
-- **The resolution and claim command.** The specification requires one atomic
-- `SECURITY DEFINER` transaction containing the entitlement, the period row,
-- the billing event and the claim - or none of them. It is a later stage, it
-- needs the grants and no-overload treatment every other Deal Room command
-- carries, and putting a command in the same file as the tables it writes would
-- make this file impossible to review as a schema change.
--
-- **Any uniqueness on `verifications`.** It is a log. Stated twice on purpose.
--
-- **Any change to `deal_room_entitlements.kind`.** Its CHECK already admits
-- `waived`, which is what a waived first activation should use: `starter` is a
-- retired product name, and ADR-0029 keeps the Starter feature set superseded,
-- so reusing it would reintroduce the vocabulary the decision removed. No CHECK
-- change is needed and none is made.
--
-- **Any change to `deal_room_entitlements.org_id`.** Tightening its
-- `ON DELETE SET NULL` is a change to a table that already holds production
-- rows in principle, and it belongs with the entitlement work rather than here.
-- `waiver_claim.org_id` carries the strict rule for the fact that matters.
--
-- **Anything touching `organizations`.** No unique constraint is added to it.
-- The decision routes identity around that table rather than through it.
