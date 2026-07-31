-- A procedure can be approved: one approval per person, and both principals hold one.
--
-- ## What Approval 3 found on 31 July 2026
--
-- With `20260731b` applied the Deal Room loop runs - 92 of 94 assertions pass -
-- and stops at the procedure gate. **No procedure version could ever reach
-- `approved`**, for two independent reasons, either sufficient on its own.
--
-- ### 1. The initiator was issued two approval obligations for themselves
--
-- `deal_room_propose_procedure` seeded one pending row per *participant row*
-- carrying `is_required_approver`:
--
--   insert into public.deal_room_procedure_approvals (procedure_id, participant_id, response)
--   select v_id, p.id, 'pending'
--   from public.deal_room_participants p
--   where p.room_id = p_room_id and p.is_required_approver and p.state in ('admitted','active');
--
-- `deal_room_propose` gives the initiator **two** participant rows in the same
-- room - master-level and first workspace - and marks both required. So the
-- initiator received two obligations. `deal_room_approve_procedure` then resolved
-- the caller with `select p.id ... limit 1` and updated that one `participant_id`,
-- leaving the other `pending` for ever. `v_outstanding` never reached zero.
--
-- Observed in production: both approval rows on the fixture procedure belonged to
-- the same person - one `approved`, one `pending`.
--
-- ### 2. An admitted counterparty principal was never a required approver
--
-- `deal_room_admit_participant` left `is_required_approver` false, so the
-- counterparty - `participant_class = 'principal'`, state `admitted` - was refused
-- with `Only a required approver can approve this procedure`, and had been issued
-- no approval row to begin with.
--
-- ## What the authority requires
--
-- `PT-PRODUCT-2026-07-27-01-DEAL-ROOM-PRODUCT-CONTRACT-V1.md`, section 8:
--
--   "The room creator, a principal participant or Ponte may propose the initial
--    procedure. It becomes agreed only after approval by every designated
--    principal approver."
--
--   "Material changes create a new procedure version and require renewed approval
--    from affected principal participants."
--
-- and, on who is separate from that: "Supporting providers approve only the
-- responsibilities and decisions assigned to them." The contract also holds that
-- "participation authority and binding-decision authority are separate" - which is
-- the line between the `principal` class and the provider, adviser and
-- intermediary classes, and is exactly what `is_required_approver` encodes.
--
-- So: **every admitted principal is a required approver, and each person approves
-- once.** Owner decision of 31 July 2026.
--
-- ## What this file changes
--
-- Three `create or replace function` statements on identical signatures, so no
-- overload is created and no grant is invalidated. Each body is `20260729b`'s,
-- extracted verbatim, with only the edits below.
--
-- 1. `deal_room_admit_participant` - the admission update also sets
--    `is_required_approver` when the participant is a principal. Admission is the
--    honest place for it: identity, capacity, authority declaration and every
--    current agreement have just been proved. It is `or`-ed, so it can only ever
--    promote; nothing demotes an existing approver.
--
-- 2. `deal_room_propose_procedure` - seeds `distinct on (p.profile_id)`, one row
--    per person, choosing the master-level row where one exists, then the earliest
--    admitted, then the lowest id. Deterministic, so the approve path cannot pick
--    a different row than the propose path seeded.
--
-- 3. `deal_room_approve_procedure` - approves by person rather than by whichever
--    participant row the authorisation check happened to find, and now refuses
--    when the caller holds no approval row on this version rather than silently
--    updating nothing and letting the outstanding count fall to zero without them.
--
-- No table, constraint, policy, trigger, index, grant or row is altered. In
-- particular **no existing row is backfilled**: the only rooms in production are
-- the negative-access fixture's, whose disposal is a separate owner decision.
--
-- Verification after applying:
--
--   npm run deal-room:acl-verify          -- ACL unchanged: anon 0, authenticated 21
--   npm run deal-room:negative-access     -- the two procedure assertions must pass
--                                         -- NOTE: this fixture cannot tear itself
--                                         -- down. See DATABASE-STATE.

begin;

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
     set state = 'admitted', admitted_at = now(),
         is_required_approver = is_required_approver or v_p.participant_class = 'principal'
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
  --
  -- ONE ROW PER PERSON, not per participant row. A person can hold several
  -- participant rows in the same room - `deal_room_propose` gives the initiator
  -- two, master-level and first workspace - and seeding both issued them two
  -- approval obligations for themselves, only one of which could ever be
  -- satisfied. The canonical row is the master-level one where it exists, then
  -- the earliest admitted, then the lowest id, so the choice is deterministic
  -- and `deal_room_approve_procedure` cannot disagree with it.
  insert into public.deal_room_procedure_approvals (procedure_id, participant_id, response)
  select distinct on (p.profile_id) v_id, p.id, 'pending'
  from public.deal_room_participants p
  where p.room_id = p_room_id and p.is_required_approver and p.state in ('admitted','active')
  order by p.profile_id, (p.sub_room_id is null) desc, p.admitted_at nulls last, p.id;

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

  -- Authorisation only. WHICH row this finds must not decide anything, because
  -- a person can hold more than one participant row in the same room.
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

  -- Approve by PERSON, not by whichever participant row the check above landed
  -- on. Keying the update on `v_participant` meant that when a person held two
  -- participant rows the wrong one could be approved and the other stayed
  -- pending for ever, so `v_outstanding` never reached zero and no procedure
  -- could ever govern. Joining on `profile_id` also settles any duplicate pair
  -- left behind by the previous behaviour.
  update public.deal_room_procedure_approvals a
     set response = 'approved', responded_at = now()
   where a.procedure_id = p_procedure_id
     and exists (
       select 1 from public.deal_room_participants p
       where p.id = a.participant_id and p.profile_id = auth.uid()
     );

  -- A required approver who is not listed on THIS version has not approved it.
  -- Someone admitted after the version was proposed is included by the
  -- amendment path, which creates a new version, rather than by silently
  -- passing through here and letting the count fall to zero without them.
  if not found then
    raise exception 'This procedure version does not list you as a required approver'
      using errcode = '42501';
  end if;

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

commit;
