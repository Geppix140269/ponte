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
-- 1. Two additive nullable columns on `deal_room_participants`:
--    `represented_legal_name` and `business_relationship`. They exist because
--    the controller ruled on 31 July 2026 that criteria 4 and 6 must be held
--    independently and may not be derived from the declared capacity or the
--    participation authority. Nullable, no default, no backfill: an existing row
--    is not invalidated, and an already-admitted participant is not re-gated.
-- 1b. `deal_room_opener_declarations`, a new table keyed to the member AND the
--    Deal, holding the three facts the member who opens a room states about
--    themselves: relationship to the represented business, transaction role and
--    authority to participate. Written only by
--    `deal_room_declare_opening_intent`, a new command granted to
--    `authenticated`. Before it, the propose path read the relationship from
--    `listings.submitter_role` and manufactured the other two as the literals
--    `'Deal owner'` and `'Owner of the published Deal'`; the controller ruled on
--    31 July 2026 that neither is the member's declaration.
-- 2. `deal_room_admission_minimum_missing(profile, participant, listing)` - one
--    read-only helper returning the NAMES of the section 6 criteria that are not
--    met, or an empty array. It is the SQL twin of `dealRoomAdmissibility()` and
--    is the only place either command asks the question.
-- 3. `deal_room_declare_participation`, DELIBERATELY re-signed from six
--    parameters to eight so the two new facts can be declared in the same
--    atomic act as the rest. The six-parameter form is dropped in the same
--    transaction, so no overload survives; see section 2 for why this is a drop
--    and not a `create or replace`, and what it costs.
-- 4. `deal_room_propose`, replaced with 20260731b's body verbatim plus a call to
--    the helper, plus the two new columns seeded on the initiator rows.
-- 5. `deal_room_admit_participant`, replaced with 20260731f's body verbatim plus
--    the same call.
--
-- `deal_room_propose` and `deal_room_admit_participant` are `create or replace`
-- on their EXISTING signatures, so no overload is created and no grant is
-- invalidated. No constraint, policy, trigger, index or row is altered.
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
-- **No verification level at all.** `profiles.verification_level` is not read by
-- this file. Not `company_verified`, which is the publication floor, and not
-- `identity_verified` either. An earlier draft required the latter and the
-- controller struck it on 31 July 2026: "`authenticated individual` is not
-- `identity_verified`... Requiring `profiles.verification_level >=
-- identity_verified` adds a stricter identity-verification wall that the owner
-- did not approve." Criterion 1 is a session user plus a `profiles` row to
-- attribute the act to; criterion 2 is the confirmed contact method, on its own.
-- Six of the nine are satisfied by a member declaration, because section 6 asks
-- for a declaration and nothing more.
--
-- **One standard for both doors.** The initiator and the invitee call the same
-- helper. Branching model section 6: "Sponsored access removes payment friction.
-- It does not weaken admission, confidentiality or authority requirements."
--
-- ## The one criterion nothing can evidence, and what it does about it
--
-- Section 6 asks for "any room-specific prerequisite completed, where
-- applicable". There is no prerequisites table and no prerequisite column
-- anywhere in the Deal Room schema; `prerequisites_pending` is a participant
-- state with nothing behind it. So no room can impose one.
--
-- The controller ruled that this may not therefore be skipped: "Room-specific
-- prerequisites cannot silently pass because the feature is unmodelled...
-- Represent the criterion explicitly as `not_applicable`, `pending` or
-- `completed`." The helper returns a second value saying which of those three
-- it found, this release returns `not_applicable` from one named branch, and a
-- test asserts the branch exists and is reached. When prerequisites are built,
-- that branch is the seam and its test is what fails first.
--
-- "Relationship to the business" and "legal or trading name" now each have their
-- own column, added in section 0. Neither is read from the declared capacity or
-- the participation authority any more; the controller struck both fallbacks by
-- name.
--
-- ## Ownership of a Deal is a precondition, never evidence
--
-- `deal_room_propose` still requires the caller to own an approved Deal, and
-- that requirement is untouched. What changed on 31 July 2026 is that owning it
-- no longer SATISFIES anything: the gate does not read `listings.user_id`,
-- `listings.status` or `listings.submitter_role` at all, and no criterion is
-- filled with a literal. The opener's relationship, role and authority come from
-- `deal_room_opener_declarations`, which they wrote, exactly as the invitee's
-- come from `deal_room_participants`, which they wrote. If the declaration is
-- absent, three criteria block and the opener is refused - as an invitee in the
-- same position would be.
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
-- Re-apply 20260731b and 20260731f in that order to restore `deal_room_propose`
-- and `deal_room_admit_participant`, then re-apply the
-- `deal_room_declare_participation` block of 20260729b to restore the
-- six-parameter form, then:
--
--   drop function if exists public.deal_room_admission_minimum_missing(uuid, uuid, uuid);
--   drop function if exists public.deal_room_room_prerequisite_state(uuid);
--   drop function if exists public.deal_room_declare_opening_intent(uuid, text, text, text);
--   drop function if exists public.deal_room_declare_participation(uuid, text, text, text, text, text, text, text);
--   -- and, if the reversal is permanent, the opener declarations. Dropping the
--   -- table DISCARDS what members stated about themselves:
--   -- drop table if exists public.deal_room_opener_declarations;
--   -- the columns may be left in place; they are nullable and nothing reads
--   -- them once the functions above are back. Drop them only if the reversal is
--   -- permanent, and note that dropping them DISCARDS member declarations:
--   -- alter table public.deal_room_participants
--   --   drop column if exists represented_legal_name,
--   --   drop column if exists business_relationship;
--
-- Everything is inside one transaction, so a failure part-way leaves the
-- database exactly as it was.

begin;

-- ---------------------------------------------------------------------------
-- 0. The two columns criteria 4 and 6 need to be independent
-- ---------------------------------------------------------------------------
--
-- Controller ruling, 31 July 2026: "A professional capacity cannot
-- simultaneously stand in for the legal/trading name, and capacity/authority
-- cannot stand in for relationship to the business. Add the minimum additive
-- storage and declaration path needed to hold the represented legal/trading
-- name and relationship independently."
--
-- Minimum means minimum: two nullable text columns, no default, no backfill, no
-- constraint, no index. Nothing existing changes meaning and no existing row
-- becomes invalid. An already-admitted participant keeps `state = 'admitted'`
-- and is never re-gated, so nobody is retroactively expelled from a room by
-- columns that did not exist when they entered.
--
-- They are NOT added to `deal_room_participants_identity_when_admitted`. That
-- constraint says an admitted participant is identifiable as an organisation or
-- a capacity, which remains true and is a different claim. Widening it would
-- invalidate existing admitted rows, which is precisely what additive means to
-- avoid; the gate below is where the new facts are required.

alter table public.deal_room_participants
  add column if not exists represented_legal_name text;

alter table public.deal_room_participants
  add column if not exists business_relationship text;

comment on column public.deal_room_participants.represented_legal_name is
  'PT-PRODUCT-2026-07-27-01 section 6 criterion 4, held independently. The legal '
  'or trading name the participant acts under. Never derived from '
  'declared_capacity: a capacity is what you do, a trading name is what you '
  'trade as. Declared by the member, checked against no registry.';

comment on column public.deal_room_participants.business_relationship is
  'PT-PRODUCT-2026-07-27-01 section 6 criterion 6, held independently. How the '
  'participant stands to that business: an office held, a mandate, an '
  'engagement. Never derived from declared_capacity or participation_authority. '
  'Seeded from listings.submitter_role for the member who opens the room.';

-- ---------------------------------------------------------------------------
-- 0b. The two columns the OPENER needs, so criterion 3's "or" is real for them
-- ---------------------------------------------------------------------------
--
-- Controller ruling, 31 July 2026: "The opener must genuinely have both routes
-- in criterion 3... an independent professional with no `profiles.company` value
-- can never use the accepted `identified business OR declared professional
-- capacity` route."
--
-- The invitee declares a capacity on their participant row, because a
-- participant row exists by the time they are asked. The opener is asked BEFORE
-- any room or participant row exists, so there is nowhere on a room to put it.
-- The minimum truthful place is therefore the member's own profile, where
-- `company` and `country` already live.
--
-- Two nullable columns, no default, no backfill, no constraint. They are the
-- member's own declaration about themselves, not about any one room, which is
-- what makes the profile the right home rather than an expedient one: an
-- independent broker is an independent broker in every room they enter.
--
-- Neither is derived from anything. `legal_or_trading_name` is NOT defaulted
-- from `company` at write time - the resolution below prefers it and falls back
-- to `company`, so a member who has a company keeps working unchanged and a
-- member who has only a capacity has somewhere to put the name they trade
-- under. `declared_capacity` is never taken from `submitter_role`, from the
-- relationship or from the authority, which the controller ruled out by name.

alter table public.profiles
  add column if not exists declared_capacity text;

alter table public.profiles
  add column if not exists legal_or_trading_name text;

comment on column public.profiles.declared_capacity is
  'PT-PRODUCT-2026-07-27-01 section 6 criterion 3, the "or declared professional '
  'capacity" route, for a member acting without a company - independent broker, '
  'freight forwarder, adviser. The member''s own declaration. Never derived from '
  'listings.submitter_role, from a relationship or from an authority.';

comment on column public.profiles.legal_or_trading_name is
  'PT-PRODUCT-2026-07-27-01 section 6 criterion 4, for a member with no company '
  'on file. The name they trade under, which is not the capacity they act in. '
  'Preferred over profiles.company where both exist; never written from it.';

-- ---------------------------------------------------------------------------
-- 0c. The opener's OWN declaration of relationship, role and authority
-- ---------------------------------------------------------------------------
--
-- Controller ruling, 31 July 2026: "Owning the Ponte listing is not the same
-- fact as declaring authority to participate for the represented business, and
-- a system-generated string is not the member's declaration."
--
-- Until now the propose path manufactured all three of criteria 6, 7 and 8 once
-- ownership of an approved Deal had been proved: the relationship was read from
-- `listings.submitter_role`, and the role and authority were the literals
-- `'Deal owner'` and `'Owner of the published Deal'`. An invitee types all three
-- and an opener typed none, while the gate claimed one standard at both doors.
-- That is the asymmetry this table removes.
--
-- ## Why a table and not more profile columns
--
-- The capacity and the trading name in section 0b are facts about the MEMBER:
-- an independent broker is an independent broker in every room. Relationship,
-- role and authority are facts about the member IN THIS DEAL - the same person
-- may be the seller's agent in one and a buyer in the next - so they are keyed
-- to the member and the Deal together, and the unique constraint says exactly
-- that. A profile column would have made a declaration about one transaction
-- silently stand for every other, which is a different way of manufacturing a
-- declaration the member did not make.
--
-- ## Why the three are `not null` here but nullable everywhere else
--
-- A row in this table IS the declaration. There is no such thing as a partial
-- one: a member who has stated a role and not an authority has not declared,
-- and the check constraints make a blank string as impossible as a null. The
-- absence of a row is how "not declared" is represented, and the gate reads
-- that absence as three pending criteria.

create table if not exists public.deal_room_opener_declarations (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references public.profiles(id) on delete cascade,
  listing_id              uuid not null references public.listings(id) on delete cascade,

  business_relationship   text not null,
  transaction_role        text not null,
  participation_authority text not null,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint deal_room_opener_declarations_one_per_deal unique (profile_id, listing_id),
  constraint deal_room_opener_declarations_relationship_stated
    check (length(btrim(business_relationship)) > 0),
  constraint deal_room_opener_declarations_role_stated
    check (length(btrim(transaction_role)) > 0),
  constraint deal_room_opener_declarations_authority_stated
    check (length(btrim(participation_authority)) > 0)
);

comment on table public.deal_room_opener_declarations is
  'What the member who OPENS a room declares about themselves in one specific '
  'Deal: PT-PRODUCT-2026-07-27-01 section 6 criteria 6, 7 and 8. Written only by '
  'deal_room_declare_opening_intent. Never inferred from listing ownership and '
  'never populated with a system-generated literal.';

alter table public.deal_room_opener_declarations enable row level security;

-- Read your own, and nothing else: the propose page shows the member what they
-- previously declared so the form is a correction rather than a blank slate.
-- There is deliberately no member INSERT or UPDATE policy, following the rule
-- the rest of this cluster follows - the only way in is a command, and a
-- command cannot change state without validating it.
drop policy if exists deal_room_opener_declarations_read_own on public.deal_room_opener_declarations;
create policy deal_room_opener_declarations_read_own
  on public.deal_room_opener_declarations for select
  using (profile_id = auth.uid());

create or replace function public.deal_room_declare_opening_intent(
  p_listing_id   uuid,
  p_relationship text,
  p_role         text,
  p_authority    text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_l public.listings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_l from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Deal not found' using errcode = '42501';
  end if;
  -- The same ownership rule `deal_room_propose` applies. A member does not
  -- declare a role in somebody else's Deal.
  if v_l.user_id <> auth.uid() then
    raise exception 'Only the owner of a Deal can declare how they act in it' using errcode = '42501';
  end if;

  /*
   * Three separate refusals, so a member who supplied two is told which one is
   * missing rather than being sent back to re-read the whole form. Each names
   * its own fact in its own words, because they are three different questions
   * and the point of this table is that they stopped being answered by one.
   */
  if coalesce(btrim(p_relationship), '') = '' then
    raise exception 'State how you stand to the business you represent: an office you hold, a mandate, or an engagement'
      using errcode = '23514';
  end if;
  if coalesce(btrim(p_role), '') = '' then
    raise exception 'State your role in this transaction' using errcode = '23514';
  end if;
  if coalesce(btrim(p_authority), '') = '' then
    raise exception 'State what authorises you to act in that role' using errcode = '23514';
  end if;

  insert into public.deal_room_opener_declarations
    (profile_id, listing_id, business_relationship, transaction_role, participation_authority)
  values
    (auth.uid(), p_listing_id, btrim(p_relationship), btrim(p_role), btrim(p_authority))
  on conflict (profile_id, listing_id) do update
    set business_relationship   = excluded.business_relationship,
        transaction_role        = excluded.transaction_role,
        participation_authority = excluded.participation_authority,
        updated_at              = now();
end;
$$;

comment on function public.deal_room_declare_opening_intent(uuid, text, text, text) is
  'The opener''s own declaration of relationship, transaction role and authority '
  'for one Deal. ADR-0021 ruling 2, controller correction of 31 July 2026: these '
  'three facts must be the member''s statement, not an inference from owning the '
  'listing and not a fixed literal.';

revoke execute on function public.deal_room_declare_opening_intent(uuid, text, text, text) from public, anon;
grant execute on function public.deal_room_declare_opening_intent(uuid, text, text, text) to authenticated;

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

/*
 * The ninth criterion, as an explicit named state. Controller ruling, 31 July
 * 2026.
 *
 * Returns exactly one of 'not_applicable', 'completed' or 'pending'. It is a
 * name, never a number, and there is no ordering between the three.
 *
 * This release has ONE branch, and it is a claim about the schema rather than a
 * shrug: there is no prerequisites table, no prerequisite column, and nothing
 * anywhere that can impose a room-specific prerequisite, so section 6's "where
 * applicable" does not apply and the honest answer is 'not_applicable'. It is
 * deliberately NOT 'completed' - a room that required nothing is not the same
 * fact as a room that required something and got it.
 *
 * When prerequisites are built, this function is the seam. Its replacement must
 * return 'pending' when it cannot read the answer, not when it reads a negative
 * one, or the fail-closed rule is lost at exactly the point it matters.
 */
create or replace function public.deal_room_room_prerequisite_state(p_room uuid)
returns text
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  -- p_room is accepted and deliberately unused: the signature is the seam, so
  -- the room-aware implementation does not have to change every caller.
  perform p_room;
  return 'not_applicable';
end;
$$;

comment on function public.deal_room_room_prerequisite_state(uuid) is
  'PT-PRODUCT-2026-07-27-01 section 6 criterion 9, as an explicit named state: '
  'not_applicable | completed | pending. Never a count or a score. This release '
  'returns not_applicable because no prerequisite mechanism exists in the schema. '
  'A future implementation must return pending when it cannot read the answer.';

revoke execute on function public.deal_room_room_prerequisite_state(uuid) from public, anon, authenticated;

create or replace function public.deal_room_admission_minimum_missing(
  p_profile     uuid,
  p_participant uuid,
  p_listing     uuid
) returns text[]
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_missing text[] := array[]::text[];
  v_profile_id uuid;
  v_company text;
  v_country text;
  v_profile_capacity text;
  v_profile_legal_name text;
  v_confirmed timestamptz;
  v_p public.deal_room_participants%rowtype;
  v_org_name text;
  v_org_country text;
  -- The opener's own declaration for this Deal. There is deliberately no
  -- `v_submitter_role` and no `v_owns_approved_deal` any more: the controller
  -- ruled on 31 July 2026 that owning the listing is not a declaration, so
  -- ownership no longer supplies evidence for any criterion.
  v_open_relationship text;
  v_open_role text;
  v_open_authority text;
  v_prerequisites text;
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
      'an authenticated member', 'confirmed contact method', 'business or professional capacity',
      'legal or trading name', 'jurisdiction', 'relationship to the business',
      'transaction role', 'authority to participate', 'room prerequisites'
    ];
  end if;

  /*
   * Criterion 1 reads the profile ROW, not a level on it.
   *
   * `verification_level` is not selected here, and must not be: the controller
   * struck the identity-verification wall on 31 July 2026. What is asked is
   * whether this act is attributable to a member, which a `profiles` row
   * answers. `v_profile_id` is null when there is no such row, and that blocks.
   */
  select p.id, p.company, p.country, p.declared_capacity, p.legal_or_trading_name
    into v_profile_id, v_company, v_country, v_profile_capacity, v_profile_legal_name
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

  /*
   * The opener's declaration for THIS Deal.
   *
   * Note what is not read: `listings.user_id`, `listings.status` and
   * `listings.submitter_role`. Ownership of an approved Deal is a precondition
   * `deal_room_propose` checks on its own account, and it is not evidence for
   * any of the nine - the controller struck that inference on 31 July 2026. If
   * no declaration row exists, all three of criteria 6, 7 and 8 stay null and
   * block, which is what "the opener has not declared" should look like.
   */
  if p_listing is not null then
    select d.business_relationship, d.transaction_role, d.participation_authority
      into v_open_relationship, v_open_role, v_open_authority
      from public.deal_room_opener_declarations d
     where d.profile_id = p_profile and d.listing_id = p_listing;
  end if;

  /*
   * Resolve the declared facts. The participant's own declaration wins where it
   * exists, because it is the statement made for THIS room.
   *
   * Note what `v_name` does NOT read: `v_p.declared_capacity`. Criterion 3 may
   * be satisfied by a capacity, and criterion 4 may not - that separation is
   * the controller's correction of 31 July 2026, and collapsing the two lines
   * back into `v_name := v_business` is the mutation the falsifiability test
   * exists to catch.
   */
  v_business := coalesce(nullif(btrim(coalesce(v_org_name, '')), ''),
                         nullif(btrim(coalesce(v_p.declared_capacity, '')), ''),
                         nullif(btrim(coalesce(v_company, '')), ''),
                         -- The opener's route into section 6's "or". Without
                         -- this, a member with no company on file could never
                         -- satisfy criterion 3 at the propose door, however
                         -- clearly they had stated the capacity they act in.
                         nullif(btrim(coalesce(v_profile_capacity, '')), ''));
  v_name := coalesce(nullif(btrim(coalesce(v_p.represented_legal_name, '')), ''),
                     nullif(btrim(coalesce(v_org_name, '')), ''),
                     nullif(btrim(coalesce(v_profile_legal_name, '')), ''),
                     nullif(btrim(coalesce(v_company, '')), ''));
  v_jurisdiction := coalesce(nullif(btrim(coalesce(v_org_country, '')), ''),
                             nullif(btrim(coalesce(v_country, '')), ''));

  if p_participant is not null then
    -- Its own column, and no fallback to capacity or authority.
    v_relationship := nullif(btrim(coalesce(v_p.business_relationship, '')), '');
    v_role := nullif(btrim(coalesce(v_p.transaction_role, '')), '');
    v_authority := nullif(btrim(coalesce(v_p.participation_authority, '')), '');
  else
    /*
     * The propose path, from the opener's OWN declaration and nothing else.
     *
     * No literal appears on either side of these three assignments, and no
     * branch consults ownership. That is the whole of the controller's
     * correction: the member who opens the room answers the same three
     * questions the member who is invited answers, in their own words, and the
     * gate reads the same kind of stored statement in both cases.
     */
    v_relationship := nullif(btrim(coalesce(v_open_relationship, '')), '');
    v_role := nullif(btrim(coalesce(v_open_role, '')), '');
    v_authority := nullif(btrim(coalesce(v_open_authority, '')), '');
  end if;

  -- 1. An authenticated, attributable member. No level, by controller ruling.
  if v_profile_id is null then
    v_missing := v_missing || 'an authenticated member';
  end if;

  -- 2. Confirmed contact method. CONFIRMED evidence.
  if v_confirmed is null then
    v_missing := v_missing || 'confirmed contact method';
  end if;

  -- 3. Identified business OR declared professional capacity. DECLARED.
  if v_business is null then
    v_missing := v_missing || 'business or professional capacity';
  end if;

  -- 4. Legal or trading name. DECLARED, and on its own facts. A member with no
  --    company states the name they trade under; no registry is consulted, so
  --    this is still not the full-Passport wall.
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

  /*
   * 9. Any room-specific prerequisite completed, WHERE APPLICABLE.
   *
   * Asked out loud rather than assumed. `deal_room_room_prerequisite_state`
   * returns one of three names; only two of them pass, and ANY other value -
   * including null, including a name added later without a decision being made
   * here - blocks. That `else` is the fail-closed rule for this criterion, and
   * it is why the answer cannot become 'satisfied' by the feature simply not
   * existing.
   */
  v_prerequisites := public.deal_room_room_prerequisite_state(v_p.room_id);
  if v_prerequisites is null or v_prerequisites not in ('not_applicable', 'completed') then
    v_missing := v_missing || 'room prerequisites';
  end if;

  return v_missing;
end;
$$;

comment on function public.deal_room_admission_minimum_missing(uuid, uuid, uuid) is
  'ADR-0021 ruling 2. Returns the NAMES of the PT-PRODUCT-2026-07-27-01 section 6 '
  'entry criteria this member does not meet, or an empty array. Never a count, a '
  'score or a completeness value. Fail-closed: anything unreadable is missing. '
  'Reads NO verification level: neither company_verified nor identity_verified is '
  'required, by controller ruling of 31 July 2026. All nine criteria are '
  'independent. Mirrored by lib/deal-room/admissibility.ts.';

-- Internal. The commands call it; members do not, following the pattern
-- 20260730c established for Deal Room helpers.
revoke execute on function public.deal_room_admission_minimum_missing(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. deal_room_declare_participation, re-signed to collect the two new facts
-- ---------------------------------------------------------------------------
--
-- ## Why this is a drop-and-create and not a `create or replace`
--
-- PostgreSQL identifies a function by name AND argument types. Adding two
-- parameters with `create or replace` does not replace anything: it creates a
-- SECOND function, and both remain callable. The six-parameter form would still
-- be granted to `authenticated` and would still write a participant row with no
-- legal name and no relationship - an ungated door left open beside the gated
-- one, which is exactly the overload the controller forbade.
--
-- So the old signature is dropped explicitly, in the same transaction, before
-- the new one is created. A test asserts that this file contains the drop, that
-- it names the exact six-parameter signature, and that no `create` for that
-- signature survives anywhere.
--
-- ## What it costs, stated rather than discovered
--
-- `drop function` discards the function's ACL with it, so the grant is
-- re-issued below. Between the drop and the create there is no
-- `deal_room_declare_participation` at all - inside one transaction, so no
-- session ever observes the gap, and a failure anywhere in this file rolls the
-- whole thing back to the six-parameter form.
--
-- ## Why one command and not two
--
-- The alternative the controller allowed was a second narrowly scoped command.
-- Rejected because admission is one act: two commands can half-succeed, leaving
-- a participant with a role and an authority but no relationship, in a state no
-- screen asked for and the gate then refuses without explaining why. One
-- statement writes all six declared facts or none of them.

drop function if exists public.deal_room_declare_participation(uuid, text, text, text, text, text);

create function public.deal_room_declare_participation(
  p_participant_id   uuid,
  p_org_name         text,
  p_org_country      text,
  p_declared_capacity text,
  p_role             text,
  p_authority        text,
  p_legal_name       text,
  p_relationship     text
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

  /*
   * The two facts this migration exists for, each refused on its own terms.
   *
   * Separate `if`s rather than one combined test, so a member who supplied one
   * is told about the other and not about both. The legal name is NOT defaulted
   * from `p_org_name` here: a member who names an organisation gets the name
   * from the organisation row at evaluation time, and a member who names only a
   * capacity must state the name they trade under.
   */
  if coalesce(btrim(p_org_name), '') = '' and coalesce(btrim(p_legal_name), '') = '' then
    raise exception 'Give the legal or trading name you act under. This is the name itself, not the capacity you act in'
      using errcode = '23514';
  end if;
  if coalesce(btrim(p_relationship), '') = '' then
    raise exception 'State how you stand to that business: an office you hold, a mandate, or an engagement'
      using errcode = '23514';
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
         represented_legal_name = nullif(btrim(p_legal_name), ''),
         business_relationship = nullif(btrim(p_relationship), ''),
         transaction_role = btrim(p_role),
         participation_authority = btrim(p_authority),
         state = 'terms_pending'
   where id = p_participant_id;
end;
$$;

comment on function public.deal_room_declare_participation(uuid, text, text, text, text, text, text, text) is
  'The admission declaration, in one atomic act. Re-signed from six parameters to '
  'eight by 20260731g so that the legal/trading name and the relationship to the '
  'business are declared independently of the capacity and the authority. The '
  'six-parameter form is dropped in the same transaction; no overload survives.';

-- The ACL the drop discarded, re-issued exactly as 20260730b and 20260730c had
-- it: revoked from public and anon, granted to authenticated, and nothing else.
revoke execute on function public.deal_room_declare_participation(uuid, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.deal_room_declare_participation(uuid, text, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. deal_room_propose, with the gate
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
  -- The initiator's own declarations, read once and written onto both of their
  -- participant rows, so the opener carries the same facts an invitee supplies.
  v_self_capacity text;
  v_self_name text;
  v_self_relationship text;
  v_self_role text;
  v_self_authority text;
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
  /*
   * The initiator's two participant rows, now carrying the same declared facts
   * an invitee must supply.
   *
   * Read once, from the member's own profile, and written onto both rows so the
   * opener's participation is described by the same columns the invitee's is.
   * The gate above already refused this call if any of them was missing, so
   * these are recorded rather than assumed.
   *
   * `declared_capacity` falls back to 'Deal owner' ONLY to keep
   * `deal_room_participants_identity_when_admitted` satisfied - that constraint
   * needs an org or a capacity on an admitted row, and 20260731b introduced this
   * literal to close LB-001. Where the member has actually declared a capacity,
   * their declaration is recorded instead of the placeholder. It is a constraint
   * filler, not evidence: criterion 3 is evaluated from the profile declaration
   * and the organisation name, never from this column on the opener's own row.
   *
   * The role, the authority and the relationship come from
   * `deal_room_opener_declarations` - the member's own words for this Deal - and
   * from nowhere else. No literal appears in these inserts for any of the three,
   * and `listings.submitter_role` is not read: the controller ruled on 31 July
   * 2026 that owning the listing is not a declaration.
   */
  select coalesce(nullif(btrim(coalesce(p.declared_capacity, '')), ''), 'Deal owner'),
         coalesce(nullif(btrim(coalesce(p.legal_or_trading_name, '')), ''),
                  nullif(btrim(coalesce(p.company, '')), ''))
    into v_self_capacity, v_self_name
    from public.profiles p where p.id = auth.uid();

  select d.business_relationship, d.transaction_role, d.participation_authority
    into v_self_relationship, v_self_role, v_self_authority
    from public.deal_room_opener_declarations d
   where d.profile_id = auth.uid() and d.listing_id = p_listing_id;

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, declared_capacity, represented_legal_name, business_relationship,
     is_required_approver, is_room_administrator, state, admitted_at)
  values
    (v_room, null, auth.uid(), v_org, 'principal', v_self_role,
     v_self_authority, v_self_capacity, v_self_name, v_self_relationship,
     true, true, 'admitted', now());

  insert into public.deal_room_participants
    (room_id, sub_room_id, profile_id, org_id, participant_class, transaction_role,
     participation_authority, declared_capacity, represented_legal_name, business_relationship,
     is_required_approver, is_room_administrator, state, admitted_at)
  values
    (v_room, v_sub, auth.uid(), v_org, 'principal', v_self_role,
     v_self_authority, v_self_capacity, v_self_name, v_self_relationship,
     true, true, 'admitted', now());

  perform public.deal_room_log_event(v_room, null, 'room_proposed', 'room', v_room,
    'Room proposed from a published Deal, with credible commercial interest recorded.',
    jsonb_build_object('interest_route', p_interest_route, 'objective', p_objective));
  perform public.deal_room_log_event(v_room, v_sub, 'sub_room_created', 'sub_room', v_sub,
    'The first private workspace was created for the intended counterparty.', null);

  return v_room;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. deal_room_admit_participant, with the same gate
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
