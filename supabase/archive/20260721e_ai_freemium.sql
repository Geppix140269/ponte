-- Freemium AI: members test the AI features free, then subscribe to
-- Ponte AI. Entitlement lives on the profile; usage is metered server-side.
-- Run in the Supabase SQL Editor. Safe to re-run.

alter table profiles add column if not exists ai_member boolean not null default false;

create table if not exists ai_usage (
  user_id uuid not null,
  feature text not null,
  used int not null default 0,
  primary key (user_id, feature)
);

alter table ai_usage enable row level security;
-- No policies: only the service role (the server) reads and writes.
