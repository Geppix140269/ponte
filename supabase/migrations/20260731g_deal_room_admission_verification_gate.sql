-- The Deal Room admission verification gate, in the database.
--
-- Authority: ADR-0021 ruling 2, accepted 31 July 2026. The threshold is
-- PT-PRODUCT-2026-07-27-01 section 6, "Deal Room-ready Business Passport", as
-- restated by the owner on 31 July 2026.
--
-- =======================================================================
-- WRITTEN AND NOT APPLIED. Applying this file is a separate owner approval
-- under AGENTS.md. It replaces two SECURITY DEFINER functions that are granted
-- to `authenticated` in three applied migrations, so it is a real event even
-- though it creates no table and alters no row. Nothing has been run against
-- production, staging or any other database.
-- =======================================================================
--
-- ## Why the application layer is not enough
--
-- `app/[locale]/deal-rooms/actions.ts` says it plainly: "There are no member
-- INSERT or UPDATE policies left on any Deal Room table. A direct write from
-- here would be refused, which is the point: the only way in is a command, and
-- a command cannot change state without recording it."
--
-- The corollary is the reason this file exists. `deal_room_propose` and
-- `deal_room_admit_participant` are both granted to `authenticated`, so any
-- member with a session can call either directly and never touch the server
-- action that holds the gate today. Until this is applied, the TypeScript
-- predicate in `lib/deal-room/admissibility.ts` is defence in depth over an
-- ungated command, not enforcement.
--
-- ## What it adds
--
-- 1. `deal_room_admission_minimum_missing(profile, participant, listing)` - one
--    read-only helper returning the NAMES of the section 6 criteria that are not
--    met, or an empty array. It is the SQL twin of `dealRoomAdmissibility()` and
--    is the only place either command asks the question.
-- 2. `deal_room_propose`, replaced with 20260731b's body verbatim plus a call to
--    that helper.
-- 3. `deal_room_admit_participant`, replaced with 20260731f's body verbatim plus
--    the same call.
--
-- Both are `create or replace` on their EXISTING signatures, so no overload is
-- created and no grant is invalidated. No table, constraint, policy, trigger,
-- index, grant or row is altered.
--
-- ## Four properties this mirrors from the application module
--
-- **Names, never numbers.** The helper returns `text[]` of criterion names. It
-- does not return a count, a score or a completeness value, and the exception
-- message lists what is missing rather than how much. Section 6: "The
-- user-facing model must remain evidence-specific rather than numerical."
--
-- **Fail closed.** Every criterion that cannot be evaluated - a missing profile
-- row, a null column, an unrecognised level - lands in the missing array. There
-- is no `coalesce(..., true)` anywhere in it. An unknown blocks.
--
-- **`identity_verified`, not `company_verified`.** The owner ruled that "a
-- complete Passport and a registry-checked business are not required merely to
-- enter". The level test is `in ('identity_verified','company_verified')`, which
-- is the publication floor's rung OR the one below it, deliberately not
-- `profiles_verification_level_check`'s top value alone. Six of the nine
-- criteria are satisfied by a member declaration, because section 6 asks for a
-- declaration and nothing more.
--
-- **One standard for both doors.** The initiator and the invitee call the same
-- helper. Branching model section 6: "Sponsored access removes payment friction.
-- It does not weaken admission, confidentiality or authority requirements."
--
-- ## The one criterion this cannot check, and what it does about it
--
-- Section 6 asks for "any room-specific prerequisite completed". There is no
-- prerequisites table and no prerequisite column anywhere in the Deal Room
-- schema; `prerequisites_pending` is a participant state with nothing behind it.
-- So no room can impose one, and the helper treats the outstanding set as empty
-- and says so in a comment at the point of the check rather than omitting the
-- criterion. When prerequisites are built, that comment is the seam.
--
-- "Relationship to the business" has no dedicated column either. On the propose
-- path it reads `listings.submitter_role`, which the publication gate already
-- requires. On the admission path nothing collects it, so it reads the declared
-- capacity and falls back to the declared authority - both the member's own
-- statement of the same thing. It is therefore not independent of two other
-- criteria on that path, and that is recorded here rather than hidden.
--
-- ## Verification after applying
--
--   npm run deal-room:acl-verify          -- ACL unchanged: anon 0, authenticated 21
--   npm run deal-room:negative-access     -- an unverified member must be refused
--
--   -- and the helper alone, without changing anything:
--   select public.deal_room_admission_minimum_missing(auth.uid(), null, '<listing>');
--
-- ## Reversal
--
-- Re-apply 20260731b and 20260731f in that order, then
-- `drop function if exists public.deal_room_admission_minimum_missing(uuid, uuid, uuid);`.
-- Nothing else is touched, so there is no data to migrate back.

begin;

-- ---------------------------------------------------------------------------
-- 1. The predicate
-- ---------------------------------------------------------------------------
--
-- Exactly one of `p_participant` and `p_listing` is expected. The participant
-- form is the admission door; the listing form is the propose door. Passing
-- neither is not an error, it simply means fewer facts are available, and fewer
-- facts means more criteria missing - which is the fail-closed direction.
--
-- `security definer` because it reads `auth.users.email_confirmed_at`, which no
-- member holds a policy on. It is `stable` and writes nothing.

create or replace function public.deal_room_admission_minimum_missing(
  p_profile     uuid,
  p_participant uuid,
  p_listing     uuid
) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_missing text[] := array[]::text[];
  v_level text;
  v_company text;
  v_country text;
  v_confirmed timestamptz;
  v_p public.deal_room_participants%rowtype;
  v_org_name text;
  v_org_country text;
  v_submitter_role text;
  v_owns_approved_deal boolean := false;
  -- The declared facts, resolved from whichever door was used.
  v_business text;
  v_name text;
  v_jurisdiction text;
  v_relationship text;
  v_role text;
  v_authority text;
begin
  if p_profile is null then
    -- No caller, no evidence. Every criterion is missing.
    return array[
      'identity confirmed', 'confirmed contact method', 'business or professional capacity',
      'legal or trading name', 'jurisdiction', 'relationship to the business',
      'transaction role', 'authority to participate', 'room prerequisites'
    ];
  end if;

  select p.verification_level, p.company, p.country
    into v_level, v_company, v_country
    from public.profiles p where p.id = p_profile;

  select u.email_confirmed_at into v_confirmed
    from auth.users u where u.id = p_profile;

  if p_participant is not null then
    select * into v_p from public.deal_room_participants where id = p_participant;
    -- Somebody else's admission is not this caller's to satisfy.
    if found and v_p.profile_id <> p_profile then
      v_p := null;
    end if;
    if v_p.org_id is not null then
      select o.name, o.country into v_org_name, v_org_country
        from public.organizations o where o.id = v_p.org_id;
    end if;
  end if;

  if p_listing is not null then
    select (l.user_id = p_profile and l.status = 'approved'), l.submitter_role
      into v_owns_approved_deal, v_submitter_role
      from public.listings l where l.id = p_listing;
    v_owns_approved_deal := coalesce(v_owns_approved_deal, false);
  end if;

  -- Resolve the declared facts. The participant's own declaration wins where it
  -- exists, because it is the statement made for THIS room.
  v_business := coalesce(nullif(btrim(coalesce(v_org_name, '')), ''),
                         nullif(btrim(coalesce(v_p.declared_capacity, '')), ''),
                         nullif(btrim(coalesce(v_company, '')), ''));
  v_name := v_business;
  v_jurisdiction := coalesce(nullif(btrim(coalesce(v_org_country, '')), ''),
                             nullif(btrim(coalesce(v_country, '')), ''));

  if p_participant is not null then
    -- No column records the relationship on this path. See the header.
    v_relationship := coalesce(nullif(btrim(coalesce(v_p.declared_capacity, '')), ''),
                               nullif(btrim(coalesce(v_p.participation_authority, '')), ''));
    v_role := nullif(btrim(coalesce(v_p.transaction_role, '')), '');
    v_authority := nullif(btrim(coalesce(v_p.participation_authority, '')), '');
  else
    -- The propose path. The role and the authority are the values this same
    -- transaction is about to write ('Deal owner', 'Owner of the published
    -- Deal'), and they count as established only once ownership of an approved
    -- Deal has been proved. Otherwise they are null and both criteria block.
    v_relationship := case when v_owns_approved_deal
                           then nullif(btrim(coalesce(v_submitter_role, '')), '') end;
    v_role := case when v_owns_approved_deal then 'Deal owner' end;
    v_authority := case when v_owns_approved_deal then 'Owner of the published Deal' end;
  end if;

  -- 1. Authenticated individual, with identity established. CONFIRMED evidence.
  --    `company_verified` passes because it is more than this asks for; it is
  --    not required, and requiring it would be the publication floor.
  if coalesce(v_level, '') not in ('identity_verified', 'company_verified') then
    v_missing := v_missing || 'identity confirmed';
  end if;

  -- 2. Confirmed contact method. CONFIRMED evidence.
  if v_confirmed is null then
    v_missing := v_missing || 'confirmed contact method';
  end if;

  -- 3. Identified business OR declared professional capacity. DECLARED.
  if v_business is null then
    v_missing := v_missing || 'business or professional capacity';
  end if;

  -- 4. Legal or trading name. DECLARED. For a member with no company this is
  --    the capacity they trade under; demanding a registered name here would
  --    readmit the full-Passport wall through the side door.
  if v_name is null then
    v_missing := v_missing || 'legal or trading name';
  end if;

  -- 5. Jurisdiction. DECLARED.
  if v_jurisdiction is null then
    v_missing := v_missing || 'jurisdiction';
  end if;

  -- 6. Relationship to the business. DECLARED.
  if v_relationship is null then
    v_missing := v_missing || 'relationship to the business';
  end if;

  -- 7. Transaction role declared. DECLARED.
  if v_role is null then
    v_missing := v_missing || 'transaction role';
  end if;

  -- 8. Authority to participate declared. DECLARED, and only ever declared.
  --    Section 6 keeps `authority declared` and `authority sighted` apart so
  --    that nothing can imply the stronger one. Nothing here sights anything.
  if v_authority is null then
    v_missing := v_missing || 'authority to participate';
  end if;

  -- 9. Any room-specific prerequisite completed.
  --    Nothing in this schema can record a prerequisite: there is no
  --    prerequisites table and no prerequisite column, and
  --    `prerequisites_pending` is a participant state with nothing behind it.
  --    So the outstanding set is empty and this criterion is satisfied. When a
  --    prerequisite mechanism is built, its check goes exactly here, and it must
  --    add to v_missing when it cannot read the answer rather than when it
  --    reads a negative one.

  return v_missing;
end;
$$;

comment on function public.deal_room_admission_minimum_missing(uuid, uuid, uuid) is
  'ADR-0021 ruling 2. Returns the NAMES of the PT-PRODUCT-2026-07-27-01 section 6 '
  'entry criteria this member does not meet, or an empty array. Never a count, a '
  'score or a completeness value. Fail-closed: anything unreadable is missing. '
  'identity_verified is the floor; a registry-checked business is not required. '
  'Mirrored by lib/deal-room/admissibility.ts.';

-- Internal. The commands call it; members do not, following the pattern
-- 20260730c established for Deal Room helpers.
revoke execute on function public.deal_room_admission_minimum_missing(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. deal_room_propose, with the gate
-- ---------------------------------------------------------------------------

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
  v_missing text[];
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

  /*
   * ADR-0021 ruling 2: the Deal Room-ready minimum, on the member OPENING the
   * room. Added by 20260731g. Everything else in this function is 20260731b's,
   * unchanged.
   *
   * It sits here, after the Deal has been resolved and proved approved and
   * owned by the caller, because the relationship-to-the-business criterion
   * reads `v_l.submitter_role` and the role and authority the inserts below
   * write are only established facts once that ownership has been proved.
   */
  v_missing := public.deal_room_admission_minimum_missing(auth.uid(), null, p_listing_id);
  if v_missing is not null and array_length(v_missing, 1) > 0 then
    raise exception 'A Deal Room needs this from every participant before entry, whoever opens it and whoever sponsors it: %. Supplying it is free, and a complete Business Passport is not required.',
      array_to_string(v_missing, ', ') using errcode = '23514';
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

-- ---------------------------------------------------------------------------
-- 3. deal_room_admit_participant, with the same gate
-- ---------------------------------------------------------------------------

create or replace function public.deal_room_admit_participant(p_participant_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_p public.deal_room_participants%rowtype;
  v_missing text[];
  v_minimum text[];
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
   * ADR-0021 ruling 2: the Deal Room-ready minimum, on the member being
   * ADMITTED. Added by 20260731g. Everything else in this function is
   * 20260731f's, unchanged.
   *
   * The same helper the propose path calls, so the invited counterparty and the
   * member who opened and paid for the room are held to one standard. Branching
   * model section 6: sponsored access "does not weaken admission,
   * confidentiality or authority requirements."
   *
   * The two checks above stay. They are narrower than this one and their
   * messages are more specific, so a member missing only an organisation still
   * reads the sentence about an organisation.
   */
  v_minimum := public.deal_room_admission_minimum_missing(auth.uid(), p_participant_id, null);
  if v_minimum is not null and array_length(v_minimum, 1) > 0 then
    raise exception 'A Deal Room needs this from every participant before entry, whoever opens it and whoever sponsors it: %. Supplying it is free, and a complete Business Passport is not required.',
      array_to_string(v_minimum, ', ') using errcode = '23514';
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
