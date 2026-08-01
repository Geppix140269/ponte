--
-- PostgreSQL database dump
--

\restrict xYS8NVAHGZx5U1PXdtBteFCczHvH4uhvm54mBLEIfqEuO7uaZhcjun3tG4kSC4S

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: aliases_text(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aliases_text(text[]) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $_$ select array_to_string($1, ' ') $_$;


--
-- Name: apply_trust_delta(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_trust_delta(p_profile uuid, p_delta integer, p_reason text, p_actor uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  cur int;
  nxt int;
  rk text;
begin
  select trust_score into cur from profiles where id = p_profile for update;
  if cur is null then
    raise exception 'profile % not found', p_profile;
  end if;

  if p_reason = 'blocked' then
    nxt := 0;
  else
    nxt := greatest(0, least(100, cur + p_delta));
  end if;

  rk := case
    when nxt = 0 then 'blocked'
    when nxt < 40 then 'high'
    when nxt < 70 then 'medium'
    else 'low'
  end;

  update profiles
    set trust_score = nxt, risk_category = rk, updated_at = now()
    where id = p_profile;

  insert into trust_score_events (profile_id, delta, reason, new_score, created_by)
    values (p_profile, nxt - cur, p_reason, nxt, p_actor);

  insert into audit_logs (actor_id, action, target_type, target_id, metadata)
    values (p_actor, 'trust_delta', 'user', p_profile,
            jsonb_build_object('reason', p_reason, 'requested_delta', p_delta,
                               'applied_delta', nxt - cur, 'new_score', nxt));

  return nxt;
end;
$$;


--
-- Name: credit_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credit_balance(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select coalesce(sum(delta), 0)::int from credit_ledger where user_id = p_user_id;
$$;


--
-- Name: deal_room_accept_agreement(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_accept_agreement(p_participant_id uuid, p_kind text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_accept_evidence_for_procedure(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_accept_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_accept_invitation(p_token_sha256 text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
     display_label, state, invited_by, invited_at)
  values
    (v_inv.room_id, v_inv.sub_room_id, auth.uid(), v_inv.proposed_participant_class,
     v_inv.proposed_role, public.deal_room_display_label(auth.uid()),
     'prerequisites_pending', v_inv.created_by, v_inv.created_at)
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


--
-- Name: deal_room_admit_participant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_admit_participant(p_participant_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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
         is_required_approver = is_required_approver or v_p.participant_class = 'principal',
         display_label = coalesce(public.deal_room_display_label(v_p.profile_id), display_label)
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


--
-- Name: deal_room_answer_clarification(uuid, text, text, text, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_answer_clarification(p_clarification_id uuid, p_answer text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_approve_procedure(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_approve_procedure(p_procedure_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_can_administer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_can_administer(p_room_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_can_read_evidence(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_can_read_evidence(p_evidence_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_declare_participation(uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_declare_participation(p_participant_id uuid, p_org_name text, p_org_country text, p_declared_capacity text, p_role text, p_authority text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_display_label(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_display_label(p_profile_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select coalesce(pr.full_name, 'A participant')
  from public.profiles pr
  where pr.id = p_profile_id;
$$;


--
-- Name: deal_room_events_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_events_append_only() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  raise exception 'deal_room_activity_events is append-only: % is not permitted', tg_op
    using errcode = '42501';
end;
$$;


--
-- Name: deal_room_invite(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_invite(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
$_$;


--
-- Name: deal_room_is_master_participant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_is_master_participant(p_room_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.deal_room_participants p
    where p.room_id = p_room_id
      and p.profile_id = auth.uid()
      and p.state in ('admitted','active')
  );
$$;


--
-- Name: deal_room_is_sub_room_participant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_is_sub_room_participant(p_sub_room_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1
    from public.deal_room_participants p
    where p.sub_room_id = p_sub_room_id
      and p.profile_id = auth.uid()
      and p.state in ('admitted','active')
  );
$$;


--
-- Name: FUNCTION deal_room_is_sub_room_participant(p_sub_room_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.deal_room_is_sub_room_participant(p_sub_room_id uuid) IS 'True only for an admitted or active participant of that private workspace. invited, prerequisites_pending and terms_pending are all outside the room.';


--
-- Name: deal_room_is_writable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_is_writable(p_room_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: FUNCTION deal_room_is_writable(p_room_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.deal_room_is_writable(p_room_id uuid) IS 'Room lifecycle AND an issued, permitting entitlement. A missing entitlement row fails closed.';


--
-- Name: deal_room_log_event(uuid, uuid, text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_log_event(p_room_id uuid, p_sub_room_id uuid, p_event_type text, p_subject_type text, p_subject_id uuid, p_summary text, p_detail jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_open_blocker(uuid, uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_open_blocker(p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text, p_description text, p_category text, p_requirement text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_propose(uuid, uuid, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_propose(p_listing_id uuid, p_counterparty_profile uuid, p_counterparty_email text, p_counterparty_name text, p_counterparty_role text, p_objective text, p_interest_route text, p_operating_mode text, p_sub_room_purpose text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
     participation_authority, declared_capacity, display_label, is_required_approver,
     is_room_administrator, state, admitted_at)
  values
    (v_room, null, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', 'Deal owner', public.deal_room_display_label(auth.uid()),
     true, true, 'admitted', now());

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, declared_capacity, display_label, is_required_approver,
     is_room_administrator, state, admitted_at)
  values
    (v_room, v_sub, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', 'Deal owner', public.deal_room_display_label(auth.uid()),
     true, true, 'admitted', now());

  perform public.deal_room_log_event(v_room, null, 'room_proposed', 'room', v_room,
    'Room proposed from a published Deal, with credible commercial interest recorded.',
    jsonb_build_object('interest_route', p_interest_route, 'objective', p_objective));
  perform public.deal_room_log_event(v_room, v_sub, 'sub_room_created', 'sub_room', v_sub,
    'The first private workspace was created for the intended counterparty.', null);

  return v_room;
end;
$_$;


--
-- Name: deal_room_propose_procedure(uuid, uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_propose_procedure(p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_request_clarification(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_request_clarification(p_evidence_id uuid, p_question text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_resolve_blocker(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_set_read_only(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_set_read_only(p_room_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_submit_evidence(uuid, text, text, text, text, text, text, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_submit_evidence(p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


--
-- Name: deal_room_uuid_or_null(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deal_room_uuid_or_null(p_text text) RETURNS uuid
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  return p_text::uuid;
exception
  when others then
    return null;
end;
$$;


--
-- Name: FUNCTION deal_room_uuid_or_null(p_text text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.deal_room_uuid_or_null(p_text text) IS 'Returns the uuid, or null when the text is not one. Used by Deal Room storage policies so a malformed object path denies instead of raising.';


--
-- Name: guard_profile_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_profile_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'UPDATE' and new.role is distinct from old.role)
     or (tg_op = 'INSERT' and coalesce(new.role, 'customer') <> 'customer')
  then
    -- Only the two PostgREST end-user roles are blocked. service_role,
    -- postgres, supabase_admin, etc. are trusted and pass through.
    if current_user in ('anon', 'authenticated') then
      raise exception 'Not authorized to set profile role';
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  -- Free tier allowance. Enough to run one counterparty verification, which
  -- costs two, and see what the product actually does before paying for it.
  --
  -- The `not exists` guard makes this idempotent. A member who is deleted and
  -- signs up again on the same id does not get a second grant, and a replay of
  -- the trigger cannot mint credits.
  if not exists (
    select 1 from credit_ledger
     where user_id = new.id and reason = 'grant_signup'
  ) then
    insert into credit_ledger (user_id, delta, reason, ref)
    values (new.id, 3, 'grant_signup', 'signup');
  end if;

  return new;
exception when others then
  -- A failure to grant credits must never stop an account being created.
  -- Signing up is the more important half of this transaction, and a missing
  -- grant is fixable afterwards by an admin adjustment.
  --
  -- This handler is also what hid the search_path bug for as long as it did,
  -- so: it stays, because the reasoning is still right, but anything it
  -- swallows is now a warning somebody has to go and read.
  raise warning 'signup profile/credit grant failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;


--
-- Name: hs_search(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hs_search(q text, lim integer DEFAULT 20) RETURNS TABLE(code text, display text, description text, short_title text, chapter text, chapter_title text, heading text, score real)
    LANGUAGE sql STABLE
    AS $$
  select
    h.code, h.display, h.description, h.short_title,
    h.chapter, h.chapter_title, h.heading,
    -- Ranking, in the order a trader means it.
    --
    -- word_similarity alone is not enough. It answers "does this word appear",
    -- which for "sugar" is true of every milk product whose description ends
    -- "not containing added sugar", and those sort first on code because
    -- chapter 04 precedes chapter 17. The trader meant chapter 17.
    --
    -- WCO wording is written "Commodity; qualifier", so what the code IS
    -- comes before the first semicolon and what it is LIKE comes after. That
    -- structure is the signal: a description opening with the query is the
    -- commodity itself, a description merely containing it is a neighbour.
    case
      when regexp_replace(q, '\D', '', 'g') <> ''
       and h.code like regexp_replace(q, '\D', '', 'g') || '%' then 1.00::real
      when h.description ilike q || '%'                        then 0.95::real
      when split_part(h.description, ';', 1) ilike '%' || q || '%' then 0.90::real
      when h.heading_title ilike '%' || q || '%'                then 0.85::real
      when coalesce(h.short_title, '') ilike '%' || q || '%'    then 0.80::real
      -- Scaled to sit BELOW every curated tier above, which is the whole
      -- point and was got wrong first time round. word_similarity returns
      -- exactly 1.0 whenever the query appears as a word anywhere at all, so
      -- unscaled it outranks the 0.95 given to a description that OPENS with
      -- the query. That is how a search for "sugar" returned sugar-beet seed,
      -- sugar-manufacturing machinery and cocoa containing added sugar, and
      -- pushed chapter 17 off the first page entirely.
      else word_similarity(
        q,
        coalesce(h.short_title, '') || ' ' || h.description || ' ' || h.heading_title
      ) * 0.75::real
    end as score
  from hs_codes h
  where h.is_active
    and (
      (regexp_replace(q, '\D', '', 'g') <> ''
        and h.code like regexp_replace(q, '\D', '', 'g') || '%')
      -- Parenthesised deliberately: the trigram operators bind tighter than
      -- ||, so without these brackets Postgres reads this as a concatenation
      -- with (heading_title <% q) on the end and rejects it as "argument of
      -- OR must be type boolean".
      or q <% (coalesce(h.short_title, '') || ' ' || h.description || ' ' || h.heading_title)
    )
  -- Shorter description before longer at equal score: WCO writes the plain
  -- commodity tersely and its exceptions at length, so the short one is
  -- almost always the row somebody meant.
  order by score desc, length(h.description), h.code
  limit least(coalesce(lim, 20), 50);
$$;


--
-- Name: increment_adamftd_usage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_adamftd_usage(p_profile uuid, p_period text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into adamftd_usage (profile_id, period, checks_used)
  values (p_profile, p_period, 1)
  on conflict (profile_id, period)
  do update set checks_used = adamftd_usage.checks_used + 1, updated_at = now();
end;
$$;


--
-- Name: increment_completed_deals(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_completed_deals(p_profile uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update profiles set completed_deals = coalesce(completed_deals,0) + 1, updated_at = now()
  where id = p_profile;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;


--
-- Name: is_deal_participant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_deal_participant(p_deal_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from deals d
    where d.id = p_deal_id
      and (d.initiator_id = auth.uid() or d.counterparty_id = auth.uid())
  );
$$;


--
-- Name: match_hs_codes(public.vector, text, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_hs_codes(query_embedding public.vector, schedule_filter text DEFAULT NULL::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 10) RETURNS TABLE(id bigint, code text, schedule text, level smallint, chapter text, chapter_desc text, heading text, heading_desc text, description text, unit text, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    hc.id, hc.code, hc.schedule, hc.level,
    hc.chapter, hc.chapter_desc, hc.heading, hc.heading_desc,
    hc.description, hc.unit,
    1 - (he.embedding <=> query_embedding) AS similarity
  FROM public.hs_embeddings he
  JOIN public.hs_codes hc ON he.hs_code_id = hc.id
  WHERE
    hc.is_active = TRUE
    AND (schedule_filter IS NULL OR hc.schedule = schedule_filter)
    AND 1 - (he.embedding <=> query_embedding) > match_threshold
  ORDER BY he.embedding <=> query_embedding
  LIMIT match_count;
$$;


--
-- Name: sanctions_match(text, real, integer, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sanctions_match(p_name text, p_threshold real DEFAULT 0.4, p_limit integer DEFAULT 50, p_entity_type text DEFAULT NULL::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(id uuid, source_list text, entry_id text, primary_name text, normalized_name text, aliases text[], entity_type text, country text, programs text[], listed_date date, score real, matched_on text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with scored as (
    select
      e.id,
      e.source_list,
      e.entry_id,
      e.primary_name,
      e.normalized_name,
      e.aliases,
      e.entity_type,
      e.country,
      e.programs,
      e.listed_date,
      similarity(e.normalized_name, p_name) as name_score,
      -- The best single alias, not the aliases mashed together: joining them
      -- into one string dilutes the trigram score of every one of them.
      coalesce((
        select max(similarity(al.alias_name, p_name))
        from unnest(e.normalized_aliases) as al(alias_name)
        where al.alias_name <> ''
      ), 0::real) as alias_score
    from sanctions_entries e
    where (
      -- Both arms are index backed: sanctions_name_trgm on normalized_name and
      -- sanctions_alias_trgm on the joined alias string.
      e.normalized_name % p_name
      or array_to_string(e.normalized_aliases, ' ') % p_name
    )
    -- An entity type filter never removes a row whose type is unknown. A list
    -- that does not say what something is must not be allowed to hide it.
    and (
      p_entity_type is null
      or e.entity_type is null
      or e.entity_type = p_entity_type
    )
    and (p_since is null or e.imported_at >= p_since)
  )
  select
    s.id,
    s.source_list,
    s.entry_id,
    s.primary_name,
    s.normalized_name,
    s.aliases,
    s.entity_type,
    s.country,
    s.programs,
    s.listed_date,
    greatest(s.name_score, s.alias_score)::real as score,
    case when s.alias_score > s.name_score then 'alias' else 'name' end as matched_on
  from scored s
  where greatest(s.name_score, s.alias_score) >= p_threshold
  order by greatest(s.name_score, s.alias_score) desc, s.source_list, s.entry_id
  limit greatest(p_limit, 1);
$$;


--
-- Name: FUNCTION sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone) IS 'Trigram match of a normalized subject name against sanctions_entries. Returns candidates at or above p_threshold, scored on the better of the primary name and the best alias. Screening decisions live in the application: this only proposes candidates.';


--
-- Name: set_listing_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_listing_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


--
-- Name: spend_credits(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_balance int;
  v_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  -- Lock this user's ledger rows so a concurrent spend cannot interleave.
  perform 1 from credit_ledger where user_id = p_user_id for update;

  select coalesce(sum(delta), 0)::int into v_balance
    from credit_ledger where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient credits: have %, need %', v_balance, p_amount
      using errcode = 'P0001';
  end if;

  insert into credit_ledger (user_id, delta, reason, ref)
  values (p_user_id, -p_amount, p_reason, p_ref)
  returning id into v_id;

  return v_id;
end;
$$;


--
-- Name: sync_investigation_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_investigation_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  target uuid := coalesce(new.signal_id, old.signal_id);
begin
  update desk_radar
     set investigation_count = (
       select count(*) from signal_investigations where signal_id = target
     )
   where id = target;
  return null;  -- after trigger; return value is ignored
end;
$$;


--
-- Name: FUNCTION sync_investigation_count(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_investigation_count() IS 'Recomputes desk_radar.investigation_count as the true row count, in the same transaction as the signal_investigations insert/delete (brief Block D follow-up). Never inconsistent with the rows.';


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: trust_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trust_score(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  select least(100, coalesce(sum(points), 0))::int
  from trust_score_components where user_id = p_user_id;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_briefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_briefs (
    user_id uuid NOT NULL,
    brief jsonb NOT NULL,
    listing_count integer DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: adamftd_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adamftd_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    period text NOT NULL,
    checks_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: adamftd_verification_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adamftd_verification_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid,
    organization_id uuid,
    listing_id uuid,
    company_name text NOT NULL,
    country text,
    commodity text,
    hs_code text,
    claimed_role text,
    status text DEFAULT 'manual_review'::text NOT NULL,
    confidence_score numeric,
    result_summary text,
    signals jsonb,
    cache_key text,
    source text DEFAULT 'mock'::text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    result_json jsonb,
    CONSTRAINT adamftd_verification_checks_source_check CHECK ((source = ANY (ARRAY['mock'::text, 'live'::text]))),
    CONSTRAINT adamftd_verification_checks_status_check CHECK ((status = ANY (ARRAY['match'::text, 'partial_match'::text, 'no_match'::text, 'manual_review'::text])))
);


--
-- Name: ai_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    feature text NOT NULL,
    model text NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    ok boolean DEFAULT true NOT NULL,
    error text,
    duration_ms integer,
    ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    user_id uuid NOT NULL,
    feature text NOT NULL,
    used integer DEFAULT 0 NOT NULL
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event text NOT NULL,
    props jsonb,
    profile_id uuid,
    session_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: anonymous_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anonymous_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_key text NOT NULL,
    kind text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    claimed_by uuid,
    claimed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT anonymous_drafts_kind_check CHECK ((kind = ANY (ARRAY['listing'::text, 'inquiry'::text, 'alert'::text])))
);


--
-- Name: TABLE anonymous_drafts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.anonymous_drafts IS 'Pre-registration composer state, keyed by session cookie. Server-side only: RLS is on with no policies because there is no auth.uid() to match against.';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blocked_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    value text NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT blocked_entities_entity_type_check CHECK ((entity_type = ANY (ARRAY['user'::text, 'organization'::text, 'domain'::text, 'email'::text])))
);


--
-- Name: bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundle_items (
    bundle_product_id uuid NOT NULL,
    component_product_id uuid NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer
);


--
-- Name: credit_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    guest_email text,
    delta integer NOT NULL,
    reason text NOT NULL,
    ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_ledger_delta_nonzero CHECK ((delta <> 0)),
    CONSTRAINT credit_ledger_has_owner CHECK (((user_id IS NOT NULL) OR (guest_email IS NOT NULL)))
);


--
-- Name: credit_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    stripe_session_id text NOT NULL,
    pack text NOT NULL,
    credits integer NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    ledger_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fulfilled_at timestamp with time zone,
    CONSTRAINT credit_purchases_amount_cents_check CHECK ((amount_cents > 0)),
    CONSTRAINT credit_purchases_credits_check CHECK ((credits > 0)),
    CONSTRAINT credit_purchases_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'fulfilled'::text, 'failed'::text])))
);


--
-- Name: TABLE credit_purchases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.credit_purchases IS 'One row per Stripe checkout. stripe_session_id is unique so webhook retries cannot grant the same credits twice.';


--
-- Name: data_source_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_source_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id text NOT NULL,
    cache_key text NOT NULL,
    payload jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_sources (
    id text NOT NULL,
    category text NOT NULL,
    provider text NOT NULL,
    auth_class text NOT NULL,
    endpoint text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    commercial_ok boolean DEFAULT true NOT NULL,
    note text,
    last_health_at timestamp with time zone,
    last_health_status text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_sources_auth_class_check CHECK ((auth_class = ANY (ARRAY['none'::text, 'register'::text, 'freemium'::text])))
);


--
-- Name: deal_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    uploader_id uuid,
    name text NOT NULL,
    path text NOT NULL,
    size_bytes bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deal_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    actor_id uuid,
    type text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deal_room_activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid,
    event_type text NOT NULL,
    subject_type text,
    subject_id uuid,
    summary text NOT NULL,
    detail jsonb,
    actor_profile_id uuid,
    actor_label text NOT NULL,
    actor_org_label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE deal_room_activity_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_activity_events IS 'Append-only attributable history. No member INSERT policy: rows are written only by the authorised command functions. UPDATE and DELETE are refused by trigger, including for the table owner.';


--
-- Name: deal_room_agreement_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_agreement_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_id uuid NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid,
    agreement_kind text NOT NULL,
    document_version text NOT NULL,
    document_sha256 text NOT NULL,
    accepted_as text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_agreement_acceptances_agreement_kind_check CHECK ((agreement_kind = ANY (ARRAY['participation'::text, 'nda'::text, 'room_rules'::text, 'authority_declaration'::text]))),
    CONSTRAINT deal_room_agreement_acceptances_document_sha256_check CHECK ((document_sha256 ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: TABLE deal_room_agreement_acceptances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_agreement_acceptances IS 'Versioned click-to-accept evidence. No IP or user agent by owner decision (issue #97). Not an electronic signature.';


--
-- Name: deal_room_agreement_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_agreement_documents (
    kind text NOT NULL,
    version text NOT NULL,
    title text NOT NULL,
    sha256 text NOT NULL,
    current boolean DEFAULT true NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_agreement_documents_kind_check CHECK ((kind = ANY (ARRAY['participation'::text, 'nda'::text, 'room_rules'::text, 'authority_declaration'::text]))),
    CONSTRAINT deal_room_agreement_documents_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: TABLE deal_room_agreement_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_agreement_documents IS 'Canonical agreement version and checksum. Written only by migration; no member policy. deal_room_accept_agreement() reads it and takes no version or hash from the caller.';


--
-- Name: deal_room_blockers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_blockers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid,
    step_id uuid,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    owner_participant_id uuid,
    resolution_requirement text NOT NULL,
    due_date date,
    state text DEFAULT 'open'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    CONSTRAINT deal_room_blockers_category_check CHECK ((category = ANY (ARRAY['critical'::text, 'material'::text, 'operational'::text]))),
    CONSTRAINT deal_room_blockers_state_check CHECK ((state = ANY (ARRAY['open'::text, 'owned'::text, 'resolution_proposed'::text, 'resolved'::text, 'waived'::text, 'escalated'::text])))
);


--
-- Name: deal_room_clarifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_clarifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid NOT NULL,
    evidence_id uuid,
    step_id uuid,
    question text NOT NULL,
    raised_by uuid NOT NULL,
    raised_at timestamp with time zone DEFAULT now() NOT NULL,
    state text DEFAULT 'open'::text NOT NULL,
    answer text,
    answered_by uuid,
    answered_at timestamp with time zone,
    CONSTRAINT deal_room_clarifications_state_check CHECK ((state = ANY (ARRAY['open'::text, 'answered'::text, 'closed'::text]))),
    CONSTRAINT deal_room_clarifications_target CHECK (((evidence_id IS NOT NULL) OR (step_id IS NOT NULL)))
);


--
-- Name: deal_room_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    org_id uuid,
    kind text NOT NULL,
    state text DEFAULT 'eligible'::text NOT NULL,
    reserved_at timestamp with time zone,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_entitlements_kind_check CHECK ((kind = ANY (ARRAY['starter'::text, 'sponsored'::text, 'waived'::text]))),
    CONSTRAINT deal_room_entitlements_state_check CHECK ((state = ANY (ARRAY['eligible'::text, 'reserved'::text, 'active'::text, 'grace'::text, 'expired'::text, 'suspended'::text, 'restored'::text, 'closed'::text])))
);


--
-- Name: TABLE deal_room_entitlements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_entitlements IS 'Entitlement state, separate from room lifecycle. Launch scope: starter and waived only. No pricing or Stripe.';


--
-- Name: deal_room_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid NOT NULL,
    step_id uuid,
    title text NOT NULL,
    provider_label text NOT NULL,
    provider_org_id uuid,
    provenance text NOT NULL,
    visibility text DEFAULT 'sub_room'::text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    current_version integer DEFAULT 0 NOT NULL,
    superseded_by_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    CONSTRAINT deal_room_evidence_provenance_check CHECK ((provenance = ANY (ARRAY['member_declared'::text, 'member_uploaded'::text, 'third_party_supplied'::text, 'ponte_checked'::text]))),
    CONSTRAINT deal_room_evidence_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'uploaded'::text, 'disclosed'::text, 'under_review'::text, 'clarification_required'::text, 'accepted_for_procedure'::text, 'rejected'::text, 'superseded'::text, 'withdrawn'::text, 'independently_verified'::text]))),
    CONSTRAINT deal_room_evidence_visibility_check CHECK ((visibility = ANY (ARRAY['own_org'::text, 'sub_room'::text, 'principals'::text, 'ponte_only'::text])))
);


--
-- Name: TABLE deal_room_evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_evidence IS 'Evidence metadata. Bytes live in the private deal-room-evidence bucket. accepted_for_procedure and independently_verified are distinct states and must not be collapsed.';


--
-- Name: deal_room_evidence_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_evidence_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    version integer NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    checksum_sha256 text,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_evidence_versions_checksum_sha256_check CHECK ((checksum_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT deal_room_evidence_versions_size_bytes_check CHECK ((size_bytes >= 0)),
    CONSTRAINT deal_room_evidence_versions_version_check CHECK ((version > 0))
);


--
-- Name: deal_room_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid NOT NULL,
    token_sha256 text NOT NULL,
    invited_email text NOT NULL,
    proposed_role text NOT NULL,
    proposed_participant_class text NOT NULL,
    preview_facts jsonb NOT NULL,
    integrity_preflight jsonb NOT NULL,
    state text DEFAULT 'sent'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    CONSTRAINT deal_room_invitations_proposed_participant_class_check CHECK ((proposed_participant_class = ANY (ARRAY['principal'::text, 'intermediary'::text, 'provider'::text, 'adviser'::text, 'ponte_facilitator'::text, 'observer'::text]))),
    CONSTRAINT deal_room_invitations_state_check CHECK ((state = ANY (ARRAY['sent'::text, 'accepted'::text, 'declined'::text, 'expired'::text, 'revoked'::text]))),
    CONSTRAINT deal_room_invitations_token_sha256_check CHECK ((token_sha256 ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: TABLE deal_room_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_invitations IS 'Protected invitation. Stores sha256(token), never the token. preview_facts is an allowlist built by lib/deal-room/invitation.ts, not a redacted room.';


--
-- Name: deal_room_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid,
    profile_id uuid NOT NULL,
    org_id uuid,
    declared_capacity text,
    participant_class text NOT NULL,
    transaction_role text NOT NULL,
    participation_authority text,
    is_required_approver boolean DEFAULT false NOT NULL,
    is_room_administrator boolean DEFAULT false NOT NULL,
    state text DEFAULT 'invited'::text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    admitted_at timestamp with time zone,
    removed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_label text,
    CONSTRAINT deal_room_participants_identity_when_admitted CHECK (((state <> ALL (ARRAY['admitted'::text, 'active'::text])) OR (org_id IS NOT NULL) OR ((declared_capacity IS NOT NULL) AND (length(btrim(declared_capacity)) > 0)))),
    CONSTRAINT deal_room_participants_participant_class_check CHECK ((participant_class = ANY (ARRAY['principal'::text, 'intermediary'::text, 'provider'::text, 'adviser'::text, 'ponte_facilitator'::text, 'observer'::text]))),
    CONSTRAINT deal_room_participants_state_check CHECK ((state = ANY (ARRAY['invited'::text, 'prerequisites_pending'::text, 'terms_pending'::text, 'admitted'::text, 'active'::text, 'suspended'::text, 'removed'::text, 'withdrawn'::text])))
);


--
-- Name: TABLE deal_room_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_participants IS 'Person plus organisation or declared capacity, class, role, authority and admission state. Only admitted/active may act.';


--
-- Name: COLUMN deal_room_participants.display_label; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.deal_room_participants.display_label IS 'The participant name as shown to other participants. Written by the command that proved the identity, because profiles is readable only to its owner.';


--
-- Name: deal_room_procedure_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_procedure_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    procedure_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    response text DEFAULT 'pending'::text NOT NULL,
    reason text,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_procedure_approvals_response_check CHECK ((response = ANY (ARRAY['pending'::text, 'approved'::text, 'objected'::text, 'amendment_requested'::text, 'clarification_requested'::text])))
);


--
-- Name: deal_room_procedure_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_procedure_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    procedure_id uuid NOT NULL,
    step_key text NOT NULL,
    seq integer NOT NULL,
    stage_label text NOT NULL,
    title text NOT NULL,
    completion_condition text NOT NULL,
    responsible_role text NOT NULL,
    responsible_participant_id uuid,
    weight integer NOT NULL,
    mandatory boolean DEFAULT true NOT NULL,
    requires_evidence boolean DEFAULT false NOT NULL,
    required_reviewer_role text,
    due_date date,
    state text DEFAULT 'not_ready'::text NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_procedure_steps_state_check CHECK ((state = ANY (ARRAY['not_ready'::text, 'ready'::text, 'in_progress'::text, 'evidence_submitted'::text, 'review_required'::text, 'clarification_required'::text, 'completed'::text, 'blocked'::text, 'waived'::text, 'not_applicable'::text, 'cancelled'::text]))),
    CONSTRAINT deal_room_procedure_steps_weight_check CHECK ((weight > 0)),
    CONSTRAINT deal_room_steps_reviewer_when_evidence CHECK (((NOT requires_evidence) OR (required_reviewer_role IS NOT NULL)))
);


--
-- Name: deal_room_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_procedures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sub_room_id uuid,
    version integer NOT NULL,
    summary text NOT NULL,
    completion_condition text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    proposed_by uuid NOT NULL,
    proposed_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    superseded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_room_procedures_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'proposed'::text, 'amendment_requested'::text, 'approved'::text, 'superseded'::text, 'completed'::text]))),
    CONSTRAINT deal_room_procedures_version_check CHECK ((version > 0))
);


--
-- Name: TABLE deal_room_procedures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_procedures IS 'Procedure versions. A version never changes after approval; an amendment creates another version.';


--
-- Name: deal_room_sub_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_room_sub_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    ref text NOT NULL,
    purpose text NOT NULL,
    kind text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    CONSTRAINT deal_room_sub_rooms_kind_check CHECK ((kind = ANY (ARRAY['counterparty'::text, 'provider'::text, 'adviser'::text, 'internal'::text]))),
    CONSTRAINT deal_room_sub_rooms_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'invitation_pending'::text, 'awaiting_admission'::text, 'active'::text, 'blocked'::text, 'paused'::text, 'outcome_reached'::text, 'closed'::text])))
);


--
-- Name: TABLE deal_room_sub_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_room_sub_rooms IS 'A private permission scope beneath a master room. Its SELECT policy returns zero rows to a non-participant, which is how sub-room isolation is enforced.';


--
-- Name: deal_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ref text NOT NULL,
    listing_id uuid NOT NULL,
    deal_snapshot jsonb NOT NULL,
    market_family text NOT NULL,
    market_intent text,
    title text NOT NULL,
    purpose text,
    completion_condition text NOT NULL,
    operating_mode text DEFAULT 'software_only'::text NOT NULL,
    initiator_profile_id uuid NOT NULL,
    sponsor_profile_id uuid,
    sponsor_org_id uuid,
    intended_counterparty_profile_id uuid,
    intended_counterparty_email text,
    intended_counterparty_name text,
    intended_counterparty_role text NOT NULL,
    state text DEFAULT 'draft'::text NOT NULL,
    activated_at timestamp with time zone,
    read_only_at timestamp with time zone,
    closed_at timestamp with time zone,
    closure_outcome text,
    closure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_rooms_intended_counterparty CHECK (((intended_counterparty_profile_id IS NOT NULL) OR ((intended_counterparty_email IS NOT NULL) AND (intended_counterparty_name IS NOT NULL)))),
    CONSTRAINT deal_rooms_market_family_check CHECK ((market_family = ANY (ARRAY['products'::text, 'services'::text, 'distribution'::text]))),
    CONSTRAINT deal_rooms_operating_mode_check CHECK ((operating_mode = ANY (ARRAY['software_only'::text, 'ponte_observed'::text, 'ponte_facilitated'::text, 'ponte_managed_procedure'::text, 'institutionally_sponsored'::text]))),
    CONSTRAINT deal_rooms_state_check CHECK ((state = ANY (ARRAY['draft'::text, 'proposed'::text, 'awaiting_principal_admission'::text, 'activation_pending'::text, 'active_procedure_not_agreed'::text, 'active_procedure_agreed'::text, 'blocked'::text, 'paused'::text, 'read_only'::text, 'ready_to_proceed'::text, 'completed'::text, 'closed'::text, 'declined_before_activation'::text, 'cancelled_before_activation'::text, 'expired_before_activation'::text, 'withdrawn'::text])))
);


--
-- Name: TABLE deal_rooms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.deal_rooms IS 'Master Deal Room. One defined Deal scope. Additive to the legacy deals cluster, which is untouched.';


--
-- Name: deal_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    from_stage text,
    to_stage text NOT NULL,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid,
    initiator_id uuid NOT NULL,
    counterparty_id uuid,
    stage text DEFAULT 'enquiry'::text NOT NULL,
    title text,
    contact_unlocked boolean DEFAULT false,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    initiator_accepted_contact boolean DEFAULT false,
    counterparty_accepted_contact boolean DEFAULT false,
    CONSTRAINT deals_stage_check CHECK ((stage = ANY (ARRAY['enquiry'::text, 'offer'::text, 'negotiation'::text, 'closed'::text, 'cancelled'::text])))
);


--
-- Name: desk_radar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.desk_radar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    side text NOT NULL,
    product text NOT NULL,
    hs_code text,
    qty numeric,
    unit text,
    incoterms text,
    payment text,
    origin text,
    destination text,
    category text,
    spotted_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    status text DEFAULT 'private'::text NOT NULL,
    ai_description text,
    summary_line text,
    source_platform text,
    source_url text,
    raw_description text,
    counterparty_name text,
    counterparty_company text,
    counterparty_contact text,
    notes text,
    dedupe_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    published_at timestamp with time zone,
    public_expires_at timestamp with time zone,
    promoted_listing_id uuid,
    investigation_count integer DEFAULT 0 NOT NULL,
    canonical_signal_id text,
    indexable boolean DEFAULT false NOT NULL,
    import_batch text,
    import_meta jsonb,
    market_family text,
    service_category_key text,
    service_subcategory_keys text[],
    distribution_partner_type_key text,
    product_sector_key text,
    territory_codes text[],
    CONSTRAINT desk_radar_distribution_family_coherent CHECK (((distribution_partner_type_key IS NULL) OR ((market_family IS NOT NULL) AND (market_family = 'distribution'::text)))),
    CONSTRAINT desk_radar_market_family_check CHECK (((market_family IS NULL) OR (market_family = ANY (ARRAY['products'::text, 'services'::text, 'distribution'::text])))),
    CONSTRAINT desk_radar_service_family_coherent CHECK ((((service_category_key IS NULL) AND (service_subcategory_keys IS NULL)) OR ((market_family IS NOT NULL) AND (market_family = 'services'::text)))),
    CONSTRAINT desk_radar_side_check CHECK ((side = ANY (ARRAY['offer'::text, 'requirement'::text]))),
    CONSTRAINT desk_radar_status_check CHECK ((status = ANY (ARRAY['private'::text, 'approved_signal'::text, 'under_investigation'::text, 'confirmed'::text, 'unavailable'::text, 'expired'::text, 'withdrawn'::text])))
);


--
-- Name: COLUMN desk_radar.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.approved_by IS 'Admin profile id that approved this signal for public display. Never selected by a public read.';


--
-- Name: COLUMN desk_radar.public_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.public_expires_at IS 'When the signal leaves the public board. Set at approval to spotted_at + 90 days (brief 5.4).';


--
-- Name: COLUMN desk_radar.promoted_listing_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.promoted_listing_id IS 'The member listing created when this signal was confirmed. Promotion creates a normal listing; a signal never inherits a Qualified badge.';


--
-- Name: COLUMN desk_radar.canonical_signal_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.canonical_signal_id IS 'Stable PUBLIC reference for an imported external signal (e.g. EXT-G4WB-000001). Names the signal, not its source; safe to expose.';


--
-- Name: COLUMN desk_radar.indexable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.indexable IS 'Whether this signal MAY be search-indexable. Honored as data; no crawler surface is enabled yet.';


--
-- Name: COLUMN desk_radar.import_batch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.import_batch IS 'Tag identifying the import that wrote this row. The rollback handle: delete where import_batch = ''<batch>''.';


--
-- Name: COLUMN desk_radar.import_meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.desk_radar.import_meta IS 'All source provenance and scoring for an imported signal. Never selected by a public read; the public payload uses the safe columns only.';


--
-- Name: fraud_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fraud_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    flag_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    detail text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fraud_flags_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT fraud_flags_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewed'::text, 'cleared'::text]))),
    CONSTRAINT fraud_flags_subject_type_check CHECK ((subject_type = ANY (ARRAY['user'::text, 'organization'::text, 'listing'::text, 'deal'::text])))
);


--
-- Name: hs_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hs_codes (
    code text NOT NULL,
    display text NOT NULL,
    chapter text NOT NULL,
    chapter_title text NOT NULL,
    heading text NOT NULL,
    heading_title text NOT NULL,
    description text NOT NULL,
    unit text,
    hs_edition text DEFAULT 'HS2022'::text NOT NULL,
    short_title text,
    examples text[],
    source text DEFAULT 'official'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hs_codes_code_check CHECK ((code ~ '^\d{6}$'::text)),
    CONSTRAINT hs_codes_source_check CHECK ((source = ANY (ARRAY['official'::text, 'seed'::text, 'ai_cached'::text])))
);


--
-- Name: TABLE hs_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hs_codes IS 'Official HS 2022 nomenclature, 5,613 six-digit codes. Official columns are read-only; short_title and examples are platform decoration written by the service role only.';


--
-- Name: listing_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    interested_business text,
    interest_role text,
    interest_target text,
    interest_geography text,
    interest_reason text,
    CONSTRAINT listing_connections_role_check CHECK (((interest_role IS NULL) OR (interest_role = ANY (ARRAY['buyer'::text, 'seller'::text, 'distributor'::text, 'intermediary'::text])))),
    CONSTRAINT listing_connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);


--
-- Name: COLUMN listing_connections.interest_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listing_connections.interest_role IS 'The interested party''s declared role on this connection: buyer, seller, distributor or intermediary. Shown to the listing owner so a decision is made on substance (brief Block D).';


--
-- Name: listing_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    path text NOT NULL,
    filename text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    event text NOT NULL,
    from_status text,
    to_status text,
    actor_type text DEFAULT 'system'::text NOT NULL,
    actor_id uuid,
    rule_version text,
    reason_code text,
    detail jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['member'::text, 'system'::text, 'admin'::text])))
);


--
-- Name: listing_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    path text NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_media_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text])))
);


--
-- Name: listing_ref_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.listing_ref_seq
    START WITH 100
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: listing_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_translations (
    listing_id uuid NOT NULL,
    lang text NOT NULL,
    product text NOT NULL,
    details text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ref text DEFAULT ('PT-'::text || lpad((nextval('public.listing_ref_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    product text NOT NULL,
    hs_code text,
    origin text,
    destination text,
    volume text,
    indicative_value_usd numeric,
    incoterm text,
    details text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    admin_notes text,
    decision_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    ai_review jsonb,
    ai_reviewed_at timestamp with time zone,
    submitter_role text,
    chain_depth text,
    quantity numeric,
    unit text,
    frequency text,
    payment_terms text,
    origin_country text,
    destination_country text,
    flexibility jsonb DEFAULT '{}'::jsonb NOT NULL,
    deal_team_note text,
    key_notes text,
    mandate_sighted boolean DEFAULT false NOT NULL,
    validity_type text,
    valid_until date,
    reconfirmed_at timestamp with time zone,
    ai_version jsonb,
    desk_version jsonb,
    prompt_version text,
    model text,
    writeup_at timestamp with time zone,
    share_text text,
    og_version integer DEFAULT 1 NOT NULL,
    desk_managed boolean DEFAULT false NOT NULL,
    market_family text,
    market_intent text,
    service_category_key text,
    service_subcategory_keys text[],
    distribution_partner_type_key text,
    distribution_relationship_terms text[],
    coverage_scope_key text,
    territory_codes text[],
    product_sector_key text,
    custom_category_label text,
    additional_details text,
    quantity_mode text,
    quantity_min numeric,
    quantity_max numeric,
    quantity_extracted boolean DEFAULT false NOT NULL,
    quantity_confirmed_at timestamp with time zone,
    declaration_accepted_at timestamp with time zone,
    declaration_version text,
    safety_flags jsonb,
    flag_reason text,
    flag_severity text,
    completeness_score integer,
    service_terms jsonb,
    distribution_terms jsonb,
    CONSTRAINT listings_additional_details_check CHECK (((additional_details IS NULL) OR (length(additional_details) <= 2000))),
    CONSTRAINT listings_completeness_range_check CHECK (((completeness_score IS NULL) OR ((completeness_score >= 0) AND (completeness_score <= 100)))),
    CONSTRAINT listings_custom_category_label_check CHECK (((custom_category_label IS NULL) OR (length(custom_category_label) <= 200))),
    CONSTRAINT listings_destination_country_check CHECK (((destination_country IS NULL) OR (destination_country ~ '^[A-Z]{2}$'::text))),
    CONSTRAINT listings_distribution_family_coherent CHECK ((((distribution_partner_type_key IS NULL) AND (distribution_relationship_terms IS NULL) AND (coverage_scope_key IS NULL)) OR ((market_family IS NOT NULL) AND (market_family = 'distribution'::text)))),
    CONSTRAINT listings_distribution_terms_family CHECK (((distribution_terms IS NULL) OR (market_family IS NULL) OR (market_family = 'distribution'::text))),
    CONSTRAINT listings_flag_severity_check CHECK (((flag_severity IS NULL) OR (flag_severity = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))),
    CONSTRAINT listings_intent_needs_family CHECK (((market_intent IS NULL) OR (market_family IS NOT NULL))),
    CONSTRAINT listings_key_notes_check CHECK (((key_notes IS NULL) OR (length(key_notes) <= 400))),
    CONSTRAINT listings_market_family_check CHECK (((market_family IS NULL) OR (market_family = ANY (ARRAY['products'::text, 'services'::text, 'distribution'::text])))),
    CONSTRAINT listings_market_intent_check CHECK (((market_intent IS NULL) OR (market_intent = ANY (ARRAY['source_product'::text, 'offer_product'::text, 'seek_trade_service'::text, 'offer_trade_service'::text, 'seek_distribution_partner'::text, 'offer_distribution_or_representation'::text, 'seek_brands_or_products_to_represent'::text])))),
    CONSTRAINT listings_origin_country_check CHECK (((origin_country IS NULL) OR (origin_country ~ '^[A-Z]{2}$'::text))),
    CONSTRAINT listings_quantity_mode_check CHECK (((quantity_mode IS NULL) OR (quantity_mode = ANY (ARRAY['exact'::text, 'approximate'::text, 'minimum'::text, 'maximum'::text, 'range'::text, 'negotiable'::text, 'on_request'::text])))),
    CONSTRAINT listings_quantity_positive_check CHECK ((((quantity IS NULL) OR (quantity > (0)::numeric)) AND ((quantity_min IS NULL) OR (quantity_min > (0)::numeric)) AND ((quantity_max IS NULL) OR (quantity_max > (0)::numeric)))),
    CONSTRAINT listings_quantity_range_check CHECK (((quantity_mode IS DISTINCT FROM 'range'::text) OR ((quantity_min IS NOT NULL) AND (quantity_max IS NOT NULL) AND (quantity_min < quantity_max)))),
    CONSTRAINT listings_service_family_coherent CHECK ((((service_category_key IS NULL) AND (service_subcategory_keys IS NULL)) OR ((market_family IS NOT NULL) AND (market_family = 'services'::text)))),
    CONSTRAINT listings_service_terms_family CHECK (((service_terms IS NULL) OR (market_family IS NULL) OR (market_family = 'services'::text))),
    CONSTRAINT listings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'validating'::text, 'needs_information'::text, 'approved'::text, 'flagged'::text, 'suspended'::text, 'rejected'::text, 'expired'::text, 'withdrawn'::text, 'closed'::text, 'closed_done'::text, 'archived'::text]))),
    CONSTRAINT listings_type_check CHECK ((type = ANY (ARRAY['offer'::text, 'requirement'::text, 'service'::text]))),
    CONSTRAINT listings_validity_coherent CHECK (((validity_type IS NULL) OR ((validity_type = 'dated'::text) AND (valid_until IS NOT NULL)) OR ((validity_type = 'standing'::text) AND (valid_until IS NULL)))),
    CONSTRAINT listings_validity_type_check CHECK (((validity_type IS NULL) OR (validity_type = ANY (ARRAY['dated'::text, 'standing'::text]))))
);


--
-- Name: COLUMN listings.mandate_sighted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listings.mandate_sighted IS 'Set by the desk only. A sighted mandate is the desk''s statement, never the poster''s claim.';


--
-- Name: COLUMN listings.desk_managed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listings.desk_managed IS 'True only for genuine Ponte-desk-brokered opportunities. The stored basis for the "Ponte-managed" affordance; never inferred.';


--
-- Name: listings_legacy_20260720; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings_legacy_20260720 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    organization_id uuid,
    listing_type text DEFAULT 'offer'::text NOT NULL,
    commodity text NOT NULL,
    hs_code text,
    origin_country text,
    destination_country text,
    quantity numeric,
    unit text,
    incoterms text,
    loading_port text,
    price_cents bigint,
    currency text DEFAULT 'USD'::text,
    price_on_request boolean DEFAULT false,
    specifications text,
    status text DEFAULT 'active'::text NOT NULL,
    moderation_status text DEFAULT 'pending'::text NOT NULL,
    moderation_reasons text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT listings_listing_type_check CHECK ((listing_type = ANY (ARRAY['offer'::text, 'request'::text]))),
    CONSTRAINT listings_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'flagged'::text, 'rejected'::text]))),
    CONSTRAINT listings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'closed'::text])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    contains_contact_info boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    stripe_subscription_id text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1,
    unit_price_cents integer,
    config_values jsonb,
    delivery_status text DEFAULT 'pending'::text,
    report_path text,
    download_url text,
    download_expires_at timestamp with time zone,
    download_count integer DEFAULT 0,
    max_downloads integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    slot_date date
);


--
-- Name: order_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text,
    stripe_payment_intent_id text,
    stripe_session_id text,
    status text DEFAULT 'pending'::text,
    total_cents integer,
    currency text DEFAULT 'USD'::text,
    created_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    status_v2 text DEFAULT 'authorized'::text,
    confirmed_delivery_at timestamp with time zone,
    capture_deadline_at timestamp with time zone,
    capture_method text DEFAULT 'automatic'::text,
    CONSTRAINT orders_capture_method_check CHECK ((capture_method = ANY (ARRAY['manual'::text, 'automatic'::text]))),
    CONSTRAINT orders_status_v2_check CHECK ((status_v2 = ANY (ARRAY['authorized'::text, 'confirmed'::text, 'captured'::text, 'delivered'::text, 'voided'::text, 'refunded'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    website text,
    registration_number text,
    vat_number text,
    country text,
    industry text,
    owner_id uuid,
    name_normalized text,
    domain_normalized text,
    verification_level text DEFAULT 'unverified'::text,
    trust_score integer DEFAULT 40,
    risk_category text DEFAULT 'low'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organizations_risk_category_check CHECK ((risk_category = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'blocked'::text]))),
    CONSTRAINT organizations_trust_score_check CHECK (((trust_score >= 0) AND (trust_score <= 100))),
    CONSTRAINT organizations_verification_level_check CHECK ((verification_level = ANY (ARRAY['unverified'::text, 'email_verified'::text, 'phone_verified'::text, 'company_verified'::text, 'fully_verified'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku text NOT NULL,
    category_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    short_description text,
    full_description text,
    price_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text,
    delivery_type text NOT NULL,
    is_subscription boolean DEFAULT false,
    stripe_price_id text,
    preview_pages integer DEFAULT 3,
    preview_pdf_url text,
    full_pdf_template text,
    is_configurable boolean DEFAULT false,
    config_fields jsonb,
    status text DEFAULT 'draft'::text,
    featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    band text,
    includes jsonb,
    price_from boolean DEFAULT false,
    price_suffix text,
    alt_price text,
    price_tiers jsonb,
    savings_cents integer,
    capacity_kind text DEFAULT 'standard'::text,
    cobrandable boolean DEFAULT false NOT NULL,
    CONSTRAINT products_capacity_kind_check CHECK ((capacity_kind = ANY (ARRAY['instant'::text, 'standard'::text, 'custom'::text, 'subscription'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    company text,
    country text,
    role text DEFAULT 'customer'::text,
    stripe_customer_id text,
    created_at timestamp with time zone DEFAULT now(),
    account_type text,
    plan text DEFAULT 'free'::text,
    verified_trader boolean DEFAULT false,
    organization_id uuid,
    trust_score integer DEFAULT 40,
    verification_level text DEFAULT 'unverified'::text NOT NULL,
    risk_category text DEFAULT 'low'::text,
    completed_deals integer DEFAULT 0,
    title text,
    languages text[],
    commodities text[],
    regions_served text[],
    years_active integer,
    typical_deal_size text,
    bio text,
    updated_at timestamp with time zone DEFAULT now(),
    plan_status text DEFAULT 'inactive'::text,
    stripe_subscription_id text,
    plan_renews_at timestamp with time zone,
    verification_tier integer DEFAULT 0,
    ai_member boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    business_verification_id uuid,
    referral_code text,
    CONSTRAINT profiles_account_type_check CHECK ((account_type = ANY (ARRAY['buyer'::text, 'seller'::text, 'trader'::text, 'enterprise'::text]))),
    CONSTRAINT profiles_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'starter'::text, 'pro'::text, 'enterprise'::text]))),
    CONSTRAINT profiles_plan_status_check CHECK ((plan_status = ANY (ARRAY['inactive'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text]))),
    CONSTRAINT profiles_risk_category_check CHECK ((risk_category = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'blocked'::text]))),
    CONSTRAINT profiles_trust_score_check CHECK (((trust_score >= 0) AND (trust_score <= 100))),
    CONSTRAINT profiles_verification_level_check CHECK ((verification_level = ANY (ARRAY['unverified'::text, 'identity_verified'::text, 'company_verified'::text]))),
    CONSTRAINT profiles_verification_tier_check CHECK (((verification_tier >= 0) AND (verification_tier <= 4)))
);


--
-- Name: COLUMN profiles.verification_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.verification_level IS 'Canonical member verification level: unverified | identity_verified | company_verified. Semantic, never numeric. company_verified is the publication floor for member-business listings. Ranked in lib/verification/level.ts, where an unrecognised value ranks -1 and fails closed.';


--
-- Name: COLUMN profiles.business_verification_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.business_verification_id IS 'The member-business verification that the public badge rests on. Null means the member has no accepted own-business verification, whatever other checks they have run.';


--
-- Name: sanctions_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sanctions_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_list text NOT NULL,
    entry_id text NOT NULL,
    primary_name text NOT NULL,
    normalized_name text NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    normalized_aliases text[] DEFAULT '{}'::text[] NOT NULL,
    entity_type text,
    country text,
    programs text[] DEFAULT '{}'::text[] NOT NULL,
    listed_date date,
    raw jsonb,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sanctions_refresh_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sanctions_refresh_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_list text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    entry_count integer,
    status text NOT NULL,
    error text,
    duration_ms integer
);


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    name text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename text NOT NULL,
    sha256 text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schema_migrations IS 'Ledger of which migration files have been applied to this database. Written only by scripts/apply-migration.mjs and scripts/db-query.mjs, both of which connect as postgres. RLS enabled with no policy, and anon and authenticated hold no privileges: this is the record auditors read, so nothing that reaches the public API may read or write it.';


--
-- Name: settlement_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    milestone_id uuid,
    actor_id uuid,
    type text NOT NULL,
    detail text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: settlement_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    seq integer NOT NULL,
    label text NOT NULL,
    amount_cents bigint NOT NULL,
    trigger_type text NOT NULL,
    required_doc_type text,
    status text DEFAULT 'pending'::text NOT NULL,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT settlement_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'funded'::text, 'ready'::text, 'released'::text, 'refunded'::text, 'disputed'::text]))),
    CONSTRAINT settlement_milestones_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['deposit'::text, 'shipment'::text, 'arrival'::text, 'inspection'::text, 'custom'::text])))
);


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    total_cents bigint NOT NULL,
    fee_bps integer DEFAULT 60 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    provider text DEFAULT 'mock'::text,
    provider_ref text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT settlements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'funded'::text, 'partially_released'::text, 'released'::text, 'refunded'::text, 'disputed'::text, 'cancelled'::text])))
);


--
-- Name: signal_investigations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signal_investigations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    signal_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    requesting_business text,
    requester_type text,
    establish_goal text,
    indicative text,
    geography text,
    evidence text,
    wants_intro boolean DEFAULT false NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_kind text DEFAULT 'investigate'::text NOT NULL,
    capability text,
    contact_phone text,
    contact_language text,
    CONSTRAINT signal_investigations_kind_check CHECK ((request_kind = ANY (ARRAY['investigate'::text, 'capability'::text]))),
    CONSTRAINT signal_investigations_requester_type_check CHECK (((requester_type IS NULL) OR (requester_type = ANY (ARRAY['supplier'::text, 'buyer'::text, 'intermediary'::text, 'adviser'::text])))),
    CONSTRAINT signal_investigations_status_check CHECK ((status = ANY (ARRAY['new'::text, 'actioned'::text, 'withdrawn'::text])))
);


--
-- Name: TABLE signal_investigations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.signal_investigations IS 'Ask Ponte to investigate requests on Market Signals. Service-role only for the admin queue; never reaches a public payload and never reveals or contacts the third party behind the signal (brief Block D).';


--
-- Name: COLUMN signal_investigations.request_kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.signal_investigations.request_kind IS 'Which action the member took on the signal: investigate (asked the desk to establish something) or capability (declared what they can supply or would buy). Never a fact about the third party behind the signal.';


--
-- Name: COLUMN signal_investigations.capability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.signal_investigations.capability IS 'What the member can supply, or what they would buy, on a capability declaration. Null on an investigation request.';


--
-- Name: COLUMN signal_investigations.contact_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.signal_investigations.contact_phone IS 'A number the requesting member asked the desk to call them on. Never shown to any other member, and never to the party behind the signal.';


--
-- Name: COLUMN signal_investigations.contact_language; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.signal_investigations.contact_language IS 'The language the member asked to be called in, from the closed list in lib/signals/investigation.ts.';


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text NOT NULL,
    status text DEFAULT 'inactive'::text NOT NULL,
    billing_interval text,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_billing_interval_check CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text]))),
    CONSTRAINT subscriptions_plan_check CHECK ((plan = ANY (ARRAY['starter'::text, 'pro'::text, 'enterprise'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['inactive'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text])))
);


--
-- Name: tombstones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tombstones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outcome_line text NOT NULL,
    hs_chapter text,
    origin_region text,
    destination_region text,
    consent boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tombstones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tombstones IS 'Anonymised closed-deal proof. Deliberately carries no listing_id: it must outlive the listing, and the link back would defeat the anonymity.';


--
-- Name: trust_score_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_score_components (
    user_id uuid NOT NULL,
    component text NOT NULL,
    points integer NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_score_components_component_check CHECK ((component = ANY (ARRAY['identity'::text, 'business'::text, 'sanctions_clean'::text, 'company_age'::text, 'activity_docs'::text, 'tenure'::text])))
);


--
-- Name: trust_score_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_score_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    organization_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    new_score integer NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trust_score_events_new_score_check CHECK (((new_score >= 0) AND (new_score <= 100)))
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'dismissed'::text]))),
    CONSTRAINT user_reports_target_type_check CHECK ((target_type = ANY (ARRAY['user'::text, 'listing'::text, 'deal'::text])))
);


--
-- Name: verification_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    verification_id uuid NOT NULL,
    storage_path text NOT NULL,
    doc_type text NOT NULL,
    ai_extract jsonb,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['bill_of_lading'::text, 'invoice'::text, 'reference_letter'::text, 'other'::text])))
);


--
-- Name: verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    guest_email text,
    subject_name text NOT NULL,
    subject_country text,
    subject_reg_number text,
    subject_vat text,
    subject_lei text,
    level_requested integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    registry jsonb,
    vies jsonb,
    gleif jsonb,
    sanctions_hits jsonb,
    ai_summary jsonb,
    verdict_reason text,
    credit_ledger_id uuid,
    reviewed_by uuid,
    rescreened_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    purpose text,
    attested_at timestamp with time zone,
    attestation_version text,
    CONSTRAINT verifications_has_requester CHECK (((user_id IS NOT NULL) OR (guest_email IS NOT NULL))),
    CONSTRAINT verifications_level_requested_check CHECK (((level_requested >= 1) AND (level_requested <= 3))),
    CONSTRAINT verifications_purpose_check CHECK (((purpose IS NULL) OR (purpose = ANY (ARRAY['member_business'::text, 'counterparty_check'::text])))),
    CONSTRAINT verifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'auto_verified'::text, 'review'::text, 'verified'::text, 'rejected'::text, 'failed'::text, 'needs_selection'::text])))
);


--
-- Name: COLUMN verifications.purpose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verifications.purpose IS 'member_business = the member verifying their own business (may grant the badge); counterparty_check = checking someone else (never grants). Null = legacy/unclassified, treated as counterparty_check. Never inferred from page copy.';


--
-- Name: COLUMN verifications.attested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verifications.attested_at IS 'When the member accepted the member-business attestation. Server-stamped, never client-supplied. Null for a counterparty check and for legacy rows.';


--
-- Name: COLUMN verifications.attestation_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.verifications.attestation_version IS 'Which version of the attestation wording the member accepted (see MEMBER_BUSINESS_ATTESTATION in lib/verification/purpose.ts). Null when no attestation was made.';


--
-- Name: account_briefs account_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_briefs
    ADD CONSTRAINT account_briefs_pkey PRIMARY KEY (user_id);


--
-- Name: adamftd_usage adamftd_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_usage
    ADD CONSTRAINT adamftd_usage_pkey PRIMARY KEY (id);


--
-- Name: adamftd_verification_checks adamftd_verification_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_verification_checks
    ADD CONSTRAINT adamftd_verification_checks_pkey PRIMARY KEY (id);


--
-- Name: ai_calls ai_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_calls
    ADD CONSTRAINT ai_calls_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (user_id, feature);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: anonymous_drafts anonymous_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_drafts
    ADD CONSTRAINT anonymous_drafts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_entities blocked_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_entities
    ADD CONSTRAINT blocked_entities_pkey PRIMARY KEY (id);


--
-- Name: bundle_items bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (bundle_product_id, component_product_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: credit_ledger credit_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (id);


--
-- Name: credit_purchases credit_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_pkey PRIMARY KEY (id);


--
-- Name: credit_purchases credit_purchases_stripe_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_stripe_session_id_key UNIQUE (stripe_session_id);


--
-- Name: data_source_cache data_source_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_source_cache
    ADD CONSTRAINT data_source_cache_pkey PRIMARY KEY (id);


--
-- Name: data_source_cache data_source_cache_source_id_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_source_cache
    ADD CONSTRAINT data_source_cache_source_id_cache_key_key UNIQUE (source_id, cache_key);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (id);


--
-- Name: deal_documents deal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_documents
    ADD CONSTRAINT deal_documents_pkey PRIMARY KEY (id);


--
-- Name: deal_events deal_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_events
    ADD CONSTRAINT deal_events_pkey PRIMARY KEY (id);


--
-- Name: deal_room_activity_events deal_room_activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_activity_events
    ADD CONSTRAINT deal_room_activity_events_pkey PRIMARY KEY (id);


--
-- Name: deal_room_agreement_acceptances deal_room_agreement_acceptanc_participant_id_agreement_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_acceptances
    ADD CONSTRAINT deal_room_agreement_acceptanc_participant_id_agreement_kind_key UNIQUE (participant_id, agreement_kind, document_version);


--
-- Name: deal_room_agreement_acceptances deal_room_agreement_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_acceptances
    ADD CONSTRAINT deal_room_agreement_acceptances_pkey PRIMARY KEY (id);


--
-- Name: deal_room_agreement_documents deal_room_agreement_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_documents
    ADD CONSTRAINT deal_room_agreement_documents_pkey PRIMARY KEY (kind);


--
-- Name: deal_room_blockers deal_room_blockers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_pkey PRIMARY KEY (id);


--
-- Name: deal_room_clarifications deal_room_clarifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_pkey PRIMARY KEY (id);


--
-- Name: deal_room_entitlements deal_room_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_entitlements
    ADD CONSTRAINT deal_room_entitlements_pkey PRIMARY KEY (id);


--
-- Name: deal_room_entitlements deal_room_entitlements_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_entitlements
    ADD CONSTRAINT deal_room_entitlements_room_id_key UNIQUE (room_id);


--
-- Name: deal_room_evidence deal_room_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_pkey PRIMARY KEY (id);


--
-- Name: deal_room_evidence_versions deal_room_evidence_versions_evidence_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence_versions
    ADD CONSTRAINT deal_room_evidence_versions_evidence_id_version_key UNIQUE (evidence_id, version);


--
-- Name: deal_room_evidence_versions deal_room_evidence_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence_versions
    ADD CONSTRAINT deal_room_evidence_versions_pkey PRIMARY KEY (id);


--
-- Name: deal_room_evidence_versions deal_room_evidence_versions_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence_versions
    ADD CONSTRAINT deal_room_evidence_versions_storage_path_key UNIQUE (storage_path);


--
-- Name: deal_room_invitations deal_room_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_pkey PRIMARY KEY (id);


--
-- Name: deal_room_invitations deal_room_invitations_token_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_token_sha256_key UNIQUE (token_sha256);


--
-- Name: deal_room_participants deal_room_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_pkey PRIMARY KEY (id);


--
-- Name: deal_room_procedure_approvals deal_room_procedure_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_approvals
    ADD CONSTRAINT deal_room_procedure_approvals_pkey PRIMARY KEY (id);


--
-- Name: deal_room_procedure_approvals deal_room_procedure_approvals_procedure_id_participant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_approvals
    ADD CONSTRAINT deal_room_procedure_approvals_procedure_id_participant_id_key UNIQUE (procedure_id, participant_id);


--
-- Name: deal_room_procedure_steps deal_room_procedure_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_steps
    ADD CONSTRAINT deal_room_procedure_steps_pkey PRIMARY KEY (id);


--
-- Name: deal_room_procedure_steps deal_room_procedure_steps_procedure_id_step_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_steps
    ADD CONSTRAINT deal_room_procedure_steps_procedure_id_step_key_key UNIQUE (procedure_id, step_key);


--
-- Name: deal_room_procedures deal_room_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedures
    ADD CONSTRAINT deal_room_procedures_pkey PRIMARY KEY (id);


--
-- Name: deal_room_procedures deal_room_procedures_room_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedures
    ADD CONSTRAINT deal_room_procedures_room_id_version_key UNIQUE (room_id, version);


--
-- Name: deal_room_sub_rooms deal_room_sub_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_sub_rooms
    ADD CONSTRAINT deal_room_sub_rooms_pkey PRIMARY KEY (id);


--
-- Name: deal_room_sub_rooms deal_room_sub_rooms_room_id_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_sub_rooms
    ADD CONSTRAINT deal_room_sub_rooms_room_id_ref_key UNIQUE (room_id, ref);


--
-- Name: deal_rooms deal_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_pkey PRIMARY KEY (id);


--
-- Name: deal_rooms deal_rooms_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_ref_key UNIQUE (ref);


--
-- Name: deal_status_history deal_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_status_history
    ADD CONSTRAINT deal_status_history_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: desk_radar desk_radar_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_radar
    ADD CONSTRAINT desk_radar_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: desk_radar desk_radar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_radar
    ADD CONSTRAINT desk_radar_pkey PRIMARY KEY (id);


--
-- Name: fraud_flags fraud_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_flags
    ADD CONSTRAINT fraud_flags_pkey PRIMARY KEY (id);


--
-- Name: hs_codes hs_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hs_codes
    ADD CONSTRAINT hs_codes_pkey PRIMARY KEY (code);


--
-- Name: listing_connections listing_connections_listing_id_requester_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_connections
    ADD CONSTRAINT listing_connections_listing_id_requester_id_key UNIQUE (listing_id, requester_id);


--
-- Name: listing_connections listing_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_connections
    ADD CONSTRAINT listing_connections_pkey PRIMARY KEY (id);


--
-- Name: listing_documents listing_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_documents
    ADD CONSTRAINT listing_documents_pkey PRIMARY KEY (id);


--
-- Name: listing_events listing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_events
    ADD CONSTRAINT listing_events_pkey PRIMARY KEY (id);


--
-- Name: listing_media listing_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_media
    ADD CONSTRAINT listing_media_pkey PRIMARY KEY (id);


--
-- Name: listing_translations listing_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_translations
    ADD CONSTRAINT listing_translations_pkey PRIMARY KEY (listing_id, lang);


--
-- Name: listings_legacy_20260720 listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings_legacy_20260720
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey1 PRIMARY KEY (id);


--
-- Name: listings listings_product_fields_family; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.listings
    ADD CONSTRAINT listings_product_fields_family CHECK (((market_family IS NULL) OR (market_family = 'products'::text) OR ((quantity IS NULL) AND (quantity_min IS NULL) AND (quantity_max IS NULL) AND (unit IS NULL) AND (incoterm IS NULL) AND (hs_code IS NULL)))) NOT VALID;


--
-- Name: listings listings_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_ref_key UNIQUE (ref);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_notes order_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_notes
    ADD CONSTRAINT order_notes_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sanctions_entries sanctions_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sanctions_entries
    ADD CONSTRAINT sanctions_entries_pkey PRIMARY KEY (id);


--
-- Name: sanctions_entries sanctions_entries_source_list_entry_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sanctions_entries
    ADD CONSTRAINT sanctions_entries_source_list_entry_id_key UNIQUE (source_list, entry_id);


--
-- Name: sanctions_refresh_log sanctions_refresh_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sanctions_refresh_log
    ADD CONSTRAINT sanctions_refresh_log_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: settlement_events settlement_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_events
    ADD CONSTRAINT settlement_events_pkey PRIMARY KEY (id);


--
-- Name: settlement_milestones settlement_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_milestones
    ADD CONSTRAINT settlement_milestones_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: signal_investigations signal_investigations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_investigations
    ADD CONSTRAINT signal_investigations_pkey PRIMARY KEY (id);


--
-- Name: signal_investigations signal_investigations_unique_requester_kind; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_investigations
    ADD CONSTRAINT signal_investigations_unique_requester_kind UNIQUE (signal_id, requester_id, request_kind);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: tombstones tombstones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tombstones
    ADD CONSTRAINT tombstones_pkey PRIMARY KEY (id);


--
-- Name: trust_score_components trust_score_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_components
    ADD CONSTRAINT trust_score_components_pkey PRIMARY KEY (user_id, component);


--
-- Name: trust_score_events trust_score_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_events
    ADD CONSTRAINT trust_score_events_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: verification_documents verification_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: adamftd_checks_cache_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX adamftd_checks_cache_idx ON public.adamftd_verification_checks USING btree (cache_key);


--
-- Name: adamftd_checks_requester_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX adamftd_checks_requester_idx ON public.adamftd_verification_checks USING btree (requester_id);


--
-- Name: adamftd_usage_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX adamftd_usage_unique ON public.adamftd_usage USING btree (profile_id, period);


--
-- Name: ai_calls_feature_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_calls_feature_idx ON public.ai_calls USING btree (feature, created_at DESC);


--
-- Name: ai_calls_ref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_calls_ref_idx ON public.ai_calls USING btree (ref);


--
-- Name: analytics_events_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_created_idx ON public.analytics_events USING btree (created_at);


--
-- Name: analytics_events_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_events_event_idx ON public.analytics_events USING btree (event, created_at);


--
-- Name: anonymous_drafts_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX anonymous_drafts_session_idx ON public.anonymous_drafts USING btree (session_key) WHERE (claimed_by IS NULL);


--
-- Name: anonymous_drafts_sweep_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX anonymous_drafts_sweep_idx ON public.anonymous_drafts USING btree (created_at) WHERE (claimed_by IS NULL);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);


--
-- Name: audit_logs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_idx ON public.audit_logs USING btree (created_at);


--
-- Name: blocked_entities_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX blocked_entities_unique ON public.blocked_entities USING btree (entity_type, value);


--
-- Name: credit_ledger_ref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_ledger_ref_idx ON public.credit_ledger USING btree (ref);


--
-- Name: credit_ledger_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_ledger_user_idx ON public.credit_ledger USING btree (user_id, created_at DESC);


--
-- Name: credit_purchases_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_purchases_user_idx ON public.credit_purchases USING btree (user_id, created_at DESC);


--
-- Name: data_source_cache_fetched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_source_cache_fetched_at_idx ON public.data_source_cache USING btree (fetched_at);


--
-- Name: deal_documents_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_documents_deal_idx ON public.deal_documents USING btree (deal_id);


--
-- Name: deal_events_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_events_deal_idx ON public.deal_events USING btree (deal_id, created_at);


--
-- Name: deal_room_activity_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_activity_room_idx ON public.deal_room_activity_events USING btree (room_id, created_at DESC);


--
-- Name: deal_room_activity_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_activity_sub_idx ON public.deal_room_activity_events USING btree (sub_room_id, created_at DESC);


--
-- Name: deal_room_agreement_participant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_agreement_participant_idx ON public.deal_room_agreement_acceptances USING btree (participant_id);


--
-- Name: deal_room_approvals_procedure_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_approvals_procedure_idx ON public.deal_room_procedure_approvals USING btree (procedure_id);


--
-- Name: deal_room_blockers_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_blockers_open_idx ON public.deal_room_blockers USING btree (room_id) WHERE (state <> ALL (ARRAY['resolved'::text, 'waived'::text]));


--
-- Name: deal_room_blockers_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_blockers_room_idx ON public.deal_room_blockers USING btree (room_id);


--
-- Name: deal_room_blockers_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_blockers_sub_idx ON public.deal_room_blockers USING btree (sub_room_id);


--
-- Name: deal_room_clarifications_evidence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_clarifications_evidence_idx ON public.deal_room_clarifications USING btree (evidence_id);


--
-- Name: deal_room_clarifications_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_clarifications_sub_idx ON public.deal_room_clarifications USING btree (sub_room_id);


--
-- Name: deal_room_entitlements_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_entitlements_org_idx ON public.deal_room_entitlements USING btree (org_id);


--
-- Name: deal_room_evidence_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_evidence_room_idx ON public.deal_room_evidence USING btree (room_id);


--
-- Name: deal_room_evidence_step_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_evidence_step_idx ON public.deal_room_evidence USING btree (step_id);


--
-- Name: deal_room_evidence_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_evidence_sub_idx ON public.deal_room_evidence USING btree (sub_room_id);


--
-- Name: deal_room_evidence_versions_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_evidence_versions_path_idx ON public.deal_room_evidence_versions USING btree (storage_path);


--
-- Name: deal_room_invitations_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_invitations_room_idx ON public.deal_room_invitations USING btree (room_id);


--
-- Name: deal_room_invitations_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_invitations_sub_idx ON public.deal_room_invitations USING btree (sub_room_id);


--
-- Name: deal_room_participants_master_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX deal_room_participants_master_unique ON public.deal_room_participants USING btree (room_id, profile_id) WHERE (sub_room_id IS NULL);


--
-- Name: deal_room_participants_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_participants_profile_idx ON public.deal_room_participants USING btree (profile_id);


--
-- Name: deal_room_participants_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_participants_room_idx ON public.deal_room_participants USING btree (room_id);


--
-- Name: deal_room_participants_sub_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_participants_sub_idx ON public.deal_room_participants USING btree (sub_room_id);


--
-- Name: deal_room_participants_sub_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX deal_room_participants_sub_unique ON public.deal_room_participants USING btree (sub_room_id, profile_id) WHERE (sub_room_id IS NOT NULL);


--
-- Name: deal_room_procedures_one_approved; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX deal_room_procedures_one_approved ON public.deal_room_procedures USING btree (room_id) WHERE (state = 'approved'::text);


--
-- Name: deal_room_procedures_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_procedures_room_idx ON public.deal_room_procedures USING btree (room_id);


--
-- Name: deal_room_steps_procedure_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_steps_procedure_idx ON public.deal_room_procedure_steps USING btree (procedure_id, seq);


--
-- Name: deal_room_sub_rooms_room_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_room_sub_rooms_room_idx ON public.deal_room_sub_rooms USING btree (room_id);


--
-- Name: deal_rooms_initiator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_rooms_initiator_idx ON public.deal_rooms USING btree (initiator_profile_id);


--
-- Name: deal_rooms_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_rooms_listing_idx ON public.deal_rooms USING btree (listing_id);


--
-- Name: deal_rooms_sponsor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_rooms_sponsor_idx ON public.deal_rooms USING btree (sponsor_org_id);


--
-- Name: deal_rooms_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_rooms_state_idx ON public.deal_rooms USING btree (state);


--
-- Name: deals_counterparty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_counterparty_idx ON public.deals USING btree (counterparty_id);


--
-- Name: deals_initiator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_initiator_idx ON public.deals USING btree (initiator_id);


--
-- Name: deals_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_listing_idx ON public.deals USING btree (listing_id);


--
-- Name: desk_radar_canonical_signal_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX desk_radar_canonical_signal_id_key ON public.desk_radar USING btree (canonical_signal_id);


--
-- Name: desk_radar_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_category_idx ON public.desk_radar USING btree (category);


--
-- Name: desk_radar_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_live_idx ON public.desk_radar USING btree (status, spotted_at DESC);


--
-- Name: desk_radar_market_family_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_market_family_idx ON public.desk_radar USING btree (market_family) WHERE (market_family IS NOT NULL);


--
-- Name: desk_radar_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_product_idx ON public.desk_radar USING btree (product) WHERE (status = 'approved_signal'::text);


--
-- Name: desk_radar_product_sector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_product_sector_idx ON public.desk_radar USING btree (product_sector_key) WHERE (product_sector_key IS NOT NULL);


--
-- Name: desk_radar_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_public_idx ON public.desk_radar USING btree (status, public_expires_at, spotted_at DESC) WHERE (status = 'approved_signal'::text);


--
-- Name: desk_radar_service_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX desk_radar_service_category_idx ON public.desk_radar USING btree (service_category_key) WHERE (service_category_key IS NOT NULL);


--
-- Name: fraud_flags_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fraud_flags_status_idx ON public.fraud_flags USING btree (status);


--
-- Name: fraud_flags_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fraud_flags_subject_idx ON public.fraud_flags USING btree (subject_type, subject_id);


--
-- Name: hs_codes_chapter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs_codes_chapter_idx ON public.hs_codes USING btree (chapter) WHERE is_active;


--
-- Name: hs_codes_edition_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs_codes_edition_idx ON public.hs_codes USING btree (hs_edition, is_active);


--
-- Name: hs_codes_heading_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs_codes_heading_idx ON public.hs_codes USING btree (heading) WHERE is_active;


--
-- Name: hs_codes_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hs_codes_search_idx ON public.hs_codes USING gin ((((((COALESCE(short_title, ''::text) || ' '::text) || description) || ' '::text) || heading_title)) public.gin_trgm_ops);


--
-- Name: listing_connections_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_connections_listing_idx ON public.listing_connections USING btree (listing_id, status);


--
-- Name: listing_documents_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_documents_listing_idx ON public.listing_documents USING btree (listing_id);


--
-- Name: listing_events_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_events_event_idx ON public.listing_events USING btree (event, created_at DESC);


--
-- Name: listing_events_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_events_listing_idx ON public.listing_events USING btree (listing_id, created_at DESC);


--
-- Name: listing_media_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_media_listing_idx ON public.listing_media USING btree (listing_id);


--
-- Name: listings_commodity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_commodity_idx ON public.listings_legacy_20260720 USING btree (commodity);


--
-- Name: listings_completeness_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_completeness_idx ON public.listings USING btree (completeness_score DESC) WHERE (status = 'approved'::text);


--
-- Name: listings_corridor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_corridor_idx ON public.listings USING btree (origin_country, destination_country) WHERE (status = 'approved'::text);


--
-- Name: listings_exception_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_exception_idx ON public.listings USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['flagged'::text, 'suspended'::text, 'needs_information'::text, 'submitted'::text]));


--
-- Name: listings_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_expiry_idx ON public.listings USING btree (valid_until) WHERE ((status = 'approved'::text) AND (valid_until IS NOT NULL));


--
-- Name: listings_flag_reason_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_flag_reason_idx ON public.listings USING btree (flag_reason) WHERE (flag_reason IS NOT NULL);


--
-- Name: listings_hs_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_hs_idx ON public.listings USING btree (hs_code) WHERE (status = 'approved'::text);


--
-- Name: listings_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_live_idx ON public.listings USING btree (status, created_at DESC) WHERE (status = 'approved'::text);


--
-- Name: listings_market_family_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_market_family_idx ON public.listings USING btree (market_family) WHERE (market_family IS NOT NULL);


--
-- Name: listings_origin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_origin_idx ON public.listings_legacy_20260720 USING btree (origin_country);


--
-- Name: listings_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_owner_idx ON public.listings_legacy_20260720 USING btree (owner_id);


--
-- Name: listings_partner_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_partner_type_idx ON public.listings USING btree (distribution_partner_type_key) WHERE (distribution_partner_type_key IS NOT NULL);


--
-- Name: listings_product_sector_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_product_sector_idx ON public.listings USING btree (product_sector_key) WHERE (product_sector_key IS NOT NULL);


--
-- Name: listings_service_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_service_category_idx ON public.listings USING btree (service_category_key) WHERE (service_category_key IS NOT NULL);


--
-- Name: listings_service_subcategories_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_service_subcategories_idx ON public.listings USING gin (service_subcategory_keys);


--
-- Name: listings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_status_idx ON public.listings_legacy_20260720 USING btree (status);


--
-- Name: listings_territory_codes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_territory_codes_idx ON public.listings USING gin (territory_codes);


--
-- Name: listings_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_user_idx ON public.listings USING btree (user_id, created_at DESC);


--
-- Name: messages_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_deal_idx ON public.messages USING btree (deal_id);


--
-- Name: notifications_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_profile_idx ON public.notifications USING btree (profile_id, read);


--
-- Name: order_items_slot_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_slot_date_idx ON public.order_items USING btree (slot_date);


--
-- Name: orders_capture_deadline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_capture_deadline_idx ON public.orders USING btree (capture_deadline_at) WHERE (status_v2 = 'authorized'::text);


--
-- Name: orders_status_v2_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_v2_idx ON public.orders USING btree (status_v2);


--
-- Name: sanctions_alias_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanctions_alias_trgm ON public.sanctions_entries USING gin (public.aliases_text(normalized_aliases) public.gin_trgm_ops);


--
-- Name: sanctions_imported_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanctions_imported_idx ON public.sanctions_entries USING btree (imported_at DESC);


--
-- Name: sanctions_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanctions_name_trgm ON public.sanctions_entries USING gin (normalized_name public.gin_trgm_ops);


--
-- Name: sanctions_refresh_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanctions_refresh_list_idx ON public.sanctions_refresh_log USING btree (source_list, fetched_at DESC);


--
-- Name: sanctions_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sanctions_source_idx ON public.sanctions_entries USING btree (source_list);


--
-- Name: saved_searches_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_searches_profile_idx ON public.saved_searches USING btree (profile_id);


--
-- Name: settlement_events_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX settlement_events_idx ON public.settlement_events USING btree (settlement_id, created_at);


--
-- Name: settlement_milestones_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX settlement_milestones_idx ON public.settlement_milestones USING btree (settlement_id, seq);


--
-- Name: settlements_deal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX settlements_deal_idx ON public.settlements USING btree (deal_id);


--
-- Name: signal_investigations_signal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX signal_investigations_signal_idx ON public.signal_investigations USING btree (signal_id, created_at DESC);


--
-- Name: subscriptions_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_active_unique ON public.subscriptions USING btree (profile_id) WHERE (status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text]));


--
-- Name: subscriptions_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_profile_idx ON public.subscriptions USING btree (profile_id);


--
-- Name: trust_score_events_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trust_score_events_profile_idx ON public.trust_score_events USING btree (profile_id);


--
-- Name: user_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_reports_status_idx ON public.user_reports USING btree (status);


--
-- Name: user_reports_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_reports_target_idx ON public.user_reports USING btree (target_type, target_id);


--
-- Name: verification_docs_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_docs_idx ON public.verification_documents USING btree (verification_id);


--
-- Name: verifications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verifications_status_idx ON public.verifications USING btree (status, created_at DESC);


--
-- Name: verifications_subject_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verifications_subject_trgm ON public.verifications USING gin (subject_name public.gin_trgm_ops);


--
-- Name: verifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verifications_user_idx ON public.verifications USING btree (user_id, created_at DESC);


--
-- Name: deal_room_activity_events deal_room_activity_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deal_room_activity_append_only BEFORE DELETE OR UPDATE ON public.deal_room_activity_events FOR EACH ROW EXECUTE FUNCTION public.deal_room_events_append_only();


--
-- Name: profiles guard_profile_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER guard_profile_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();


--
-- Name: listings listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_listing_updated_at();


--
-- Name: adamftd_usage touch_adamftd_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_adamftd_usage BEFORE UPDATE ON public.adamftd_usage FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: adamftd_verification_checks touch_adamftd_verification_checks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_adamftd_verification_checks BEFORE UPDATE ON public.adamftd_verification_checks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_blockers touch_deal_room_blockers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_blockers BEFORE UPDATE ON public.deal_room_blockers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_entitlements touch_deal_room_entitlements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_entitlements BEFORE UPDATE ON public.deal_room_entitlements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_evidence touch_deal_room_evidence; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_evidence BEFORE UPDATE ON public.deal_room_evidence FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_participants touch_deal_room_participants; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_participants BEFORE UPDATE ON public.deal_room_participants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_procedures touch_deal_room_procedures; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_procedures BEFORE UPDATE ON public.deal_room_procedures FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_procedure_steps touch_deal_room_steps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_steps BEFORE UPDATE ON public.deal_room_procedure_steps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_room_sub_rooms touch_deal_room_sub_rooms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_room_sub_rooms BEFORE UPDATE ON public.deal_room_sub_rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deal_rooms touch_deal_rooms; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deal_rooms BEFORE UPDATE ON public.deal_rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: deals touch_deals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_deals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: listings_legacy_20260720 touch_listings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_listings BEFORE UPDATE ON public.listings_legacy_20260720 FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: organizations touch_organizations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: settlements touch_settlements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_settlements BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: subscriptions touch_subscriptions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: user_reports touch_user_reports; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_user_reports BEFORE UPDATE ON public.user_reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: signal_investigations trg_sync_investigation_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_investigation_count AFTER INSERT OR DELETE ON public.signal_investigations FOR EACH ROW EXECUTE FUNCTION public.sync_investigation_count();


--
-- Name: adamftd_usage adamftd_usage_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_usage
    ADD CONSTRAINT adamftd_usage_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: adamftd_verification_checks adamftd_verification_checks_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_verification_checks
    ADD CONSTRAINT adamftd_verification_checks_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings_legacy_20260720(id) ON DELETE SET NULL;


--
-- Name: adamftd_verification_checks adamftd_verification_checks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_verification_checks
    ADD CONSTRAINT adamftd_verification_checks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: adamftd_verification_checks adamftd_verification_checks_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adamftd_verification_checks
    ADD CONSTRAINT adamftd_verification_checks_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_calls ai_calls_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_calls
    ADD CONSTRAINT ai_calls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: analytics_events analytics_events_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: anonymous_drafts anonymous_drafts_claimed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anonymous_drafts
    ADD CONSTRAINT anonymous_drafts_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: blocked_entities blocked_entities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_entities
    ADD CONSTRAINT blocked_entities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bundle_items bundle_items_bundle_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_product_id_fkey FOREIGN KEY (bundle_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: bundle_items bundle_items_component_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: credit_ledger credit_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: credit_purchases credit_purchases_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_ledger_id_fkey FOREIGN KEY (ledger_id) REFERENCES public.credit_ledger(id);


--
-- Name: credit_purchases credit_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_purchases
    ADD CONSTRAINT credit_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_documents deal_documents_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_documents
    ADD CONSTRAINT deal_documents_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deal_documents deal_documents_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_documents
    ADD CONSTRAINT deal_documents_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_events deal_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_events
    ADD CONSTRAINT deal_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_events deal_events_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_events
    ADD CONSTRAINT deal_events_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deal_room_activity_events deal_room_activity_events_actor_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_activity_events
    ADD CONSTRAINT deal_room_activity_events_actor_profile_id_fkey FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_activity_events deal_room_activity_events_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_activity_events
    ADD CONSTRAINT deal_room_activity_events_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_activity_events deal_room_activity_events_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_activity_events
    ADD CONSTRAINT deal_room_activity_events_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_agreement_acceptances deal_room_agreement_acceptances_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_acceptances
    ADD CONSTRAINT deal_room_agreement_acceptances_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.deal_room_participants(id) ON DELETE CASCADE;


--
-- Name: deal_room_agreement_acceptances deal_room_agreement_acceptances_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_acceptances
    ADD CONSTRAINT deal_room_agreement_acceptances_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_agreement_acceptances deal_room_agreement_acceptances_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_agreement_acceptances
    ADD CONSTRAINT deal_room_agreement_acceptances_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_blockers deal_room_blockers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_blockers deal_room_blockers_owner_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_owner_participant_id_fkey FOREIGN KEY (owner_participant_id) REFERENCES public.deal_room_participants(id) ON DELETE SET NULL;


--
-- Name: deal_room_blockers deal_room_blockers_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_blockers deal_room_blockers_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_blockers deal_room_blockers_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.deal_room_procedure_steps(id) ON DELETE SET NULL;


--
-- Name: deal_room_blockers deal_room_blockers_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_blockers
    ADD CONSTRAINT deal_room_blockers_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_clarifications deal_room_clarifications_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_clarifications deal_room_clarifications_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.deal_room_evidence(id) ON DELETE CASCADE;


--
-- Name: deal_room_clarifications deal_room_clarifications_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_clarifications deal_room_clarifications_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_clarifications deal_room_clarifications_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.deal_room_procedure_steps(id) ON DELETE SET NULL;


--
-- Name: deal_room_clarifications deal_room_clarifications_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_clarifications
    ADD CONSTRAINT deal_room_clarifications_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_entitlements deal_room_entitlements_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_entitlements
    ADD CONSTRAINT deal_room_entitlements_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: deal_room_entitlements deal_room_entitlements_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_entitlements
    ADD CONSTRAINT deal_room_entitlements_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_evidence deal_room_evidence_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_evidence deal_room_evidence_provider_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_provider_org_id_fkey FOREIGN KEY (provider_org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: deal_room_evidence deal_room_evidence_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_evidence deal_room_evidence_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_evidence deal_room_evidence_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.deal_room_procedure_steps(id) ON DELETE SET NULL;


--
-- Name: deal_room_evidence deal_room_evidence_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_evidence deal_room_evidence_superseded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence
    ADD CONSTRAINT deal_room_evidence_superseded_by_id_fkey FOREIGN KEY (superseded_by_id) REFERENCES public.deal_room_evidence(id) ON DELETE SET NULL;


--
-- Name: deal_room_evidence_versions deal_room_evidence_versions_evidence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence_versions
    ADD CONSTRAINT deal_room_evidence_versions_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.deal_room_evidence(id) ON DELETE CASCADE;


--
-- Name: deal_room_evidence_versions deal_room_evidence_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_evidence_versions
    ADD CONSTRAINT deal_room_evidence_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_invitations deal_room_invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_invitations deal_room_invitations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_invitations deal_room_invitations_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_invitations deal_room_invitations_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_invitations
    ADD CONSTRAINT deal_room_invitations_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_participants deal_room_participants_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_room_participants deal_room_participants_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: deal_room_participants deal_room_participants_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_participants deal_room_participants_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_participants deal_room_participants_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_participants
    ADD CONSTRAINT deal_room_participants_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_procedure_approvals deal_room_procedure_approvals_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_approvals
    ADD CONSTRAINT deal_room_procedure_approvals_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.deal_room_participants(id) ON DELETE CASCADE;


--
-- Name: deal_room_procedure_approvals deal_room_procedure_approvals_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_approvals
    ADD CONSTRAINT deal_room_procedure_approvals_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.deal_room_procedures(id) ON DELETE CASCADE;


--
-- Name: deal_room_procedure_steps deal_room_procedure_steps_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_steps
    ADD CONSTRAINT deal_room_procedure_steps_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.deal_room_procedures(id) ON DELETE CASCADE;


--
-- Name: deal_room_procedure_steps deal_room_procedure_steps_responsible_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedure_steps
    ADD CONSTRAINT deal_room_procedure_steps_responsible_participant_id_fkey FOREIGN KEY (responsible_participant_id) REFERENCES public.deal_room_participants(id) ON DELETE SET NULL;


--
-- Name: deal_room_procedures deal_room_procedures_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedures
    ADD CONSTRAINT deal_room_procedures_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_procedures deal_room_procedures_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedures
    ADD CONSTRAINT deal_room_procedures_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_procedures deal_room_procedures_sub_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_procedures
    ADD CONSTRAINT deal_room_procedures_sub_room_id_fkey FOREIGN KEY (sub_room_id) REFERENCES public.deal_room_sub_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_room_sub_rooms deal_room_sub_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_sub_rooms
    ADD CONSTRAINT deal_room_sub_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_room_sub_rooms deal_room_sub_rooms_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_room_sub_rooms
    ADD CONSTRAINT deal_room_sub_rooms_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.deal_rooms(id) ON DELETE CASCADE;


--
-- Name: deal_rooms deal_rooms_initiator_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_initiator_profile_id_fkey FOREIGN KEY (initiator_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_rooms deal_rooms_intended_counterparty_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_intended_counterparty_profile_id_fkey FOREIGN KEY (intended_counterparty_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: deal_rooms deal_rooms_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT;


--
-- Name: deal_rooms deal_rooms_sponsor_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_sponsor_org_id_fkey FOREIGN KEY (sponsor_org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: deal_rooms deal_rooms_sponsor_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_rooms
    ADD CONSTRAINT deal_rooms_sponsor_profile_id_fkey FOREIGN KEY (sponsor_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_status_history deal_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_status_history
    ADD CONSTRAINT deal_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deal_status_history deal_status_history_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_status_history
    ADD CONSTRAINT deal_status_history_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deals deals_counterparty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: deals deals_initiator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: deals deals_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings_legacy_20260720(id) ON DELETE SET NULL;


--
-- Name: desk_radar desk_radar_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_radar
    ADD CONSTRAINT desk_radar_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: desk_radar desk_radar_promoted_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.desk_radar
    ADD CONSTRAINT desk_radar_promoted_listing_id_fkey FOREIGN KEY (promoted_listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: listing_connections listing_connections_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_connections
    ADD CONSTRAINT listing_connections_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_documents listing_documents_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_documents
    ADD CONSTRAINT listing_documents_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_documents listing_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_documents
    ADD CONSTRAINT listing_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: listing_events listing_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_events
    ADD CONSTRAINT listing_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: listing_events listing_events_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_events
    ADD CONSTRAINT listing_events_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_media listing_media_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_media
    ADD CONSTRAINT listing_media_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listing_media listing_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_media
    ADD CONSTRAINT listing_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: listing_translations listing_translations_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_translations
    ADD CONSTRAINT listing_translations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listings listings_hs_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_hs_code_fkey FOREIGN KEY (hs_code) REFERENCES public.hs_codes(code) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: listings_legacy_20260720 listings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings_legacy_20260720
    ADD CONSTRAINT listings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: listings_legacy_20260720 listings_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings_legacy_20260720
    ADD CONSTRAINT listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: listings listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_notes order_notes_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_notes
    ADD CONSTRAINT order_notes_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: profiles profiles_business_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_business_verification_id_fkey FOREIGN KEY (business_verification_id) REFERENCES public.verifications(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: saved_searches saved_searches_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: settlement_events settlement_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_events
    ADD CONSTRAINT settlement_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: settlement_events settlement_events_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_events
    ADD CONSTRAINT settlement_events_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.settlement_milestones(id) ON DELETE SET NULL;


--
-- Name: settlement_events settlement_events_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_events
    ADD CONSTRAINT settlement_events_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE;


--
-- Name: settlement_milestones settlement_milestones_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_milestones
    ADD CONSTRAINT settlement_milestones_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: signal_investigations signal_investigations_signal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_investigations
    ADD CONSTRAINT signal_investigations_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES public.desk_radar(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: trust_score_components trust_score_components_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_components
    ADD CONSTRAINT trust_score_components_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: trust_score_events trust_score_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_events
    ADD CONSTRAINT trust_score_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: trust_score_events trust_score_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_events
    ADD CONSTRAINT trust_score_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: trust_score_events trust_score_events_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_score_events
    ADD CONSTRAINT trust_score_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: user_reports user_reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: verification_documents verification_documents_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_documents
    ADD CONSTRAINT verification_documents_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.verifications(id) ON DELETE CASCADE;


--
-- Name: verifications verifications_credit_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_credit_ledger_id_fkey FOREIGN KEY (credit_ledger_id) REFERENCES public.credit_ledger(id) ON DELETE SET NULL;


--
-- Name: verifications verifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: verifications verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: listing_documents Admins read all listing docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all listing docs" ON public.listing_documents FOR SELECT USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: listing_events Admins read all listing events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all listing events" ON public.listing_events FOR SELECT USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: listings Admins read all listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all listings" ON public.listings FOR SELECT USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: listing_media Admins read all media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all media" ON public.listing_media FOR SELECT USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: listings Admins update listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update listings" ON public.listings FOR UPDATE USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: listings Authenticated read approved listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read approved listings" ON public.listings FOR SELECT TO authenticated USING ((status = 'approved'::text));


--
-- Name: listing_media Authenticated read approved media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read approved media" ON public.listing_media FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_media.listing_id) AND (l.status = 'approved'::text)))));


--
-- Name: listing_documents Members add own listing docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members add own listing docs" ON public.listing_documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: listing_media Members add own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members add own media" ON public.listing_media FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: signal_investigations Members create investigation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members create investigation requests" ON public.signal_investigations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = requester_id));


--
-- Name: listings Members create own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members create own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))));


--
-- Name: listing_connections Members read own connection requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own connection requests" ON public.listing_connections FOR SELECT TO authenticated USING ((auth.uid() = requester_id));


--
-- Name: signal_investigations Members read own investigation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own investigation requests" ON public.signal_investigations FOR SELECT TO authenticated USING ((auth.uid() = requester_id));


--
-- Name: listing_documents Members read own listing docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own listing docs" ON public.listing_documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: listing_events Members read own listing events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own listing events" ON public.listing_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_events.listing_id) AND (l.user_id = auth.uid())))));


--
-- Name: listings Members read own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own listings" ON public.listings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: listing_media Members read own media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read own media" ON public.listing_media FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: listing_connections Members request connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members request connections" ON public.listing_connections FOR INSERT TO authenticated WITH CHECK (((auth.uid() = requester_id) AND (status = 'pending'::text)));


--
-- Name: listings Members submit own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members submit own drafts" ON public.listings FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = ANY (ARRAY['draft'::text, 'needs_information'::text, 'expired'::text, 'rejected'::text, 'withdrawn'::text])))) WITH CHECK (((auth.uid() = user_id) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'withdrawn'::text]))));


--
-- Name: listings Members withdraw own live listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members withdraw own live listings" ON public.listings FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (status = 'approved'::text))) WITH CHECK (((auth.uid() = user_id) AND (status = ANY (ARRAY['approved'::text, 'withdrawn'::text]))));


--
-- Name: listing_connections Owners decide listing connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners decide listing connections" ON public.listing_connections FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_connections.listing_id) AND (l.user_id = auth.uid()))))) WITH CHECK ((status = ANY (ARRAY['accepted'::text, 'declined'::text])));


--
-- Name: listing_connections Owners read listing connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners read listing connections" ON public.listing_connections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_connections.listing_id) AND (l.user_id = auth.uid())))));


--
-- Name: deal_room_agreement_acceptances acceptance read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "acceptance read" ON public.deal_room_agreement_acceptances FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.deal_room_participants p
  WHERE ((p.id = deal_room_agreement_acceptances.participant_id) AND (p.profile_id = auth.uid())))) OR public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: account_briefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_briefs ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_activity_events activity read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "activity read" ON public.deal_room_activity_events FOR SELECT TO authenticated USING ((((sub_room_id IS NULL) AND (public.deal_room_is_master_participant(room_id) OR public.deal_room_can_administer(room_id))) OR ((sub_room_id IS NOT NULL) AND public.deal_room_is_sub_room_participant(sub_room_id)) OR ((sub_room_id IS NOT NULL) AND public.deal_room_can_administer(room_id)) OR public.is_admin()));


--
-- Name: adamftd_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adamftd_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: adamftd_verification_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adamftd_verification_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs admin audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin audit" ON public.audit_logs FOR SELECT USING (public.is_admin());


--
-- Name: blocked_entities admin blocked; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin blocked" ON public.blocked_entities USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: fraud_flags admin fraud; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin fraud" ON public.fraud_flags USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: categories admin manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manage categories" ON public.categories USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: products admin manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin manage products" ON public.products USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: order_notes admin order notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin order notes" ON public.order_notes USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: analytics_events admin reads analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin reads analytics" ON public.analytics_events FOR SELECT USING (public.is_admin());


--
-- Name: ai_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: anonymous_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anonymous_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_procedure_approvals approval read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "approval read" ON public.deal_room_procedure_approvals FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.deal_room_procedures pr
  WHERE ((pr.id = deal_room_procedure_approvals.procedure_id) AND (public.deal_room_is_master_participant(pr.room_id) OR public.deal_room_can_administer(pr.room_id))))) OR public.is_admin()));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_blockers blocker read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "blocker read" ON public.deal_room_blockers FOR SELECT TO authenticated USING ((((sub_room_id IS NOT NULL) AND public.deal_room_is_sub_room_participant(sub_room_id)) OR ((sub_room_id IS NULL) AND public.deal_room_is_master_participant(room_id)) OR public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: bundle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: bundle_items bundle_items readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bundle_items readable" ON public.bundle_items FOR SELECT USING (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "categories readable" ON public.categories FOR SELECT USING (true);


--
-- Name: deal_room_clarifications clarification read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clarification read" ON public.deal_room_clarifications FOR SELECT TO authenticated USING ((public.deal_room_is_sub_room_participant(sub_room_id) OR public.is_admin()));


--
-- Name: saved_searches create saved search; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "create saved search" ON public.saved_searches FOR INSERT WITH CHECK ((profile_id = auth.uid()));


--
-- Name: credit_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_ledger credit_ledger_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY credit_ledger_own_read ON public.credit_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_purchases credit_purchases_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY credit_purchases_own_read ON public.credit_purchases FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: data_source_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_source_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: data_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_documents deal documents read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal documents read" ON public.deal_documents FOR SELECT USING ((public.is_deal_participant(deal_id) OR public.is_admin()));


--
-- Name: deal_events deal events read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal events read" ON public.deal_events FOR SELECT USING ((public.is_deal_participant(deal_id) OR public.is_admin()));


--
-- Name: deal_status_history deal history read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal history read" ON public.deal_status_history FOR SELECT USING ((public.is_deal_participant(deal_id) OR public.is_admin()));


--
-- Name: deals deal initiator creates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal initiator creates" ON public.deals FOR INSERT WITH CHECK ((initiator_id = auth.uid()));


--
-- Name: messages deal messages read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal messages read" ON public.messages FOR SELECT USING ((public.is_deal_participant(deal_id) OR public.is_admin()));


--
-- Name: messages deal messages send; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal messages send" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND public.is_deal_participant(deal_id)));


--
-- Name: deals deal participants read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal participants read" ON public.deals FOR SELECT USING (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR public.is_admin()));


--
-- Name: deals deal participants update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal participants update" ON public.deals FOR UPDATE USING (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR public.is_admin())) WITH CHECK (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR public.is_admin()));


--
-- Name: deal_rooms deal room read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "deal room read" ON public.deal_rooms FOR SELECT TO authenticated USING ((public.deal_room_can_administer(id) OR public.deal_room_is_master_participant(id) OR (EXISTS ( SELECT 1
   FROM public.deal_room_participants p
  WHERE ((p.room_id = deal_rooms.id) AND (p.profile_id = auth.uid()) AND (p.state = ANY (ARRAY['admitted'::text, 'active'::text]))))) OR public.is_admin()));


--
-- Name: deal_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_activity_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_activity_events ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_agreement_acceptances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_agreement_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_agreement_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_agreement_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_blockers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_blockers ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_clarifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_clarifications ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_entitlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_entitlements ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_evidence_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_evidence_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_procedure_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_procedure_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_procedure_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_procedure_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_procedures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_sub_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_room_sub_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_searches delete saved search; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "delete saved search" ON public.saved_searches FOR DELETE USING ((profile_id = auth.uid()));


--
-- Name: desk_radar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.desk_radar ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_entitlements entitlement read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "entitlement read" ON public.deal_room_entitlements FOR SELECT TO authenticated USING ((public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: deal_room_evidence evidence read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evidence read" ON public.deal_room_evidence FOR SELECT TO authenticated USING ((public.deal_room_can_read_evidence(id) OR public.is_admin()));


--
-- Name: deal_room_evidence_versions evidence version read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "evidence version read" ON public.deal_room_evidence_versions FOR SELECT TO authenticated USING ((public.deal_room_can_read_evidence(evidence_id) OR public.is_admin()));


--
-- Name: user_reports file report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "file report" ON public.user_reports FOR INSERT WITH CHECK ((reporter_id = auth.uid()));


--
-- Name: fraud_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: hs_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hs_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: hs_codes hs_codes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hs_codes_public_read ON public.hs_codes FOR SELECT USING (is_active);


--
-- Name: deal_room_invitations invitation administer read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitation administer read" ON public.deal_room_invitations FOR SELECT TO authenticated USING ((public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: listing_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

--
-- Name: listings_legacy_20260720 listings public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "listings public read" ON public.listings_legacy_20260720 FOR SELECT USING ((((status = 'active'::text) AND (moderation_status = 'approved'::text)) OR (owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: listings_legacy_20260720; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listings_legacy_20260720 ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations orgs readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "orgs readable" ON public.organizations FOR SELECT USING (true);


--
-- Name: adamftd_verification_checks own adamftd checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own adamftd checks" ON public.adamftd_verification_checks FOR SELECT USING (((requester_id = auth.uid()) OR public.is_admin()));


--
-- Name: notifications own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own notifications" ON public.notifications FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: notifications own notifications update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: order_items own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own order items" ON public.order_items FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid()))))));


--
-- Name: orders own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own orders" ON public.orders FOR SELECT USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: profiles own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own profile" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.is_admin()));


--
-- Name: saved_searches own saved searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own saved searches" ON public.saved_searches FOR SELECT USING ((profile_id = auth.uid()));


--
-- Name: subscriptions own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own subscription" ON public.subscriptions FOR SELECT USING (((profile_id = auth.uid()) OR public.is_admin()));


--
-- Name: trust_score_events own trust events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own trust events" ON public.trust_score_events FOR SELECT USING (((profile_id = auth.uid()) OR public.is_admin()));


--
-- Name: adamftd_usage own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own usage" ON public.adamftd_usage FOR SELECT USING (((profile_id = auth.uid()) OR public.is_admin()));


--
-- Name: listings_legacy_20260720 owner manages listing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner manages listing" ON public.listings_legacy_20260720 USING (((owner_id = auth.uid()) OR public.is_admin())) WITH CHECK (((owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: organizations owner manages org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "owner manages org" ON public.organizations USING (((owner_id = auth.uid()) OR public.is_admin())) WITH CHECK (((owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: deal_room_participants participant read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "participant read" ON public.deal_room_participants FOR SELECT TO authenticated USING (((profile_id = auth.uid()) OR ((sub_room_id IS NOT NULL) AND public.deal_room_is_sub_room_participant(sub_room_id)) OR public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: deal_room_procedures procedure read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "procedure read" ON public.deal_room_procedures FOR SELECT TO authenticated USING ((public.deal_room_is_master_participant(room_id) OR ((sub_room_id IS NOT NULL) AND public.deal_room_is_sub_room_participant(sub_room_id)) OR (EXISTS ( SELECT 1
   FROM public.deal_room_participants p
  WHERE ((p.room_id = deal_room_procedures.room_id) AND (p.profile_id = auth.uid()) AND (p.state = ANY (ARRAY['admitted'::text, 'active'::text]))))) OR public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "products readable" ON public.products FOR SELECT USING (((status = 'published'::text) OR public.is_admin()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reports read own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "read own reports" ON public.user_reports FOR SELECT USING (((reporter_id = auth.uid()) OR public.is_admin()));


--
-- Name: sanctions_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sanctions_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: sanctions_refresh_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sanctions_refresh_log ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: settlement_events settlement events read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "settlement events read" ON public.settlement_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.settlements s
  WHERE ((s.id = settlement_events.settlement_id) AND (public.is_deal_participant(s.deal_id) OR public.is_admin())))));


--
-- Name: settlement_milestones settlement milestones read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "settlement milestones read" ON public.settlement_milestones FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.settlements s
  WHERE ((s.id = settlement_milestones.settlement_id) AND (public.is_deal_participant(s.deal_id) OR public.is_admin())))));


--
-- Name: settlements settlement participants read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "settlement participants read" ON public.settlements FOR SELECT USING ((public.is_deal_participant(deal_id) OR public.is_admin()));


--
-- Name: settlement_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlement_events ENABLE ROW LEVEL SECURITY;

--
-- Name: settlement_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlement_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: signal_investigations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signal_investigations ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_room_procedure_steps step read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "step read" ON public.deal_room_procedure_steps FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.deal_room_procedures pr
  WHERE ((pr.id = deal_room_procedure_steps.procedure_id) AND (public.deal_room_is_master_participant(pr.room_id) OR ((pr.sub_room_id IS NOT NULL) AND public.deal_room_is_sub_room_participant(pr.sub_room_id)) OR (EXISTS ( SELECT 1
           FROM public.deal_room_participants p
          WHERE ((p.room_id = pr.room_id) AND (p.profile_id = auth.uid()) AND (p.state = ANY (ARRAY['admitted'::text, 'active'::text]))))) OR public.deal_room_can_administer(pr.room_id))))) OR public.is_admin()));


--
-- Name: deal_room_sub_rooms sub room read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sub room read" ON public.deal_room_sub_rooms FOR SELECT TO authenticated USING ((public.deal_room_is_sub_room_participant(id) OR public.deal_room_can_administer(room_id) OR public.is_admin()));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tombstones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tombstones ENABLE ROW LEVEL SECURITY;

--
-- Name: tombstones tombstones_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tombstones_public_read ON public.tombstones FOR SELECT USING (consent);


--
-- Name: trust_score_components trust_components_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_components_own_read ON public.trust_score_components FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trust_score_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trust_score_components ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_score_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trust_score_events ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: user_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_documents verification_docs_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY verification_docs_own_read ON public.verification_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.verifications v
  WHERE ((v.id = verification_documents.verification_id) AND (v.user_id = auth.uid())))));


--
-- Name: verification_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: verifications verifications_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY verifications_own_read ON public.verifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION aliases_text(text[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.aliases_text(text[]) TO anon;
GRANT ALL ON FUNCTION public.aliases_text(text[]) TO authenticated;
GRANT ALL ON FUNCTION public.aliases_text(text[]) TO service_role;


--
-- Name: FUNCTION apply_trust_delta(p_profile uuid, p_delta integer, p_reason text, p_actor uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.apply_trust_delta(p_profile uuid, p_delta integer, p_reason text, p_actor uuid) TO anon;
GRANT ALL ON FUNCTION public.apply_trust_delta(p_profile uuid, p_delta integer, p_reason text, p_actor uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_trust_delta(p_profile uuid, p_delta integer, p_reason text, p_actor uuid) TO service_role;


--
-- Name: FUNCTION credit_balance(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.credit_balance(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.credit_balance(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.credit_balance(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_accept_agreement(p_participant_id uuid, p_kind text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_accept_agreement(p_participant_id uuid, p_kind text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_accept_agreement(p_participant_id uuid, p_kind text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_accept_agreement(p_participant_id uuid, p_kind text) TO service_role;


--
-- Name: FUNCTION deal_room_accept_evidence_for_procedure(p_evidence_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_accept_evidence_for_procedure(p_evidence_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_accept_invitation(p_token_sha256 text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_accept_invitation(p_token_sha256 text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_accept_invitation(p_token_sha256 text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_accept_invitation(p_token_sha256 text) TO service_role;


--
-- Name: FUNCTION deal_room_admit_participant(p_participant_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_admit_participant(p_participant_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_admit_participant(p_participant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_admit_participant(p_participant_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_answer_clarification(p_clarification_id uuid, p_answer text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_answer_clarification(p_clarification_id uuid, p_answer text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_answer_clarification(p_clarification_id uuid, p_answer text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_answer_clarification(p_clarification_id uuid, p_answer text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) TO service_role;


--
-- Name: FUNCTION deal_room_approve_procedure(p_procedure_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_approve_procedure(p_procedure_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_approve_procedure(p_procedure_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_approve_procedure(p_procedure_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_can_administer(p_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_can_administer(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_can_administer(p_room_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_can_administer(p_room_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_can_read_evidence(p_evidence_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_can_read_evidence(p_evidence_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_can_read_evidence(p_evidence_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_can_read_evidence(p_evidence_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_declare_participation(p_participant_id uuid, p_org_name text, p_org_country text, p_declared_capacity text, p_role text, p_authority text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_declare_participation(p_participant_id uuid, p_org_name text, p_org_country text, p_declared_capacity text, p_role text, p_authority text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_declare_participation(p_participant_id uuid, p_org_name text, p_org_country text, p_declared_capacity text, p_role text, p_authority text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_declare_participation(p_participant_id uuid, p_org_name text, p_org_country text, p_declared_capacity text, p_role text, p_authority text) TO service_role;


--
-- Name: FUNCTION deal_room_display_label(p_profile_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_display_label(p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_display_label(p_profile_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_events_append_only(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_events_append_only() FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_events_append_only() TO service_role;


--
-- Name: FUNCTION deal_room_invite(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_invite(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_invite(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_invite(p_sub_room_id uuid, p_token_sha256 text, p_expires_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION deal_room_is_master_participant(p_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_is_master_participant(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_is_master_participant(p_room_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_is_master_participant(p_room_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_is_sub_room_participant(p_sub_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_is_sub_room_participant(p_sub_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_is_sub_room_participant(p_sub_room_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_is_sub_room_participant(p_sub_room_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_is_writable(p_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_is_writable(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_is_writable(p_room_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.deal_room_is_writable(p_room_id uuid) TO authenticated;


--
-- Name: FUNCTION deal_room_log_event(p_room_id uuid, p_sub_room_id uuid, p_event_type text, p_subject_type text, p_subject_id uuid, p_summary text, p_detail jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_log_event(p_room_id uuid, p_sub_room_id uuid, p_event_type text, p_subject_type text, p_subject_id uuid, p_summary text, p_detail jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_log_event(p_room_id uuid, p_sub_room_id uuid, p_event_type text, p_subject_type text, p_subject_id uuid, p_summary text, p_detail jsonb) TO service_role;


--
-- Name: FUNCTION deal_room_open_blocker(p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text, p_description text, p_category text, p_requirement text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_open_blocker(p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text, p_description text, p_category text, p_requirement text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_open_blocker(p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text, p_description text, p_category text, p_requirement text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_open_blocker(p_room_id uuid, p_sub_room_id uuid, p_step_key text, p_title text, p_description text, p_category text, p_requirement text) TO service_role;


--
-- Name: FUNCTION deal_room_propose(p_listing_id uuid, p_counterparty_profile uuid, p_counterparty_email text, p_counterparty_name text, p_counterparty_role text, p_objective text, p_interest_route text, p_operating_mode text, p_sub_room_purpose text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_propose(p_listing_id uuid, p_counterparty_profile uuid, p_counterparty_email text, p_counterparty_name text, p_counterparty_role text, p_objective text, p_interest_route text, p_operating_mode text, p_sub_room_purpose text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_propose(p_listing_id uuid, p_counterparty_profile uuid, p_counterparty_email text, p_counterparty_name text, p_counterparty_role text, p_objective text, p_interest_route text, p_operating_mode text, p_sub_room_purpose text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_propose(p_listing_id uuid, p_counterparty_profile uuid, p_counterparty_email text, p_counterparty_name text, p_counterparty_role text, p_objective text, p_interest_route text, p_operating_mode text, p_sub_room_purpose text) TO service_role;


--
-- Name: FUNCTION deal_room_propose_procedure(p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_propose_procedure(p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_propose_procedure(p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_propose_procedure(p_room_id uuid, p_sub_room_id uuid, p_summary text, p_completion text, p_steps jsonb) TO service_role;


--
-- Name: FUNCTION deal_room_request_clarification(p_evidence_id uuid, p_question text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_request_clarification(p_evidence_id uuid, p_question text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_request_clarification(p_evidence_id uuid, p_question text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_request_clarification(p_evidence_id uuid, p_question text) TO service_role;


--
-- Name: FUNCTION deal_room_resolve_blocker(p_blocker_id uuid, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_resolve_blocker(p_blocker_id uuid, p_note text) TO service_role;


--
-- Name: FUNCTION deal_room_set_read_only(p_room_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_set_read_only(p_room_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_set_read_only(p_room_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_set_read_only(p_room_id uuid) TO service_role;


--
-- Name: FUNCTION deal_room_submit_evidence(p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_submit_evidence(p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_submit_evidence(p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) TO authenticated;
GRANT ALL ON FUNCTION public.deal_room_submit_evidence(p_sub_room_id uuid, p_step_key text, p_title text, p_provenance text, p_visibility text, p_file_name text, p_mime text, p_size bigint, p_storage_path text, p_checksum text) TO service_role;


--
-- Name: FUNCTION deal_room_uuid_or_null(p_text text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.deal_room_uuid_or_null(p_text text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.deal_room_uuid_or_null(p_text text) TO service_role;
GRANT ALL ON FUNCTION public.deal_room_uuid_or_null(p_text text) TO authenticated;


--
-- Name: FUNCTION guard_profile_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_profile_role() TO anon;
GRANT ALL ON FUNCTION public.guard_profile_role() TO authenticated;
GRANT ALL ON FUNCTION public.guard_profile_role() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION hs_search(q text, lim integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.hs_search(q text, lim integer) TO anon;
GRANT ALL ON FUNCTION public.hs_search(q text, lim integer) TO authenticated;
GRANT ALL ON FUNCTION public.hs_search(q text, lim integer) TO service_role;


--
-- Name: FUNCTION increment_adamftd_usage(p_profile uuid, p_period text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_adamftd_usage(p_profile uuid, p_period text) TO anon;
GRANT ALL ON FUNCTION public.increment_adamftd_usage(p_profile uuid, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.increment_adamftd_usage(p_profile uuid, p_period text) TO service_role;


--
-- Name: FUNCTION increment_completed_deals(p_profile uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.increment_completed_deals(p_profile uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_completed_deals(p_profile uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_completed_deals(p_profile uuid) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_deal_participant(p_deal_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_deal_participant(p_deal_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_deal_participant(p_deal_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_deal_participant(p_deal_id uuid) TO service_role;


--
-- Name: FUNCTION match_hs_codes(query_embedding public.vector, schedule_filter text, match_threshold double precision, match_count integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.match_hs_codes(query_embedding public.vector, schedule_filter text, match_threshold double precision, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_hs_codes(query_embedding public.vector, schedule_filter text, match_threshold double precision, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_hs_codes(query_embedding public.vector, schedule_filter text, match_threshold double precision, match_count integer) TO service_role;


--
-- Name: FUNCTION sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.sanctions_match(p_name text, p_threshold real, p_limit integer, p_entity_type text, p_since timestamp with time zone) TO service_role;


--
-- Name: FUNCTION set_listing_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_listing_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_listing_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_listing_updated_at() TO service_role;


--
-- Name: FUNCTION spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text) TO anon;
GRANT ALL ON FUNCTION public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text) TO authenticated;
GRANT ALL ON FUNCTION public.spend_credits(p_user_id uuid, p_amount integer, p_reason text, p_ref text) TO service_role;


--
-- Name: FUNCTION sync_investigation_count(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_investigation_count() TO anon;
GRANT ALL ON FUNCTION public.sync_investigation_count() TO authenticated;
GRANT ALL ON FUNCTION public.sync_investigation_count() TO service_role;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;


--
-- Name: FUNCTION trust_score(p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trust_score(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.trust_score(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.trust_score(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE account_briefs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.account_briefs TO anon;
GRANT ALL ON TABLE public.account_briefs TO authenticated;
GRANT ALL ON TABLE public.account_briefs TO service_role;


--
-- Name: TABLE adamftd_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.adamftd_usage TO anon;
GRANT ALL ON TABLE public.adamftd_usage TO authenticated;
GRANT ALL ON TABLE public.adamftd_usage TO service_role;


--
-- Name: TABLE adamftd_verification_checks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.adamftd_verification_checks TO anon;
GRANT ALL ON TABLE public.adamftd_verification_checks TO authenticated;
GRANT ALL ON TABLE public.adamftd_verification_checks TO service_role;


--
-- Name: TABLE ai_calls; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_calls TO anon;
GRANT ALL ON TABLE public.ai_calls TO authenticated;
GRANT ALL ON TABLE public.ai_calls TO service_role;


--
-- Name: TABLE ai_usage; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ai_usage TO anon;
GRANT ALL ON TABLE public.ai_usage TO authenticated;
GRANT ALL ON TABLE public.ai_usage TO service_role;


--
-- Name: TABLE analytics_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;


--
-- Name: TABLE anonymous_drafts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.anonymous_drafts TO anon;
GRANT ALL ON TABLE public.anonymous_drafts TO authenticated;
GRANT ALL ON TABLE public.anonymous_drafts TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE blocked_entities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.blocked_entities TO anon;
GRANT ALL ON TABLE public.blocked_entities TO authenticated;
GRANT ALL ON TABLE public.blocked_entities TO service_role;


--
-- Name: TABLE bundle_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bundle_items TO anon;
GRANT ALL ON TABLE public.bundle_items TO authenticated;
GRANT ALL ON TABLE public.bundle_items TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE credit_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.credit_ledger TO anon;
GRANT ALL ON TABLE public.credit_ledger TO authenticated;
GRANT ALL ON TABLE public.credit_ledger TO service_role;


--
-- Name: TABLE credit_purchases; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.credit_purchases TO anon;
GRANT ALL ON TABLE public.credit_purchases TO authenticated;
GRANT ALL ON TABLE public.credit_purchases TO service_role;


--
-- Name: TABLE data_source_cache; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.data_source_cache TO anon;
GRANT ALL ON TABLE public.data_source_cache TO authenticated;
GRANT ALL ON TABLE public.data_source_cache TO service_role;


--
-- Name: TABLE data_sources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.data_sources TO anon;
GRANT ALL ON TABLE public.data_sources TO authenticated;
GRANT ALL ON TABLE public.data_sources TO service_role;


--
-- Name: TABLE deal_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_documents TO anon;
GRANT ALL ON TABLE public.deal_documents TO authenticated;
GRANT ALL ON TABLE public.deal_documents TO service_role;


--
-- Name: TABLE deal_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_events TO anon;
GRANT ALL ON TABLE public.deal_events TO authenticated;
GRANT ALL ON TABLE public.deal_events TO service_role;


--
-- Name: TABLE deal_room_activity_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_activity_events TO anon;
GRANT ALL ON TABLE public.deal_room_activity_events TO authenticated;
GRANT ALL ON TABLE public.deal_room_activity_events TO service_role;


--
-- Name: TABLE deal_room_agreement_acceptances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_agreement_acceptances TO anon;
GRANT ALL ON TABLE public.deal_room_agreement_acceptances TO authenticated;
GRANT ALL ON TABLE public.deal_room_agreement_acceptances TO service_role;


--
-- Name: TABLE deal_room_agreement_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_agreement_documents TO service_role;


--
-- Name: TABLE deal_room_blockers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_blockers TO anon;
GRANT ALL ON TABLE public.deal_room_blockers TO authenticated;
GRANT ALL ON TABLE public.deal_room_blockers TO service_role;


--
-- Name: TABLE deal_room_clarifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_clarifications TO anon;
GRANT ALL ON TABLE public.deal_room_clarifications TO authenticated;
GRANT ALL ON TABLE public.deal_room_clarifications TO service_role;


--
-- Name: TABLE deal_room_entitlements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_entitlements TO anon;
GRANT ALL ON TABLE public.deal_room_entitlements TO authenticated;
GRANT ALL ON TABLE public.deal_room_entitlements TO service_role;


--
-- Name: TABLE deal_room_evidence; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_evidence TO anon;
GRANT ALL ON TABLE public.deal_room_evidence TO authenticated;
GRANT ALL ON TABLE public.deal_room_evidence TO service_role;


--
-- Name: TABLE deal_room_evidence_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_evidence_versions TO anon;
GRANT ALL ON TABLE public.deal_room_evidence_versions TO authenticated;
GRANT ALL ON TABLE public.deal_room_evidence_versions TO service_role;


--
-- Name: TABLE deal_room_invitations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_invitations TO anon;
GRANT ALL ON TABLE public.deal_room_invitations TO authenticated;
GRANT ALL ON TABLE public.deal_room_invitations TO service_role;


--
-- Name: TABLE deal_room_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_participants TO anon;
GRANT ALL ON TABLE public.deal_room_participants TO authenticated;
GRANT ALL ON TABLE public.deal_room_participants TO service_role;


--
-- Name: TABLE deal_room_procedure_approvals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_procedure_approvals TO anon;
GRANT ALL ON TABLE public.deal_room_procedure_approvals TO authenticated;
GRANT ALL ON TABLE public.deal_room_procedure_approvals TO service_role;


--
-- Name: TABLE deal_room_procedure_steps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_procedure_steps TO anon;
GRANT ALL ON TABLE public.deal_room_procedure_steps TO authenticated;
GRANT ALL ON TABLE public.deal_room_procedure_steps TO service_role;


--
-- Name: TABLE deal_room_procedures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_procedures TO anon;
GRANT ALL ON TABLE public.deal_room_procedures TO authenticated;
GRANT ALL ON TABLE public.deal_room_procedures TO service_role;


--
-- Name: TABLE deal_room_sub_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_room_sub_rooms TO anon;
GRANT ALL ON TABLE public.deal_room_sub_rooms TO authenticated;
GRANT ALL ON TABLE public.deal_room_sub_rooms TO service_role;


--
-- Name: TABLE deal_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_rooms TO anon;
GRANT ALL ON TABLE public.deal_rooms TO authenticated;
GRANT ALL ON TABLE public.deal_rooms TO service_role;


--
-- Name: TABLE deal_status_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deal_status_history TO anon;
GRANT ALL ON TABLE public.deal_status_history TO authenticated;
GRANT ALL ON TABLE public.deal_status_history TO service_role;


--
-- Name: TABLE deals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deals TO anon;
GRANT ALL ON TABLE public.deals TO authenticated;
GRANT ALL ON TABLE public.deals TO service_role;


--
-- Name: TABLE desk_radar; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.desk_radar TO anon;
GRANT ALL ON TABLE public.desk_radar TO authenticated;
GRANT ALL ON TABLE public.desk_radar TO service_role;


--
-- Name: TABLE fraud_flags; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fraud_flags TO anon;
GRANT ALL ON TABLE public.fraud_flags TO authenticated;
GRANT ALL ON TABLE public.fraud_flags TO service_role;


--
-- Name: TABLE hs_codes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hs_codes TO anon;
GRANT ALL ON TABLE public.hs_codes TO authenticated;
GRANT ALL ON TABLE public.hs_codes TO service_role;


--
-- Name: TABLE listing_connections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listing_connections TO anon;
GRANT ALL ON TABLE public.listing_connections TO authenticated;
GRANT ALL ON TABLE public.listing_connections TO service_role;


--
-- Name: TABLE listing_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listing_documents TO anon;
GRANT ALL ON TABLE public.listing_documents TO authenticated;
GRANT ALL ON TABLE public.listing_documents TO service_role;


--
-- Name: TABLE listing_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listing_events TO anon;
GRANT ALL ON TABLE public.listing_events TO authenticated;
GRANT ALL ON TABLE public.listing_events TO service_role;


--
-- Name: TABLE listing_media; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listing_media TO anon;
GRANT ALL ON TABLE public.listing_media TO authenticated;
GRANT ALL ON TABLE public.listing_media TO service_role;


--
-- Name: SEQUENCE listing_ref_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.listing_ref_seq TO anon;
GRANT ALL ON SEQUENCE public.listing_ref_seq TO authenticated;
GRANT ALL ON SEQUENCE public.listing_ref_seq TO service_role;


--
-- Name: TABLE listing_translations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listing_translations TO anon;
GRANT ALL ON TABLE public.listing_translations TO authenticated;
GRANT ALL ON TABLE public.listing_translations TO service_role;


--
-- Name: TABLE listings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listings TO anon;
GRANT ALL ON TABLE public.listings TO authenticated;
GRANT ALL ON TABLE public.listings TO service_role;


--
-- Name: TABLE listings_legacy_20260720; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.listings_legacy_20260720 TO anon;
GRANT ALL ON TABLE public.listings_legacy_20260720 TO authenticated;
GRANT ALL ON TABLE public.listings_legacy_20260720 TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE newsletter_subscribers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.newsletter_subscribers TO anon;
GRANT ALL ON TABLE public.newsletter_subscribers TO authenticated;
GRANT ALL ON TABLE public.newsletter_subscribers TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;


--
-- Name: TABLE order_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.order_notes TO anon;
GRANT ALL ON TABLE public.order_notes TO authenticated;
GRANT ALL ON TABLE public.order_notes TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.organizations TO anon;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE sanctions_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sanctions_entries TO anon;
GRANT ALL ON TABLE public.sanctions_entries TO authenticated;
GRANT ALL ON TABLE public.sanctions_entries TO service_role;


--
-- Name: TABLE sanctions_refresh_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sanctions_refresh_log TO anon;
GRANT ALL ON TABLE public.sanctions_refresh_log TO authenticated;
GRANT ALL ON TABLE public.sanctions_refresh_log TO service_role;


--
-- Name: TABLE saved_searches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.saved_searches TO anon;
GRANT ALL ON TABLE public.saved_searches TO authenticated;
GRANT ALL ON TABLE public.saved_searches TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.schema_migrations TO service_role;


--
-- Name: TABLE settlement_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.settlement_events TO anon;
GRANT ALL ON TABLE public.settlement_events TO authenticated;
GRANT ALL ON TABLE public.settlement_events TO service_role;


--
-- Name: TABLE settlement_milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.settlement_milestones TO anon;
GRANT ALL ON TABLE public.settlement_milestones TO authenticated;
GRANT ALL ON TABLE public.settlement_milestones TO service_role;


--
-- Name: TABLE settlements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.settlements TO anon;
GRANT ALL ON TABLE public.settlements TO authenticated;
GRANT ALL ON TABLE public.settlements TO service_role;


--
-- Name: TABLE signal_investigations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.signal_investigations TO anon;
GRANT ALL ON TABLE public.signal_investigations TO authenticated;
GRANT ALL ON TABLE public.signal_investigations TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE tombstones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tombstones TO anon;
GRANT ALL ON TABLE public.tombstones TO authenticated;
GRANT ALL ON TABLE public.tombstones TO service_role;


--
-- Name: TABLE trust_score_components; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trust_score_components TO anon;
GRANT ALL ON TABLE public.trust_score_components TO authenticated;
GRANT ALL ON TABLE public.trust_score_components TO service_role;


--
-- Name: TABLE trust_score_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trust_score_events TO anon;
GRANT ALL ON TABLE public.trust_score_events TO authenticated;
GRANT ALL ON TABLE public.trust_score_events TO service_role;


--
-- Name: TABLE user_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_reports TO anon;
GRANT ALL ON TABLE public.user_reports TO authenticated;
GRANT ALL ON TABLE public.user_reports TO service_role;


--
-- Name: TABLE verification_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.verification_documents TO anon;
GRANT ALL ON TABLE public.verification_documents TO authenticated;
GRANT ALL ON TABLE public.verification_documents TO service_role;


--
-- Name: TABLE verifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.verifications TO anon;
GRANT ALL ON TABLE public.verifications TO authenticated;
GRANT ALL ON TABLE public.verifications TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict xYS8NVAHGZx5U1PXdtBteFCczHvH4uhvm54mBLEIfqEuO7uaZhcjun3tG4kSC4S

