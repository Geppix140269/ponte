-- Cached machine translations of approved listings: each listing/language
-- pair is translated once by AI, then served from this table forever.
-- Written and read server-side only (service role); RLS locks it down.
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists listing_translations (
  listing_id uuid not null references listings(id) on delete cascade,
  lang text not null,
  product text not null,
  details text not null,
  created_at timestamptz not null default now(),
  primary key (listing_id, lang)
);

alter table listing_translations enable row level security;
-- No policies: only the service role (the server) reads and writes.
