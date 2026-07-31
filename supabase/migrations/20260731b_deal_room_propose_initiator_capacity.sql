-- The room initiator must satisfy the identity constraint they are admitted under.
--
-- ## What Approval 3 found
--
-- `npm run deal-room:negative-access` stopped at the first positive-path step on
-- 31 July 2026: the Deal owner could not create a room at all.
--
--   new row for relation "deal_room_participants"
--   violates check constraint "deal_room_participants_identity_when_admitted"
--
-- `20260729a` requires that a participant in state `admitted` or `active` carry
-- either an `org_id` or a non-empty `declared_capacity`:
--
--   CHECK (state <> ALL (ARRAY['admitted','active'])
--          OR org_id IS NOT NULL
--          OR (declared_capacity IS NOT NULL AND length(btrim(declared_capacity)) > 0))
--
-- `deal_room_propose` admits the initiator immediately - two rows, master level and
-- first workspace - with `org_id = v_org` and **no `declared_capacity` at all**.
-- `v_org` is `profiles.organization_id`, and every production profile has none:
-- `organizations` holds zero rows. All three disjuncts are false, so no room could
-- be created by anybody.
--
-- ## Why the constraint is right and the command was wrong
--
-- The counterparty path already honours it. `deal_room_accept_invitation` inserts
-- at `prerequisites_pending`, outside the constraint; `deal_room_declare_participation`
-- sets `declared_capacity`; and `deal_room_admit_participant` refuses admission
-- while both `org_id` and `declared_capacity` are empty. The counterparty is *made*
-- to declare a capacity before admission.
--
-- The initiator was admitted with neither. The asymmetry was the defect, not the
-- constraint.
--
-- ## The correction, and what it does and does not assert
--
-- Owner decision of 31 July 2026, option 1 of three: seed the initiator's
-- `declared_capacity` inside `deal_room_propose`.
--
-- The value is `'Deal owner'`, matching the `transaction_role` the same insert
-- already sets, and consistent with the `participation_authority` of `'Owner of the
-- published Deal'` beside it. **It is a fact this function has just proved, not a
-- claim made on the member's behalf**: execution only reaches this point after
-- `v_l.user_id <> auth.uid()` has been checked and the Deal confirmed published.
-- That distinction matters - `declare_participation` exists so that a counterparty
-- states their own capacity, and nothing here weakens that.
--
-- Members who do have an organisation are unaffected in presentation: the reader
-- of a participant row uses `coalesce(o.name, v_p.declared_capacity, ...)`, so an
-- organisation name still wins.
--
-- ## What this file changes
--
-- `create or replace function` on the **same nine-argument signature**, so no
-- overload is created and no grant is invalidated. The body is `20260729b`'s,
-- extracted verbatim, with exactly three lines changed: `declared_capacity` added
-- to the shared column list and `'Deal owner'` added to each of the two value
-- lists. Nothing else in the function, and nothing outside it, is touched.
--
-- No table, constraint, policy, trigger, index, grant or row is altered.
--
-- Verification after applying:
--
--   npm run deal-room:acl-verify          -- ACL unchanged: anon 0, authenticated 21
--   npm run deal-room:negative-access     -- must now get past step one

begin;

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
     participation_authority, declared_capacity, is_required_approver, is_room_administrator,
     state, admitted_at)
  values
    (v_room, null, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', 'Deal owner', true, true, 'admitted', now());

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, declared_capacity, is_required_approver, is_room_administrator,
     state, admitted_at)
  values
    (v_room, v_sub, auth.uid(), v_org, 'principal', 'Deal owner',
     'Owner of the published Deal', 'Deal owner', true, true, 'admitted', now());

  perform public.deal_room_log_event(v_room, null, 'room_proposed', 'room', v_room,
    'Room proposed from a published Deal, with credible commercial interest recorded.',
    jsonb_build_object('interest_route', p_interest_route, 'objective', p_objective));
  perform public.deal_room_log_event(v_room, v_sub, 'sub_room_created', 'sub_room', v_sub,
    'The first private workspace was created for the intended counterparty.', null);

  return v_room;
end;
$$;

commit;
