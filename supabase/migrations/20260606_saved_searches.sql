-- ponte.trade — saved listing searches (+ alert on new matching listing)
-- Date: 2026-06-06. Idempotent.
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists saved_searches_profile_idx on saved_searches(profile_id);

alter table saved_searches enable row level security;

drop policy if exists "own saved searches" on saved_searches;
create policy "own saved searches" on saved_searches
  for select using (profile_id = auth.uid());
drop policy if exists "create saved search" on saved_searches;
create policy "create saved search" on saved_searches
  for insert with check (profile_id = auth.uid());
drop policy if exists "delete saved search" on saved_searches;
create policy "delete saved search" on saved_searches
  for delete using (profile_id = auth.uid());
