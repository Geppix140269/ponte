-- Deal Room launch slice: core domain.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260729a_deal_room_core.sql
--
-- NOT APPLIED. Written and reviewed at Gate B; it has not been run against
-- production and must not be until the owner approves it at Gate C. A merge to
-- `main` applies nothing in this repository (docs/codex/DATABASE-STATE.md: the
-- historical chain aborts at its first file), so this is applied by hand and
-- recorded in `public.schema_migrations` with its SHA-256.
--
-- Authority: issue #97; ADR-0003, ADR-0008, ADR-0009 as amended by the owner
-- decision of 29 July 2026; docs/codex/audits/2026-07-29-deal-room-preflight.md;
-- docs/plans/active/deal-room-launch-slice.md.
--
-- ============================ WHAT THIS IS NOT =========================
--
-- It does not touch the legacy Deal-era cluster. `deals`, `deal_documents`,
-- `deal_events`, `deal_status_history`, `messages`, `settlements`,
-- `settlement_milestones`, `settlement_events` and `is_deal_participant()` are
-- left exactly as they are: not dropped, not renamed, not altered, not
-- declared. The Gate A disposition established that they are empty, referenced
-- by no code, and structurally unable to carry this product - `deals.listing_id`
-- points at `listings_legacy_20260720` rather than the live `listings`, and
-- `is_deal_participant()` is two-party and has no concept of an organisation, a
-- sub-room, an admission state or an agreement acceptance.
--
-- Everything here is new and prefixed `deal_room_`, which cannot collide with
-- that cluster and makes the boundary obvious in any query, policy or log.
--
-- No existing table, column, constraint, index, policy, function, trigger or
-- bucket is modified by this file. It is additive throughout and idempotent:
-- running it twice changes nothing.
--
-- ================================ ROLLBACK =============================
--
-- Withdrawal is clean only while these tables are empty. Once a member has
-- uploaded evidence into a room, withdrawal becomes a retention decision, not a
-- rollback, and is an owner decision.
--
-- The rollback of record is NOT this script: it is setting NEXT_PUBLIC_DEAL_ROOM
-- to anything other than `on` and redeploying, which makes the slice
-- unreachable in one deploy cycle with no database action at all.
--
-- If the schema must be withdrawn, in this order (child before parent):
--
--   drop table if exists public.deal_room_activity_events;
--   drop table if exists public.deal_room_blockers;
--   drop table if exists public.deal_room_clarifications;
--   drop table if exists public.deal_room_evidence_versions;
--   drop table if exists public.deal_room_evidence;
--   drop table if exists public.deal_room_procedure_approvals;
--   drop table if exists public.deal_room_procedure_steps;
--   drop table if exists public.deal_room_procedures;
--   drop table if exists public.deal_room_agreement_acceptances;
--   drop table if exists public.deal_room_invitations;
--   drop table if exists public.deal_room_participants;
--   drop table if exists public.deal_room_sub_rooms;
--   drop table if exists public.deal_room_entitlements;
--   drop table if exists public.deal_rooms;
--   drop function if exists public.deal_room_events_append_only();
--   drop function if exists public.deal_room_uuid_or_null(text);
--
-- Run 20260729b's rollback (policies, helpers, command functions) BEFORE this
-- one, and 20260729c's (storage) before that.
-- =======================================================================

set lock_timeout = '5s';

begin;

-- ---------------------------------------------------------------------
-- 0. Helpers this file installs
-- ---------------------------------------------------------------------

-- Cast text to uuid, or null on anything that is not one.
--
-- Needed by the storage policy in 20260729c. Casting a path segment straight to
-- uuid raises 22P02 on a malformed path, and Postgres does not guarantee AND
-- evaluation order, so a regex guard placed first in the predicate is not
-- sufficient to prevent it. A raising policy is an error, not a denial, and the
-- difference matters: it turns a crafted object name into a broken query rather
-- than a refused one.
create or replace function public.deal_room_uuid_or_null(p_text text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return p_text::uuid;
exception
  when others then
    return null;
end;
$$;

comment on function public.deal_room_uuid_or_null(text) is
  'Returns the uuid, or null when the text is not one. Used by Deal Room storage policies so a malformed object path denies instead of raising.';

-- The append-only guard for the activity table.
--
-- Members have no INSERT policy on that table at all - rows are written only
-- inside the authorised command functions - but this refuses UPDATE and DELETE
-- to the table OWNER as well, which RLS never can. An audit history that the
-- owning role can silently rewrite is not an audit history.
create or replace function public.deal_room_events_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'deal_room_activity_events is append-only: % is not permitted', tg_op
    using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------
-- 1. deal_rooms - the master room
-- ---------------------------------------------------------------------

create table if not exists public.deal_rooms (
  id                     uuid primary key default gen_random_uuid(),
  ref                    text not null unique,

  -- The structured Deal. `on delete restrict` is deliberate: a room must never
  -- be orphaned or cascade-deleted by an upstream change to the Deal. Removing
  -- a Deal that has a room is a decision, and this makes somebody take it.
  listing_id             uuid not null references public.listings(id) on delete restrict,

  -- The immutable Deal Version. A later edit to the published Deal cannot
  -- silently rewrite what the parties agreed to work on, which is the whole
  -- reason a room references a version rather than a live row.
  deal_snapshot          jsonb not null,

  market_family          text not null check (market_family in ('products','services','distribution')),
  market_intent          text,

  title                  text not null,
  purpose                text,
  completion_condition   text not null,

  operating_mode         text not null default 'software_only'
                           check (operating_mode in ('software_only','ponte_observed','ponte_facilitated',
                                                     'ponte_managed_procedure','institutionally_sponsored')),

  initiator_profile_id   uuid not null references public.profiles(id) on delete restrict,
  sponsor_profile_id     uuid references public.profiles(id) on delete set null,
  sponsor_org_id         uuid references public.organizations(id) on delete set null,

  state                  text not null default 'draft'
                           check (state in ('draft','proposed','awaiting_principal_admission','activation_pending',
                                            'active_procedure_not_agreed','active_procedure_agreed','blocked','paused',
                                            'read_only','ready_to_proceed','completed','closed',
                                            'declined_before_activation','cancelled_before_activation',
                                            'expired_before_activation','withdrawn')),

  activated_at           timestamptz,
  read_only_at           timestamptz,
  closed_at              timestamptz,
  closure_outcome        text,
  closure_reason         text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.deal_rooms is
  'Master Deal Room. One defined Deal scope. Additive to the legacy deals cluster, which is untouched.';

create index if not exists deal_rooms_listing_idx   on public.deal_rooms (listing_id);
create index if not exists deal_rooms_sponsor_idx   on public.deal_rooms (sponsor_org_id);
create index if not exists deal_rooms_initiator_idx on public.deal_rooms (initiator_profile_id);
create index if not exists deal_rooms_state_idx     on public.deal_rooms (state);

drop trigger if exists touch_deal_rooms on public.deal_rooms;
create trigger touch_deal_rooms before update on public.deal_rooms
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. deal_room_entitlements - held APART from room lifecycle
-- ---------------------------------------------------------------------
--
-- Its own table, not two more columns on deal_rooms, because issue #97 and
-- ADR-0009 both require entitlement state to be separate from room lifecycle
-- state. A room can be `active` while its entitlement is `expired`: the result
-- is a readable room that refuses writes, which is exactly read-only continuity.
--
-- No price, no currency, no Stripe identifier, no invoice. Launch scope is
-- Starter and authorised waiver.

create table if not exists public.deal_room_entitlements (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null unique references public.deal_rooms(id) on delete cascade,
  org_id        uuid references public.organizations(id) on delete set null,

  kind          text not null check (kind in ('starter','sponsored','waived')),
  state         text not null default 'eligible'
                  check (state in ('eligible','reserved','active','grace','expired','suspended','restored','closed')),

  reserved_at   timestamptz,
  activated_at  timestamptz,
  expires_at    timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.deal_room_entitlements is
  'Entitlement state, separate from room lifecycle. Launch scope: starter and waived only. No pricing or Stripe.';

create index if not exists deal_room_entitlements_org_idx on public.deal_room_entitlements (org_id);

drop trigger if exists touch_deal_room_entitlements on public.deal_room_entitlements;
create trigger touch_deal_room_entitlements before update on public.deal_room_entitlements
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. deal_room_sub_rooms - the private permission scope
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_sub_rooms (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.deal_rooms(id) on delete cascade,
  ref         text not null,
  purpose     text not null,
  kind        text not null check (kind in ('counterparty','provider','adviser','internal')),
  state       text not null default 'draft'
                check (state in ('draft','invitation_pending','awaiting_admission','active','blocked','paused',
                                 'outcome_reached','closed')),
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz,
  unique (room_id, ref)
);

comment on table public.deal_room_sub_rooms is
  'A private permission scope beneath a master room. Its SELECT policy returns zero rows to a non-participant, which is how sub-room isolation is enforced.';

create index if not exists deal_room_sub_rooms_room_idx on public.deal_room_sub_rooms (room_id);

drop trigger if exists touch_deal_room_sub_rooms on public.deal_room_sub_rooms;
create trigger touch_deal_room_sub_rooms before update on public.deal_room_sub_rooms
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. deal_room_participants
-- ---------------------------------------------------------------------
--
-- `org_id` OR `declared_capacity`, and once admitted at least one is required.
-- The Gate A preflight found `organizations` empty and no profile bound to one,
-- so admission cannot read an existing organisation; it creates or attaches one,
-- or records the declared professional capacity ADR-0003 section 6 permits.

create table if not exists public.deal_room_participants (
  id                    uuid primary key default gen_random_uuid(),
  room_id               uuid not null references public.deal_rooms(id) on delete cascade,
  -- Null means admitted at master level rather than to one sub-room.
  sub_room_id           uuid references public.deal_room_sub_rooms(id) on delete cascade,
  profile_id            uuid not null references public.profiles(id) on delete restrict,

  org_id                uuid references public.organizations(id) on delete set null,
  declared_capacity     text,

  participant_class     text not null
                          check (participant_class in ('principal','intermediary','provider','adviser',
                                                       'ponte_facilitator','observer')),
  transaction_role      text not null,
  participation_authority text,
  is_required_approver  boolean not null default false,
  is_room_administrator boolean not null default false,

  state                 text not null default 'invited'
                          check (state in ('invited','prerequisites_pending','terms_pending','admitted','active',
                                           'suspended','removed','withdrawn')),

  invited_by            uuid references public.profiles(id) on delete set null,
  invited_at            timestamptz not null default now(),
  admitted_at           timestamptz,
  removed_at            timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- An admitted participant must be identifiable as an organisation or a
  -- declared capacity. Before admission neither is required yet.
  constraint deal_room_participants_identity_when_admitted
    check (
      state not in ('admitted','active')
      or org_id is not null
      or (declared_capacity is not null and length(btrim(declared_capacity)) > 0)
    )
);

comment on table public.deal_room_participants is
  'Person plus organisation or declared capacity, class, role, authority and admission state. Only admitted/active may act.';

-- Two partial uniques rather than one: a person may hold a master-level
-- participation AND a sub-room participation, but not two of either.
create unique index if not exists deal_room_participants_sub_unique
  on public.deal_room_participants (sub_room_id, profile_id)
  where sub_room_id is not null;

create unique index if not exists deal_room_participants_master_unique
  on public.deal_room_participants (room_id, profile_id)
  where sub_room_id is null;

create index if not exists deal_room_participants_room_idx    on public.deal_room_participants (room_id);
create index if not exists deal_room_participants_sub_idx     on public.deal_room_participants (sub_room_id);
create index if not exists deal_room_participants_profile_idx on public.deal_room_participants (profile_id);

drop trigger if exists touch_deal_room_participants on public.deal_room_participants;
create trigger touch_deal_room_participants before update on public.deal_room_participants
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. deal_room_invitations
-- ---------------------------------------------------------------------
--
-- The raw token is NEVER stored. The row holds sha256(token); resolution hashes
-- the presented value and looks up the digest, so a database disclosure yields
-- no working invitation.
--
-- `preview_facts` is the exact payload the invitee was shown, and
-- `integrity_preflight` is the Ponte Integrity result as it stood at send time.
-- Both are snapshots: what was disclosed, and what was known, at that moment.

create table if not exists public.deal_room_invitations (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id          uuid not null references public.deal_room_sub_rooms(id) on delete cascade,

  token_sha256         text not null unique check (token_sha256 ~ '^[0-9a-f]{64}$'),
  invited_email        text not null,

  proposed_role        text not null,
  proposed_participant_class text not null
                         check (proposed_participant_class in ('principal','intermediary','provider','adviser',
                                                               'ponte_facilitator','observer')),

  preview_facts        jsonb not null,
  integrity_preflight  jsonb not null,

  state                text not null default 'sent'
                         check (state in ('sent','accepted','declined','expired','revoked')),

  expires_at           timestamptz not null,
  created_by           uuid not null references public.profiles(id) on delete restrict,
  created_at           timestamptz not null default now(),
  accepted_by          uuid references public.profiles(id) on delete set null,
  accepted_at          timestamptz,
  declined_at          timestamptz
);

comment on table public.deal_room_invitations is
  'Protected invitation. Stores sha256(token), never the token. preview_facts is an allowlist built by lib/deal-room/invitation.ts, not a redacted room.';

create index if not exists deal_room_invitations_room_idx on public.deal_room_invitations (room_id);
create index if not exists deal_room_invitations_sub_idx  on public.deal_room_invitations (sub_room_id);

-- ---------------------------------------------------------------------
-- 6. deal_room_agreement_acceptances
-- ---------------------------------------------------------------------
--
-- The click-to-accept evidence set confirmed by the owner on 29 July 2026
-- (issue #97, decision 4): profile identity, organisation or declared capacity,
-- agreement kind, immutable document version, SHA-256 of the accepted content,
-- UTC timestamp, and an attributable append-only activity event.
--
-- NO IP address and NO user agent are stored. That is a deliberate
-- data-minimisation decision, confirmed by the owner, and it is why there is no
-- column for either.
--
-- This is rigorous versioned click-to-accept evidence. It is NOT a qualified,
-- advanced or otherwise regulated electronic signature, and nothing in the
-- product may describe it as one.

create table if not exists public.deal_room_agreement_acceptances (
  id                 uuid primary key default gen_random_uuid(),
  participant_id     uuid not null references public.deal_room_participants(id) on delete cascade,
  room_id            uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id        uuid references public.deal_room_sub_rooms(id) on delete cascade,

  agreement_kind     text not null
                       check (agreement_kind in ('participation','nda','room_rules','authority_declaration')),
  document_version   text not null,
  document_sha256    text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),

  -- Denormalised on purpose: the acceptance must remain readable as it stood,
  -- even if the participant later changes organisation.
  accepted_as        text not null,

  accepted_at        timestamptz not null default now(),

  unique (participant_id, agreement_kind, document_version)
);

comment on table public.deal_room_agreement_acceptances is
  'Versioned click-to-accept evidence. No IP or user agent by owner decision (issue #97). Not an electronic signature.';

create index if not exists deal_room_agreement_participant_idx
  on public.deal_room_agreement_acceptances (participant_id);

-- ---------------------------------------------------------------------
-- 7. deal_room_procedures - immutable versions
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_procedures (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id          uuid references public.deal_room_sub_rooms(id) on delete cascade,

  version              integer not null check (version > 0),
  summary              text not null,
  completion_condition text not null,

  state                text not null default 'draft'
                         check (state in ('draft','proposed','amendment_requested','approved','superseded','completed')),

  proposed_by          uuid not null references public.profiles(id) on delete restrict,
  proposed_at          timestamptz not null default now(),
  approved_at          timestamptz,
  superseded_at        timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  unique (room_id, version)
);

comment on table public.deal_room_procedures is
  'Procedure versions. A version never changes after approval; an amendment creates another version.';

-- At most one governing version per room. Expressed as a partial unique index
-- because it is an invariant, not a convention, and a CHECK cannot see across
-- rows.
create unique index if not exists deal_room_procedures_one_approved
  on public.deal_room_procedures (room_id)
  where state = 'approved';

create index if not exists deal_room_procedures_room_idx on public.deal_room_procedures (room_id);

drop trigger if exists touch_deal_room_procedures on public.deal_room_procedures;
create trigger touch_deal_room_procedures before update on public.deal_room_procedures
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 8. deal_room_procedure_steps
-- ---------------------------------------------------------------------
--
-- The weights-sum-to-exactly-100 rule cannot be a row CHECK: it is a property of
-- the set. It is enforced atomically inside deal_room_approve_procedure() in
-- 20260729b, and mirrored by assertWeights() in lib/ponte/progress.ts.

create table if not exists public.deal_room_procedure_steps (
  id                     uuid primary key default gen_random_uuid(),
  procedure_id           uuid not null references public.deal_room_procedures(id) on delete cascade,

  step_key               text not null,
  seq                    integer not null,
  stage_label            text not null,
  title                  text not null,
  completion_condition   text not null,
  responsible_role       text not null,
  responsible_participant_id uuid references public.deal_room_participants(id) on delete set null,

  weight                 integer not null check (weight > 0),
  mandatory              boolean not null default true,
  requires_evidence      boolean not null default false,
  required_reviewer_role text,
  due_date               date,

  state                  text not null default 'not_ready'
                           check (state in ('not_ready','ready','in_progress','evidence_submitted','review_required',
                                            'clarification_required','completed','blocked','waived','not_applicable',
                                            'cancelled')),

  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  unique (procedure_id, step_key),

  -- A step that requires evidence but names no reviewer could never be accepted
  -- for the procedure, so the row would define an unreachable state.
  constraint deal_room_steps_reviewer_when_evidence
    check (not requires_evidence or required_reviewer_role is not null)
);

create index if not exists deal_room_steps_procedure_idx on public.deal_room_procedure_steps (procedure_id, seq);

drop trigger if exists touch_deal_room_steps on public.deal_room_procedure_steps;
create trigger touch_deal_room_steps before update on public.deal_room_procedure_steps
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 9. deal_room_procedure_approvals
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_procedure_approvals (
  id             uuid primary key default gen_random_uuid(),
  procedure_id   uuid not null references public.deal_room_procedures(id) on delete cascade,
  participant_id uuid not null references public.deal_room_participants(id) on delete cascade,

  response       text not null default 'pending'
                   check (response in ('pending','approved','objected','amendment_requested','clarification_requested')),
  reason         text,
  responded_at   timestamptz,

  created_at     timestamptz not null default now(),
  unique (procedure_id, participant_id)
);

create index if not exists deal_room_approvals_procedure_idx
  on public.deal_room_procedure_approvals (procedure_id);

-- ---------------------------------------------------------------------
-- 10. deal_room_evidence
-- ---------------------------------------------------------------------
--
-- `sub_room_id` is NOT NULL for the launch slice: every evidence item lives
-- inside a private workspace. `accepted_for_procedure` and
-- `independently_verified` are separate values of the same column and must
-- never be collapsed.

create table if not exists public.deal_room_evidence (
  id                 uuid primary key default gen_random_uuid(),
  room_id            uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id        uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  step_id            uuid references public.deal_room_procedure_steps(id) on delete set null,

  title              text not null,
  provider_label     text not null,
  provider_org_id    uuid references public.organizations(id) on delete set null,

  provenance         text not null
                       check (provenance in ('member_declared','member_uploaded','third_party_supplied','ponte_checked')),
  visibility         text not null default 'sub_room'
                       check (visibility in ('own_org','sub_room','principals','selected','ponte_only')),
  state              text not null default 'draft'
                       check (state in ('draft','uploaded','disclosed','under_review','clarification_required',
                                        'accepted_for_procedure','rejected','superseded','withdrawn',
                                        'independently_verified')),

  current_version    integer not null default 0,
  superseded_by_id   uuid references public.deal_room_evidence(id) on delete set null,

  created_by         uuid not null references public.profiles(id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  reviewed_by        uuid references public.profiles(id) on delete set null,
  reviewed_at        timestamptz
);

comment on table public.deal_room_evidence is
  'Evidence metadata. Bytes live in the private deal-room-evidence bucket. accepted_for_procedure and independently_verified are distinct states and must not be collapsed.';

create index if not exists deal_room_evidence_sub_idx  on public.deal_room_evidence (sub_room_id);
create index if not exists deal_room_evidence_room_idx on public.deal_room_evidence (room_id);
create index if not exists deal_room_evidence_step_idx on public.deal_room_evidence (step_id);

drop trigger if exists touch_deal_room_evidence on public.deal_room_evidence;
create trigger touch_deal_room_evidence before update on public.deal_room_evidence
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 11. deal_room_evidence_versions - immutable
-- ---------------------------------------------------------------------
--
-- No UPDATE path is granted anywhere. Supersession writes a NEW row, so the
-- version a reviewer accepted stays exactly as it was when they accepted it.

create table if not exists public.deal_room_evidence_versions (
  id              uuid primary key default gen_random_uuid(),
  evidence_id     uuid not null references public.deal_room_evidence(id) on delete cascade,
  version         integer not null check (version > 0),

  -- Bucket-relative object name. The storage policy joins on this rather than
  -- parsing the path, so a guessed or crafted object name grants nothing.
  storage_path    text not null unique,
  file_name       text not null,
  mime_type       text not null,
  size_bytes      bigint not null check (size_bytes >= 0),
  checksum_sha256 text check (checksum_sha256 ~ '^[0-9a-f]{64}$'),

  uploaded_by     uuid not null references public.profiles(id) on delete restrict,
  uploaded_at     timestamptz not null default now(),

  unique (evidence_id, version)
);

create index if not exists deal_room_evidence_versions_path_idx
  on public.deal_room_evidence_versions (storage_path);

-- ---------------------------------------------------------------------
-- 12. deal_room_clarifications
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_clarifications (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id   uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  evidence_id   uuid references public.deal_room_evidence(id) on delete cascade,
  step_id       uuid references public.deal_room_procedure_steps(id) on delete set null,

  question      text not null,
  raised_by     uuid not null references public.profiles(id) on delete restrict,
  raised_at     timestamptz not null default now(),

  state         text not null default 'open' check (state in ('open','answered','closed')),
  answer        text,
  answered_by   uuid references public.profiles(id) on delete set null,
  answered_at   timestamptz,

  -- A clarification with nothing to clarify has nowhere to appear.
  constraint deal_room_clarifications_target
    check (evidence_id is not null or step_id is not null)
);

create index if not exists deal_room_clarifications_evidence_idx on public.deal_room_clarifications (evidence_id);
create index if not exists deal_room_clarifications_sub_idx      on public.deal_room_clarifications (sub_room_id);

-- ---------------------------------------------------------------------
-- 13. deal_room_blockers
-- ---------------------------------------------------------------------
--
-- Resolving a blocker never deletes it. The row keeps its owner, its
-- requirement and its resolution, because a resolved blocker is part of the
-- transaction's history and is one of the things a Deal Passport fact can later
-- be drawn from.

create table if not exists public.deal_room_blockers (
  id                     uuid primary key default gen_random_uuid(),
  room_id                uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id            uuid references public.deal_room_sub_rooms(id) on delete cascade,
  step_id                uuid references public.deal_room_procedure_steps(id) on delete set null,

  title                  text not null,
  description            text not null,
  category               text not null check (category in ('critical','material','operational')),
  owner_participant_id   uuid references public.deal_room_participants(id) on delete set null,
  resolution_requirement text not null,
  due_date               date,

  state                  text not null default 'open'
                           check (state in ('open','owned','resolution_proposed','resolved','waived','escalated')),

  created_by             uuid not null references public.profiles(id) on delete restrict,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  resolved_by            uuid references public.profiles(id) on delete set null,
  resolved_at            timestamptz,
  resolution_note        text
);

create index if not exists deal_room_blockers_room_idx on public.deal_room_blockers (room_id);
create index if not exists deal_room_blockers_sub_idx  on public.deal_room_blockers (sub_room_id);
create index if not exists deal_room_blockers_open_idx on public.deal_room_blockers (room_id)
  where state not in ('resolved','waived');

drop trigger if exists touch_deal_room_blockers on public.deal_room_blockers;
create trigger touch_deal_room_blockers before update on public.deal_room_blockers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 14. deal_room_activity_events - append-only
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_activity_events (
  id                 uuid primary key default gen_random_uuid(),
  room_id            uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id        uuid references public.deal_room_sub_rooms(id) on delete cascade,

  event_type         text not null,
  subject_type       text,
  subject_id         uuid,
  summary            text not null,
  detail             jsonb,

  -- Attribution is denormalised so a removed participant's prior actions stay
  -- attributable, which the product definition requires explicitly.
  actor_profile_id   uuid references public.profiles(id) on delete set null,
  actor_label        text not null,
  actor_org_label    text,

  created_at         timestamptz not null default now()
);

comment on table public.deal_room_activity_events is
  'Append-only attributable history. No member INSERT policy: rows are written only by the authorised command functions. UPDATE and DELETE are refused by trigger, including for the table owner.';

create index if not exists deal_room_activity_room_idx on public.deal_room_activity_events (room_id, created_at desc);
create index if not exists deal_room_activity_sub_idx  on public.deal_room_activity_events (sub_room_id, created_at desc);

drop trigger if exists deal_room_activity_append_only on public.deal_room_activity_events;
create trigger deal_room_activity_append_only
  before update or delete on public.deal_room_activity_events
  for each row execute function public.deal_room_events_append_only();

commit;
