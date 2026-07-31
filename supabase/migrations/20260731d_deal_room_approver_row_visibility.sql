-- The approver a member is waiting for must be a person they can see.
--
-- ## What the surface review of 31 July 2026 found
--
-- `20260731c` made procedure approvals one row per person and chose the
-- master-level participant row as the canonical one. That choice is invisible to
-- everybody except a room administrator.
--
-- `participant read`, from `20260729b`:
--
--   using (
--     profile_id = auth.uid()
--     or (sub_room_id is not null and public.deal_room_is_sub_room_participant(sub_room_id))
--     or public.deal_room_can_administer(room_id)
--     or public.is_admin()
--   );
--
-- The second disjunct requires `sub_room_id is not null`, so **another person's
-- master-level row is readable only by a room administrator**. The initiator is
-- an administrator; an admitted counterparty is not.
--
-- The counterparty could therefore read the approval row - `approval read` needs
-- only `deal_room_is_master_participant`, which any admitted participant of the
-- room satisfies - but not the participant row it points at. So
-- `approversById.get(approval.participantId)` missed, and
-- `app/[locale]/deal-rooms/[roomId]/procedure/page.tsx` rendered the fallback
-- "A required approver" instead of the initiator's name, on the page whose stated
-- purpose is to show who is outstanding.
--
-- Nothing was insecure and no approval was lost. The gate worked; it just could
-- not be read by the person waiting on it.
--
-- ## The correction
--
-- Prefer a row the other approvers can actually see. New ordering, still
-- deterministic and still independent of physical row order:
--
--   1. the participant's row in THIS procedure's sub-room - everyone who can see
--      the procedure is in that sub-room, so everyone can read it;
--   2. any other sub-room row;
--   3. the master-level row;
--   4. earliest admitted, then lowest id.
--
-- `deal_room_approve_procedure` is unaffected: it already approves by joining on
-- `profile_id = auth.uid()` rather than on any particular row, which is why this
-- is a display correction and not a second gate defect.
--
-- ## What this file changes
--
-- One `create or replace function` on the identical five-argument signature, so
-- no overload is created and no grant is invalidated. The body is `20260731c`'s,
-- extracted verbatim, with the seed's `order by` clause changed and its comment
-- rewritten. Nothing else.
--
-- No table, constraint, policy, trigger, index, grant or row is altered, and no
-- existing row is backfilled - there are no rooms in production.
--
-- Verification after applying:
--
--   npm run deal-room:acl-verify          -- ACL unchanged: anon 0, authenticated 21
--   npm run deal-room:negative-access     -- must stay at 94 passed, 0 failed

begin;

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
  -- satisfied.
  --
  -- The row chosen must also be one the OTHER approvers can read, or the
  -- procedure page cannot name who it is waiting for. `participant read` allows
  -- another person's row only through
  -- `sub_room_id is not null and deal_room_is_sub_room_participant(sub_room_id)`,
  -- or to a room administrator. A master-level row is therefore invisible to a
  -- counterparty, so preferring it left them looking at an unnamed approver.
  --
  -- Preference, deterministic and independent of physical row order: the row in
  -- this procedure's own sub-room, then any other sub-room row, then the
  -- master-level row, then the earliest admitted, then the lowest id.
  insert into public.deal_room_procedure_approvals (procedure_id, participant_id, response)
  select distinct on (p.profile_id) v_id, p.id, 'pending'
  from public.deal_room_participants p
  where p.room_id = p_room_id and p.is_required_approver and p.state in ('admitted','active')
  order by p.profile_id,
           (p.sub_room_id = p_sub_room_id) desc nulls last,
           (p.sub_room_id is not null) desc,
           p.admitted_at nulls last, p.id;

  perform public.deal_room_log_event(p_room_id, p_sub_room_id, 'procedure_proposed', 'procedure', v_id,
    'A procedure version was proposed. It governs nothing until every required approver has approved it.', null);

  return v_id;
end;
$$;

commit;
