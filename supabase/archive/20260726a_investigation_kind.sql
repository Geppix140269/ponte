-- Two different actions on a Market Signal, told apart.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260726a_investigation_kind.sql
--
-- PROBE FIRST:
--   select count(*) from signal_investigations;
--   select conname from pg_constraint
--    where conrelid = 'public.signal_investigations'::regclass;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- A signal page offers two actions: "Ask Ponte to investigate" and "I may be
-- able to supply this" (or buy it). Both opened the same questionnaire and were
-- stored identically, so a supplier answering a signal was asked what it wanted
-- Ponte to ESTABLISH, and the desk could not tell an enquiry from an offer of
-- capability. The two are now distinct requests:
--
--   * request_kind records which action was taken. Existing rows are all
--     investigations, which is what the default backfills them as.
--   * capability holds what a supplier can supply, or what a buyer would buy.
--     It is null on an investigation request, exactly as establish_goal is null
--     on a capability declaration.
--   * The uniqueness rule widens from (signal, member) to (signal, member,
--     kind). One of each per member per signal: a repeat click is still a
--     no-op, but a member who first asked the desk to investigate is no longer
--     silently blocked from later declaring that they can supply.
--
-- Additive and idempotent: columns are add-if-not-exists, constraints are
-- dropped-then-created. No row is deleted and no value is overwritten.
--
-- Rollback: drop the two columns, drop the three-part unique constraint and
-- restore the two-part one. That loses only which kind each request was.

alter table signal_investigations
  add column if not exists request_kind text not null default 'investigate';

alter table signal_investigations
  add column if not exists capability text;

-- How the desk reaches this member, and in what language. The desk works an
-- investigation by asking questions back, so a phone number is part of the
-- request rather than something chased afterwards; the language is asked so the
-- call is placed by someone who can actually be understood. Nullable, because
-- rows created before this migration have neither.
alter table signal_investigations
  add column if not exists contact_phone text;

alter table signal_investigations
  add column if not exists contact_language text;

comment on column signal_investigations.contact_phone is
  'A number the requesting member asked the desk to call them on. Never shown to any other member, and never to the party behind the signal.';

comment on column signal_investigations.contact_language is
  'The language the member asked to be called in, from the closed list in lib/signals/investigation.ts.';

alter table signal_investigations
  drop constraint if exists signal_investigations_kind_check;
alter table signal_investigations
  add constraint signal_investigations_kind_check check (
    request_kind in ('investigate', 'capability')
  );

comment on column signal_investigations.request_kind is
  'Which action the member took on the signal: investigate (asked the desk to establish something) or capability (declared what they can supply or would buy). Never a fact about the third party behind the signal.';

comment on column signal_investigations.capability is
  'What the member can supply, or what they would buy, on a capability declaration. Null on an investigation request.';

-- One request of each kind per member per signal. Replaces the two-part rule,
-- so a duplicate click is still a no-op while the two actions stay independent.
alter table signal_investigations
  drop constraint if exists signal_investigations_unique_requester;
alter table signal_investigations
  drop constraint if exists signal_investigations_unique_requester_kind;
alter table signal_investigations
  add constraint signal_investigations_unique_requester_kind
  unique (signal_id, requester_id, request_kind);
