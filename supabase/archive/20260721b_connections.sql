-- Direct, free connections between members: a member requests to connect
-- on an approved listing; the owner accepts or declines; on accept both
-- sides receive each other's contact. Anonymous until both agree.
-- Run in the Supabase SQL Editor. Safe to re-run.

create table if not exists listing_connections (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  requester_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (listing_id, requester_id)
);

alter table listing_connections enable row level security;

-- Requesters create and read their own requests.
drop policy if exists "Members request connections" on listing_connections;
create policy "Members request connections"
  on listing_connections for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

drop policy if exists "Members read own connection requests" on listing_connections;
create policy "Members read own connection requests"
  on listing_connections for select to authenticated
  using (auth.uid() = requester_id);

-- Listing owners read and decide requests on their own listings.
drop policy if exists "Owners read listing connections" on listing_connections;
create policy "Owners read listing connections"
  on listing_connections for select to authenticated
  using (exists (
    select 1 from listings l
    where l.id = listing_id and l.user_id = auth.uid()
  ));

drop policy if exists "Owners decide listing connections" on listing_connections;
create policy "Owners decide listing connections"
  on listing_connections for update to authenticated
  using (exists (
    select 1 from listings l
    where l.id = listing_id and l.user_id = auth.uid()
  ))
  with check (status in ('accepted', 'declined'));

create index if not exists listing_connections_listing_idx
  on listing_connections (listing_id, status);
