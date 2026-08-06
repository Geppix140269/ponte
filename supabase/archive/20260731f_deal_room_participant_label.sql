-- A participant can be named to the people they are dealing with.
--
-- ## What rendering the surfaces found, 31 July 2026
--
-- With `listParticipants()` repaired, the counterparty's procedure page read:
--
--     A participant                              approved
--     Diego Alonso - Iberia Importaciones SL     approved
--
-- Their own name, and nobody else's. `profiles` carries exactly one SELECT
-- policy:
--
--     using ((id = auth.uid()) OR is_admin())
--
-- so a member can never read another member's `full_name`. Every counterparty is
-- "A participant" to everyone but themselves, on every surface. For a room whose
-- purpose is knowing who you are dealing with, that is not a cosmetic defect.
--
-- ## Owner decision of 31 July 2026: option 1 of two
--
-- **Denormalise the label onto the participant row**, rather than widening
-- `profiles`. The alternative - letting co-participants read each other's
-- profile - is smaller, but it moves a boundary that currently holds everywhere
-- in Ponte, and it would keep moving as new surfaces joined to `profiles`.
--
-- This is not a new pattern. `deal_room_activity_events` already carries
-- `actor_label` and `actor_org_label`, written by `deal_room_log_event()` from
-- inside a SECURITY DEFINER command, which is why the activity feed named people
-- correctly the whole time the participant list could not. The same reasoning
-- and the same derivation are used here.
--
-- ## What this file changes
--
-- 1. `deal_room_participants.display_label text` - nullable, because a row can
--    exist before there is anything to say.
--
-- 2. `deal_room_display_label(uuid)` - SECURITY DEFINER, reads `profiles`, and is
--    granted to NOBODY. It is called only from inside other SECURITY DEFINER
--    commands, so a member cannot use it to look up an arbitrary person's name.
--    That restriction is the whole point: the label is written where identity has
--    already been proved, and read from the row afterwards.
--
-- 3. Three commands, replaced on identical signatures, extracted verbatim and
--    patched to write it: `deal_room_propose` (both initiator rows),
--    `deal_room_accept_invitation` (the counterparty row), and
--    `deal_room_admit_participant`, which refreshes it so a name changed between
--    acceptance and admission is not stale.
--
--    `deal_room_propose` is taken from `20260731b` and `deal_room_admit_participant`
--    from `20260731c`, not from `20260729b`, so the initiator's `declared_capacity`
--    and the required-approver promotion are carried forward rather than reverted.
--
-- No policy, trigger, index or grant is altered, and **no existing row is
-- backfilled**: production holds no rooms.
--
-- Verification after applying:
--
--   npm run deal-room:acl-verify       -- ACL unchanged: anon 0, authenticated 21
--   npm run deal-room:negative-access  -- must stay at 109 passed, 0 failed
--   and the surface capture, where the counterparty must read the other party's name

begin;

alter table public.deal_room_participants
  add column if not exists display_label text;

comment on column public.deal_room_participants.display_label is
  'The participant name as shown to other participants. Written by the command that proved the identity, because profiles is readable only to its owner.';

/*
 * The label, derived exactly as `deal_room_log_event` derives `actor_label`.
 *
 * SECURITY DEFINER so it can read `profiles`, and granted to no application role
 * at all - `20260730b` and `20260730c` established that pattern for the Deal
 * Room's internal helpers, and `npm run deal-room:acl-verify` holds it. A member
 * who could call this directly could enumerate names.
 */
create or replace function public.deal_room_display_label(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(pr.full_name, 'A participant')
  from public.profiles pr
  where pr.id = p_profile_id;
$$;

-- Same form as 20260730b and 20260730c, which `function-acl.test.ts` reads and
-- `npm run deal-room:acl-verify` checks against production. `revoke all` would
-- do the same thing and be invisible to both.
revoke execute on function public.deal_room_display_label(uuid) from public;
revoke execute on function public.deal_room_display_label(uuid) from anon;
revoke execute on function public.deal_room_display_label(uuid) from authenticated;

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
$$;

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

commit;
