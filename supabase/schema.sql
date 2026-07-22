-- Ponte Trade: the base schema.
--
-- This file holds only what everything else depends on: the member profile,
-- the admin test, and the trigger that gives every new auth user a profile
-- row. Every feature table (listings, media, connections, credits,
-- verifications, sanctions, datasources) is created by a dated file in
-- supabase/migrations and is not repeated here.
--
-- It used to describe the report shop as the current schema: products,
-- categories, orders, order_items, order_notes, bundle_items and
-- newsletter_subscribers, with their RLS. That shop was removed in July 2026
-- having taken zero orders, and its tables are dropped by
-- 20260722a_drop_legacy_shop.sql.
--
-- KNOWN DRIFT, 2026-07-22: the live `profiles` table carries columns that no
-- file in this repository creates, among them account_type, verified_trader,
-- organization_id, risk_category, completed_deals, title, languages,
-- commodities, regions_served, years_active, typical_deal_size, bio, plan,
-- plan_status, plan_renews_at, stripe_subscription_id and verification_tier.
-- They were added straight to the database. Applying this repository to an
-- empty project therefore does NOT reproduce production. Recording it here so
-- the next person finds out from a comment rather than from a failing query.

-- ============================================================ TABLES

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  company text,
  country text,
  role text default 'customer',          -- 'customer' | 'admin'
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- ============================================================ HELPERS

create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================ RLS

alter table profiles enable row level security;

-- Profiles: a user sees and edits their own; admins see all.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
