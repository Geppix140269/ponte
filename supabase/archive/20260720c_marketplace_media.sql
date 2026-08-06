-- Marketplace media: product photos and videos on listings.
-- Run in the Supabase SQL Editor after the previous two migrations.

create table if not exists listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,        -- object path in the public 'listing-media' bucket
  kind text not null check (kind in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_idx on listing_media (listing_id);

alter table listing_media enable row level security;

drop policy if exists "Members read own media" on listing_media;
create policy "Members read own media"
  on listing_media for select
  using (auth.uid() = user_id);

drop policy if exists "Members add own media" on listing_media;
create policy "Members add own media"
  on listing_media for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins read all media" on listing_media;
create policy "Admins read all media"
  on listing_media for select
  using ((select is_admin()));

-- Signed-in users may see media of approved listings (the board).
drop policy if exists "Authenticated read approved media" on listing_media;
create policy "Authenticated read approved media"
  on listing_media for select
  to authenticated
  using (exists (
    select 1 from listings l
    where l.id = listing_media.listing_id and l.status = 'approved'
  ));

-- Public bucket: media is meant to be shown. 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media', 'listing-media', true, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "Public read listing media" on storage.objects;
create policy "Public read listing media"
  on storage.objects for select
  using (bucket_id = 'listing-media');

drop policy if exists "Members upload own listing media" on storage.objects;
create policy "Members upload own listing media"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
