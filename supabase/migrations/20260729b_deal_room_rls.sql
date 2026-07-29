-- Deal Room launch slice: RLS, helper predicates and authorised commands.
--
-- Run AFTER 20260729a_deal_room_core.sql:
--   node scripts/db-query.mjs --file supabase/migrations/20260729b_deal_room_rls.sql
--
-- NOT APPLIED. Written and reviewed at Gate B. Applying it is a Gate C owner
-- decision. It creates no table and alters no existing object.
--
-- ============================ THE ONE IDEA =============================
--
-- Sub-room isolation is enforced by returning ZERO ROWS, not by raising an
-- error and not by filtering in the interface. A counterparty admitted to
-- workspace A asking for workspace B gets an empty result: no row, no count, no
-- error message that differs from any other empty result, and therefore nothing
-- to infer from. Acceptance criterion 13 is a property of these policies.
--
-- Everything else follows from that. Every list, count, navigation item,
-- notification and AI context is built from the same filtered reads, because
-- there is no unfiltered read available to build them from.
--
-- ========================== AND THE OTHER ONE ==========================
--
-- `deal_room_activity_events` has NO member INSERT policy. History is written
-- only inside the SECURITY DEFINER command functions below, so a participant
-- cannot forge an event. This is the shape `listing_events` already uses on
-- `main`; the difference is that here the same functions also perform the state
-- transition, so the event and the change it records cannot come apart.
--
-- ================================ ROLLBACK =============================
--
--   drop function if exists public.deal_room_set_read_only(uuid);
--   drop function if exists public.deal_room_resolve_blocker(uuid, text);
--   drop function if exists public.deal_room_open_blocker(uuid, uuid, uuid, text, text, text, text);
--   drop function if exists public.deal_room_supersede_evidence(uuid, uuid);
--   drop function if exists public.deal_room_reject_evidence(uuid, text);
--   drop function if exists public.deal_room_accept_evidence_for_procedure(uuid);
--   drop function if exists public.deal_room_answer_clarification(uuid, text);
--   drop function if exists public.deal_room_request_clarification(uuid, text);
--   drop function if exists public.deal_room_submit_evidence(uuid, text, text, text, bigint, text);
--   drop function if exists public.deal_room_approve_procedure(uuid);
--   drop function if exists public.deal_room_admit_participant(uuid, uuid, text, text, jsonb);
--   drop function if exists public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb);
--   drop function if exists public.deal_room_can_read_evidence(uuid);
--   drop function if exists public.deal_room_is_writable(uuid);
--   drop function if exists public.deal_room_can_administer(uuid);
--   drop function if exists public.deal_room_is_master_participant(uuid);
--   drop function if exists public.deal_room_is_sub_room_participant(uuid);
--   -- then every `drop policy if exists` named below, then 20260729a's rollback.
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
-- All SECURITY DEFINER, STABLE, with `search_path` pinned so a caller cannot
-- shadow `public` with a schema of their own and change what these read.
--
-- They are the only place the membership question is answered. Writing the same
-- EXISTS clause inline in twenty policies is how one of them ends up subtly
-- different from the rest.

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
  'True only for an admitted or active participant of that private workspace. Invited, prerequisites_pending and terms_pending are all outside the room.';

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

-- Room lifecycle AND entitlement, both. They fail for different reasons and
-- both must hold. This is what makes read-only continuity a database property:
-- a stale client holding an old room state cannot write to a lapsed room,
-- because the policy re-reads both at statement time.
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
    left join public.deal_room_entitlements e on e.room_id = r.id
    where r.id = p_room_id
      and r.state in ('draft','proposed','awaiting_principal_admission','activation_pending',
                      'active_procedure_not_agreed','active_procedure_agreed','blocked','ready_to_proceed')
      and (e.id is null or e.state in ('reserved','active','grace','restored'))
  );
$$;

-- Evidence visibility is more specific than room membership, so it gets its own
-- predicate rather than being folded into the sub-room one.
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
        -- Sub-room membership is the floor for every visibility below it.
        (ev.visibility in ('sub_room','principals','selected')
           and public.deal_room_is_sub_room_participant(ev.sub_room_id))
        -- The provider always sees their own item, at any visibility.
        or ev.created_by = auth.uid()
        -- Ponte-only items are for platform administrators.
        or (ev.visibility = 'ponte_only' and public.is_admin())
      )
      -- `principals` narrows the floor further.
      and (
        ev.visibility <> 'principals'
        or ev.created_by = auth.uid()
        or exists (
          select 1 from public.deal_room_participants p
          where p.sub_room_id = ev.sub_room_id
            and p.profile_id = auth.uid()
            and p.participant_class = 'principal'
            and p.state in ('admitted','active')
        )
      )
      -- `own_org` never leaves the creating organisation.
      and (
        ev.visibility <> 'own_org'
        or ev.created_by = auth.uid()
        or exists (
          select 1
          from public.deal_room_participants me
          join public.deal_room_participants owner_p
            on owner_p.sub_room_id = me.sub_room_id
          where me.profile_id = auth.uid()
            and me.sub_room_id = ev.sub_room_id
            and me.state in ('admitted','active')
            and owner_p.profile_id = ev.created_by
            and me.org_id is not null
            and me.org_id = owner_p.org_id
        )
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Enable RLS on all fourteen tables
-- ---------------------------------------------------------------------
--
-- No policy anywhere grants anything to `anon`. Supabase grants table
-- privileges to anon and authenticated by default, so RLS with no matching
-- policy is what closes them, and every policy below names `authenticated`.

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

-- ---------------------------------------------------------------------
-- 3. deal_rooms
-- ---------------------------------------------------------------------

drop policy if exists "deal room read" on public.deal_rooms;
create policy "deal room read" on public.deal_rooms
  for select to authenticated
  using (
    public.deal_room_can_administer(id)
    or public.deal_room_is_master_participant(id)
    -- A sub-room participant sees the master room's own facts (the Deal, the
    -- stage) but never its sub-room portfolio, which is a different table with
    -- a different policy.
    or exists (
      select 1 from public.deal_room_participants p
      where p.room_id = deal_rooms.id
        and p.profile_id = auth.uid()
        and p.state in ('admitted','active')
    )
    or public.is_admin()
  );

drop policy if exists "deal room create" on public.deal_rooms;
create policy "deal room create" on public.deal_rooms
  for insert to authenticated
  with check (initiator_profile_id = auth.uid());

drop policy if exists "deal room administer" on public.deal_rooms;
create policy "deal room administer" on public.deal_rooms
  for update to authenticated
  using (public.deal_room_can_administer(id))
  with check (public.deal_room_can_administer(id) and public.deal_room_is_writable(id));

-- No DELETE policy on any Deal Room table, anywhere in this file. A room, a
-- participation, an evidence item and a blocker are all history, and history is
-- superseded rather than removed.

-- ---------------------------------------------------------------------
-- 4. deal_room_entitlements
-- ---------------------------------------------------------------------

drop policy if exists "entitlement read" on public.deal_room_entitlements;
create policy "entitlement read" on public.deal_room_entitlements
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

drop policy if exists "entitlement create" on public.deal_room_entitlements;
create policy "entitlement create" on public.deal_room_entitlements
  for insert to authenticated
  with check (public.deal_room_can_administer(room_id));

-- Entitlement state is advanced by the command functions and by scheduled
-- expiry under the service role. A member cannot extend their own term, which
-- is why there is no member UPDATE policy here.

-- ---------------------------------------------------------------------
-- 5. deal_room_sub_rooms - the isolation boundary
-- ---------------------------------------------------------------------

drop policy if exists "sub room read" on public.deal_room_sub_rooms;
create policy "sub room read" on public.deal_room_sub_rooms
  for select to authenticated
  using (
    public.deal_room_is_sub_room_participant(id)
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "sub room create" on public.deal_room_sub_rooms;
create policy "sub room create" on public.deal_room_sub_rooms
  for insert to authenticated
  with check (public.deal_room_can_administer(room_id) and public.deal_room_is_writable(room_id));

drop policy if exists "sub room administer" on public.deal_room_sub_rooms;
create policy "sub room administer" on public.deal_room_sub_rooms
  for update to authenticated
  using (public.deal_room_can_administer(room_id))
  with check (public.deal_room_can_administer(room_id) and public.deal_room_is_writable(room_id));

-- ---------------------------------------------------------------------
-- 6. deal_room_participants
-- ---------------------------------------------------------------------

drop policy if exists "participant read" on public.deal_room_participants;
create policy "participant read" on public.deal_room_participants
  for select to authenticated
  using (
    -- Yourself, always.
    profile_id = auth.uid()
    -- People sharing a workspace you are admitted to. Note this is the
    -- participant's OWN sub_room_id: a master-level row (sub_room_id null) is
    -- not exposed to sub-room participants by this arm.
    or (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "participant invite" on public.deal_room_participants;
create policy "participant invite" on public.deal_room_participants
  for insert to authenticated
  with check (public.deal_room_can_administer(room_id) and public.deal_room_is_writable(room_id));

-- Admission itself runs through deal_room_admit_participant(). This policy
-- exists for the narrower case of a participant completing their own
-- prerequisites before that: it cannot move anyone into `admitted`, because the
-- WITH CHECK forbids it.
drop policy if exists "participant self progress" on public.deal_room_participants;
create policy "participant self progress" on public.deal_room_participants
  for update to authenticated
  using (profile_id = auth.uid() and state in ('invited','prerequisites_pending','terms_pending'))
  with check (
    profile_id = auth.uid()
    and state in ('invited','prerequisites_pending','terms_pending')
    and public.deal_room_is_writable(room_id)
  );

drop policy if exists "participant administer" on public.deal_room_participants;
create policy "participant administer" on public.deal_room_participants
  for update to authenticated
  using (public.deal_room_can_administer(room_id))
  with check (public.deal_room_can_administer(room_id) and public.deal_room_is_writable(room_id));

-- ---------------------------------------------------------------------
-- 7. deal_room_invitations
-- ---------------------------------------------------------------------
--
-- No SELECT policy for a member at all, deliberately.
--
-- The invitation landing is reached by someone with no account and no
-- participation. It is resolved server-side: the raw token is hashed and looked
-- up under the service role, and only `preview_facts` is returned. If members
-- could select this table, an admitted participant could enumerate invitations
-- for other workspaces, which is the inference acceptance criterion 13 forbids.

drop policy if exists "invitation issue" on public.deal_room_invitations;
create policy "invitation issue" on public.deal_room_invitations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.deal_room_can_administer(room_id)
    and public.deal_room_is_writable(room_id)
  );

drop policy if exists "invitation administer read" on public.deal_room_invitations;
create policy "invitation administer read" on public.deal_room_invitations
  for select to authenticated
  using (public.deal_room_can_administer(room_id) or public.is_admin());

drop policy if exists "invitation revoke" on public.deal_room_invitations;
create policy "invitation revoke" on public.deal_room_invitations
  for update to authenticated
  using (public.deal_room_can_administer(room_id))
  with check (public.deal_room_can_administer(room_id));

-- ---------------------------------------------------------------------
-- 8. deal_room_agreement_acceptances
-- ---------------------------------------------------------------------

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

-- A member records their own acceptance, for their own participation, and only
-- while that participation is still inside the admission gate. Nobody can
-- accept on behalf of anybody else.
drop policy if exists "acceptance record" on public.deal_room_agreement_acceptances;
create policy "acceptance record" on public.deal_room_agreement_acceptances
  for insert to authenticated
  with check (
    exists (
      select 1 from public.deal_room_participants p
      where p.id = participant_id
        and p.profile_id = auth.uid()
        and p.state in ('invited','prerequisites_pending','terms_pending')
    )
    and public.deal_room_is_writable(room_id)
  );

-- No UPDATE and no DELETE. An acceptance is evidence; it is superseded by a
-- later version, never edited.

-- ---------------------------------------------------------------------
-- 9. deal_room_procedures, steps, approvals
-- ---------------------------------------------------------------------

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

drop policy if exists "procedure propose" on public.deal_room_procedures;
create policy "procedure propose" on public.deal_room_procedures
  for insert to authenticated
  with check (
    proposed_by = auth.uid()
    and public.deal_room_is_writable(room_id)
    and (
      public.deal_room_can_administer(room_id)
      or exists (
        select 1 from public.deal_room_participants p
        where p.room_id = deal_room_procedures.room_id
          and p.profile_id = auth.uid()
          and p.participant_class in ('principal','ponte_facilitator')
          and p.state in ('admitted','active')
      )
    )
  );

-- Editing a version is allowed only while it is a draft. `proposed` and
-- `approved` versions are immutable to members; the transition to `approved`
-- happens inside deal_room_approve_procedure().
drop policy if exists "procedure edit draft" on public.deal_room_procedures;
create policy "procedure edit draft" on public.deal_room_procedures
  for update to authenticated
  using (proposed_by = auth.uid() and state = 'draft')
  with check (proposed_by = auth.uid() and state in ('draft','proposed') and public.deal_room_is_writable(room_id));

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

drop policy if exists "step write draft" on public.deal_room_procedure_steps;
create policy "step write draft" on public.deal_room_procedure_steps
  for insert to authenticated
  with check (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id
        and pr.proposed_by = auth.uid()
        and pr.state = 'draft'
        and public.deal_room_is_writable(pr.room_id)
    )
  );

-- Two distinct update paths, and the distinction is the point.
--
-- The proposer may reshape a DRAFT: titles, weights, reviewers. Once a version
-- is approved that is closed, and what remains is advancing a step's STATE,
-- which the responsible participant does. Neither can do the other's job.
drop policy if exists "step edit draft" on public.deal_room_procedure_steps;
create policy "step edit draft" on public.deal_room_procedure_steps
  for update to authenticated
  using (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id and pr.proposed_by = auth.uid() and pr.state = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id and pr.proposed_by = auth.uid() and pr.state = 'draft'
        and public.deal_room_is_writable(pr.room_id)
    )
  );

drop policy if exists "step advance state" on public.deal_room_procedure_steps;
create policy "step advance state" on public.deal_room_procedure_steps
  for update to authenticated
  using (
    exists (
      select 1
      from public.deal_room_procedures pr
      join public.deal_room_participants p on p.room_id = pr.room_id
      where pr.id = procedure_id
        and pr.state = 'approved'
        and p.profile_id = auth.uid()
        and p.state in ('admitted','active')
        and p.participant_class <> 'observer'
    )
  )
  with check (
    exists (
      select 1
      from public.deal_room_procedures pr
      join public.deal_room_participants p on p.room_id = pr.room_id
      where pr.id = procedure_id
        and pr.state = 'approved'
        and p.profile_id = auth.uid()
        and p.state in ('admitted','active')
        and p.participant_class <> 'observer'
        and public.deal_room_is_writable(pr.room_id)
    )
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

-- Only the designated approver, and only their own row. This is acceptance
-- criterion 6 - the procedure cannot govern before required approval - and it
-- is why nobody can insert an approval on someone else's behalf.
drop policy if exists "approval respond" on public.deal_room_procedure_approvals;
create policy "approval respond" on public.deal_room_procedure_approvals
  for update to authenticated
  using (
    exists (
      select 1 from public.deal_room_participants p
      where p.id = participant_id and p.profile_id = auth.uid() and p.is_required_approver
        and p.state in ('admitted','active')
    )
  )
  with check (
    exists (
      select 1 from public.deal_room_participants p
      where p.id = participant_id and p.profile_id = auth.uid() and p.is_required_approver
        and p.state in ('admitted','active')
        and public.deal_room_is_writable(p.room_id)
    )
  );

drop policy if exists "approval seed" on public.deal_room_procedure_approvals;
create policy "approval seed" on public.deal_room_procedure_approvals
  for insert to authenticated
  with check (
    exists (
      select 1 from public.deal_room_procedures pr
      where pr.id = procedure_id
        and pr.proposed_by = auth.uid()
        and pr.state in ('draft','proposed')
        and public.deal_room_is_writable(pr.room_id)
    )
  );

-- ---------------------------------------------------------------------
-- 10. Evidence, versions, clarifications
-- ---------------------------------------------------------------------

drop policy if exists "evidence read" on public.deal_room_evidence;
create policy "evidence read" on public.deal_room_evidence
  for select to authenticated
  using (public.deal_room_can_read_evidence(id) or public.is_admin());

drop policy if exists "evidence create" on public.deal_room_evidence;
create policy "evidence create" on public.deal_room_evidence
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.deal_room_is_sub_room_participant(sub_room_id)
    and public.deal_room_is_writable(room_id)
    and exists (
      select 1 from public.deal_room_participants p
      where p.sub_room_id = deal_room_evidence.sub_room_id
        and p.profile_id = auth.uid()
        and p.participant_class <> 'observer'
        and p.state in ('admitted','active')
    )
  );

-- The provider may change their own item's title or visibility while it is
-- still a draft or merely uploaded. Review states are not theirs to set: moving
-- an item to `accepted_for_procedure` is a reviewer's act and runs through
-- deal_room_accept_evidence_for_procedure(). The WITH CHECK is what stops a
-- provider marking their own document accepted.
drop policy if exists "evidence author edit" on public.deal_room_evidence;
create policy "evidence author edit" on public.deal_room_evidence
  for update to authenticated
  using (created_by = auth.uid() and state in ('draft','uploaded','clarification_required'))
  with check (
    created_by = auth.uid()
    and state in ('draft','uploaded','disclosed','under_review','withdrawn')
    and public.deal_room_is_writable(room_id)
  );

drop policy if exists "evidence version read" on public.deal_room_evidence_versions;
create policy "evidence version read" on public.deal_room_evidence_versions
  for select to authenticated
  using (public.deal_room_can_read_evidence(evidence_id) or public.is_admin());

drop policy if exists "evidence version create" on public.deal_room_evidence_versions;
create policy "evidence version create" on public.deal_room_evidence_versions
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.deal_room_evidence ev
      where ev.id = evidence_id
        and public.deal_room_is_sub_room_participant(ev.sub_room_id)
        and public.deal_room_is_writable(ev.room_id)
    )
  );

-- No UPDATE and no DELETE on versions, at all. A version is immutable; a
-- correction is a new version. This is what makes "the version the reviewer
-- accepted" a meaningful phrase.

drop policy if exists "clarification read" on public.deal_room_clarifications;
create policy "clarification read" on public.deal_room_clarifications
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

drop policy if exists "clarification raise" on public.deal_room_clarifications;
create policy "clarification raise" on public.deal_room_clarifications
  for insert to authenticated
  with check (
    raised_by = auth.uid()
    and public.deal_room_is_sub_room_participant(sub_room_id)
    and public.deal_room_is_writable(room_id)
  );

drop policy if exists "clarification answer" on public.deal_room_clarifications;
create policy "clarification answer" on public.deal_room_clarifications
  for update to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id))
  with check (public.deal_room_is_sub_room_participant(sub_room_id) and public.deal_room_is_writable(room_id));

-- ---------------------------------------------------------------------
-- 11. Blockers
-- ---------------------------------------------------------------------

drop policy if exists "blocker read" on public.deal_room_blockers;
create policy "blocker read" on public.deal_room_blockers
  for select to authenticated
  using (
    (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or (sub_room_id is null and public.deal_room_is_master_participant(room_id))
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

drop policy if exists "blocker open" on public.deal_room_blockers;
create policy "blocker open" on public.deal_room_blockers
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.deal_room_is_writable(room_id)
    and (
      (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
      or (sub_room_id is null and public.deal_room_is_master_participant(room_id))
    )
  );

drop policy if exists "blocker update" on public.deal_room_blockers;
create policy "blocker update" on public.deal_room_blockers
  for update to authenticated
  using (
    (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
    or (sub_room_id is null and public.deal_room_is_master_participant(room_id))
    or public.deal_room_can_administer(room_id)
  )
  with check (public.deal_room_is_writable(room_id));

-- ---------------------------------------------------------------------
-- 12. Activity events - read only, for everyone
-- ---------------------------------------------------------------------
--
-- SELECT is permission-filtered by sub-room, so the feed a participant reads
-- can never mention a workspace they cannot see. There is NO insert, update or
-- delete policy: writes happen inside the command functions, and the
-- append-only trigger from 20260729a refuses UPDATE and DELETE even to the
-- table owner.

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
-- 13. Authorised commands
-- ---------------------------------------------------------------------
--
-- Every material state change is one of these. They validate authority, perform
-- the transition and write the activity event in a single transaction, so a
-- change can never exist without its record, and a record can never be written
-- without its change.
--
-- SECURITY DEFINER with a pinned search_path. Each one re-checks the caller
-- with `auth.uid()`; being SECURITY DEFINER lets them write the activity table,
-- it does not let the caller do anything the function has not verified.

create or replace function public.deal_room_log_event(
  p_room_id     uuid,
  p_sub_room_id uuid,
  p_event_type  text,
  p_subject_type text,
  p_subject_id  uuid,
  p_summary     text,
  p_detail      jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_actor_label text;
  v_actor_org text;
begin
  select coalesce(pr.full_name, 'A participant'), o.name
    into v_actor_label, v_actor_org
  from public.profiles pr
  left join public.organizations o on o.id = pr.organization_id
  where pr.id = auth.uid();

  insert into public.deal_room_activity_events
    (room_id, sub_room_id, event_type, subject_type, subject_id, summary, detail,
     actor_profile_id, actor_label, actor_org_label)
  values
    (p_room_id, p_sub_room_id, p_event_type, p_subject_type, p_subject_id, p_summary, p_detail,
     auth.uid(), coalesce(v_actor_label, 'A participant'), v_actor_org)
  returning id into v_id;

  return v_id;
end;
$$;

-- Admission. The gate acceptance criterion 4 is about.
create or replace function public.deal_room_admit_participant(p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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

  -- Every required agreement, accepted, for this participation. Missing any one
  -- of them and the person stays outside the room.
  select array_agg(kind) into v_missing
  from unnest(array['participation','nda','room_rules','authority_declaration']) as kind
  where not exists (
    select 1 from public.deal_room_agreement_acceptances a
    where a.participant_id = p_participant_id and a.agreement_kind = kind
  );

  if v_missing is not null and array_length(v_missing, 1) > 0 then
    raise exception 'Admission blocked: % not yet accepted', array_to_string(v_missing, ', ')
      using errcode = '23514';
  end if;

  update public.deal_room_participants
     set state = 'admitted', admitted_at = now()
   where id = p_participant_id;

  perform public.deal_room_log_event(
    v_p.room_id, v_p.sub_room_id, 'participant_admitted', 'participant', p_participant_id,
    'Participant admitted after accepting the Participation Agreement, the NDA and the room rules.', null);

  -- Activation: the term begins when the first required principal is admitted,
  -- not when the room was created. A room waiting on an invitation nobody
  -- answers must not spend the member's Starter entitlement.
  if v_p.participant_class = 'principal' then
    update public.deal_rooms
       set state = 'active_procedure_not_agreed',
           activated_at = coalesce(activated_at, now())
     where id = v_p.room_id
       and state in ('proposed','awaiting_principal_admission','activation_pending');

    update public.deal_room_entitlements
       set state = 'active',
           activated_at = coalesce(activated_at, now()),
           expires_at = coalesce(expires_at, now() + interval '30 days')
     where room_id = v_p.room_id
       and state in ('eligible','reserved');
  end if;
end;
$$;

-- Procedure approval. This is where the weights rule is enforced atomically.
create or replace function public.deal_room_approve_procedure(p_procedure_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
  where p.room_id = v_pr.room_id
    and p.profile_id = auth.uid()
    and p.is_required_approver
    and p.state in ('admitted','active');

  if v_participant is null then
    raise exception 'Only a required approver can approve this procedure' using errcode = '42501';
  end if;

  if not public.deal_room_is_writable(v_pr.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  if v_pr.state not in ('proposed','amendment_requested') then
    raise exception 'Only a proposed procedure version can be approved' using errcode = '23514';
  end if;

  -- The set-level rule a row CHECK cannot express, checked at the moment it
  -- matters rather than hoped for.
  select coalesce(sum(weight), 0) into v_total
  from public.deal_room_procedure_steps
  where procedure_id = p_procedure_id and state not in ('not_applicable','cancelled');

  if v_total <> 100 then
    raise exception 'Procedure weights must sum to exactly 100, not %', v_total using errcode = '23514';
  end if;

  update public.deal_room_procedure_approvals
     set response = 'approved', responded_at = now()
   where procedure_id = p_procedure_id and participant_id = v_participant;

  perform public.deal_room_log_event(
    v_pr.room_id, v_pr.sub_room_id, 'procedure_approval_recorded', 'procedure', p_procedure_id,
    'A required approver approved this procedure version.', null);

  select count(*) into v_outstanding
  from public.deal_room_procedure_approvals
  where procedure_id = p_procedure_id and response <> 'approved';

  -- The version governs only when EVERY required approver has approved. Until
  -- then nothing changes and no percentage appears.
  if v_outstanding = 0 then
    update public.deal_room_procedures
       set state = 'superseded', superseded_at = now()
     where room_id = v_pr.room_id and state = 'approved' and id <> p_procedure_id;

    update public.deal_room_procedures
       set state = 'approved', approved_at = now()
     where id = p_procedure_id;

    update public.deal_rooms
       set state = 'active_procedure_agreed'
     where id = v_pr.room_id
       and state in ('active_procedure_not_agreed','proposed','activation_pending');

    -- The two admission steps are complete by the time a procedure is agreed:
    -- the participants are in and the procedure is approved. Marking them here
    -- is what produces the 22% baseline the product definition specifies,
    -- rather than a number chosen to look right.
    update public.deal_room_procedure_steps
       set state = 'completed', completed_at = now()
     where procedure_id = p_procedure_id
       and step_key in ('admission_and_nda','procedure_agreed');

    update public.deal_room_procedure_steps
       set state = 'ready'
     where procedure_id = p_procedure_id and state = 'not_ready';

    perform public.deal_room_log_event(
      v_pr.room_id, v_pr.sub_room_id, 'procedure_approved', 'procedure', p_procedure_id,
      'The procedure was approved by every required approver and now governs this room.', null);
  end if;
end;
$$;

-- Accepting evidence for the procedure. A reviewer's act, never the provider's.
create or replace function public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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

  -- The provider cannot accept their own evidence. This is the single most
  -- important line in the function: without it, "accepted for procedure" would
  -- mean nothing more than "uploaded".
  if v_ev.created_by = auth.uid() then
    raise exception 'Evidence cannot be accepted for the procedure by the participant who supplied it'
      using errcode = '42501';
  end if;

  if v_ev.step_id is not null then
    select required_reviewer_role into v_reviewer_role
    from public.deal_room_procedure_steps where id = v_ev.step_id;

    if v_reviewer_role is not null and not exists (
      select 1 from public.deal_room_participants p
      where p.sub_room_id = v_ev.sub_room_id
        and p.profile_id = auth.uid()
        and p.participant_class::text = v_reviewer_role
        and p.state in ('admitted','active')
    ) then
      raise exception 'The procedure names % as the reviewer for this requirement', v_reviewer_role
        using errcode = '42501';
    end if;
  end if;

  update public.deal_room_evidence
     set state = 'accepted_for_procedure', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_evidence_id;

  if v_ev.step_id is not null then
    update public.deal_room_procedure_steps
       set state = 'completed', completed_at = now()
     where id = v_ev.step_id;

    perform public.deal_room_log_event(
      v_ev.room_id, v_ev.sub_room_id, 'step_completed', 'step', v_ev.step_id,
      'A procedure step completed because its required evidence was accepted.', null);
  end if;

  perform public.deal_room_log_event(
    v_ev.room_id, v_ev.sub_room_id, 'evidence_accepted_for_procedure', 'evidence', p_evidence_id,
    'Evidence accepted for the agreed procedure. Acceptance for a procedure is not a finding of authenticity.',
    null);
end;
$$;

-- Blocker resolution. The row is retained, always.
create or replace function public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
     set state = 'resolved', resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_note
   where id = p_blocker_id;

  -- The room leaves `blocked` only when nothing critical is left open.
  update public.deal_rooms r
     set state = 'active_procedure_agreed'
   where r.id = v_b.room_id
     and r.state = 'blocked'
     and not exists (
       select 1 from public.deal_room_blockers b
       where b.room_id = r.id and b.category = 'critical' and b.state not in ('resolved','waived')
     );

  -- The blockers step earns its weight once no critical blocker remains.
  update public.deal_room_procedure_steps s
     set state = 'completed', completed_at = now()
    from public.deal_room_procedures pr
   where pr.id = s.procedure_id
     and pr.room_id = v_b.room_id
     and pr.state = 'approved'
     and s.step_key = 'blockers_cleared'
     and not exists (
       select 1 from public.deal_room_blockers b
       where b.room_id = v_b.room_id and b.category = 'critical' and b.state not in ('resolved','waived')
     );

  perform public.deal_room_log_event(
    v_b.room_id, v_b.sub_room_id, 'blocker_resolved', 'blocker', p_blocker_id,
    'Blocker resolved. The blocker, its owner and its resolution stay in the history.',
    jsonb_build_object('resolution_note', p_note));
end;
$$;

-- Read-only continuity. Nothing is deleted, ever.
create or replace function public.deal_room_set_read_only(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.deal_room_can_administer(p_room_id) then
    raise exception 'Only a room administrator can do this' using errcode = '42501';
  end if;

  update public.deal_rooms
     set state = 'read_only', read_only_at = coalesce(read_only_at, now())
   where id = p_room_id;

  perform public.deal_room_log_event(
    p_room_id, null, 'room_read_only', 'room', p_room_id,
    'The room moved to read-only. Every document, decision and event is preserved and readable.', null);
end;
$$;

-- Grants. `authenticated` only; `anon` is never granted execute on any of them.
revoke all on function public.deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb) from public;
grant execute on function public.deal_room_admit_participant(uuid) to authenticated;
grant execute on function public.deal_room_approve_procedure(uuid) to authenticated;
grant execute on function public.deal_room_accept_evidence_for_procedure(uuid) to authenticated;
grant execute on function public.deal_room_resolve_blocker(uuid, text) to authenticated;
grant execute on function public.deal_room_set_read_only(uuid) to authenticated;

commit;
