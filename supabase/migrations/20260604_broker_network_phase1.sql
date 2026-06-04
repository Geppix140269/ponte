-- ponte.trade — Broker Network, Phase 1 schema + RLS
-- Date: 2026-06-04
-- See PONTE-TRADE-MASTER-PLAN.md for the full plan.
--
-- Adds the trade-facilitation network on top of the existing report store.
-- The store tables (products, orders, etc.) are untouched. This migration only
-- ADDS new tables and EXTENDS the profiles table.
--
-- Run in the Supabase SQL editor or via `supabase db push`.
-- Safe to re-run: tables use "create table if not exists", columns are guarded
-- with information_schema checks, and every policy is dropped before create.

-- ============================================================ EXTENSIONS

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================ HELPERS

-- is_admin() already exists from the store schema. We reuse it.

-- updated_at touch trigger, reused by several tables below.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================ PROFILES (extend)
-- The store profiles table has: id, full_name, company, country, role,
-- stripe_customer_id, created_at. We add network + broker fields.
--
-- Role model (satisfies the spec's 6 user types without overloading one column):
--   role          — platform access: 'customer' | 'admin' (existing, unchanged)
--   account_type  — network persona: 'broker' | 'buyer' | 'seller' | 'trader' | 'enterprise'
--   plan          — subscription tier: 'free' | 'starter' | 'pro' | 'enterprise'
--   verified_broker — boolean status, derived from verification level (Pro + COMPANY_VERIFIED)
-- Spec "VERIFIED BROKER" = account_type='broker' AND verified_broker=true.
-- Spec "ENTERPRISE USER"  = plan='enterprise'.

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='account_type') then
    alter table profiles add column account_type text
      check (account_type in ('broker','buyer','seller','trader','enterprise'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='plan') then
    alter table profiles add column plan text default 'free'
      check (plan in ('free','starter','pro','enterprise'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='verified_broker') then
    alter table profiles add column verified_broker boolean default false;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='organization_id') then
    alter table profiles add column organization_id uuid;
  end if;

  -- Reputation
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='trust_score') then
    alter table profiles add column trust_score int default 40
      check (trust_score between 0 and 100);
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='verification_level') then
    alter table profiles add column verification_level text default 'unverified'
      check (verification_level in
        ('unverified','email_verified','phone_verified','company_verified','fully_verified'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='risk_category') then
    alter table profiles add column risk_category text default 'low'
      check (risk_category in ('low','medium','high','blocked'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='completed_deals') then
    alter table profiles add column completed_deals int default 0;
  end if;

  -- Trading information
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='title') then
    alter table profiles add column title text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='languages') then
    alter table profiles add column languages text[];
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='commodities') then
    alter table profiles add column commodities text[];
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='regions_served') then
    alter table profiles add column regions_served text[];
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='years_active') then
    alter table profiles add column years_active int;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='typical_deal_size') then
    alter table profiles add column typical_deal_size text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='bio') then
    alter table profiles add column bio text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='updated_at') then
    alter table profiles add column updated_at timestamptz default now();
  end if;
end $$;

-- ============================================================ ORGANIZATIONS

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  registration_number text,
  vat_number text,
  country text,
  industry text,
  owner_id uuid references profiles(id) on delete set null,
  -- normalized keys used for duplicate detection (lowercased / domain only)
  name_normalized text,
  domain_normalized text,
  verification_level text default 'unverified'
    check (verification_level in
      ('unverified','email_verified','phone_verified','company_verified','fully_verified')),
  trust_score int default 40 check (trust_score between 0 and 100),
  risk_category text default 'low' check (risk_category in ('low','medium','high','blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- FK from profiles.organization_id -> organizations (added after table exists)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_organization_id_fkey'
  ) then
    alter table profiles
      add constraint profiles_organization_id_fkey
      foreign key (organization_id) references organizations(id) on delete set null;
  end if;
end $$;

-- ============================================================ LISTINGS

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  listing_type text not null default 'offer' check (listing_type in ('offer','request')),
  commodity text not null,
  hs_code text,
  origin_country text,
  destination_country text,
  quantity numeric,
  unit text,
  incoterms text,
  loading_port text,
  price_cents bigint,
  currency text default 'USD',
  price_on_request boolean default false,
  specifications text,
  status text not null default 'active' check (status in ('active','paused','closed')),
  -- moderation
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending','approved','flagged','rejected')),
  moderation_reasons text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists listings_owner_idx on listings(owner_id);
create index if not exists listings_commodity_idx on listings(commodity);
create index if not exists listings_status_idx on listings(status);
create index if not exists listings_origin_idx on listings(origin_country);

-- ============================================================ DEALS (deal rooms)

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  initiator_id uuid not null references profiles(id) on delete cascade,
  counterparty_id uuid references profiles(id) on delete set null,
  stage text not null default 'enquiry'
    check (stage in ('enquiry','offer','negotiation','closed','cancelled')),
  title text,
  -- mutual acceptance gate for contact exchange (spec: contact protection)
  contact_unlocked boolean default false,
  internal_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists deals_listing_idx on deals(listing_id);
create index if not exists deals_initiator_idx on deals(initiator_id);
create index if not exists deals_counterparty_idx on deals(counterparty_id);

-- Status history (audit of stage transitions)
create table if not exists deal_status_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================ MESSAGES

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  -- contact details auto-detected and masked until contact_unlocked (spec)
  contains_contact_info boolean default false,
  created_at timestamptz default now()
);

create index if not exists messages_deal_idx on messages(deal_id);

-- ============================================================ VERIFICATIONS

create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  level text not null
    check (level in ('email','phone','company','id','trade_reference')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  -- supporting documents live in Supabase storage; we keep object paths
  document_paths text[],
  reviewer_id uuid references profiles(id) on delete set null,
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists verifications_profile_idx on verifications(profile_id);
create index if not exists verifications_status_idx on verifications(status);

-- ============================================================ TRUST SCORE LEDGER
-- profiles.trust_score holds the current value; this table is the append-only
-- history of every change, for transparency and audit.

create table if not exists trust_score_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  delta int not null,
  reason text not null,        -- e.g. 'email_verified','completed_deal','user_report'
  new_score int not null check (new_score between 0 and 100),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists trust_score_events_profile_idx on trust_score_events(profile_id);

-- ============================================================ USER REPORTS
-- Named user_reports to avoid confusion with the store's market "reports".

create table if not exists user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  target_type text not null check (target_type in ('user','listing','deal')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open'
    check (status in ('open','investigating','resolved','dismissed')),
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists user_reports_status_idx on user_reports(status);
create index if not exists user_reports_target_idx on user_reports(target_type, target_id);

-- ============================================================ BLOCKED ENTITIES

create table if not exists blocked_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('user','organization','domain','email')),
  value text not null,          -- profile id, org id, domain, or email
  reason text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists blocked_entities_unique on blocked_entities(entity_type, value);

-- ============================================================ FRAUD FLAGS

create table if not exists fraud_flags (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('user','organization','listing','deal')),
  subject_id uuid not null,
  flag_type text not null,      -- 'duplicate_company','duplicate_domain','rate_limit','suspicious_activity'
  severity text not null default 'medium' check (severity in ('low','medium','high')),
  detail text,
  status text not null default 'open' check (status in ('open','reviewed','cleared')),
  created_at timestamptz default now()
);

create index if not exists fraud_flags_subject_idx on fraud_flags(subject_type, subject_id);
create index if not exists fraud_flags_status_idx on fraud_flags(status);

-- ============================================================ AUDIT LOG

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists audit_logs_actor_idx on audit_logs(actor_id);
create index if not exists audit_logs_created_idx on audit_logs(created_at);

-- ============================================================ NOTIFICATIONS

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_profile_idx on notifications(profile_id, read);

-- ============================================================ ADAMFTD VERIFICATION CHECKS
-- Cached, shared results of ADAMftd lookups. Keyed by company + country so a
-- counterparty verified once is reused across all users (cost control).

create table if not exists adamftd_verification_checks (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  company_name text not null,
  country text,
  commodity text,
  hs_code text,
  claimed_role text,            -- 'buyer' | 'seller' | 'broker'
  status text not null default 'manual_review'
    check (status in ('match','partial_match','no_match','manual_review')),
  confidence_score numeric,     -- 0..1
  result_summary text,
  signals jsonb,                -- { sanctions_clear, company_registered, trade_activity_exists, ... }
  -- cache control
  cache_key text,               -- lower(company_name)|lower(country)
  source text default 'mock' check (source in ('mock','live')),
  expires_at timestamptz,       -- 30-60 day TTL; null = no expiry
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists adamftd_checks_cache_idx on adamftd_verification_checks(cache_key);
create index if not exists adamftd_checks_requester_idx on adamftd_verification_checks(requester_id);

-- ============================================================ updated_at TRIGGERS

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','listings','deals','verifications',
    'user_reports','adamftd_verification_checks'
  ] loop
    execute format('drop trigger if exists touch_%1$s on %1$s;', t);
    execute format(
      'create trigger touch_%1$s before update on %1$s
       for each row execute function touch_updated_at();', t);
  end loop;
end $$;

-- ============================================================ HELPER: deal participant

create or replace function is_deal_participant(p_deal_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from deals d
    where d.id = p_deal_id
      and (d.initiator_id = auth.uid() or d.counterparty_id = auth.uid())
  );
$$;

-- ============================================================ RLS

alter table organizations               enable row level security;
alter table listings                    enable row level security;
alter table deals                       enable row level security;
alter table deal_status_history         enable row level security;
alter table messages                    enable row level security;
alter table verifications               enable row level security;
alter table trust_score_events          enable row level security;
alter table user_reports                enable row level security;
alter table blocked_entities            enable row level security;
alter table fraud_flags                 enable row level security;
alter table audit_logs                  enable row level security;
alter table notifications               enable row level security;
alter table adamftd_verification_checks enable row level security;

-- Organizations: public can read basic org rows; owner + admin manage.
drop policy if exists "orgs readable" on organizations;
create policy "orgs readable" on organizations for select using (true);

drop policy if exists "owner manages org" on organizations;
create policy "owner manages org" on organizations
  for all using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

-- Listings: active + approved listings are public; owner sees own; admin all.
drop policy if exists "listings public read" on listings;
create policy "listings public read" on listings
  for select using (
    (status = 'active' and moderation_status = 'approved')
    or owner_id = auth.uid()
    or is_admin()
  );

drop policy if exists "owner manages listing" on listings;
create policy "owner manages listing" on listings
  for all using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

-- Deals: only the two participants (and admin) may see or act.
drop policy if exists "deal participants read" on deals;
create policy "deal participants read" on deals
  for select using (
    initiator_id = auth.uid() or counterparty_id = auth.uid() or is_admin()
  );

drop policy if exists "deal initiator creates" on deals;
create policy "deal initiator creates" on deals
  for insert with check (initiator_id = auth.uid());

drop policy if exists "deal participants update" on deals;
create policy "deal participants update" on deals
  for update using (
    initiator_id = auth.uid() or counterparty_id = auth.uid() or is_admin()
  ) with check (
    initiator_id = auth.uid() or counterparty_id = auth.uid() or is_admin()
  );

-- Deal status history: participants read; writes via service role / triggers.
drop policy if exists "deal history read" on deal_status_history;
create policy "deal history read" on deal_status_history
  for select using (is_deal_participant(deal_id) or is_admin());

-- Messages: only deal participants read/insert.
drop policy if exists "deal messages read" on messages;
create policy "deal messages read" on messages
  for select using (is_deal_participant(deal_id) or is_admin());

drop policy if exists "deal messages send" on messages;
create policy "deal messages send" on messages
  for insert with check (sender_id = auth.uid() and is_deal_participant(deal_id));

-- Verifications: owner reads own; admin all. Decisions via service role.
drop policy if exists "own verifications" on verifications;
create policy "own verifications" on verifications
  for select using (profile_id = auth.uid() or is_admin());

drop policy if exists "request verification" on verifications;
create policy "request verification" on verifications
  for insert with check (profile_id = auth.uid());

-- Trust score events: owner reads own history; admin all. Writes service role.
drop policy if exists "own trust events" on trust_score_events;
create policy "own trust events" on trust_score_events
  for select using (profile_id = auth.uid() or is_admin());

-- User reports: reporter inserts and reads own; admin all.
drop policy if exists "file report" on user_reports;
create policy "file report" on user_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists "read own reports" on user_reports;
create policy "read own reports" on user_reports
  for select using (reporter_id = auth.uid() or is_admin());

-- Blocked entities, fraud flags, audit logs: admin-only read. Writes service role.
drop policy if exists "admin blocked" on blocked_entities;
create policy "admin blocked" on blocked_entities
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin fraud" on fraud_flags;
create policy "admin fraud" on fraud_flags
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin audit" on audit_logs;
create policy "admin audit" on audit_logs
  for select using (is_admin());

-- Notifications: owner only.
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications
  for select using (profile_id = auth.uid());

drop policy if exists "own notifications update" on notifications;
create policy "own notifications update" on notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ADAMftd checks: requester reads own; admin all. Writes via service role only
-- (the verification provider runs server-side, never from the browser).
drop policy if exists "own adamftd checks" on adamftd_verification_checks;
create policy "own adamftd checks" on adamftd_verification_checks
  for select using (requester_id = auth.uid() or is_admin());

-- ============================================================ DONE
-- Verify with:
--   select table_name from information_schema.tables
--   where table_schema='public' and table_name in
--   ('organizations','listings','deals','messages','verifications',
--    'trust_score_events','user_reports','blocked_entities','fraud_flags',
--    'audit_logs','notifications','adamftd_verification_checks');
