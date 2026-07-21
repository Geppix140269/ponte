-- Verification pipeline: levels 1 to 3.
--
-- Level 4, institutional, stays manual and is deliberately not modelled here.
-- No customs or third party trade data is involved anywhere in this schema:
-- activity verification runs on documents the member uploads themselves.
--
-- Additive only. Run in the Supabase SQL Editor. Safe to re-run.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Sanctions lists
-- ---------------------------------------------------------------------------
-- Rebuilt wholesale on each refresh. The refresh writes into a staging table
-- and swaps, so a screening never runs against a half loaded list.
create table if not exists sanctions_entries (
  id uuid primary key default gen_random_uuid(),
  source_list text not null,        -- 'OFAC_SDN' | 'OFAC_CONS' | 'EU_CFSL' | 'UN_SC' | 'UK_OFSI'
  entry_id text not null,           -- the publisher's own id
  primary_name text not null,
  normalized_name text not null,    -- lowercased, punctuation and legal suffixes stripped
  aliases text[] not null default '{}',
  normalized_aliases text[] not null default '{}',
  entity_type text,                 -- 'individual' | 'entity' | 'vessel' | 'aircraft' | null
  country text,
  programs text[] not null default '{}',
  listed_date date,
  raw jsonb,
  imported_at timestamptz not null default now(),
  unique (source_list, entry_id)
);

-- Postgres refuses a non IMMUTABLE function in an index expression, and
-- array_to_string is only STABLE. This wrapper asserts immutability, which is
-- true here: the input is a text array and the separator is constant, so the
-- result cannot change for the same input.
create or replace function aliases_text(text[])
returns text
language sql
immutable
parallel safe
as $$ select array_to_string($1, ' ') $$;

-- Trigram indexes are what make fuzzy name matching fast enough to run inline.
create index if not exists sanctions_name_trgm
  on sanctions_entries using gin (normalized_name gin_trgm_ops);
create index if not exists sanctions_alias_trgm
  on sanctions_entries using gin (aliases_text(normalized_aliases) gin_trgm_ops);
create index if not exists sanctions_source_idx on sanctions_entries (source_list);
create index if not exists sanctions_imported_idx on sanctions_entries (imported_at desc);

alter table sanctions_entries enable row level security;
-- Published public data, but screening runs server side, so no client policies.

create table if not exists sanctions_refresh_log (
  id uuid primary key default gen_random_uuid(),
  source_list text not null,
  fetched_at timestamptz not null default now(),
  entry_count int,
  status text not null,             -- 'ok' | 'failed'
  error text,
  duration_ms int
);
create index if not exists sanctions_refresh_list_idx
  on sanctions_refresh_log (source_list, fetched_at desc);
alter table sanctions_refresh_log enable row level security;

-- ---------------------------------------------------------------------------
-- Verifications
-- ---------------------------------------------------------------------------
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  -- Null for a guest who bought a single certificate without an account.
  user_id uuid references profiles on delete set null,
  guest_email text,

  subject_name text not null,
  subject_country text,
  subject_reg_number text,
  subject_vat text,
  subject_lei text,

  level_requested int not null check (level_requested between 1 and 3),
  status text not null default 'pending'
    check (status in ('pending','auto_verified','review','verified','rejected','failed')),

  registry jsonb,
  vies jsonb,
  gleif jsonb,
  sanctions_hits jsonb,
  ai_summary jsonb,

  verdict_reason text,
  credit_ledger_id uuid references credit_ledger on delete set null,
  reviewed_by uuid references profiles on delete set null,

  -- Set when a later list refresh turns up a hit on an already verified
  -- subject. This is what keeps a badge honest over time.
  rescreened_at timestamptz,

  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint verifications_has_requester check (user_id is not null or guest_email is not null)
);

create index if not exists verifications_user_idx on verifications (user_id, created_at desc);
create index if not exists verifications_status_idx on verifications (status, created_at desc);
create index if not exists verifications_subject_trgm
  on verifications using gin (subject_name gin_trgm_ops);

alter table verifications enable row level security;

drop policy if exists verifications_own_read on verifications;
create policy verifications_own_read on verifications
  for select using (auth.uid() = user_id);
-- Writes are server side only. A member never sets their own verdict.

-- ---------------------------------------------------------------------------
-- Level 3 documents
-- ---------------------------------------------------------------------------
create table if not exists verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references verifications on delete cascade,
  storage_path text not null,       -- private bucket, signed URLs only
  doc_type text not null
    check (doc_type in ('bill_of_lading','invoice','reference_letter','other')),
  ai_extract jsonb,
  uploaded_at timestamptz not null default now()
);
create index if not exists verification_docs_idx on verification_documents (verification_id);
alter table verification_documents enable row level security;

drop policy if exists verification_docs_own_read on verification_documents;
create policy verification_docs_own_read on verification_documents
  for select using (
    exists (
      select 1 from verifications v
      where v.id = verification_id and v.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Trust score
-- ---------------------------------------------------------------------------
-- Deterministic and additive. The AI never sets a score: it only produces
-- evidence a human or a rule acts on. Components are stored separately so a
-- member can be shown exactly how their number was reached.
create table if not exists trust_score_components (
  user_id uuid not null references profiles on delete cascade,
  component text not null
    check (component in ('identity','business','sanctions_clean','company_age','activity_docs','tenure')),
  points int not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, component)
);
alter table trust_score_components enable row level security;

drop policy if exists trust_components_own_read on trust_score_components;
create policy trust_components_own_read on trust_score_components
  for select using (auth.uid() = user_id);

create or replace function trust_score(p_user_id uuid)
returns int
language sql
stable
as $$
  select least(100, coalesce(sum(points), 0))::int
  from trust_score_components where user_id = p_user_id;
$$;

-- Current verification level reached, for badges.
alter table profiles add column if not exists verification_level int not null default 0;
alter table profiles add column if not exists verified_at timestamptz;
