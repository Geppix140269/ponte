-- AI account manager (Phase 2): one cached brief per member, regenerated
-- at most daily server-side. Written and read by the service role only.
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists account_briefs (
  user_id uuid primary key,
  brief jsonb not null,
  listing_count int not null default 0,
  generated_at timestamptz not null default now()
);

alter table account_briefs enable row level security;
-- No policies: only the service role (the server) reads and writes.
