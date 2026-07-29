-- Deal Room launch slice: RLS, helper predicates and the authorised commands.
--
-- Run AFTER 20260729a_deal_room_core.sql:
--   node scripts/db-query.mjs --file supabase/migrations/20260729b_deal_room_rls.sql
--
-- NOT APPLIED. Written and reviewed at Gate B. Applying it is a Gate C owner
-- decision. It creates no table and alters no existing object.
--
-- ====================== WHAT THE OWNER REVIEW CHANGED ==================
--
-- The first draft of this file protected reads and then let members write
-- directly. The owner review of 29 July 2026 established that this is not a
-- policy detail but the difference between a controlled workflow and a
-- decorative one, and named five fail-open paths. All five are closed here:
--
-- 1. `deal_rooms` INSERT checked only `initiator_profile_id = auth.uid()`. Any
--    authenticated user could open a room against a listing they did not own,
--    with a Deal snapshot, family and state of their choosing, bypassing
--    credible interest and the Integrity pre-flight entirely. There is now NO
--    member INSERT policy on `deal_rooms`. `deal_room_propose()` proves
--    ownership, publication, family correctness and the family's own required
--    facts, and BUILDS the snapshot from the listing row rather than accepting
--    one.
--
-- 2. Having created a room, the initiator became its administrator and could
--    then insert their own entitlement, in any kind and any state. There is now
--    NO member INSERT or UPDATE policy on `deal_room_entitlements` at all. The
--    propose command is the only thing that creates one, it may only create a
--    `starter`, and it refuses a second Starter for an organisation that has
--    already used one.
--
-- 3. `deal_room_is_writable()` treated a missing entitlement row as writable.
--    It now requires one to exist and to be in a permitting state: a room with
--    no entitlement fails closed.
--
-- 4. Direct INSERT/UPDATE policies contradicted the stated rule that material
--    state changes happen only through deterministic authorised commands with
--    an atomic activity event. Every one of them is gone. Members hold SELECT
--    and nothing else on all fourteen tables.
--
-- 5. `selected` evidence visibility was evaluated as ordinary sub-room
--    visibility, so a label promising restriction to a few delivered none. It
--    is removed from launch scope in 20260729a; the predicate below no longer
--    mentions it.
--
-- ============================ THE TWO IDEAS ============================
--
-- **Isolation returns zero rows.** A counterparty admitted to workspace A
-- asking for workspace B gets an empty result: no row, no count, and no error
-- that differs from any other empty result, so there is nothing to infer from.
--
-- **Members cannot write.** Not to the activity table, and not to anything
-- else. Every transition runs inside a SECURITY DEFINER command that checks
-- authority, performs the change and writes the event in one transaction, so a
-- change cannot exist without its record and a record cannot be written
-- without its change.
--
-- ================================ ROLLBACK =============================
--
-- Drop every function named in the grants block at the end of this file, then
-- every `drop policy if exists` named below, then run 20260729a's rollback.
-- Run 20260729c's rollback (storage) before any of it.
--
-- `is_deal_participant()` is NOT dropped, altered or referenced. It belongs to
-- the legacy cluster and is untouched.
-- =======================================================================

set lock_timeout = '5s';

begin;

-- ---------------------------------------------------------------------
-- 1. Helper predicates
-- ---------------------------------------------------------------------
--
-- All SECURITY DEFINER, STABLE, `search_path` pinned so a caller cannot shadow
-- `public` and change what they read. They are the only place the membership
-- question is answered: the same EXISTS clause inline in twenty policies is how
-- one of them ends up subtly different.

create or replace function public.deal_room_is_sub_room_participant(p_sub_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deal_room_participants p
    where p.sub_room_id = p_sub_room_id
      and p.profile_id = auth.uid()
      and p.state in ('admitted','active')
  );
$$;

comment on function public.deal_room_is_sub_room_participant(uuid) is
  'True only for an admitted or active participant of that private workspace. invited, prerequisites_pending and terms_pending are all outside the room.';

create or replace function public.deal_room_is_master_participant(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deal_room_participants p
    where p.room_id = p_room_id
      and p.profile_id = auth.uid()
      and p.state in ('admitted','active')
  );
$$;

-- The sponsor team. Deliberately narrow: an admitted principal inside one
-- sub-room is NOT an administrator and does not gain the portfolio.
create or replace function public.deal_room_can_administer(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.deal_rooms r
    where r.id = p_room_id
      and (r.initiator_profile_id = auth.uid() or r.sponsor_profile_id = auth.uid())
  )
  or exists (
    select 1 from public.deal_room_participants p
    where p.room_id = p_room_id
      and p.profile_id = auth.uid()
      and p.is_room_administrator
      and p.state in ('admitted','active')
  );
$$;

-- Room lifecycle AND entitlement, both, and BOTH must be present.
--
-- The `e.id is null or ...` of the first draft is gone. A room with no
-- entitlement row is not writable: an entitlement that has not been issued is
-- not an entitlement that permits work, and treating its absence as permission
-- was the third fail-open path in the owner review.
create or replace function public.deal_room_is_writable(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deal_rooms r
    join public.deal_room_entitlements e on e.room_id = r.id
    where r.id = p_room_id
      and r.state in ('draft','proposed','awaiting_principal_admission','activation_pending',
                      'active_procedure_not_agreed','active_procedure_agreed','blocked','ready_to_proceed')
      and e.state in ('reserved','active','grace','restored')
  );
$$;

comment on function public.deal_room_is_writable(uuid) is
  'Room lifecycle AND an issued, permitting entitlement. A missing entitlement row fails closed.';

-- Evidence visibility is more specific than room membership, so it has its own
-- predicate. `selected` is gone: it is not in the column constraint any more.
create or replace function public.deal_room_can_read_evidence(p_evidence_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deal_room_evidence ev
    where ev.id = p_evidence_id
      and (
        -- The provider always sees their own item, at any visibility.
        ev.created_by = auth.uid()

        -- Anyone admitted to the workspace, for a workspace-visible item.
        or (ev.visibility = 'sub_room' and public.deal_room_is_sub_room_participant(ev.sub_room_id))

        -- Principals only, and admitted to this workspace.
        or (
          ev.visibility = 'principals'
          and exists (
            select 1 from public.deal_room_participants p
            where p.sub_room_id = ev.sub_room_id
              and p.profile_id = auth.uid()
              and p.participant_class = 'principal'
              and p.state in ('admitted','active')
          )
        )

        -- The provider's own organisation, and admitted to this workspace.
        or (
          ev.visibility = 'own_org'
          and exists (
            select 1
            from public.deal_room_participants me
            join public.deal_room_participants owner_p on owner_p.sub_room_id = me.sub_room_id
            where me.profile_id = auth.uid()
              and me.sub_room_id = ev.sub_room_id
              and me.state in ('admitted','active')
              and owner_p.profile_id = ev.created_by
              and me.org_id is not null
              and me.org_id = owner_p.org_id
          )
        )

        -- Ponte-only items are for platform administrators.
        or (ev.visibility = 'ponte_only' and public.is_admin())
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Enable RLS on all fourteen tables
-- ---------------------------------------------------------------------
--
-- Supabase grants table privileges to `anon` and `authenticated` by default, so
-- RLS with no matching policy is what closes them. No policy in this file names
-- `anon`.

alter table public.deal_rooms                      enable row level security;
alter table public.deal_room_entitlements          enable row level security;
alter table public.deal_room_sub_rooms             enable row level security;
alter table public.deal_room_participants          enable row level security;
alter table public.deal_room_invitations           enable row level security;
alter table public.deal_room_agreement_acceptances enable row level security;
alter table public.deal_room_procedures            enable row level security;
alter table public.deal_room_procedure_steps       enable row level security;
alter table public.deal_room_procedure_approvals   enable row level security;
alter table public.deal_room_evidence              enable row level security;
alter table public.deal_room_evidence_versions     enable row level security;
alter table public.deal_room_clarifications        enable row level security;
alter table public.deal_room_blockers              enable row level security;
alter table public.deal_room_activity_events       enable row level security;
alter table public.deal_room_agreement_documents   enable row level security;

-- ---------------------------------------------------------------------
-- 3. Remove the first draft's write policies
-- ---------------------------------------------------------------------
--
-- Named explicitly rather than left to a fresh install, so that a database
-- which received the earlier draft is corrected by running this file rather
-- than keeping the paths the owner review rejected.

drop policy if exists "deal room create"            on public.deal_rooms;
drop policy if exists "deal room administer"        on public.deal_rooms;
drop policy if exists "entitlement create"          on public.deal_room_entitlements;
drop policy if exists "sub room create"             on public.deal_room_sub_rooms;
drop policy if exists "sub room administer"         on public.deal_room_sub_rooms;
drop policy if exists "participant invite"          on public.deal_room_participants;
drop policy if exists "participant self progress"   on public.deal_room_participants;
drop policy if exists "participant administer"      on public.deal_room_participants;
drop policy if exists "invitation issue"            on public.deal_room_invitations;
drop policy if exists "invitation revoke"           on public.deal_room_invitations;
drop policy if exists "acceptance record"           on public.deal_room_agreement_acceptances;
drop policy if exists "procedure propose"           on public.deal_room_procedures;
drop policy if exists "procedure edit draft"        on public.deal_room_procedures;
drop policy if exists "step write draft"            on public.deal_room_procedure_steps;
drop policy if exists "step edit draft"             on public.deal_room_procedure_steps;
drop policy if exists "step advance state"          on public.deal_room_procedure_steps;
drop policy if exists "approval respond"            on public.deal_room_procedure_approvals;
drop policy if exists "approval seed"               on public.deal_room_procedure_approvals;
drop policy if exists "evidence create"             on public.deal_room_evidence;
drop policy if exists "evidence author edit"        on public.deal_room_evidence;
drop policy if exists "evidence version create"     on public.deal_room_evidence_versions;
drop policy if exists "clarification raise"         on public.deal_room_clarifications;
drop policy if exists "clarification answer"        on public.deal_room_clarifications;
drop policy if exists "blocker open"                on public.deal_room_blockers;
drop policy if exists "blocker update"              on public.deal_room_blockers;

-- ---------------------------------------------------------------------
-- 4. Read policies. These are the ONLY member policies in this file.
-- ---------------------------------------------------------------------

drop policy if exists "deal room read" on public.deal_rooms;
create policy "deal room read" on public.deal_rooms
  for select to authenticated
  using (
    public.deal_room_can_administer(id)
    or public.deal_room_is_master_participant(id)
    or exists (
      select 1 from public.deal_room_participants p
      where p.room_id = deal_rooms.id
        and p.profile_id = auth.uid()
        and p.state in ('admitted','active')
    )
    or public.is_admin()
  );

drop policy if exists "entitlement read" on public.deal_room_entitlements;
create policy "entitlement read" on public.deal_room_entitlements
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

-- The isolation boundary.
drop policy if exists "sub room read" on public.deal_room_sub_rooms;
create policy "sub room read" on public.deal_room_sub_rooms
  for select to authenticated
  using (
    public.deal_room_is_sub_room_participant(id)
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "participant read" on public.deal_room_participants;
create policy "participant read" on public.deal_room_participants
  for select to authenticated
  using (
    profile_id = auth.uid()
    or (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

-- Invitations: administrators only. An invitee never queries this table; the
-- landing page is resolved server-side by hashing the presented token. If
-- members could select it, an admitted participant could enumerate invitations
-- for workspaces they cannot see.
drop policy if exists "invitation administer read" on public.deal_room_invitations;
create policy "invitation administer read" on public.deal_room_invitations
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

drop policy if exists "acceptance read" on public.deal_room_agreement_acceptances;
create policy "acceptance read" on public.deal_room_agreement_acceptances
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_room_participants p
      where p.id = participant_id and p.profile_id = auth.uid()
    )
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "procedure read" on public.deal_room_procedures;
create policy "procedure read" on public.deal_room_procedures
  for select to authenticated
  using (
    public.deal_room_is_master_participant(room_id)
    or (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or exists (
      select 1 from public.deal_room_participants p
      where p.room_id = deal_room_procedures.room_id
        and p.profile_id = auth.uid()
        and p.state in ('admitted','active')
    )
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "step read" on public.deal_room_procedure_steps;
create policy "step read" on public.deal_room_procedure_steps
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id
        and (
          public.deal_room_is_master_participant(pr.room_id)
          or (pr.sub_room_id is not null and public.deal_room_is_sub_room_participant(pr.sub_room_id))
          or exists (
            select 1 from public.deal_room_participants p
            where p.room_id = pr.room_id and p.profile_id = auth.uid() and p.state in ('admitted','active')
          )
          or public.deal_room_can_administer(pr.room_id)
        )
    )
    or public.is_admin()
  );

drop policy if exists "approval read" on public.deal_room_procedure_approvals;
create policy "approval read" on public.deal_room_procedure_approvals
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id
        and (public.deal_room_is_master_participant(pr.room_id) or public.deal_room_can_administer(pr.room_id))
    )
    or public.is_admin()
  );

drop policy if exists "evidence read" on public.deal_room_evidence;
create policy "evidence read" on public.deal_room_evidence
  for select to authenticated
  using (public.deal_room_can_read_evidence(id) or public.is_admin());

drop policy if exists "evidence version read" on public.deal_room_evidence_versions;
create policy "evidence version read" on public.deal_room_evidence_versions
  for select to authenticated
  using (public.deal_room_can_read_evidence(evidence_id) or public.is_admin());

drop policy if exists "clarification read" on public.deal_room_clarifications;
create policy "clarification read" on public.deal_room_clarifications
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

drop policy if exists "blocker read" on public.deal_room_blockers;
create policy "blocker read" on public.deal_room_blockers
  for select to authenticated
  using (
    (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or (sub_room_id is null and public.deal_room_is_master_participant(room_id))
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "activity read" on public.deal_room_activity_events;
create policy "activity read" on public.deal_room_activity_events
  for select to authenticated
  using (
    (
      sub_room_id is null
      and (public.deal_room_is_master_participant(room_id) or public.deal_room_can_administer(room_id))
    )
    or (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or (sub_room_id is not null and public.deal_room_can_administer(room_id))
    or public.is_admin()
  );

-- ---------------------------------------------------------------------
-- 5. The authorised commands
-- ---------------------------------------------------------------------

create or replace function public.deal_room_log_event(
  p_room_id uuid, p_sub_room_id uuid, p_event_type text, p_subject_type text,
  p_subject_id uuid, p_summary text, p_detail jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_actor text;
  v_org text;
begin
  select coalesce(pr.full_name, 'A participant'), o.name into v_actor, v_org
  from public.profiles pr
  left join public.organizations o on o.id = pr.organization_id
  where pr.id = auth.uid();

  insert into public.deal_room_activity_events
    (room_id, sub_room_id, event_type, subject_type, subject_id, summary, detail,
     actor_profile_id, actor_label, actor_org_label)
  values
    (p_room_id, p_sub_room_id, p_event_type, p_subject_type, p_subject_id, p_summary, p_detail,
     auth.uid(), coalesce(v_actor, 'A participant'), v_org)
  returning id into v_id;
  return v_id;
end;
$$;

/*
 * Create the proposed room.
 *
 * This is the command the first fail-open path became. It proves, in one
 * transaction and before anything is written:
 *
 *   - the caller owns the listing;
 *   - the listing is published;
 *   - it carries a market family and intent;
 *   - it carries the facts THAT family requires, and no other family's;
 *   - a counterparty other than the caller is identified;
 *   - an objective is stated;
 *   - the caller's organisation has not already used its Starter room.
 *
 * The Deal snapshot is BUILT here from the listing row. It is not a parameter,
 * so a caller cannot supply one, and a services room cannot be given a
 * quantity: each branch selects only the columns its own family uses.
 */
create or replace function public.deal_room_propose(
  p_listing_id           uuid,
  p_counterparty_profile uuid,
  p_counterparty_email   text,
  p_counterparty_name    text,
  p_counterparty_role    text,
  p_objective            text,
  p_interest_route       text,
  p_operating_mode       text,
  p_sub_room_purpose     text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_l public.listings%rowtype;
  v_family text;
  v_snapshot jsonb;
  v_subject text;
  v_org uuid;
  v_room uuid;
  v_sub uuid;
  v_ref text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_l from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Deal not found' using errcode = '42501';
  end if;

  -- Ownership. Without this any authenticated member could open a room against
  -- somebody else's published Deal.
  if v_l.user_id <> auth.uid() then
    raise exception 'Only the owner of a Deal can take it into a Deal Room' using errcode = '42501';
  end if;

  if v_l.status <> 'approved' then
    raise exception 'Only a published Deal can be taken into a Deal Room' using errcode = '23514';
  end if;

  if v_l.valid_until is not null and v_l.valid_until < current_date then
    raise exception 'This Deal has passed its validity date' using errcode = '23514';
  end if;

  v_family := v_l.market_family;
  if v_family is null or v_family not in ('products','services','distribution') then
    raise exception 'This Deal carries no market family, so no procedure applies' using errcode = '23514';
  end if;
  if v_l.market_intent is null then
    raise exception 'This Deal carries no intent' using errcode = '23514';
  end if;

  /*
   * The intended principal, proved and persisted.
   *
   * The first draft checked only that a uuid was non-null and not the caller,
   * then discarded it. Nothing recorded who the room was about, so the later
   * invitation could go to any address - the credible-interest gate was
   * ceremonial. Either an existing member is named and proved to exist, or an
   * external principal is named with a durable name and address.
   */
  if p_counterparty_profile is not null then
    if p_counterparty_profile = auth.uid() then
      raise exception 'The Deal owner and the counterparty cannot be the same member' using errcode = '23514';
    end if;
    if not exists (select 1 from public.profiles where id = p_counterparty_profile) then
      raise exception 'That counterparty is not a Ponte member' using errcode = '23503';
    end if;
    if not exists (select 1 from auth.users where id = p_counterparty_profile and email is not null) then
      raise exception 'That counterparty has no address an invitation could reach' using errcode = '23514';
    end if;
  elsif coalesce(btrim(p_counterparty_email), '') <> '' then
    if coalesce(btrim(p_counterparty_name), '') = '' then
      raise exception 'Name the external principal as well as their address' using errcode = '23514';
    end if;
    if p_counterparty_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'That is not a usable email address' using errcode = '23514';
    end if;
    if lower(btrim(p_counterparty_email)) = (select lower(email) from auth.users where id = auth.uid()) then
      raise exception 'The Deal owner and the counterparty cannot be the same person' using errcode = '23514';
    end if;
  else
    raise exception 'A room is proposed to somebody: identify the counterparty' using errcode = '23514';
  end if;
  if coalesce(btrim(p_objective), '') = '' then
    raise exception 'Record what the interested party wants. Curiosity does not open a room' using errcode = '23514';
  end if;
  -- The role is persisted below, not merely validated. `deal_room_invite()`
  -- reads it from the room and takes no role of its own.
  if coalesce(btrim(p_counterparty_role), '') = '' then
    raise exception 'State the counterparty role' using errcode = '23514';
  end if;
  if p_interest_route not in ('accepted_introduction','member_opportunity_participation','investigated_signal',
                              'imported_transaction','ponte_facilitated','qualified_member_discussion') then
    raise exception 'Unknown credible-interest route' using errcode = '23514';
  end if;

  -- Launch scope: no mode that commits human Ponte work.
  if p_operating_mode not in ('software_only','ponte_observed') then
    raise exception 'That operating mode is not available in this release' using errcode = '23514';
  end if;

  -- Family-correct required facts, and only that family's.
  if v_family = 'products' then
    if v_l.product is null or v_l.quantity is null
       or coalesce(v_l.origin_country, v_l.destination_country) is null then
      raise exception 'This Deal is missing the product facts a room needs' using errcode = '23514';
    end if;
    v_subject := v_l.product;
    v_snapshot := jsonb_build_object(
      'deal_id', v_l.id, 'market_family', v_family, 'market_intent', v_l.market_intent,
      'subject', v_subject, 'product', v_l.product, 'quantity', v_l.quantity, 'unit', v_l.unit,
      'incoterm', v_l.incoterm, 'origin_country', v_l.origin_country,
      'destination_country', v_l.destination_country);
  elsif v_family = 'services' then
    if v_l.service_category_key is null or v_l.coverage_scope_key is null then
      raise exception 'This Deal is missing the service facts a room needs' using errcode = '23514';
    end if;
    v_subject := v_l.service_category_key;
    v_snapshot := jsonb_build_object(
      'deal_id', v_l.id, 'market_family', v_family, 'market_intent', v_l.market_intent,
      'subject', v_subject, 'service_category_key', v_l.service_category_key,
      'coverage_scope_key', v_l.coverage_scope_key, 'territory_codes', v_l.territory_codes);
  else
    if v_l.distribution_partner_type_key is null or v_l.product_sector_key is null
       or v_l.territory_codes is null or array_length(v_l.territory_codes, 1) is null then
      raise exception 'This Deal is missing the distribution facts a room needs' using errcode = '23514';
    end if;
    v_subject := v_l.product_sector_key;
    v_snapshot := jsonb_build_object(
      'deal_id', v_l.id, 'market_family', v_family, 'market_intent', v_l.market_intent,
      'subject', v_subject, 'distribution_partner_type_key', v_l.distribution_partner_type_key,
      'product_sector_key', v_l.product_sector_key, 'territory_codes', v_l.territory_codes);
  end if;

  select organization_id into v_org from public.profiles where id = auth.uid();

  -- One Starter per organisation, or per member when no organisation exists.
  -- Members cannot issue their own entitlement at all; this bounds the one the
  -- command issues on their behalf.
  if exists (
    select 1
    from public.deal_room_entitlements e
    join public.deal_rooms r on r.id = e.room_id
    where e.kind = 'starter'
      and (
        (v_org is not null and e.org_id = v_org)
        or (v_org is null and r.initiator_profile_id = auth.uid())
      )
  ) then
    raise exception 'This organisation has already used its Starter Deal Room' using errcode = '23505';
  end if;

  v_ref := 'DR-' || to_char(now(), 'YYYY') || '-' ||
           lpad((select count(*) + 1 from public.deal_rooms)::text, 4, '0');

  insert into public.deal_rooms
    (ref, listing_id, deal_snapshot, market_family, market_intent, title, purpose,
     completion_condition, operating_mode, initiator_profile_id, sponsor_profile_id, sponsor_org_id, state,
     intended_counterparty_profile_id, intended_counterparty_email, intended_counterparty_name,
     intended_counterparty_role)
  values
    (v_ref, v_l.id, v_snapshot, v_family, v_l.market_intent, v_subject,
     p_objective,
     'Both principals have confirmed that the agreed procedure is complete and the transaction may proceed to formal contracting outside Ponte.',
     p_operating_mode, auth.uid(), auth.uid(), v_org, 'proposed',
     p_counterparty_profile,
     case when p_counterparty_profile is null then lower(btrim(p_counterparty_email)) end,
     case when p_counterparty_profile is null then btrim(p_counterparty_name) end,
     btrim(p_counterparty_role))
  returning id into v_room;

  insert into public.deal_room_entitlements (room_id, org_id, kind, state, reserved_at)
  values (v_room, v_org, 'starter', 'reserved', now());

  insert into public.deal_room_sub_rooms (room_id, ref, purpose, kind, state, created_by)
  values (v_room, 'W-01', p_sub_room_purpose, 'counterparty', 'draft', auth.uid())
  returning id into v_sub;

  -- The initiator is admitted at master level, as principal, approver and
  -- administrator, and into their own first workspace.
  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, is_required_approver, is_room_administrator, state, admitted_at)
  values
    (v_room, null, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', true, true, 'admitted', now());

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, is_required_approver, is_room_administrator, state, admitted_at)
  values
    (v_room, v_sub, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', true, true, 'admitted', now());

  perform public.deal_room_log_event(v_room, null, 'room_proposed', 'room', v_room,
    'Room proposed from a published Deal, with credible commercial interest recorded.',
    jsonb_build_object('interest_route', p_interest_route, 'objective', p_objective));
  perform public.deal_room_log_event(v_room, v_sub, 'sub_room_created', 'sub_room', v_sub,
    'The first private workspace was created for the intended counterparty.', null);

  return v_room;
end;
$$;

/*
 * Issue the protected invitation.
 *
 * ## Five parameters are gone, and that is the correction
 *
 * The first draft took `p_email`, `p_preview` and `p_preflight`. The server
 * action derived all three from real records, but this function is granted to
 * `authenticated`, so a room administrator could call it directly and store
 * fabricated "checked" facts - which the invitee is then shown as Ponte's own
 * Integrity statement. The owner review of 29 July 2026 named that as the
 * second trust defect, and the unbound email as the third.
 *
 * Now:
 *
 * - the address comes from the room's persisted intended counterparty, so the
 *   person invited IS the principal credible interest was recorded for;
 * - `preview_facts` is built here from the room and the sponsor;
 * - `integrity_preflight` is built here from `profiles`, `organizations` and
 *   `verifications`, and stores the attributable SOURCE FACTS rather than a
 *   rendered report. The wording stays in `lib/deal-room/integrity.ts`, which
 *   renders these facts; keeping one copy of the wording and one copy of the
 *   facts is the point. Sanctions state is read from `verifications.sanctions_hits`
 *   and is absent when nothing was screened.
 *
 * The owner final review of 29 July 2026 then removed two more: `p_role` and
 * `p_class`. Validating a caller-supplied copy of the role is not the same as
 * refusing to accept one. The role now comes from the room's own proposal
 * record, and the class is `principal` because that is what this launch
 * sub-room is: the first principal counterparty workspace. A direct RPC can no
 * longer invite the intended principal as an observer or a provider, and class
 * governs admission activation, approval rights and permissions.
 *
 * The raw token still never reaches the database; only its digest does.
 */
create or replace function public.deal_room_invite(
  p_sub_room_id uuid,
  p_token_sha256 text,
  p_expires_at  timestamptz
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_r public.deal_rooms%rowtype;
  v_id uuid;
  v_email text;
  v_role text;
  v_class constant text := 'principal';
  v_sponsor text;
  v_preview jsonb;
  v_preflight jsonb;
  v_level text;
  v_org_name text;
  v_jurisdiction text;
  v_sanctions jsonb;
begin
  select r.* into v_r
  from public.deal_rooms r
  join public.deal_room_sub_rooms s on s.room_id = r.id
  where s.id = p_sub_room_id;

  if not found then
    raise exception 'Workspace not found' using errcode = '42501';
  end if;
  if not public.deal_room_can_administer(v_r.id) then
    raise exception 'Only a room administrator can send an invitation' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_r.id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if p_token_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Malformed invitation token digest' using errcode = '23514';
  end if;
  if p_expires_at <= now() then
    raise exception 'An invitation cannot expire in the past' using errcode = '23514';
  end if;

  -- The role proposed when the room was opened, read rather than accepted.
  v_role := btrim(coalesce(v_r.intended_counterparty_role, ''));
  if v_role = '' then
    raise exception 'This room records no proposed role for its counterparty' using errcode = '23514';
  end if;

  -- Bound to the room's own record of who this room is about.
  if v_r.intended_counterparty_profile_id is not null then
    select lower(u.email) into v_email
    from auth.users u where u.id = v_r.intended_counterparty_profile_id;
  else
    v_email := lower(btrim(v_r.intended_counterparty_email));
  end if;

  if coalesce(v_email, '') = '' then
    raise exception 'This room has no reachable intended counterparty' using errcode = '23514';
  end if;

  -- The inviting side's own facts, read rather than accepted.
  select coalesce(o.name, pr.full_name, 'The inviting organisation'),
         pr.verification_level,
         coalesce(o.country, pr.country)
    into v_sponsor, v_level, v_jurisdiction
  from public.profiles pr
  left join public.organizations o on o.id = pr.organization_id
  where pr.id = auth.uid();

  select o.name into v_org_name
  from public.organizations o where o.id = v_r.sponsor_org_id;

  -- Sanctions: the stored ScreenResult, or an explicit absence. Never invented.
  select case
           when v.sanctions_hits is null then null
           when jsonb_typeof(v.sanctions_hits -> 'clean') <> 'boolean' then null
           else jsonb_build_object(
             'screened', true,
             'clean', (v.sanctions_hits ->> 'clean')::boolean,
             'strongCount', coalesce((v.sanctions_hits ->> 'strongCount')::int, 0),
             'checkedAt', to_char(coalesce(v.rescreened_at, v.created_at), 'YYYY-MM-DD'),
             'source', 'Ponte sanctions screening')
         end
    into v_sanctions
  from public.verifications v
  where v.user_id = auth.uid() and v.sanctions_hits is not null
  order by coalesce(v.rescreened_at, v.created_at) desc
  limit 1;

  -- The one gate Ponte Integrity imposes, enforced here rather than in the
  -- interface. An unresolved screening candidate is a compliance boundary, and
  -- a check that only ran in the server action would be bypassed by the same
  -- direct RPC call that made the preview forgeable.
  if v_sanctions is not null and (v_sanctions ->> 'clean')::boolean is false then
    raise exception 'Resolve the sanctions screening candidate before inviting this participant'
      using errcode = '23514';
  end if;

  v_preview := jsonb_build_object(
    'invitingOrganisation', v_sponsor,
    'dealSubject', coalesce(v_r.deal_snapshot ->> 'subject', v_r.title),
    'marketFamily', v_r.market_family,
    'proposedRole', v_role,
    'proposedParticipantClass', v_class,
    'roomSponsor', coalesce(v_org_name, v_sponsor),
    'expiresAt', to_char(p_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));

  v_preflight := jsonb_build_object(
    'derivedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'organisationName', v_org_name,
    'jurisdiction', v_jurisdiction,
    'verificationLevel', coalesce(v_level, 'unverified'),
    'sanctions', coalesce(v_sanctions, jsonb_build_object('screened', false)));

  insert into public.deal_room_invitations
    (room_id, sub_room_id, token_sha256, invited_email, proposed_role,
     proposed_participant_class, preview_facts, integrity_preflight, state, expires_at, created_by)
  values
    (v_r.id, p_sub_room_id, p_token_sha256, v_email, v_role,
     v_class, v_preview, v_preflight, 'sent', p_expires_at, auth.uid())
  returning id into v_id;

  update public.deal_rooms set state = 'awaiting_principal_admission'
   where id = v_r.id and state = 'proposed';
  update public.deal_room_sub_rooms set state = 'invitation_pending'
   where id = p_sub_room_id and state = 'draft';

  perform public.deal_room_log_event(v_r.id, p_sub_room_id, 'invitation_sent', 'invitation', v_id,
    'A protected invitation was sent to the intended counterparty. It discloses only the authorised preview facts.',
    null);

  return v_id;
end;
$$;

-- Both superseded signatures are dropped. Leaving either in place would keep a
-- callable path that still accepts caller-authored facts: the eight-argument
-- form took the preview and Integrity pre-flight JSON, and the five-argument
-- form took the participant role and class.
drop function if exists public.deal_room_invite(uuid, text, text, text, text, timestamptz, jsonb, jsonb);
drop function if exists public.deal_room_invite(uuid, text, text, text, timestamptz);

/*
 * Accept an invitation.
 *
 * Callable by somebody who is not yet a participant of anything, which is why
 * it takes the token digest rather than a room id: there is no row they could
 * name that they would also be allowed to read.
 *
 * ## The token is not the identity
 *
 * A bearer token proves only that somebody holds a link. The owner final review
 * of 29 July 2026 found that this command accepted any authenticated caller who
 * held one, so a forwarded, disclosed or intercepted link made a different
 * member the participant - defeating the whole point of persisting the intended
 * counterparty, since credible interest had been recorded for somebody else.
 *
 * The identity is therefore checked here, against the room's own record:
 *
 * - a member target must be `deal_rooms.intended_counterparty_profile_id`;
 * - an external target must hold a CONFIRMED address equal to the invitation's,
 *   compared case-insensitively. Unconfirmed is refused, because an
 *   unconfirmed address is a claim rather than a fact and anybody can claim one.
 *
 * The check runs before every state change in this function, including the
 * expiry write, so a refusal leaves the invitation, the participant, the
 * workspace and the activity record exactly as they were.
 */
create or replace function public.deal_room_accept_invitation(p_token_sha256 text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_inv public.deal_room_invitations%rowtype;
  v_r public.deal_rooms%rowtype;
  v_actor_email text;
  v_participant uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to accept an invitation' using errcode = '42501';
  end if;

  select * into v_inv from public.deal_room_invitations where token_sha256 = p_token_sha256;
  if not found then
    raise exception 'This invitation link is not valid' using errcode = '42501';
  end if;

  select * into v_r from public.deal_rooms where id = v_inv.room_id;
  if not found then
    raise exception 'This invitation link is not valid' using errcode = '42501';
  end if;

  if v_r.intended_counterparty_profile_id is not null then
    if auth.uid() <> v_r.intended_counterparty_profile_id then
      raise exception 'This invitation was issued to another member' using errcode = '42501';
    end if;
  else
    select lower(btrim(u.email)) into v_actor_email
    from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null;

    if v_actor_email is null then
      raise exception 'Confirm your email address before accepting this invitation' using errcode = '42501';
    end if;
    if v_actor_email <> lower(btrim(v_inv.invited_email)) then
      raise exception 'This invitation was issued to a different address' using errcode = '42501';
    end if;
  end if;

  if v_inv.state <> 'sent' then
    raise exception 'This invitation is no longer open' using errcode = '23514';
  end if;
  if v_inv.expires_at < now() then
    update public.deal_room_invitations set state = 'expired' where id = v_inv.id;
    raise exception 'This invitation has expired' using errcode = '23514';
  end if;

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, participant_class, transaction_role,
     state, invited_by, invited_at)
  values
    (v_inv.room_id, v_inv.sub_room_id, auth.uid(), v_inv.proposed_participant_class,
     v_inv.proposed_role, 'prerequisites_pending', v_inv.created_by, v_inv.created_at)
  on conflict (sub_room_id, profile_id) where sub_room_id is not null
  do update set state = case
      when public.deal_room_participants.state = 'invited' then 'prerequisites_pending'
      else public.deal_room_participants.state end
  returning id into v_participant;

  update public.deal_room_invitations
     set state = 'accepted', accepted_by = auth.uid(), accepted_at = now()
   where id = v_inv.id;

  update public.deal_room_sub_rooms set state = 'awaiting_admission'
   where id = v_inv.sub_room_id and state = 'invitation_pending';

  /*
   * `invitation_accepted`, not `participant_admitted`.
   *
   * The first draft wrote `participant_admitted` here, while the participant
   * was still `prerequisites_pending` and outside the gate - and then the real
   * admission command wrote a second `participant_admitted` later. The durable
   * history therefore stated that somebody had been admitted before anything
   * had verified their identity, capacity, role, authority or agreements. The
   * owner review of 29 July 2026 named it as the fourth trust defect, and it is
   * the worst kind: an append-only record that cannot be corrected, saying
   * something the database had not proved.
   *
   * `participant_admitted` is now written in exactly one place, by the command
   * that has checked all of it.
   */
  perform public.deal_room_log_event(v_inv.room_id, v_inv.sub_room_id, 'invitation_accepted',
    'participant', v_participant,
    'An invitation was accepted and admission began. The participant is inside the admission gate and cannot yet act.',
    null);

  return v_participant;
end;
$$;

/* Declare the organisation or capacity, the role and the authority. */
create or replace function public.deal_room_declare_participation(
  p_participant_id   uuid,
  p_org_name         text,
  p_org_country      text,
  p_declared_capacity text,
  p_role             text,
  p_authority        text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p public.deal_room_participants%rowtype;
  v_org uuid;
begin
  select * into v_p from public.deal_room_participants where id = p_participant_id;
  if not found or v_p.profile_id <> auth.uid() then
    raise exception 'You can only complete your own admission' using errcode = '42501';
  end if;
  if v_p.state not in ('invited','prerequisites_pending','terms_pending') then
    raise exception 'This admission is already complete' using errcode = '23514';
  end if;
  if not public.deal_room_is_writable(v_p.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if coalesce(btrim(p_role), '') = '' or coalesce(btrim(p_authority), '') = '' then
    raise exception 'A role and a declaration of authority are both required' using errcode = '23514';
  end if;
  if coalesce(btrim(p_org_name), '') = '' and coalesce(btrim(p_declared_capacity), '') = '' then
    raise exception 'Give the organisation you act for, or the capacity you act in' using errcode = '23514';
  end if;

  -- The organisation layer is empty in production, so an organisation is
  -- created here on the member's own statement rather than looked up. It is
  -- never inferred from a company text field elsewhere.
  if coalesce(btrim(p_org_name), '') <> '' then
    select id into v_org from public.organizations
     where lower(name) = lower(btrim(p_org_name)) limit 1;
    if v_org is null then
      insert into public.organizations (name, country, owner_id)
      values (btrim(p_org_name), nullif(btrim(p_org_country), ''), auth.uid())
      returning id into v_org;
    end if;
    update public.profiles set organization_id = coalesce(organization_id, v_org)
     where id = auth.uid();
  end if;

  update public.deal_room_participants
     set org_id = v_org,
         declared_capacity = nullif(btrim(p_declared_capacity), ''),
         transaction_role = btrim(p_role),
         participation_authority = btrim(p_authority),
         state = 'terms_pending'
   where id = p_participant_id;
end;
$$;

/*
 * Record one versioned acceptance.
 *
 * ## There is no version or checksum parameter, deliberately
 *
 * The first draft took `p_version` and `p_sha256` from the caller. The
 * TypeScript action passed the canonical values, but this function is granted
 * to `authenticated`, so a member could call it directly with any version and
 * any hash - and admission only checked that a row existed for each required
 * kind. The acceptance record, which is the whole evidentiary point of the
 * admission gate, was forgeable. The owner review of 29 July 2026 named it as
 * the first trust defect.
 *
 * The identity of what was accepted is now read from
 * `deal_room_agreement_documents`, which no member holds any policy on. A
 * forged version is not rejected; it cannot be expressed.
 *
 * No IP address and no user agent, by the owner decision of 29 July 2026.
 */
create or replace function public.deal_room_accept_agreement(
  p_participant_id uuid, p_kind text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p public.deal_room_participants%rowtype;
  v_doc public.deal_room_agreement_documents%rowtype;
  v_as text;
begin
  select * into v_p from public.deal_room_participants where id = p_participant_id;
  if not found or v_p.profile_id <> auth.uid() then
    raise exception 'You can only accept on your own behalf' using errcode = '42501';
  end if;
  if v_p.state not in ('invited','prerequisites_pending','terms_pending') then
    raise exception 'This admission is already complete' using errcode = '23514';
  end if;
  if not public.deal_room_is_writable(v_p.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  select * into v_doc
  from public.deal_room_agreement_documents
  where kind = p_kind and current;

  if not found then
    raise exception 'There is no current Ponte agreement of kind %', coalesce(p_kind, 'null')
      using errcode = '23514';
  end if;

  select coalesce(o.name, v_p.declared_capacity, 'Declared capacity not stated') into v_as
  from public.deal_room_participants p
  left join public.organizations o on o.id = p.org_id
  where p.id = p_participant_id;

  insert into public.deal_room_agreement_acceptances
    (participant_id, room_id, sub_room_id, agreement_kind, document_version, document_sha256, accepted_as)
  values
    (p_participant_id, v_p.room_id, v_p.sub_room_id, v_doc.kind, v_doc.version, v_doc.sha256, v_as)
  on conflict (participant_id, agreement_kind, document_version) do nothing;

  perform public.deal_room_log_event(v_p.room_id, v_p.sub_room_id, 'agreement_accepted',
    'participant', p_participant_id,
    'An agreement was accepted, recorded with its version and a checksum of the text accepted.',
    jsonb_build_object('kind', v_doc.kind, 'version', v_doc.version));
end;
$$;

-- The old four-argument signature is dropped rather than left beside the new
-- one: an overload that still accepted a caller's version would reopen exactly
-- the hole this closes.
drop function if exists public.deal_room_accept_agreement(uuid, text, text, text);

/* Admission: the gate. */
create or replace function public.deal_room_admit_participant(p_participant_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p public.deal_room_participants%rowtype;
  v_missing text[];
begin
  select * into v_p from public.deal_room_participants where id = p_participant_id;
  if not found then
    raise exception 'Participation not found' using errcode = '42501';
  end if;
  if v_p.profile_id <> auth.uid() then
    raise exception 'Only the invited person can complete their own admission' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_p.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if v_p.org_id is null and coalesce(btrim(v_p.declared_capacity), '') = '' then
    raise exception 'Admission needs an organisation or a declared professional capacity' using errcode = '23514';
  end if;
  if coalesce(btrim(v_p.participation_authority), '') = '' then
    raise exception 'Admission needs a declaration of authority to participate' using errcode = '23514';
  end if;

  /*
   * Every required agreement, accepted, AT THE CURRENT VERSION AND CHECKSUM.
   *
   * The join to `deal_room_agreement_documents` is what makes this a gate
   * rather than a row count. Checking only that a row exists per kind is what
   * let a forged acceptance satisfy admission in the first draft; an acceptance
   * that does not match the current canonical document now does not count, and
   * neither does one recorded against a retired version.
   */
  select array_agg(d.kind) into v_missing
  from public.deal_room_agreement_documents d
  where d.current
    and not exists (
      select 1 from public.deal_room_agreement_acceptances a
      where a.participant_id = p_participant_id
        and a.agreement_kind = d.kind
        and a.document_version = d.version
        and a.document_sha256 = d.sha256
    );

  if v_missing is not null and array_length(v_missing, 1) > 0 then
    raise exception 'Admission blocked: % not yet accepted at the current version', array_to_string(v_missing, ', ')
      using errcode = '23514';
  end if;

  update public.deal_room_participants
     set state = 'admitted', admitted_at = now()
   where id = p_participant_id;

  perform public.deal_room_log_event(v_p.room_id, v_p.sub_room_id, 'participant_admitted',
    'participant', p_participant_id,
    'Participant admitted after accepting the Participation Agreement, the NDA and the room rules.', null);

  -- Activation, and the term begins here rather than at room creation, so an
  -- invitation nobody answers does not spend the member's Starter room.
  if v_p.participant_class = 'principal' then
    update public.deal_rooms
       set state = 'active_procedure_not_agreed', activated_at = coalesce(activated_at, now())
     where id = v_p.room_id
       and state in ('proposed','awaiting_principal_admission','activation_pending');

    update public.deal_room_sub_rooms set state = 'active'
     where id = v_p.sub_room_id and state in ('awaiting_admission','invitation_pending');

    update public.deal_room_entitlements
       set state = 'active',
           activated_at = coalesce(activated_at, now()),
           expires_at = coalesce(expires_at, now() + interval '30 days')
     where room_id = v_p.room_id and state in ('eligible','reserved');

    perform public.deal_room_log_event(v_p.room_id, null, 'room_activated', 'room', v_p.room_id,
      'The room activated when the first principal counterparty was admitted. The Starter term begins now.', null);
  end if;
end;
$$;

/*
 * Propose a procedure version.
 *
 * The steps arrive as jsonb from the family template. Weights are validated
 * here as well as at approval: a version that could never be approved should
 * not be proposable.
 */
create or replace function public.deal_room_propose_procedure(
  p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_version integer;
  v_total integer;
begin
  if not (
    public.deal_room_can_administer(p_room_id)
    or exists (
      select 1 from public.deal_room_participants p
      where p.room_id = p_room_id and p.profile_id = auth.uid()
        and p.participant_class in ('principal','ponte_facilitator')
        and p.state in ('admitted','active')
    )
  ) then
    raise exception 'Only a principal participant or a room administrator can propose the procedure'
      using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(p_room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  select coalesce(sum((s->>'weight')::int), 0) into v_total
  from jsonb_array_elements(p_steps) s;
  if v_total <> 100 then
    raise exception 'Procedure weights must sum to exactly 100, not %', v_total using errcode = '23514';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.deal_room_procedures where room_id = p_room_id;

  insert into public.deal_room_procedures
    (room_id, sub_room_id, version, summary, completion_condition, state, proposed_by)
  values (p_room_id, p_sub_room_id, v_version, p_summary, p_completion, 'proposed', auth.uid())
  returning id into v_id;

  insert into public.deal_room_procedure_steps
    (procedure_id, step_key, seq, stage_label, title, completion_condition, responsible_role,
     weight, mandatory, requires_evidence, required_reviewer_role, state)
  select
    v_id, s->>'key', (s->>'seq')::int, s->>'stageLabel', s->>'title', s->>'completionCondition',
    s->>'responsibleRole', (s->>'weight')::int, (s->>'mandatory')::boolean,
    (s->>'requiresEvidence')::boolean, nullif(s->>'requiredReviewerRole', ''), 'not_ready'
  from jsonb_array_elements(p_steps) s;

  -- Every required approver gets a pending row, so "who has not responded" is a
  -- fact about rows rather than an inference.
  insert into public.deal_room_procedure_approvals (procedure_id, participant_id, response)
  select v_id, p.id, 'pending'
  from public.deal_room_participants p
  where p.room_id = p_room_id and p.is_required_approver and p.state in ('admitted','active');

  perform public.deal_room_log_event(p_room_id, p_sub_room_id, 'procedure_proposed', 'procedure', v_id,
    'A procedure version was proposed. It governs nothing until every required approver has approved it.', null);

  return v_id;
end;
$$;

create or replace function public.deal_room_approve_procedure(p_procedure_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_pr public.deal_room_procedures%rowtype;
  v_participant uuid;
  v_total integer;
  v_outstanding integer;
begin
  select * into v_pr from public.deal_room_procedures where id = p_procedure_id;
  if not found then
    raise exception 'Procedure not found' using errcode = '42501';
  end if;

  select p.id into v_participant
  from public.deal_room_participants p
  where p.room_id = v_pr.room_id and p.profile_id = auth.uid()
    and p.is_required_approver and p.state in ('admitted','active')
  limit 1;

  if v_participant is null then
    raise exception 'Only a required approver can approve this procedure' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_pr.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if v_pr.state not in ('proposed','amendment_requested') then
    raise exception 'Only a proposed procedure version can be approved' using errcode = '23514';
  end if;

  select coalesce(sum(weight), 0) into v_total
  from public.deal_room_procedure_steps
  where procedure_id = p_procedure_id and state not in ('not_applicable','cancelled');
  if v_total <> 100 then
    raise exception 'Procedure weights must sum to exactly 100, not %', v_total using errcode = '23514';
  end if;

  update public.deal_room_procedure_approvals
     set response = 'approved', responded_at = now()
   where procedure_id = p_procedure_id and participant_id = v_participant;

  perform public.deal_room_log_event(v_pr.room_id, v_pr.sub_room_id, 'procedure_approval_recorded',
    'procedure', p_procedure_id, 'A required approver approved this procedure version.', null);

  select count(*) into v_outstanding
  from public.deal_room_procedure_approvals
  where procedure_id = p_procedure_id and response <> 'approved';

  if v_outstanding = 0 then
    update public.deal_room_procedures set state = 'superseded', superseded_at = now()
     where room_id = v_pr.room_id and state = 'approved' and id <> p_procedure_id;

    update public.deal_room_procedures set state = 'approved', approved_at = now()
     where id = p_procedure_id;

    update public.deal_rooms set state = 'active_procedure_agreed'
     where id = v_pr.room_id
       and state in ('active_procedure_not_agreed','proposed','activation_pending');

    -- The two admission steps are complete by the time a procedure is agreed.
    -- Marking them here is what produces the 22% baseline, rather than a number
    -- chosen to look right.
    update public.deal_room_procedure_steps
       set state = 'completed', completed_at = now()
     where procedure_id = p_procedure_id
       and step_key in ('admission_and_nda','procedure_agreed');

    update public.deal_room_procedure_steps set state = 'ready'
     where procedure_id = p_procedure_id and state = 'not_ready';

    perform public.deal_room_log_event(v_pr.room_id, v_pr.sub_room_id, 'procedure_approved',
      'procedure', p_procedure_id,
      'The procedure was approved by every required approver and now governs this room.', null);
  end if;
end;
$$;

/* Submit evidence, with its first version, in one act. */
create or replace function public.deal_room_submit_evidence(
  p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text,
  p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_room uuid;
  v_step uuid;
  v_evidence uuid;
  v_label text;
begin
  select room_id into v_room from public.deal_room_sub_rooms where id = p_sub_room_id;
  if v_room is null or not public.deal_room_is_sub_room_participant(p_sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_room) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.deal_room_participants p
    where p.sub_room_id = p_sub_room_id and p.profile_id = auth.uid()
      and p.participant_class = 'observer'
  ) then
    raise exception 'An observer cannot supply evidence' using errcode = '42501';
  end if;
  if p_visibility not in ('own_org','sub_room','principals','ponte_only') then
    raise exception 'Unknown evidence visibility' using errcode = '23514';
  end if;

  select s.id into v_step
  from public.deal_room_procedure_steps s
  join public.deal_room_procedures pr on pr.id = s.procedure_id
  where pr.room_id = v_room and pr.state = 'approved' and s.step_key = p_step_key;

  select coalesce(o.name, pr.full_name, 'A participant') into v_label
  from public.profiles pr
  left join public.organizations o on o.id = pr.organization_id
  where pr.id = auth.uid();

  insert into public.deal_room_evidence
    (room_id, sub_room_id, step_id, title, provider_label, provenance, visibility, state,
     current_version, created_by)
  values
    (v_room, p_sub_room_id, v_step, p_title, v_label, p_provenance, p_visibility, 'uploaded', 1, auth.uid())
  returning id into v_evidence;

  insert into public.deal_room_evidence_versions
    (evidence_id, version, storage_path, file_name, mime_type, size_bytes, checksum_sha256, uploaded_by)
  values (v_evidence, 1, p_storage_path, p_file_name, p_mime, p_size, nullif(p_checksum, ''), auth.uid());

  if v_step is not null then
    update public.deal_room_procedure_steps set state = 'review_required' where id = v_step;
  end if;

  perform public.deal_room_log_event(v_room, p_sub_room_id, 'evidence_submitted', 'evidence', v_evidence,
    'Evidence was submitted. Submitting a document is not a check and it has not been accepted.', null);

  return v_evidence;
end;
$$;

create or replace function public.deal_room_request_clarification(p_evidence_id uuid, p_question text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ev public.deal_room_evidence%rowtype;
  v_id uuid;
begin
  select * into v_ev from public.deal_room_evidence where id = p_evidence_id;
  if not found or not public.deal_room_is_sub_room_participant(v_ev.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_ev.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if v_ev.created_by = auth.uid() then
    raise exception 'A clarification is asked of the provider, not by them' using errcode = '42501';
  end if;
  if coalesce(btrim(p_question), '') = '' then
    raise exception 'Ask the question' using errcode = '23514';
  end if;

  insert into public.deal_room_clarifications
    (room_id, sub_room_id, evidence_id, step_id, question, raised_by, state)
  values (v_ev.room_id, v_ev.sub_room_id, p_evidence_id, v_ev.step_id, btrim(p_question), auth.uid(), 'open')
  returning id into v_id;

  update public.deal_room_evidence set state = 'clarification_required' where id = p_evidence_id;
  if v_ev.step_id is not null then
    update public.deal_room_procedure_steps set state = 'clarification_required' where id = v_ev.step_id;
  end if;

  perform public.deal_room_log_event(v_ev.room_id, v_ev.sub_room_id, 'evidence_clarification_requested',
    'evidence', p_evidence_id, 'A reviewer asked a question about this evidence.', null);

  return v_id;
end;
$$;

/*
 * Answer a clarification, and correct the evidence in the same act.
 *
 * The corrected file is a NEW version. The version the reviewer questioned is
 * retained, which is what lets the history be read afterwards.
 */
create or replace function public.deal_room_answer_clarification(
  p_clarification_id uuid, p_answer text,
  p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_c public.deal_room_clarifications%rowtype;
  v_ev public.deal_room_evidence%rowtype;
  v_next integer;
begin
  select * into v_c from public.deal_room_clarifications where id = p_clarification_id;
  if not found or not public.deal_room_is_sub_room_participant(v_c.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_c.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if coalesce(btrim(p_answer), '') = '' then
    raise exception 'An answer is required' using errcode = '23514';
  end if;

  select * into v_ev from public.deal_room_evidence where id = v_c.evidence_id;
  if v_ev.created_by <> auth.uid() then
    raise exception 'Only the participant who supplied the evidence can answer this' using errcode = '42501';
  end if;

  update public.deal_room_clarifications
     set state = 'answered', answer = btrim(p_answer), answered_by = auth.uid(), answered_at = now()
   where id = p_clarification_id;

  if coalesce(btrim(p_storage_path), '') <> '' then
    select coalesce(max(version), 0) + 1 into v_next
    from public.deal_room_evidence_versions where evidence_id = v_ev.id;

    insert into public.deal_room_evidence_versions
      (evidence_id, version, storage_path, file_name, mime_type, size_bytes, checksum_sha256, uploaded_by)
    values (v_ev.id, v_next, p_storage_path, p_file_name, p_mime, p_size, nullif(p_checksum, ''), auth.uid());

    update public.deal_room_evidence set current_version = v_next where id = v_ev.id;

    perform public.deal_room_log_event(v_c.room_id, v_c.sub_room_id, 'evidence_superseded',
      'evidence', v_ev.id,
      'A corrected version was supplied. The earlier version is retained.', null);
  end if;

  update public.deal_room_evidence set state = 'under_review' where id = v_ev.id;
  if v_ev.step_id is not null then
    update public.deal_room_procedure_steps set state = 'review_required' where id = v_ev.step_id;
  end if;

  perform public.deal_room_log_event(v_c.room_id, v_c.sub_room_id, 'evidence_clarification_answered',
    'evidence', v_ev.id, 'The clarification was answered.', null);
end;
$$;

create or replace function public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ev public.deal_room_evidence%rowtype;
  v_reviewer_role text;
begin
  select * into v_ev from public.deal_room_evidence where id = p_evidence_id;
  if not found then
    raise exception 'Evidence not found' using errcode = '42501';
  end if;
  if not public.deal_room_is_sub_room_participant(v_ev.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_ev.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  -- The single most important line here. Without it, "accepted for procedure"
  -- would mean nothing more than "uploaded".
  if v_ev.created_by = auth.uid() then
    raise exception 'Evidence cannot be accepted for the procedure by the participant who supplied it'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.deal_room_clarifications c
             where c.evidence_id = p_evidence_id and c.state = 'open') then
    raise exception 'An open clarification must be answered before this can be accepted' using errcode = '23514';
  end if;

  if v_ev.step_id is not null then
    select required_reviewer_role into v_reviewer_role
    from public.deal_room_procedure_steps where id = v_ev.step_id;

    if v_reviewer_role is not null and not exists (
      select 1 from public.deal_room_participants p
      where p.sub_room_id = v_ev.sub_room_id and p.profile_id = auth.uid()
        and p.participant_class::text = v_reviewer_role and p.state in ('admitted','active')
    ) then
      raise exception 'The procedure names % as the reviewer for this requirement', v_reviewer_role
        using errcode = '42501';
    end if;
  end if;

  update public.deal_room_evidence
     set state = 'accepted_for_procedure', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_evidence_id;

  if v_ev.step_id is not null then
    update public.deal_room_procedure_steps set state = 'completed', completed_at = now()
     where id = v_ev.step_id;
    perform public.deal_room_log_event(v_ev.room_id, v_ev.sub_room_id, 'step_completed', 'step', v_ev.step_id,
      'A procedure step completed because its required evidence was accepted.', null);
  end if;

  perform public.deal_room_log_event(v_ev.room_id, v_ev.sub_room_id, 'evidence_accepted_for_procedure',
    'evidence', p_evidence_id,
    'Evidence accepted for the agreed procedure. Acceptance for a procedure is not a finding of authenticity.',
    null);
end;
$$;

create or replace function public.deal_room_open_blocker(
  p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text,
  p_description text, p_category text, p_requirement text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_step uuid;
  v_owner uuid;
begin
  if not (
    (p_sub_room_id is not null and public.deal_room_is_sub_room_participant(p_sub_room_id))
    or (p_sub_room_id is null and public.deal_room_is_master_participant(p_room_id))
  ) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(p_room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if p_category not in ('critical','material','operational') then
    raise exception 'Unknown blocker category' using errcode = '23514';
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_requirement), '') = '' then
    raise exception 'A blocker needs a title and a statement of what would resolve it' using errcode = '23514';
  end if;

  select s.id into v_step
  from public.deal_room_procedure_steps s
  join public.deal_room_procedures pr on pr.id = s.procedure_id
  where pr.room_id = p_room_id and pr.state = 'approved' and s.step_key = p_step_key;

  select id into v_owner from public.deal_room_participants
   where sub_room_id = p_sub_room_id and profile_id = auth.uid() limit 1;

  insert into public.deal_room_blockers
    (room_id, sub_room_id, step_id, title, description, category,
     owner_participant_id, resolution_requirement, state, created_by)
  values
    (p_room_id, p_sub_room_id, v_step, btrim(p_title), p_description, p_category,
     v_owner, btrim(p_requirement), 'owned', auth.uid())
  returning id into v_id;

  if v_step is not null then
    update public.deal_room_procedure_steps set state = 'blocked' where id = v_step;
  end if;

  if p_category = 'critical' then
    update public.deal_rooms set state = 'blocked'
     where id = p_room_id and state in ('active_procedure_agreed','active_procedure_not_agreed');
  end if;

  perform public.deal_room_log_event(p_room_id, p_sub_room_id, 'blocker_opened', 'blocker', v_id,
    'A blocker was opened. Progress already earned is unchanged.', null);

  return v_id;
end;
$$;

create or replace function public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_b public.deal_room_blockers%rowtype;
begin
  select * into v_b from public.deal_room_blockers where id = p_blocker_id;
  if not found then
    raise exception 'Blocker not found' using errcode = '42501';
  end if;
  if not (
    (v_b.sub_room_id is not null and public.deal_room_is_sub_room_participant(v_b.sub_room_id))
    or (v_b.sub_room_id is null and public.deal_room_is_master_participant(v_b.room_id))
  ) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_b.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'A resolution note is required: a blocker closed without one is not a record'
      using errcode = '23514';
  end if;

  update public.deal_room_blockers
     set state = 'resolved', resolved_by = auth.uid(), resolved_at = now(), resolution_note = btrim(p_note)
   where id = p_blocker_id;

  if v_b.step_id is not null then
    update public.deal_room_procedure_steps set state = 'ready'
     where id = v_b.step_id and state = 'blocked';
  end if;

  update public.deal_rooms r set state = 'active_procedure_agreed'
   where r.id = v_b.room_id and r.state = 'blocked'
     and not exists (
       select 1 from public.deal_room_blockers b
       where b.room_id = r.id and b.category = 'critical' and b.state not in ('resolved','waived'));

  update public.deal_room_procedure_steps s set state = 'completed', completed_at = now()
    from public.deal_room_procedures pr
   where pr.id = s.procedure_id and pr.room_id = v_b.room_id and pr.state = 'approved'
     and s.step_key = 'blockers_cleared'
     and not exists (
       select 1 from public.deal_room_blockers b
       where b.room_id = v_b.room_id and b.category = 'critical' and b.state not in ('resolved','waived'));

  perform public.deal_room_log_event(v_b.room_id, v_b.sub_room_id, 'blocker_resolved', 'blocker', p_blocker_id,
    'Blocker resolved. The blocker, its owner and its resolution stay in the history.',
    jsonb_build_object('resolution_note', p_note));
end;
$$;

create or replace function public.deal_room_set_read_only(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.deal_room_can_administer(p_room_id) then
    raise exception 'Only a room administrator can do this' using errcode = '42501';
  end if;

  update public.deal_rooms
     set state = 'read_only', read_only_at = coalesce(read_only_at, now())
   where id = p_room_id;

  update public.deal_room_entitlements set state = 'expired' where room_id = p_room_id;

  perform public.deal_room_log_event(p_room_id, null, 'room_read_only', 'room', p_room_id,
    'The room moved to read-only. Every document, decision and event is preserved and readable.', null);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------
--
-- `authenticated` only. `anon` is granted execute on nothing. The event logger
-- is revoked from everyone: a member who could call it directly could forge
-- history, which is the whole reason the other commands write it for them.

revoke all on function public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb) from public;

grant execute on function public.deal_room_propose(uuid, uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_invite(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.deal_room_accept_invitation(text) to authenticated;
grant execute on function public.deal_room_declare_participation(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_accept_agreement(uuid, text) to authenticated;

-- The agreement authority is readable only through the commands. A member who
-- could select it could not forge an acceptance - the command no longer takes a
-- version - but there is no reason for it to be reachable either.
revoke all on table public.deal_room_agreement_documents from anon, authenticated;
grant execute on function public.deal_room_admit_participant(uuid) to authenticated;
grant execute on function public.deal_room_propose_procedure(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.deal_room_approve_procedure(uuid) to authenticated;
grant execute on function public.deal_room_submit_evidence(uuid, text, text, text, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.deal_room_request_clarification(uuid, text) to authenticated;
grant execute on function public.deal_room_answer_clarification(uuid, text, text, text, bigint, text, text) to authenticated;
grant execute on function public.deal_room_accept_evidence_for_procedure(uuid) to authenticated;
grant execute on function public.deal_room_open_blocker(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.deal_room_resolve_blocker(uuid, text) to authenticated;
grant execute on function public.deal_room_set_read_only(uuid) to authenticated;

commit;
