-- Automated listing publication, the structured quantity, and the lifecycle
-- audit trail.
--
-- Authority: ADR-0012 (Automated listing publication and unified transactional
-- email), accepted 28 July 2026.
--
-- Written against the recorded production state in docs/codex/DATABASE-STATE.md
-- and the migration chain, not against a fresh project. Every statement is
-- additive and idempotent: the file is safe to re-run, and nothing here drops a
-- column, narrows an existing type or rewrites a member's data.
--
-- WHAT THIS DOES NOT DO
--
--   It does not publish anything. There is no bulk UPDATE that moves existing
--   `submitted` rows to `approved`. A legacy row publishes only when the
--   central validator has run over it, and the validator is application code
--   because it needs the submitter's live verification state, the media and
--   document counts and the safety pass. A migration that published rows by
--   status alone would put unvalidated, possibly unverified listings on the
--   public board, which is precisely the failure mode this work exists to avoid.

-- ===========================================================================
-- 1. Lifecycle states
-- ===========================================================================
-- `validating`, `needs_information`, `flagged` and `suspended` join the
-- vocabulary. The states already in use are all preserved: `approved` remains
-- the stored value for a public listing (it is presented as "Published"), so no
-- index, RLS policy or public read path changes meaning.
--
-- 20260722c noted that a duplicate `listings_status_check1` had survived an
-- earlier edit and silently rejected values the visible constraint allowed. It
-- is dropped again here defensively: a constraint that reappears is cheaper to
-- drop twice than to debug once.
alter table listings drop constraint if exists listings_status_check1;
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check check (
  status in (
    'draft', 'submitted', 'validating', 'needs_information',
    'approved', 'flagged', 'suspended', 'rejected',
    'expired', 'withdrawn', 'closed', 'closed_done', 'archived'
  )
);

-- ===========================================================================
-- 2. The structured quantity
-- ===========================================================================
-- `quantity` is already `numeric`, so decimals have always been storable and no
-- data needs converting. What was missing was the member's commercial STANCE:
-- a single number cannot say "approximately", "at least", "between", or "ask
-- me", so every one of those was previously stored as a bare figure that reads
-- as a firm quantity.
--
-- numeric without precision keeps exact decimal arithmetic. A float here would
-- make 1.25 MT a value that does not compare equal to itself across a round
-- trip, which for a commercial quantity is not acceptable.
alter table listings add column if not exists quantity_mode text;
alter table listings add column if not exists quantity_min  numeric;
alter table listings add column if not exists quantity_max  numeric;

alter table listings drop constraint if exists listings_quantity_mode_check;
alter table listings add constraint listings_quantity_mode_check check (
  quantity_mode is null or quantity_mode in (
    'exact', 'approximate', 'minimum', 'maximum', 'range', 'negotiable', 'on_request'
  )
);

-- A range is ordered, and every stated figure is positive. These are the two
-- invariants the application validates; enforcing them here means a direct SQL
-- write cannot create a listing that says "500 to 200 MT".
alter table listings drop constraint if exists listings_quantity_range_check;
alter table listings add constraint listings_quantity_range_check check (
  quantity_mode is distinct from 'range'
  or (quantity_min is not null and quantity_max is not null and quantity_min < quantity_max)
);

alter table listings drop constraint if exists listings_quantity_positive_check;
alter table listings add constraint listings_quantity_positive_check check (
  (quantity     is null or quantity     > 0)
  and (quantity_min is null or quantity_min > 0)
  and (quantity_max is null or quantity_max > 0)
);

-- Existing rows carry a number and no mode. A number that was entered as a
-- plain figure always meant "this quantity", so it is read as `exact`.
-- Softening it to `approximate` would weaken a claim the member made firmly.
update listings
   set quantity_mode = 'exact'
 where quantity_mode is null
   and quantity is not null;

-- ===========================================================================
-- 3. Document-extracted values need confirming
-- ===========================================================================
-- A quantity read out of an uploaded PDF is not a statement by anybody until
-- the member responsible for the listing says it is. Publication is blocked
-- while an extracted quantity is unconfirmed.
alter table listings add column if not exists quantity_extracted    boolean not null default false;
alter table listings add column if not exists quantity_confirmed_at timestamptz;

-- ===========================================================================
-- 4. The member responsibility declaration
-- ===========================================================================
-- Ponte does not publish on somebody's behalf without them accepting that the
-- information is accurate, that they are authorised to submit it, and that
-- publication is not verification or endorsement. The accepted VERSION is
-- stored alongside the timestamp: knowing that somebody accepted terms is
-- worthless without knowing which terms.
alter table listings add column if not exists declaration_accepted_at timestamptz;
alter table listings add column if not exists declaration_version     text;

-- ===========================================================================
-- 5. Automated safety flags
-- ===========================================================================
-- The machine-readable reason a listing was held. `flag_reason` is the primary
-- code and `safety_flags` is the full finding list, so the exception console
-- can filter on one and show the other.
alter table listings add column if not exists safety_flags  jsonb;
alter table listings add column if not exists flag_reason   text;
alter table listings add column if not exists flag_severity text;

alter table listings drop constraint if exists listings_flag_severity_check;
alter table listings add constraint listings_flag_severity_check check (
  flag_severity is null or flag_severity in ('high', 'medium', 'low')
);

-- ===========================================================================
-- 6. Completeness
-- ===========================================================================
-- How much of the useful record the member stated, 0-100. It drives ranking,
-- search visibility and the prompts to improve a listing.
--
-- It is NOT a trust score and must never be rendered as one. A listing can
-- score 100 and be entirely untrue; the score counts fields, and Ponte has not
-- checked any of the commercial claims in them.
alter table listings add column if not exists completeness_score int;

alter table listings drop constraint if exists listings_completeness_range_check;
alter table listings add constraint listings_completeness_range_check check (
  completeness_score is null or (completeness_score between 0 and 100)
);

-- ===========================================================================
-- 7. Lifecycle audit trail
-- ===========================================================================
-- Every status change, who caused it and why. Without this, "why is this
-- listing flagged" is answerable only by re-running the validator against
-- today's rules rather than the ones that actually applied.
--
-- Deliberately NOT stored here: email bodies, subject lines with interpolated
-- member data, or anything read out of an uploaded document. The event says
-- what happened, not what was written.
create table if not exists listing_events (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings (id) on delete cascade,
  event        text not null,
  from_status  text,
  to_status    text,
  actor_type   text not null default 'system',
  actor_id     uuid references auth.users (id) on delete set null,
  -- Which version of the automated rules produced this outcome. A reason code
  -- without a rule version is not reproducible six months later.
  rule_version text,
  reason_code  text,
  -- Structured, non-sensitive context: issue codes, flag codes, template name,
  -- provider message id, failure category.
  detail       jsonb,
  created_at   timestamptz not null default now()
);

alter table listing_events drop constraint if exists listing_events_actor_type_check;
alter table listing_events add constraint listing_events_actor_type_check check (
  actor_type in ('member', 'system', 'admin')
);

create index if not exists listing_events_listing_idx
  on listing_events (listing_id, created_at desc);
create index if not exists listing_events_event_idx
  on listing_events (event, created_at desc);

alter table listing_events enable row level security;

-- A member sees the history of their own listing. Nobody but an admin sees
-- anybody else's, and NOBODY writes through RLS: events are written by trusted
-- server-side code under the service role, so a member cannot forge a
-- "listing_published" event for a listing that was never published.
drop policy if exists "Members read own listing events" on listing_events;
create policy "Members read own listing events"
  on listing_events for select to authenticated
  using (exists (
    select 1 from listings l
     where l.id = listing_events.listing_id
       and l.user_id = auth.uid()
  ));

drop policy if exists "Admins read all listing events" on listing_events;
create policy "Admins read all listing events"
  on listing_events for select
  using ((select is_admin()));

-- ===========================================================================
-- 8. Row-level security: a member still cannot publish themselves
-- ===========================================================================
-- This is the security half of automated publication. "Automated" means a
-- trusted server-side validator decides, NOT that the client may write its own
-- status. The policies are restated here so the new states are covered
-- explicitly rather than by omission.
--
-- A member may create a draft or hand one in. A member may put their own work
-- back to draft, hand it in, or withdraw it. A member may NOT write `approved`,
-- `flagged`, `suspended`, `validating` or `needs_information`, and may not
-- clear `safety_flags` — those transitions belong to the validator and the
-- exception console.
drop policy if exists "Members create own listings" on listings;
create policy "Members create own listings"
  on listings for insert to authenticated
  with check (auth.uid() = user_id and status in ('draft', 'submitted'));

drop policy if exists "Members submit own drafts" on listings;
create policy "Members submit own drafts"
  on listings for update to authenticated
  using (
    auth.uid() = user_id
    and status in ('draft', 'needs_information', 'expired', 'rejected', 'withdrawn')
  )
  with check (
    auth.uid() = user_id
    and status in ('draft', 'submitted', 'withdrawn')
  );

-- Taking your own live listing down is a member's right and needs its own
-- policy: the rule above cannot reach a row that is currently `approved`.
-- Withdrawal is the ONLY transition it permits out of a public state.
drop policy if exists "Members withdraw own live listings" on listings;
create policy "Members withdraw own live listings"
  on listings for update to authenticated
  using (auth.uid() = user_id and status = 'approved')
  with check (auth.uid() = user_id and status in ('approved', 'withdrawn'));

-- ===========================================================================
-- 9. Legacy reconciliation
-- ===========================================================================
-- Rows sitting in `submitted` predate automated publication. They are NOT
-- published here, for the reason recorded at the top of this file.
--
-- They are left in `submitted`. The application re-validates a legacy row the
-- next time it is touched, and the exception console lists `submitted` as an
-- exception state precisely so that a backlog is visible rather than silent.
--
-- What IS reconciled: rows that a human already marked as needing work, so the
-- member sees an honest state and a route to fix it rather than an indefinite
-- wait. A rejected row with a decision note has been read by a person and its
-- meaning is preserved exactly.
update listings
   set completeness_score = null
 where completeness_score is not null
   and status = 'draft';

-- Every listing that is already public is recorded as having reached that state,
-- so the audit trail does not begin with a gap. `actor_type` is 'admin' because
-- that is what actually happened for these rows.
insert into listing_events (listing_id, event, from_status, to_status, actor_type, reason_code, created_at)
select l.id, 'listing_published', 'submitted', 'approved', 'admin',
       'legacy_desk_approval', coalesce(l.decided_at, l.created_at)
  from listings l
 where l.status = 'approved'
   and not exists (
     select 1 from listing_events e
      where e.listing_id = l.id and e.event = 'listing_published'
   );

-- ===========================================================================
-- 10. Indexes the new surfaces read
-- ===========================================================================
-- The exception console orders by arrival within a status.
create index if not exists listings_exception_idx
  on listings (status, created_at desc)
  where status in ('flagged', 'suspended', 'needs_information', 'submitted');

-- Ranking and search visibility read the score on public rows only.
create index if not exists listings_completeness_idx
  on listings (completeness_score desc)
  where status = 'approved';

create index if not exists listings_flag_reason_idx
  on listings (flag_reason)
  where flag_reason is not null;
