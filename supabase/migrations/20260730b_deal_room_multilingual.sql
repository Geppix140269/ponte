-- 20260730b_deal_room_multilingual.sql
--
-- LB-009 multilingual Deal Room: participant language, immutable messages,
-- derived translations, interpretation proposals, canonical terms and the
-- confirm/reject decisions. Authority: ADR-0016;
-- docs/plans/active/multilingual-deal-room-launch.md;
-- docs/codex/audits/deal-room/MULTILINGUAL-PREFLIGHT-2026-07-30.md.
--
-- NOT APPLIED. This file is written for review only. A merge to main applies no
-- SQL in this repository (the automated chain aborts at its first file, there is
-- no non-production database, PL-002), so this is applied to production only by a
-- separate explicit owner decision after LB-008 is fixed. See DATABASE-STATE.md.
--
-- Additive throughout. It creates one column and six tables, enables RLS on
-- every new table, reuses the existing sub-room permission predicates, writes all
-- state through SECURITY DEFINER commands that enforce participant, admission,
-- room, sub-room, lifecycle and authority requirements internally, and grants
-- each function only to its intended role while explicitly revoking it from anon
-- and authenticated by name. That last point is deliberate: LB-008 exists because
-- `revoke ... from public` does not remove Supabase's default explicit grants to
-- anon and authenticated. Every function below is revoked from those roles by
-- name before it is granted to the one role that may call it.
--
-- Nothing existing is altered. No existing table, column, constraint, index,
-- policy, function or trigger is changed. The legacy Deal-era cluster is untouched.

begin;

-- ---------------------------------------------------------------------
-- 0. A generic append-only guard, so a message or a decision cannot be
--    rewritten. The existing deal_room_events_append_only() names its table in
--    the error; this one reports whichever table fired it.
-- ---------------------------------------------------------------------

create or replace function public.deal_room_row_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception '% is append-only: % is not permitted', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Participant preferred language (additive column)
--
-- Deal-Room-scoped by design: the preference belongs to a participant's
-- participation in one room, not to their global Ponte profile and not to the
-- English-only public interface locale. It never feeds i18n/routing.ts or the
-- site language switcher. Default en; unsupported values cannot be stored.
-- ---------------------------------------------------------------------

alter table public.deal_room_participants
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'deal_room_participants_preferred_language_supported'
  ) then
    alter table public.deal_room_participants
      add constraint deal_room_participants_preferred_language_supported
      check (preferred_language in ('en','es','ru','zh-CN','ar'));
  end if;
end;
$$;

comment on column public.deal_room_participants.preferred_language is
  'The participant''s preferred Deal Room language (en, es, ru, zh-CN, ar). Deal-Room-scoped, not a global profile-language and not the site interface locale. Default en; set only by the participant through deal_room_set_participant_language.';

-- ---------------------------------------------------------------------
-- 2. deal_room_messages - the immutable original participant statement
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_messages (
  id                        uuid primary key default gen_random_uuid(),
  room_id                   uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id               uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  author_participant_id     uuid not null references public.deal_room_participants(id) on delete restrict,
  author_profile_id         uuid not null references public.profiles(id) on delete restrict,

  source_language           text not null check (source_language in ('en','es','ru','zh-CN','ar')),
  source_language_confidence text not null default 'declared'
                              check (source_language_confidence in ('declared','detected','uncertain')),
  original_text             text not null check (length(btrim(original_text)) > 0),
  -- Provenance hash of the exact original text. The application computes it; the
  -- translation worker binds a translation to its own re-hash of the text it
  -- read, so a wrong value here cannot attach a translation to different content.
  content_sha256            text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),

  created_at                timestamptz not null default now()
);

comment on table public.deal_room_messages is
  'Immutable original participant messages. Append-only: no UPDATE or DELETE, and no member write policy. Corrections are separate follow-up rows. Content never lives in deal_room_activity_events.';

create index if not exists deal_room_messages_sub_idx on public.deal_room_messages (sub_room_id, created_at);
create index if not exists deal_room_messages_room_idx on public.deal_room_messages (room_id, created_at);
create index if not exists deal_room_messages_author_idx on public.deal_room_messages (author_participant_id);

drop trigger if exists deal_room_messages_append_only on public.deal_room_messages;
create trigger deal_room_messages_append_only
  before update or delete on public.deal_room_messages
  for each row execute function public.deal_room_row_append_only();

-- ---------------------------------------------------------------------
-- 3. deal_room_message_corrections - attributable follow-up, never an edit
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_message_corrections (
  id                        uuid primary key default gen_random_uuid(),
  message_id                uuid not null references public.deal_room_messages(id) on delete cascade,
  sub_room_id               uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  corrected_by_participant_id uuid not null references public.deal_room_participants(id) on delete restrict,
  corrected_by_profile_id   uuid not null references public.profiles(id) on delete restrict,
  corrected_text            text not null check (length(btrim(corrected_text)) > 0),
  created_at                timestamptz not null default now()
);

comment on table public.deal_room_message_corrections is
  'A correction to a message, recorded as a new attributable row. The original message is never mutated. Append-only.';

create index if not exists deal_room_message_corrections_message_idx on public.deal_room_message_corrections (message_id, created_at);
create index if not exists deal_room_message_corrections_sub_idx on public.deal_room_message_corrections (sub_room_id, created_at);

drop trigger if exists deal_room_message_corrections_append_only on public.deal_room_message_corrections;
create trigger deal_room_message_corrections_append_only
  before update or delete on public.deal_room_message_corrections
  for each row execute function public.deal_room_row_append_only();

-- ---------------------------------------------------------------------
-- 4. deal_room_message_translations - derived participant-specific view
--
-- One row per (message, target language): the current best translation, updated
-- in place on re-translation. Provenance records what produced it so a model or
-- glossary change is a visible invalidation. source_sha256 binds it to the exact
-- source text. status carries text if and only if it is a with-text status, so
-- an untranslated fallback can never be labelled a success.
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_message_translations (
  id                  uuid primary key default gen_random_uuid(),
  message_id          uuid not null references public.deal_room_messages(id) on delete cascade,
  sub_room_id         uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  target_language     text not null check (target_language in ('en','es','ru','zh-CN','ar')),
  status              text not null
                        check (status in ('pending','completed','failed','provider_unavailable',
                                          'source_uncertain','low_confidence','ambiguous')),
  translated_text     text,
  provider            text not null,
  model               text,
  model_version       text,
  glossary_version    text not null,
  source_sha256       text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  confidence          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- The honesty invariant: text is present exactly for the with-text statuses.
  constraint deal_room_translation_text_matches_status
    check ((status in ('completed','low_confidence','ambiguous')) = (translated_text is not null)),
  -- One current translation per message per target language.
  constraint deal_room_translation_identity unique (message_id, target_language)
);

comment on table public.deal_room_message_translations is
  'Derived, participant-specific translations of an immutable source message. Not a second message and not a commitment. Written only by the service-role worker; members hold no write policy. Read scope inherits the source sub-room.';

create index if not exists deal_room_translations_message_idx on public.deal_room_message_translations (message_id);
create index if not exists deal_room_translations_sub_idx on public.deal_room_message_translations (sub_room_id);

drop trigger if exists touch_deal_room_translations on public.deal_room_message_translations;
create trigger touch_deal_room_translations before update on public.deal_room_message_translations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. deal_room_interpretation_proposals - advisory structured facts
--
-- AI output. It cannot change canonical state. Every proposal must cite at least
-- one source message excerpt (enforced by the command and by the check below).
-- Read scope inherits the sub-room.
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_interpretation_proposals (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id         uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  field               text not null,
  proposed_value      jsonb not null,
  previous_value      jsonb,
  party_position      text not null,
  party_participant_id uuid references public.deal_room_participants(id) on delete set null,
  -- Non-empty array of {messageId, excerpt, sourceLanguage}: every proposed
  -- value must be attributable to a source message.
  source_message_refs jsonb not null
                        check (jsonb_typeof(source_message_refs) = 'array'
                               and jsonb_array_length(source_message_refs) >= 1),
  status              text not null default 'proposed'
                        check (status in ('proposed','confirmed','rejected','superseded','disputed')),
  confidence          text,
  ambiguity           text,
  provider            text,
  model               text,
  model_version       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.deal_room_interpretation_proposals is
  'Advisory structured commercial facts Ponte proposes from discussion. Cannot change canonical state. Written by the service-role worker; status advanced only by the confirm/reject commands. Conflicting positions are kept as separate rows and never merged.';

create index if not exists deal_room_proposals_sub_idx on public.deal_room_interpretation_proposals (sub_room_id, created_at);
create index if not exists deal_room_proposals_field_idx on public.deal_room_interpretation_proposals (room_id, field);

drop trigger if exists touch_deal_room_proposals on public.deal_room_interpretation_proposals;
create trigger touch_deal_room_proposals before update on public.deal_room_interpretation_proposals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 6. deal_room_terms - the canonical confirmed commercial facts
--
-- English-canonical, room-level (one deal state). current marks the value in
-- force; a new confirmation supersedes the prior current row and records the
-- value it replaced. AI never writes here: only the confirm command does.
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_terms (
  id                      uuid primary key default gen_random_uuid(),
  room_id                 uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id             uuid references public.deal_room_sub_rooms(id) on delete set null,
  field                   text not null,
  value                   jsonb not null,
  language                text not null default 'en' check (language = 'en'),
  current                 boolean not null default true,
  previous_value          jsonb,
  confirmed_by_participant_id uuid not null references public.deal_room_participants(id) on delete restrict,
  capacity_label          text not null,
  source_proposal_id      uuid not null references public.deal_room_interpretation_proposals(id) on delete restrict,
  created_at              timestamptz not null default now()
);

comment on table public.deal_room_terms is
  'Canonical confirmed commercial terms in English. current is the value in force. Written only by deal_room_confirm_interpretation. History is preserved: superseded rows keep current=false and the previous_value they replaced.';

create unique index if not exists deal_room_terms_current_field
  on public.deal_room_terms (room_id, field) where current;
create index if not exists deal_room_terms_room_idx on public.deal_room_terms (room_id, field, created_at);

-- ---------------------------------------------------------------------
-- 7. deal_room_term_decisions - the confirm/reject record (append-only)
-- ---------------------------------------------------------------------

create table if not exists public.deal_room_term_decisions (
  id                    uuid primary key default gen_random_uuid(),
  proposal_id           uuid not null references public.deal_room_interpretation_proposals(id) on delete restrict,
  room_id               uuid not null references public.deal_rooms(id) on delete cascade,
  sub_room_id           uuid not null references public.deal_room_sub_rooms(id) on delete cascade,
  decided_by_participant_id uuid not null references public.deal_room_participants(id) on delete restrict,
  decided_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  capacity_label        text not null,
  organisation_label    text,
  decision              text not null check (decision in ('confirm','reject')),
  previous_value        jsonb,
  decided_value         jsonb,
  reason                text,
  term_id               uuid references public.deal_room_terms(id) on delete set null,
  created_at            timestamptz not null default now(),

  -- A confirmation carries the value it confirmed and the resulting term; a
  -- rejection carries neither but preserves the proposal.
  constraint deal_room_term_decision_shape
    check (
      (decision = 'confirm' and decided_value is not null and term_id is not null)
      or (decision = 'reject' and decided_value is null and term_id is null)
    )
);

comment on table public.deal_room_term_decisions is
  'Append-only record of every confirmation and rejection: proposal, participant, capacity, organisation, previous and decided value, and the resulting canonical term. A rejection preserves the proposal and records why.';

create index if not exists deal_room_term_decisions_sub_idx on public.deal_room_term_decisions (sub_room_id, created_at);
create index if not exists deal_room_term_decisions_proposal_idx on public.deal_room_term_decisions (proposal_id);

drop trigger if exists deal_room_term_decisions_append_only on public.deal_room_term_decisions;
create trigger deal_room_term_decisions_append_only
  before update or delete on public.deal_room_term_decisions
  for each row execute function public.deal_room_row_append_only();

-- ---------------------------------------------------------------------
-- 8. Row Level Security: enable on every new table
-- ---------------------------------------------------------------------

alter table public.deal_room_messages enable row level security;
alter table public.deal_room_message_corrections enable row level security;
alter table public.deal_room_message_translations enable row level security;
alter table public.deal_room_interpretation_proposals enable row level security;
alter table public.deal_room_terms enable row level security;
alter table public.deal_room_term_decisions enable row level security;

-- ---------------------------------------------------------------------
-- 9. Read policies. Every one is SELECT-only and scoped to authenticated.
--    Message-derived tables inherit the source sub-room boundary through the
--    existing deal_room_is_sub_room_participant predicate, so a participant of
--    sub-room A can read nothing of sub-room B: no row, count, status or id.
--    There are no INSERT/UPDATE/DELETE policies for any role: writes are through
--    the commands only. No policy names anon.
-- ---------------------------------------------------------------------

create policy "message read" on public.deal_room_messages
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

create policy "message correction read" on public.deal_room_message_corrections
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

create policy "message translation read" on public.deal_room_message_translations
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

create policy "interpretation proposal read" on public.deal_room_interpretation_proposals
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

-- Canonical terms are room-level deal state, readable by an admitted participant
-- of the room or its administrators. For the launch loop (one counterparty
-- sub-room) this is the deal's terms; the multi-sub-room visibility of canonical
-- terms is recorded as an owner decision in the preflight.
create policy "term read" on public.deal_room_terms
  for select to authenticated
  using (
    public.deal_room_is_master_participant(room_id)
    or public.deal_room_can_administer(room_id)
    or public.is_admin()
  );

create policy "term decision read" on public.deal_room_term_decisions
  for select to authenticated
  using (public.deal_room_is_sub_room_participant(sub_room_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- 10. Commands. Member commands are granted to authenticated; worker commands to
--     service_role. Each enforces its own authority internally: being
--     authenticated is never sufficient.
-- ---------------------------------------------------------------------

-- 10a. Set the caller's own preferred Deal Room language.
create or replace function public.deal_room_set_participant_language(p_participant_id uuid, p_language text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_part public.deal_room_participants%rowtype;
begin
  if p_language not in ('en','es','ru','zh-CN','ar') then
    raise exception 'Unsupported Deal Room language' using errcode = '23514';
  end if;
  select * into v_part from public.deal_room_participants where id = p_participant_id;
  if not found or v_part.profile_id <> auth.uid() then
    raise exception 'You can set only your own Deal Room language' using errcode = '42501';
  end if;
  update public.deal_room_participants set preferred_language = p_language where id = p_participant_id;
end;
$$;

-- 10b. Post an original message into a sub-room the caller is admitted to.
create or replace function public.deal_room_post_message(
  p_sub_room_id uuid,
  p_source_language text,
  p_original_text text,
  p_content_sha256 text
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_part public.deal_room_participants%rowtype;
  v_id uuid;
begin
  if p_source_language not in ('en','es','ru','zh-CN','ar') then
    raise exception 'Unsupported source language' using errcode = '23514';
  end if;
  if coalesce(btrim(p_original_text), '') = '' then
    raise exception 'Write the message' using errcode = '23514';
  end if;
  if p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Malformed content hash' using errcode = '23514';
  end if;

  select * into v_part
  from public.deal_room_participants
  where sub_room_id = p_sub_room_id
    and profile_id = auth.uid()
    and state in ('admitted','active');
  if not found then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_part.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  insert into public.deal_room_messages
    (room_id, sub_room_id, author_participant_id, author_profile_id,
     source_language, original_text, content_sha256)
  values (v_part.room_id, p_sub_room_id, v_part.id, auth.uid(),
     p_source_language, btrim(p_original_text), p_content_sha256)
  returning id into v_id;

  perform public.deal_room_log_event(v_part.room_id, p_sub_room_id, 'message_posted',
    'message', v_id, 'A participant posted a message.', null);

  return v_id;
end;
$$;

-- 10c. Correct a message as an attributable follow-up. The original is untouched.
create or replace function public.deal_room_correct_message(p_message_id uuid, p_corrected_text text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_msg public.deal_room_messages%rowtype;
  v_part public.deal_room_participants%rowtype;
  v_id uuid;
begin
  if coalesce(btrim(p_corrected_text), '') = '' then
    raise exception 'Write the correction' using errcode = '23514';
  end if;
  select * into v_msg from public.deal_room_messages where id = p_message_id;
  if not found or not public.deal_room_is_sub_room_participant(v_msg.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  -- Only the original author may correct their own message.
  select * into v_part
  from public.deal_room_participants
  where sub_room_id = v_msg.sub_room_id
    and profile_id = auth.uid()
    and state in ('admitted','active');
  if not found or v_msg.author_profile_id <> auth.uid() then
    raise exception 'Only the author may correct their message' using errcode = '42501';
  end if;

  insert into public.deal_room_message_corrections
    (message_id, sub_room_id, corrected_by_participant_id, corrected_by_profile_id, corrected_text)
  values (p_message_id, v_msg.sub_room_id, v_part.id, auth.uid(), btrim(p_corrected_text))
  returning id into v_id;

  perform public.deal_room_log_event(v_msg.room_id, v_msg.sub_room_id, 'message_corrected',
    'message', p_message_id, 'A participant corrected a message.', null);

  return v_id;
end;
$$;

-- 10d. Worker: record or update a translation of a message. service_role only.
create or replace function public.deal_room_record_translation(
  p_message_id uuid,
  p_target_language text,
  p_status text,
  p_translated_text text,
  p_provider text,
  p_model text,
  p_model_version text,
  p_glossary_version text,
  p_source_sha256 text,
  p_confidence text
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_msg public.deal_room_messages%rowtype;
  v_id uuid;
begin
  select * into v_msg from public.deal_room_messages where id = p_message_id;
  if not found then
    raise exception 'No such message' using errcode = '42501';
  end if;

  insert into public.deal_room_message_translations
    (message_id, sub_room_id, target_language, status, translated_text,
     provider, model, model_version, glossary_version, source_sha256, confidence)
  values (p_message_id, v_msg.sub_room_id, p_target_language, p_status, p_translated_text,
     p_provider, p_model, p_model_version, p_glossary_version, p_source_sha256, p_confidence)
  on conflict (message_id, target_language) do update set
     status = excluded.status,
     translated_text = excluded.translated_text,
     provider = excluded.provider,
     model = excluded.model,
     model_version = excluded.model_version,
     glossary_version = excluded.glossary_version,
     source_sha256 = excluded.source_sha256,
     confidence = excluded.confidence,
     updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- 10e. Worker: record an interpretation proposal. service_role only. Cannot
--      change canonical state; must carry at least one source reference.
create or replace function public.deal_room_record_interpretation(
  p_room_id uuid,
  p_sub_room_id uuid,
  p_field text,
  p_proposed_value jsonb,
  p_previous_value jsonb,
  p_party_position text,
  p_party_participant_id uuid,
  p_source_message_refs jsonb,
  p_status text,
  p_confidence text,
  p_ambiguity text,
  p_provider text,
  p_model text,
  p_model_version text
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_source_message_refs) is distinct from 'array'
     or jsonb_array_length(p_source_message_refs) < 1 then
    raise exception 'A proposal must cite at least one source message' using errcode = '23514';
  end if;
  if coalesce(p_status, 'proposed') not in ('proposed','disputed') then
    raise exception 'A recorded proposal is proposed or disputed' using errcode = '23514';
  end if;
  if not exists (select 1 from public.deal_room_sub_rooms s where s.id = p_sub_room_id and s.room_id = p_room_id) then
    raise exception 'Sub-room does not belong to that room' using errcode = '42501';
  end if;

  insert into public.deal_room_interpretation_proposals
    (room_id, sub_room_id, field, proposed_value, previous_value, party_position,
     party_participant_id, source_message_refs, status, confidence, ambiguity,
     provider, model, model_version)
  values (p_room_id, p_sub_room_id, p_field, p_proposed_value, p_previous_value, p_party_position,
     p_party_participant_id, p_source_message_refs, coalesce(p_status,'proposed'), p_confidence, p_ambiguity,
     p_provider, p_model, p_model_version)
  returning id into v_id;

  return v_id;
end;
$$;

-- 10f. Confirm an interpretation. Only a principal party of the sub-room may.
--      Writes/supersedes the canonical term and records the decision.
create or replace function public.deal_room_confirm_interpretation(p_proposal_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_prop public.deal_room_interpretation_proposals%rowtype;
  v_part public.deal_room_participants%rowtype;
  v_prev jsonb;
  v_term_id uuid;
  v_capacity text;
  v_org text;
begin
  select * into v_prop from public.deal_room_interpretation_proposals where id = p_proposal_id;
  if not found or not public.deal_room_is_sub_room_participant(v_prop.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if v_prop.status <> 'proposed' then
    raise exception 'Only a proposed interpretation can be confirmed' using errcode = '42501';
  end if;

  select * into v_part
  from public.deal_room_participants
  where sub_room_id = v_prop.sub_room_id
    and profile_id = auth.uid()
    and state in ('admitted','active')
    and participant_class = 'principal';
  if not found then
    raise exception 'Only a principal party may confirm an interpretation' using errcode = '42501';
  end if;
  if not public.deal_room_is_writable(v_prop.room_id) then
    raise exception 'This room cannot be changed in its current state' using errcode = '42501';
  end if;

  v_capacity := coalesce(nullif(btrim(coalesce(v_part.declared_capacity, '')), ''), v_part.transaction_role);
  select name into v_org from public.organizations where id = v_part.org_id;

  select value into v_prev from public.deal_room_terms
    where room_id = v_prop.room_id and field = v_prop.field and current;

  update public.deal_room_terms set current = false
    where room_id = v_prop.room_id and field = v_prop.field and current;

  insert into public.deal_room_terms
    (room_id, sub_room_id, field, value, language, current, previous_value,
     confirmed_by_participant_id, capacity_label, source_proposal_id)
  values (v_prop.room_id, v_prop.sub_room_id, v_prop.field, v_prop.proposed_value, 'en', true, v_prev,
     v_part.id, v_capacity, v_prop.id)
  returning id into v_term_id;

  insert into public.deal_room_term_decisions
    (proposal_id, room_id, sub_room_id, decided_by_participant_id, decided_by_profile_id,
     capacity_label, organisation_label, decision, previous_value, decided_value, reason, term_id)
  values (v_prop.id, v_prop.room_id, v_prop.sub_room_id, v_part.id, auth.uid(),
     v_capacity, v_org, 'confirm', v_prev, v_prop.proposed_value, null, v_term_id);

  update public.deal_room_interpretation_proposals set status = 'confirmed' where id = v_prop.id;

  perform public.deal_room_log_event(v_prop.room_id, v_prop.sub_room_id, 'interpretation_confirmed',
    'interpretation', v_prop.id, 'A principal confirmed a proposed term.', jsonb_build_object('field', v_prop.field));
end;
$$;

-- 10g. Reject an interpretation. Preserves the proposal and records the reason.
create or replace function public.deal_room_reject_interpretation(p_proposal_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_prop public.deal_room_interpretation_proposals%rowtype;
  v_part public.deal_room_participants%rowtype;
  v_capacity text;
  v_org text;
begin
  select * into v_prop from public.deal_room_interpretation_proposals where id = p_proposal_id;
  if not found or not public.deal_room_is_sub_room_participant(v_prop.sub_room_id) then
    raise exception 'You do not have access to this workspace' using errcode = '42501';
  end if;
  if v_prop.status <> 'proposed' then
    raise exception 'Only a proposed interpretation can be rejected' using errcode = '42501';
  end if;

  select * into v_part
  from public.deal_room_participants
  where sub_room_id = v_prop.sub_room_id
    and profile_id = auth.uid()
    and state in ('admitted','active')
    and participant_class = 'principal';
  if not found then
    raise exception 'Only a principal party may reject an interpretation' using errcode = '42501';
  end if;

  v_capacity := coalesce(nullif(btrim(coalesce(v_part.declared_capacity, '')), ''), v_part.transaction_role);
  select name into v_org from public.organizations where id = v_part.org_id;

  insert into public.deal_room_term_decisions
    (proposal_id, room_id, sub_room_id, decided_by_participant_id, decided_by_profile_id,
     capacity_label, organisation_label, decision, previous_value, decided_value, reason, term_id)
  values (v_prop.id, v_prop.room_id, v_prop.sub_room_id, v_part.id, auth.uid(),
     v_capacity, v_org, 'reject', null, null, nullif(btrim(coalesce(p_reason, '')), ''), null);

  update public.deal_room_interpretation_proposals set status = 'rejected' where id = v_prop.id;

  perform public.deal_room_log_event(v_prop.room_id, v_prop.sub_room_id, 'interpretation_rejected',
    'interpretation', v_prop.id, 'A principal rejected a proposed term.', jsonb_build_object('field', v_prop.field));
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Grants and revokes.
--
-- LB-008-safe: every function is revoked from public AND from anon AND from
-- authenticated by name, then granted only to the one role that may call it.
-- A revoke from public alone would leave Supabase's default explicit anon and
-- authenticated grants in place, which is exactly the LB-008 defect.
-- ---------------------------------------------------------------------

revoke all on function public.deal_room_set_participant_language(uuid, text) from public, anon, authenticated;
grant execute on function public.deal_room_set_participant_language(uuid, text) to authenticated;

revoke all on function public.deal_room_post_message(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.deal_room_post_message(uuid, text, text, text) to authenticated;

revoke all on function public.deal_room_correct_message(uuid, text) from public, anon, authenticated;
grant execute on function public.deal_room_correct_message(uuid, text) to authenticated;

revoke all on function public.deal_room_confirm_interpretation(uuid) from public, anon, authenticated;
grant execute on function public.deal_room_confirm_interpretation(uuid) to authenticated;

revoke all on function public.deal_room_reject_interpretation(uuid, text) from public, anon, authenticated;
grant execute on function public.deal_room_reject_interpretation(uuid, text) to authenticated;

-- Worker commands: service_role only. anon and authenticated cannot call them,
-- so a member can never forge a translation or an interpretation proposal.
revoke all on function public.deal_room_record_translation(uuid, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.deal_room_record_translation(uuid, text, text, text, text, text, text, text, text, text) to service_role;

revoke all on function public.deal_room_record_interpretation(uuid, uuid, text, jsonb, jsonb, text, uuid, jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.deal_room_record_interpretation(uuid, uuid, text, jsonb, jsonb, text, uuid, jsonb, text, text, text, text, text, text) to service_role;

-- The generic append-only trigger function is internal; revoke it from members.
revoke all on function public.deal_room_row_append_only() from public, anon, authenticated;

commit;

-- ---------------------------------------------------------------------
-- Rollback and safe-disable
--
-- Primary safe-disable is the multilingual capability flag
-- (NEXT_PUBLIC_DEAL_ROOM_MULTILINGUAL): with it off, no translation or
-- interpretation is produced and the derived surfaces are hidden, while original
-- messages and confirmed terms remain readable and the loop can be re-enabled.
--
-- Schema withdrawal, clean only while the new tables are empty:
--
--   begin;
--   drop function if exists public.deal_room_record_interpretation(uuid, uuid, text, jsonb, jsonb, text, uuid, jsonb, text, text, text, text, text, text);
--   drop function if exists public.deal_room_record_translation(uuid, text, text, text, text, text, text, text, text, text);
--   drop function if exists public.deal_room_reject_interpretation(uuid, text);
--   drop function if exists public.deal_room_confirm_interpretation(uuid);
--   drop function if exists public.deal_room_correct_message(uuid, text);
--   drop function if exists public.deal_room_post_message(uuid, text, text, text);
--   drop function if exists public.deal_room_set_participant_language(uuid, text);
--   drop table if exists public.deal_room_term_decisions;
--   drop table if exists public.deal_room_terms;
--   drop table if exists public.deal_room_interpretation_proposals;
--   drop table if exists public.deal_room_message_translations;
--   drop table if exists public.deal_room_message_corrections;
--   drop table if exists public.deal_room_messages;
--   drop function if exists public.deal_room_row_append_only();
--   alter table public.deal_room_participants drop constraint if exists deal_room_participants_preferred_language_supported;
--   alter table public.deal_room_participants drop column if exists preferred_language;
--   commit;
--
-- Once a member has posted a message or a term is confirmed, withdrawal is a
-- retention decision and an owner action, not a rollback step: original evidence
-- and confirmed canonical facts must not be silently destroyed.
