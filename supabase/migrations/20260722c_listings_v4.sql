-- Listings: the structured fields the composer, the write-up and the
-- lifecycle need. Additive throughout: every column is new and nullable, and
-- nothing existing is renamed or dropped.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260722c_listings_v4.sql
--
-- ---------------------------------------------------------------------------
-- Written against the live schema, not against this folder
-- ---------------------------------------------------------------------------
-- The migration files in this repository cannot rebuild production: seventeen
-- columns on `profiles` exist that no file here creates. So the live table was
-- read first and this migration written against what is actually there.
--
-- ---------------------------------------------------------------------------
-- The names the briefs asked for, and why they are not used
-- ---------------------------------------------------------------------------
-- The briefs specify listing_type, product_name, incoterms, poster_role and
-- chain_declaration. The live table has type, product, incoterm,
-- submitter_role and chain_depth, all wired through RLS policies, the admin
-- queue, the decision emails and the member's own listing list. Renaming five
-- live columns to match a document is churn that buys nothing, so the repo
-- wins and the briefs are the ones that move.

-- ===========================================================================
-- 1. A live bug, found while reading the schema
-- ===========================================================================
-- There are TWO status check constraints. 20260721a_drafts_sharing.sql
-- replaced `listings_status_check` to allow 'draft', but an older duplicate
-- named `listings_status_check1` survived and does NOT allow it. Postgres
-- applies every check, so the effective rule is their intersection and
-- 'draft' has been forbidden ever since.
--
-- The try-before-you-register flow writes drafts. It cannot have worked.
-- Nothing loses data here: the constraint is redundant with the one that
-- replaces it below.
alter table listings drop constraint if exists listings_status_check1;

-- ===========================================================================
-- 2. Structured quantity
-- ===========================================================================
-- `volume` is a composed string, "12000 MT per month", built by the composer
-- and parsed back out for display. That is fine for showing and useless for
-- filtering: a board cannot answer "offers above 5,000 MT" against text.
--
-- The string stays. It is what the desk and the emails already read, and
-- throwing it away to prove a point would break both.
alter table listings add column if not exists quantity numeric;
alter table listings add column if not exists unit text;
alter table listings add column if not exists frequency text;

-- Backfill from the composed string. The composer writes
-- "<number> <unit>[ <frequency>]", so the leading number and the token after
-- it are recoverable; anything that does not match that shape is left null
-- rather than guessed at.
-- Split on whitespace into at most three parts and take them positionally.
-- The obvious substring arithmetic is wrong for a volume with no spaces at
-- all: position(' ' in '10000') is 0, so the offset lands at 1 and the whole
-- string is copied into frequency. "10000" is a quantity with no unit and no
-- frequency, and the parse has to say so rather than fill the columns.
update listings
   set quantity  = nullif(regexp_replace((regexp_split_to_array(trim(volume), '\s+'))[1], '[^0-9.]', '', 'g'), '')::numeric,
       unit      = (regexp_split_to_array(trim(volume), '\s+'))[2],
       frequency = nullif(
                     array_to_string(
                       (regexp_split_to_array(trim(volume), '\s+'))[3:],
                       ' '
                     ), '')
 where volume is not null
   and quantity is null
   and (regexp_split_to_array(trim(volume), '\s+'))[1] ~ '^[0-9][0-9,.]*$';

-- ===========================================================================
-- 3. Terms a counterparty self-qualifies on
-- ===========================================================================
alter table listings add column if not exists payment_terms text;

-- ISO-2 alongside the free text, not instead of it. `origin` holds whatever
-- the member typed, which is often a port or a region rather than a country,
-- and that detail is worth keeping.
alter table listings add column if not exists origin_country      text
  check (origin_country is null or origin_country ~ '^[A-Z]{2}$');
alter table listings add column if not exists destination_country text
  check (destination_country is null or destination_country ~ '^[A-Z]{2}$');

-- Per-term Fixed / Negotiable / Open, as declared by the poster. Shape:
--   {"price":"fixed","payment_terms":"fixed","quantity":"negotiable", ...}
-- jsonb rather than six columns because the set of flaggable terms will move
-- and a jsonb key is cheaper to add than a migration.
alter table listings add column if not exists flexibility jsonb not null default '{}'::jsonb;

alter table listings add column if not exists deal_team_note text;
-- Capped at the database, not only in the form. 400 characters is a rule about
-- forcing signal, and a rule enforced only in the browser is a suggestion.
alter table listings add column if not exists key_notes text
  check (key_notes is null or length(key_notes) <= 400);

-- Desk-set only. No member-facing write path may touch this: a sighted
-- mandate is the desk's statement, not the poster's claim.
alter table listings add column if not exists mandate_sighted boolean not null default false;

-- ===========================================================================
-- 4. Validity, and the clock every listing lives on
-- ===========================================================================
alter table listings add column if not exists validity_type text
  check (validity_type is null or validity_type in ('dated', 'standing'));
alter table listings add column if not exists valid_until date;
alter table listings add column if not exists reconfirmed_at timestamptz;

-- A dated listing without a date is the silent open-endedness the addendum
-- exists to end, so the two fields are constrained together rather than
-- separately.
alter table listings drop constraint if exists listings_validity_coherent;
alter table listings add constraint listings_validity_coherent check (
  validity_type is null
  or (validity_type = 'dated'    and valid_until is not null)
  or (validity_type = 'standing' and valid_until is null)
);

-- ===========================================================================
-- 5. Status: the lifecycle states, added to the ones already in use
-- ===========================================================================
-- submitted, approved and rejected stay. They are wired through RLS, the admin
-- queue and the decision emails, and the briefs' in_review/live are the same
-- three states under different names. `approved` renders as "live" in the UI,
-- which is a presentation decision and belongs there rather than here.
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check check (
  status in (
    'draft', 'submitted', 'approved', 'rejected', 'closed',
    'expired', 'closed_done', 'withdrawn', 'archived'
  )
);

-- ===========================================================================
-- 6. The write-up
-- ===========================================================================
-- Two versions, deliberately. ai_version is what the model produced,
-- desk_version is what a person approved, and public surfaces render the desk
-- version. Keeping both is what makes "AI-drafted, desk-reviewed" a checkable
-- claim rather than a slogan.
alter table listings add column if not exists ai_version     jsonb;
alter table listings add column if not exists desk_version   jsonb;
alter table listings add column if not exists prompt_version text;
alter table listings add column if not exists model          text;
alter table listings add column if not exists writeup_at     timestamptz;

alter table listings add column if not exists share_text text;
-- Bumped whenever the listing or its desk version changes. WhatsApp caches
-- preview images hard, so the OG URL needs something to change.
alter table listings add column if not exists og_version int not null default 1;

-- ===========================================================================
-- 7. Classification, now that there is a catalog to point at
-- ===========================================================================
-- hs_code has existed since July and no code path has ever written it, so
-- every row is null and this key can be added without a backfill or a NOT
-- VALID escape hatch. From here a code on a listing is a code in the catalog.
alter table listings drop constraint if exists listings_hs_code_fkey;
alter table listings
  add constraint listings_hs_code_fkey
  foreign key (hs_code) references hs_codes (code)
  on update cascade on delete set null;

-- ===========================================================================
-- 8. Indexes the board will actually use
-- ===========================================================================
create index if not exists listings_live_idx
  on listings (status, created_at desc) where status = 'approved';
create index if not exists listings_hs_idx
  on listings (hs_code) where status = 'approved';
create index if not exists listings_corridor_idx
  on listings (origin_country, destination_country) where status = 'approved';
-- The expiry cron reads exactly this.
create index if not exists listings_expiry_idx
  on listings (valid_until) where status = 'approved' and valid_until is not null;

-- ===========================================================================
-- 9. Anonymous drafts
-- ===========================================================================
-- A visitor composes a listing, an inquiry or an alert before they have an
-- account, and the gate fires only when they act. Their work has to survive
-- that moment, and it has to survive it server side: a draft in localStorage
-- does not survive the sign-in round trip on a phone.
create table if not exists anonymous_drafts (
  id          uuid primary key default gen_random_uuid(),
  session_key text not null,
  kind        text not null check (kind in ('listing', 'inquiry', 'alert')),
  payload     jsonb not null default '{}'::jsonb,
  claimed_by  uuid references auth.users (id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists anonymous_drafts_session_idx
  on anonymous_drafts (session_key) where claimed_by is null;
create index if not exists anonymous_drafts_sweep_idx
  on anonymous_drafts (created_at) where claimed_by is null;

alter table anonymous_drafts enable row level security;
-- No policies. Anonymous drafts are keyed by a cookie, not by an identity, so
-- there is no auth.uid() to write a policy against. Every read and write goes
-- through a server route holding the service role, which is the only place the
-- session cookie can be checked against the row.

-- ===========================================================================
-- 10. Tombstones
-- ===========================================================================
-- A closed deal, anonymised, with the poster's consent. This is the proof
-- engine: "Verified: 12,000 MT sugar, EU to GCC, closed August 2026".
--
-- No listing_id foreign key on purpose. A tombstone has to outlive the listing
-- it came from, including a listing deleted at a member's request, and a
-- cascade would quietly delete the proof along with it. Anonymity is the whole
-- point, so the link back is deliberately not kept.
create table if not exists tombstones (
  id           uuid primary key default gen_random_uuid(),
  outcome_line text not null,
  hs_chapter   text,
  origin_region      text,
  destination_region text,
  consent      boolean not null default false,
  closed_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table tombstones enable row level security;

-- Public read, but only what the poster agreed to publish.
drop policy if exists tombstones_public_read on tombstones;
create policy tombstones_public_read on tombstones
  for select using (consent);

comment on column listings.mandate_sighted is
  'Set by the desk only. A sighted mandate is the desk''s statement, never the poster''s claim.';
comment on table anonymous_drafts is
  'Pre-registration composer state, keyed by session cookie. Server-side only: RLS is on with no policies because there is no auth.uid() to match against.';
comment on table tombstones is
  'Anonymised closed-deal proof. Deliberately carries no listing_id: it must outlive the listing, and the link back would defeat the anonymity.';
