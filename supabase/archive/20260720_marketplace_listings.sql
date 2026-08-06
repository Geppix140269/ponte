-- Marketplace Phase 1: vetted listings pipeline (v2).
-- Run in the Supabase SQL Editor.
--
-- v2: the database may contain OLD "listings" / "listing_documents" tables
-- from earlier experiments with a different structure. This migration
-- archives them (rename, data preserved) before creating the new ones.

do $$ begin
  if exists (select from information_schema.tables
             where table_schema = 'public' and table_name = 'listings')
     and not exists (select from information_schema.columns
                     where table_schema = 'public' and table_name = 'listings'
                       and column_name = 'decision_note') then
    alter table public.listings rename to listings_legacy_20260720;
  end if;
  if exists (select from information_schema.tables
             where table_schema = 'public' and table_name = 'listing_documents')
     and not exists (select from information_schema.columns
                     where table_schema = 'public' and table_name = 'listing_documents'
                       and column_name = 'path') then
    alter table public.listing_documents rename to listing_documents_legacy_20260720;
  end if;
end $$;

-- ---------------------------------------------------------------
-- Reference sequence: PT-0001, PT-0002, ...
-- ---------------------------------------------------------------
create sequence if not exists listing_ref_seq start 100;

-- ---------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null default ('PT-' || lpad(nextval('listing_ref_seq')::text, 4, '0')),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('offer', 'requirement', 'service')),
  product text not null,
  hs_code text,
  origin text,
  destination text,
  volume text,
  indicative_value_usd numeric,
  incoterm text,
  details text not null,
  -- submitted -> approved | rejected; approved -> closed when done
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'closed')),
  admin_notes text,          -- internal, never shown to the member
  decision_note text,        -- shown to the member with the decision
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists listings_user_idx on listings (user_id, created_at desc);
create index if not exists listings_status_idx on listings (status, created_at desc);

alter table listings enable row level security;

-- Owners see their own listings.
drop policy if exists "Members read own listings" on listings;
create policy "Members read own listings"
  on listings for select
  using (auth.uid() = user_id);

-- Owners create listings for themselves; server forces status 'submitted'.
drop policy if exists "Members create own listings" on listings;
create policy "Members create own listings"
  on listings for insert
  with check (auth.uid() = user_id and status = 'submitted');

-- Admins do everything.
drop policy if exists "Admins read all listings" on listings;
create policy "Admins read all listings"
  on listings for select
  using ((select is_admin()));

drop policy if exists "Admins update listings" on listings;
create policy "Admins update listings"
  on listings for update
  using ((select is_admin()));

-- ---------------------------------------------------------------
-- Listing documents (metadata; files live in the private bucket)
-- ---------------------------------------------------------------
create table if not exists listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,       -- storage object path in 'listing-docs'
  filename text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_documents_listing_idx on listing_documents (listing_id);

alter table listing_documents enable row level security;

drop policy if exists "Members read own listing docs" on listing_documents;
create policy "Members read own listing docs"
  on listing_documents for select
  using (auth.uid() = user_id);

drop policy if exists "Members add own listing docs" on listing_documents;
create policy "Members add own listing docs"
  on listing_documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins read all listing docs" on listing_documents;
create policy "Admins read all listing docs"
  on listing_documents for select
  using ((select is_admin()));

-- ---------------------------------------------------------------
-- Private storage bucket for verification documents
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-docs', 'listing-docs', false, 10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Owners upload only under their own uid/ prefix.
drop policy if exists "Members upload own listing docs" on storage.objects;
create policy "Members upload own listing docs"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members read own listing doc files" on storage.objects;
create policy "Members read own listing doc files"
  on storage.objects for select
  using (
    bucket_id = 'listing-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Admins read all listing doc files" on storage.objects;
create policy "Admins read all listing doc files"
  on storage.objects for select
  using (bucket_id = 'listing-docs' and (select is_admin()));

-- ---------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------
create or replace function set_listing_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists listings_updated_at on listings;
create trigger listings_updated_at
  before update on listings
  for each row execute function set_listing_updated_at();
