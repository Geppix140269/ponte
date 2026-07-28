-- Ponte Trade: schema-only baseline for the tables the repository does not declare.
--
-- GENERATED, 2026-07-28, from production
-- (cptglsmjmzcfpjndqfmc) by reading pg_catalog. Do not hand-edit:
-- regenerate it, so that it keeps saying what production actually is.
--
-- ---------------------------------------------------------------------------
-- What this is, and what it is not
-- ---------------------------------------------------------------------------
-- Production holds 52 tables in `public`. The repository declares
-- 23 of them, in supabase/schema.sql and supabase/migrations. The
-- remaining 29 are in this file. They pre-date the migration chain or were
-- created straight against the database, and until now nothing in the
-- repository described them at all. That is why applying this repository to an
-- empty project does not reproduce production, and why the Supabase preview
-- could never have worked.
--
-- This file closes the description gap. It does NOT close the provenance gap:
-- it records what these tables ARE, not why they exist or who decided them. It
-- is a photograph, not a history.
--
-- **It is deliberately not in supabase/migrations.** Nothing applies it. It has
-- never been run, it does not need to be run against production, where every
-- object in it already exists, and it must not be added to the auto-apply chain
-- without a reconciliation plan and owner approval. Its use is (a) to let a
-- fresh project be brought to the shape production is in, and (b) to give the
-- next audit something to diff against.
--
-- Structure: tables first with columns only, then constraints, then indexes,
-- then row level security. Constraints come after every table so that foreign
-- keys do not depend on the order the tables are written in.
--
-- No row of any of these tables was read to produce this file, and no data is
-- included. Several of them hold live records.

-- ============================================================ TABLES

create table if not exists adamftd_usage (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  period text not null,
  checks_used integer default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists adamftd_verification_checks (
  id uuid default gen_random_uuid() not null,
  requester_id uuid,
  organization_id uuid,
  listing_id uuid,
  company_name text not null,
  country text,
  commodity text,
  hs_code text,
  claimed_role text,
  status text default 'manual_review'::text not null,
  confidence_score numeric,
  result_summary text,
  signals jsonb,
  cache_key text,
  source text default 'mock'::text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  result_json jsonb
);

create table if not exists analytics_events (
  id uuid default gen_random_uuid() not null,
  event text not null,
  props jsonb,
  profile_id uuid,
  session_id text,
  created_at timestamp with time zone default now()
);

create table if not exists audit_logs (
  id uuid default gen_random_uuid() not null,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists blocked_entities (
  id uuid default gen_random_uuid() not null,
  entity_type text not null,
  value text not null,
  reason text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists bundle_items (
  bundle_product_id uuid not null,
  component_product_id uuid not null
);

create table if not exists categories (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name text not null,
  description text,
  display_order integer
);

create table if not exists deal_documents (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  uploader_id uuid,
  name text not null,
  path text not null,
  size_bytes bigint,
  created_at timestamp with time zone default now()
);

create table if not exists deal_events (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  actor_id uuid,
  type text not null,
  detail text,
  created_at timestamp with time zone default now()
);

create table if not exists deal_status_history (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  from_stage text,
  to_stage text not null,
  changed_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists deals (
  id uuid default gen_random_uuid() not null,
  listing_id uuid,
  initiator_id uuid not null,
  counterparty_id uuid,
  stage text default 'enquiry'::text not null,
  title text,
  contact_unlocked boolean default false,
  internal_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  initiator_accepted_contact boolean default false,
  counterparty_accepted_contact boolean default false
);

create table if not exists fraud_flags (
  id uuid default gen_random_uuid() not null,
  subject_type text not null,
  subject_id uuid not null,
  flag_type text not null,
  severity text default 'medium'::text not null,
  detail text,
  status text default 'open'::text not null,
  created_at timestamp with time zone default now()
);

create table if not exists listings_legacy_20260720 (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  organization_id uuid,
  listing_type text default 'offer'::text not null,
  commodity text not null,
  hs_code text,
  origin_country text,
  destination_country text,
  quantity numeric,
  unit text,
  incoterms text,
  loading_port text,
  price_cents bigint,
  currency text default 'USD'::text,
  price_on_request boolean default false,
  specifications text,
  status text default 'active'::text not null,
  moderation_status text default 'pending'::text not null,
  moderation_reasons text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  sender_id uuid not null,
  body text not null,
  contains_contact_info boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  name text,
  stripe_subscription_id text,
  status text default 'active'::text,
  created_at timestamp with time zone default now()
);

create table if not exists notifications (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid,
  product_id uuid,
  quantity integer default 1,
  unit_price_cents integer,
  config_values jsonb,
  delivery_status text default 'pending'::text,
  report_path text,
  download_url text,
  download_expires_at timestamp with time zone,
  download_count integer default 0,
  max_downloads integer default 5,
  created_at timestamp with time zone default now(),
  slot_date date
);

create table if not exists order_notes (
  id uuid default gen_random_uuid() not null,
  order_item_id uuid,
  note text,
  created_by text,
  created_at timestamp with time zone default now()
);

create table if not exists orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  email text,
  stripe_payment_intent_id text,
  stripe_session_id text,
  status text default 'pending'::text,
  total_cents integer,
  currency text default 'USD'::text,
  created_at timestamp with time zone default now(),
  delivered_at timestamp with time zone,
  status_v2 text default 'authorized'::text,
  confirmed_delivery_at timestamp with time zone,
  capture_deadline_at timestamp with time zone,
  capture_method text default 'automatic'::text
);

create table if not exists organizations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  website text,
  registration_number text,
  vat_number text,
  country text,
  industry text,
  owner_id uuid,
  name_normalized text,
  domain_normalized text,
  verification_level text default 'unverified'::text,
  trust_score integer default 40,
  risk_category text default 'low'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists products (
  id uuid default gen_random_uuid() not null,
  sku text not null,
  category_id uuid,
  title text not null,
  slug text not null,
  short_description text,
  full_description text,
  price_cents integer not null,
  currency text default 'USD'::text,
  delivery_type text not null,
  is_subscription boolean default false,
  stripe_price_id text,
  preview_pages integer default 3,
  preview_pdf_url text,
  full_pdf_template text,
  is_configurable boolean default false,
  config_fields jsonb,
  status text default 'draft'::text,
  featured boolean default false,
  created_at timestamp with time zone default now(),
  band text,
  includes jsonb,
  price_from boolean default false,
  price_suffix text,
  alt_price text,
  price_tiers jsonb,
  savings_cents integer,
  capacity_kind text default 'standard'::text,
  cobrandable boolean default false not null
);

create table if not exists saved_searches (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  name text not null,
  filters jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now()
);

create table if not exists schema_migrations (
  filename text not null,
  sha256 text not null,
  applied_at timestamp with time zone default now() not null
);

create table if not exists settlement_events (
  id uuid default gen_random_uuid() not null,
  settlement_id uuid not null,
  milestone_id uuid,
  actor_id uuid,
  type text not null,
  detail text,
  created_at timestamp with time zone default now()
);

create table if not exists settlement_milestones (
  id uuid default gen_random_uuid() not null,
  settlement_id uuid not null,
  seq integer not null,
  label text not null,
  amount_cents bigint not null,
  trigger_type text not null,
  required_doc_type text,
  status text default 'pending'::text not null,
  released_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists settlements (
  id uuid default gen_random_uuid() not null,
  deal_id uuid not null,
  currency text default 'USD'::text not null,
  total_cents bigint not null,
  fee_bps integer default 60 not null,
  status text default 'draft'::text not null,
  provider text default 'mock'::text,
  provider_ref text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists subscriptions (
  id uuid default gen_random_uuid() not null,
  profile_id uuid not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null,
  status text default 'inactive'::text not null,
  billing_interval text,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists trust_score_events (
  id uuid default gen_random_uuid() not null,
  profile_id uuid,
  organization_id uuid,
  delta integer not null,
  reason text not null,
  new_score integer not null,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists user_reports (
  id uuid default gen_random_uuid() not null,
  reporter_id uuid,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text default 'open'::text not null,
  resolved_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================ CONSTRAINTS

-- adamftd_usage
alter table adamftd_usage drop constraint if exists adamftd_usage_profile_id_fkey;
alter table adamftd_usage add constraint adamftd_usage_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table adamftd_usage drop constraint if exists adamftd_usage_pkey;
alter table adamftd_usage add constraint adamftd_usage_pkey PRIMARY KEY (id);   -- primary key

-- adamftd_verification_checks
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_source_check;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_source_check CHECK ((source = ANY (ARRAY['mock'::text, 'live'::text])));   -- check
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_status_check;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_status_check CHECK ((status = ANY (ARRAY['match'::text, 'partial_match'::text, 'no_match'::text, 'manual_review'::text])));   -- check
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_listing_id_fkey;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings_legacy_20260720(id) ON DELETE SET NULL;   -- foreign key
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_organization_id_fkey;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;   -- foreign key
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_requester_id_fkey;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table adamftd_verification_checks drop constraint if exists adamftd_verification_checks_pkey;
alter table adamftd_verification_checks add constraint adamftd_verification_checks_pkey PRIMARY KEY (id);   -- primary key

-- analytics_events
alter table analytics_events drop constraint if exists analytics_events_profile_id_fkey;
alter table analytics_events add constraint analytics_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table analytics_events drop constraint if exists analytics_events_pkey;
alter table analytics_events add constraint analytics_events_pkey PRIMARY KEY (id);   -- primary key

-- audit_logs
alter table audit_logs drop constraint if exists audit_logs_actor_id_fkey;
alter table audit_logs add constraint audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table audit_logs drop constraint if exists audit_logs_pkey;
alter table audit_logs add constraint audit_logs_pkey PRIMARY KEY (id);   -- primary key

-- blocked_entities
alter table blocked_entities drop constraint if exists blocked_entities_entity_type_check;
alter table blocked_entities add constraint blocked_entities_entity_type_check CHECK ((entity_type = ANY (ARRAY['user'::text, 'organization'::text, 'domain'::text, 'email'::text])));   -- check
alter table blocked_entities drop constraint if exists blocked_entities_created_by_fkey;
alter table blocked_entities add constraint blocked_entities_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table blocked_entities drop constraint if exists blocked_entities_pkey;
alter table blocked_entities add constraint blocked_entities_pkey PRIMARY KEY (id);   -- primary key

-- bundle_items
alter table bundle_items drop constraint if exists bundle_items_bundle_product_id_fkey;
alter table bundle_items add constraint bundle_items_bundle_product_id_fkey FOREIGN KEY (bundle_product_id) REFERENCES products(id) ON DELETE CASCADE;   -- foreign key
alter table bundle_items drop constraint if exists bundle_items_component_product_id_fkey;
alter table bundle_items add constraint bundle_items_component_product_id_fkey FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE;   -- foreign key
alter table bundle_items drop constraint if exists bundle_items_pkey;
alter table bundle_items add constraint bundle_items_pkey PRIMARY KEY (bundle_product_id, component_product_id);   -- primary key

-- categories
alter table categories drop constraint if exists categories_pkey;
alter table categories add constraint categories_pkey PRIMARY KEY (id);   -- primary key
alter table categories drop constraint if exists categories_slug_key;
alter table categories add constraint categories_slug_key UNIQUE (slug);   -- unique

-- deal_documents
alter table deal_documents drop constraint if exists deal_documents_deal_id_fkey;
alter table deal_documents add constraint deal_documents_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;   -- foreign key
alter table deal_documents drop constraint if exists deal_documents_uploader_id_fkey;
alter table deal_documents add constraint deal_documents_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table deal_documents drop constraint if exists deal_documents_pkey;
alter table deal_documents add constraint deal_documents_pkey PRIMARY KEY (id);   -- primary key

-- deal_events
alter table deal_events drop constraint if exists deal_events_actor_id_fkey;
alter table deal_events add constraint deal_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table deal_events drop constraint if exists deal_events_deal_id_fkey;
alter table deal_events add constraint deal_events_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;   -- foreign key
alter table deal_events drop constraint if exists deal_events_pkey;
alter table deal_events add constraint deal_events_pkey PRIMARY KEY (id);   -- primary key

-- deal_status_history
alter table deal_status_history drop constraint if exists deal_status_history_changed_by_fkey;
alter table deal_status_history add constraint deal_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table deal_status_history drop constraint if exists deal_status_history_deal_id_fkey;
alter table deal_status_history add constraint deal_status_history_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;   -- foreign key
alter table deal_status_history drop constraint if exists deal_status_history_pkey;
alter table deal_status_history add constraint deal_status_history_pkey PRIMARY KEY (id);   -- primary key

-- deals
alter table deals drop constraint if exists deals_stage_check;
alter table deals add constraint deals_stage_check CHECK ((stage = ANY (ARRAY['enquiry'::text, 'offer'::text, 'negotiation'::text, 'closed'::text, 'cancelled'::text])));   -- check
alter table deals drop constraint if exists deals_counterparty_id_fkey;
alter table deals add constraint deals_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table deals drop constraint if exists deals_initiator_id_fkey;
alter table deals add constraint deals_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table deals drop constraint if exists deals_listing_id_fkey;
alter table deals add constraint deals_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings_legacy_20260720(id) ON DELETE SET NULL;   -- foreign key
alter table deals drop constraint if exists deals_pkey;
alter table deals add constraint deals_pkey PRIMARY KEY (id);   -- primary key

-- fraud_flags
alter table fraud_flags drop constraint if exists fraud_flags_severity_check;
alter table fraud_flags add constraint fraud_flags_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));   -- check
alter table fraud_flags drop constraint if exists fraud_flags_status_check;
alter table fraud_flags add constraint fraud_flags_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewed'::text, 'cleared'::text])));   -- check
alter table fraud_flags drop constraint if exists fraud_flags_subject_type_check;
alter table fraud_flags add constraint fraud_flags_subject_type_check CHECK ((subject_type = ANY (ARRAY['user'::text, 'organization'::text, 'listing'::text, 'deal'::text])));   -- check
alter table fraud_flags drop constraint if exists fraud_flags_pkey;
alter table fraud_flags add constraint fraud_flags_pkey PRIMARY KEY (id);   -- primary key

-- listings_legacy_20260720
alter table listings_legacy_20260720 drop constraint if exists listings_listing_type_check;
alter table listings_legacy_20260720 add constraint listings_listing_type_check CHECK ((listing_type = ANY (ARRAY['offer'::text, 'request'::text])));   -- check
alter table listings_legacy_20260720 drop constraint if exists listings_moderation_status_check;
alter table listings_legacy_20260720 add constraint listings_moderation_status_check CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'flagged'::text, 'rejected'::text])));   -- check
alter table listings_legacy_20260720 drop constraint if exists listings_status_check;
alter table listings_legacy_20260720 add constraint listings_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'closed'::text])));   -- check
alter table listings_legacy_20260720 drop constraint if exists listings_organization_id_fkey;
alter table listings_legacy_20260720 add constraint listings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;   -- foreign key
alter table listings_legacy_20260720 drop constraint if exists listings_owner_id_fkey;
alter table listings_legacy_20260720 add constraint listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table listings_legacy_20260720 drop constraint if exists listings_pkey;
alter table listings_legacy_20260720 add constraint listings_pkey PRIMARY KEY (id);   -- primary key

-- messages
alter table messages drop constraint if exists messages_deal_id_fkey;
alter table messages add constraint messages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;   -- foreign key
alter table messages drop constraint if exists messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table messages drop constraint if exists messages_pkey;
alter table messages add constraint messages_pkey PRIMARY KEY (id);   -- primary key

-- newsletter_subscribers
alter table newsletter_subscribers drop constraint if exists newsletter_subscribers_pkey;
alter table newsletter_subscribers add constraint newsletter_subscribers_pkey PRIMARY KEY (id);   -- primary key
alter table newsletter_subscribers drop constraint if exists newsletter_subscribers_email_key;
alter table newsletter_subscribers add constraint newsletter_subscribers_email_key UNIQUE (email);   -- unique

-- notifications
alter table notifications drop constraint if exists notifications_profile_id_fkey;
alter table notifications add constraint notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table notifications drop constraint if exists notifications_pkey;
alter table notifications add constraint notifications_pkey PRIMARY KEY (id);   -- primary key

-- order_items
alter table order_items drop constraint if exists order_items_order_id_fkey;
alter table order_items add constraint order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;   -- foreign key
alter table order_items drop constraint if exists order_items_product_id_fkey;
alter table order_items add constraint order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);   -- foreign key
alter table order_items drop constraint if exists order_items_pkey;
alter table order_items add constraint order_items_pkey PRIMARY KEY (id);   -- primary key

-- order_notes
alter table order_notes drop constraint if exists order_notes_order_item_id_fkey;
alter table order_notes add constraint order_notes_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;   -- foreign key
alter table order_notes drop constraint if exists order_notes_pkey;
alter table order_notes add constraint order_notes_pkey PRIMARY KEY (id);   -- primary key

-- orders
alter table orders drop constraint if exists orders_capture_method_check;
alter table orders add constraint orders_capture_method_check CHECK ((capture_method = ANY (ARRAY['manual'::text, 'automatic'::text])));   -- check
alter table orders drop constraint if exists orders_status_v2_check;
alter table orders add constraint orders_status_v2_check CHECK ((status_v2 = ANY (ARRAY['authorized'::text, 'confirmed'::text, 'captured'::text, 'delivered'::text, 'voided'::text, 'refunded'::text])));   -- check
alter table orders drop constraint if exists orders_user_id_fkey;
alter table orders add constraint orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);   -- foreign key
alter table orders drop constraint if exists orders_pkey;
alter table orders add constraint orders_pkey PRIMARY KEY (id);   -- primary key
alter table orders drop constraint if exists orders_stripe_payment_intent_id_key;
alter table orders add constraint orders_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);   -- unique

-- organizations
alter table organizations drop constraint if exists organizations_risk_category_check;
alter table organizations add constraint organizations_risk_category_check CHECK ((risk_category = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'blocked'::text])));   -- check
alter table organizations drop constraint if exists organizations_trust_score_check;
alter table organizations add constraint organizations_trust_score_check CHECK (((trust_score >= 0) AND (trust_score <= 100)));   -- check
alter table organizations drop constraint if exists organizations_verification_level_check;
alter table organizations add constraint organizations_verification_level_check CHECK ((verification_level = ANY (ARRAY['unverified'::text, 'email_verified'::text, 'phone_verified'::text, 'company_verified'::text, 'fully_verified'::text])));   -- check
alter table organizations drop constraint if exists organizations_owner_id_fkey;
alter table organizations add constraint organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table organizations drop constraint if exists organizations_pkey;
alter table organizations add constraint organizations_pkey PRIMARY KEY (id);   -- primary key

-- products
alter table products drop constraint if exists products_capacity_kind_check;
alter table products add constraint products_capacity_kind_check CHECK ((capacity_kind = ANY (ARRAY['instant'::text, 'standard'::text, 'custom'::text, 'subscription'::text])));   -- check
alter table products drop constraint if exists products_category_id_fkey;
alter table products add constraint products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id);   -- foreign key
alter table products drop constraint if exists products_pkey;
alter table products add constraint products_pkey PRIMARY KEY (id);   -- primary key
alter table products drop constraint if exists products_sku_key;
alter table products add constraint products_sku_key UNIQUE (sku);   -- unique
alter table products drop constraint if exists products_slug_key;
alter table products add constraint products_slug_key UNIQUE (slug);   -- unique

-- saved_searches
alter table saved_searches drop constraint if exists saved_searches_profile_id_fkey;
alter table saved_searches add constraint saved_searches_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table saved_searches drop constraint if exists saved_searches_pkey;
alter table saved_searches add constraint saved_searches_pkey PRIMARY KEY (id);   -- primary key

-- schema_migrations
alter table schema_migrations drop constraint if exists schema_migrations_pkey;
alter table schema_migrations add constraint schema_migrations_pkey PRIMARY KEY (filename);   -- primary key

-- settlement_events
alter table settlement_events drop constraint if exists settlement_events_actor_id_fkey;
alter table settlement_events add constraint settlement_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table settlement_events drop constraint if exists settlement_events_milestone_id_fkey;
alter table settlement_events add constraint settlement_events_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES settlement_milestones(id) ON DELETE SET NULL;   -- foreign key
alter table settlement_events drop constraint if exists settlement_events_settlement_id_fkey;
alter table settlement_events add constraint settlement_events_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE;   -- foreign key
alter table settlement_events drop constraint if exists settlement_events_pkey;
alter table settlement_events add constraint settlement_events_pkey PRIMARY KEY (id);   -- primary key

-- settlement_milestones
alter table settlement_milestones drop constraint if exists settlement_milestones_status_check;
alter table settlement_milestones add constraint settlement_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'funded'::text, 'ready'::text, 'released'::text, 'refunded'::text, 'disputed'::text])));   -- check
alter table settlement_milestones drop constraint if exists settlement_milestones_trigger_type_check;
alter table settlement_milestones add constraint settlement_milestones_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['deposit'::text, 'shipment'::text, 'arrival'::text, 'inspection'::text, 'custom'::text])));   -- check
alter table settlement_milestones drop constraint if exists settlement_milestones_settlement_id_fkey;
alter table settlement_milestones add constraint settlement_milestones_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE;   -- foreign key
alter table settlement_milestones drop constraint if exists settlement_milestones_pkey;
alter table settlement_milestones add constraint settlement_milestones_pkey PRIMARY KEY (id);   -- primary key

-- settlements
alter table settlements drop constraint if exists settlements_status_check;
alter table settlements add constraint settlements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'funded'::text, 'partially_released'::text, 'released'::text, 'refunded'::text, 'disputed'::text, 'cancelled'::text])));   -- check
alter table settlements drop constraint if exists settlements_deal_id_fkey;
alter table settlements add constraint settlements_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;   -- foreign key
alter table settlements drop constraint if exists settlements_pkey;
alter table settlements add constraint settlements_pkey PRIMARY KEY (id);   -- primary key

-- subscriptions
alter table subscriptions drop constraint if exists subscriptions_billing_interval_check;
alter table subscriptions add constraint subscriptions_billing_interval_check CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text])));   -- check
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check CHECK ((plan = ANY (ARRAY['starter'::text, 'pro'::text, 'enterprise'::text])));   -- check
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['inactive'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text])));   -- check
alter table subscriptions drop constraint if exists subscriptions_profile_id_fkey;
alter table subscriptions add constraint subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table subscriptions drop constraint if exists subscriptions_pkey;
alter table subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);   -- primary key
alter table subscriptions drop constraint if exists subscriptions_stripe_subscription_id_key;
alter table subscriptions add constraint subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);   -- unique

-- trust_score_events
alter table trust_score_events drop constraint if exists trust_score_events_new_score_check;
alter table trust_score_events add constraint trust_score_events_new_score_check CHECK (((new_score >= 0) AND (new_score <= 100)));   -- check
alter table trust_score_events drop constraint if exists trust_score_events_created_by_fkey;
alter table trust_score_events add constraint trust_score_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table trust_score_events drop constraint if exists trust_score_events_organization_id_fkey;
alter table trust_score_events add constraint trust_score_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;   -- foreign key
alter table trust_score_events drop constraint if exists trust_score_events_profile_id_fkey;
alter table trust_score_events add constraint trust_score_events_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;   -- foreign key
alter table trust_score_events drop constraint if exists trust_score_events_pkey;
alter table trust_score_events add constraint trust_score_events_pkey PRIMARY KEY (id);   -- primary key

-- user_reports
alter table user_reports drop constraint if exists user_reports_status_check;
alter table user_reports add constraint user_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'dismissed'::text])));   -- check
alter table user_reports drop constraint if exists user_reports_target_type_check;
alter table user_reports add constraint user_reports_target_type_check CHECK ((target_type = ANY (ARRAY['user'::text, 'listing'::text, 'deal'::text])));   -- check
alter table user_reports drop constraint if exists user_reports_reporter_id_fkey;
alter table user_reports add constraint user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table user_reports drop constraint if exists user_reports_resolved_by_fkey;
alter table user_reports add constraint user_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL;   -- foreign key
alter table user_reports drop constraint if exists user_reports_pkey;
alter table user_reports add constraint user_reports_pkey PRIMARY KEY (id);   -- primary key

-- ============================================================ INDEXES

-- Indexes that back a primary key or unique constraint are created by the
-- constraint above and are not repeated here.

create UNIQUE index if not exists adamftd_usage_unique ON public.adamftd_usage USING btree (profile_id, period);
create index if not exists adamftd_checks_cache_idx ON public.adamftd_verification_checks USING btree (cache_key);
create index if not exists adamftd_checks_requester_idx ON public.adamftd_verification_checks USING btree (requester_id);
create index if not exists analytics_events_created_idx ON public.analytics_events USING btree (created_at);
create index if not exists analytics_events_event_idx ON public.analytics_events USING btree (event, created_at);
create index if not exists audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);
create index if not exists audit_logs_created_idx ON public.audit_logs USING btree (created_at);
create UNIQUE index if not exists blocked_entities_unique ON public.blocked_entities USING btree (entity_type, value);
create index if not exists deal_documents_deal_idx ON public.deal_documents USING btree (deal_id);
create index if not exists deal_events_deal_idx ON public.deal_events USING btree (deal_id, created_at);
create index if not exists deals_counterparty_idx ON public.deals USING btree (counterparty_id);
create index if not exists deals_initiator_idx ON public.deals USING btree (initiator_id);
create index if not exists deals_listing_idx ON public.deals USING btree (listing_id);
create index if not exists fraud_flags_status_idx ON public.fraud_flags USING btree (status);
create index if not exists fraud_flags_subject_idx ON public.fraud_flags USING btree (subject_type, subject_id);
create index if not exists listings_commodity_idx ON public.listings_legacy_20260720 USING btree (commodity);
create index if not exists listings_origin_idx ON public.listings_legacy_20260720 USING btree (origin_country);
create index if not exists listings_owner_idx ON public.listings_legacy_20260720 USING btree (owner_id);
create index if not exists listings_status_idx ON public.listings_legacy_20260720 USING btree (status);
create index if not exists messages_deal_idx ON public.messages USING btree (deal_id);
create index if not exists notifications_profile_idx ON public.notifications USING btree (profile_id, read);
create index if not exists order_items_slot_date_idx ON public.order_items USING btree (slot_date);
create index if not exists orders_capture_deadline_idx ON public.orders USING btree (capture_deadline_at) WHERE (status_v2 = 'authorized'::text);
create index if not exists orders_status_v2_idx ON public.orders USING btree (status_v2);
create index if not exists saved_searches_profile_idx ON public.saved_searches USING btree (profile_id);
create index if not exists settlement_events_idx ON public.settlement_events USING btree (settlement_id, created_at);
create index if not exists settlement_milestones_idx ON public.settlement_milestones USING btree (settlement_id, seq);
create index if not exists settlements_deal_idx ON public.settlements USING btree (deal_id);
create UNIQUE index if not exists subscriptions_active_unique ON public.subscriptions USING btree (profile_id) WHERE (status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text]));
create index if not exists subscriptions_profile_idx ON public.subscriptions USING btree (profile_id);
create index if not exists trust_score_events_profile_idx ON public.trust_score_events USING btree (profile_id);
create index if not exists user_reports_status_idx ON public.user_reports USING btree (status);
create index if not exists user_reports_target_idx ON public.user_reports USING btree (target_type, target_id);

-- ============================================================ ROW LEVEL SECURITY

alter table adamftd_usage enable row level security;
drop policy if exists "own usage" on adamftd_usage;
create policy "own usage" on adamftd_usage for select to public
  using (((profile_id = auth.uid()) OR is_admin()));

alter table adamftd_verification_checks enable row level security;
drop policy if exists "own adamftd checks" on adamftd_verification_checks;
create policy "own adamftd checks" on adamftd_verification_checks for select to public
  using (((requester_id = auth.uid()) OR is_admin()));

alter table analytics_events enable row level security;
drop policy if exists "admin reads analytics" on analytics_events;
create policy "admin reads analytics" on analytics_events for select to public
  using (is_admin());

alter table audit_logs enable row level security;
drop policy if exists "admin audit" on audit_logs;
create policy "admin audit" on audit_logs for select to public
  using (is_admin());

alter table blocked_entities enable row level security;
drop policy if exists "admin blocked" on blocked_entities;
create policy "admin blocked" on blocked_entities for all to public
  using (is_admin())
  with check (is_admin());

alter table bundle_items enable row level security;
drop policy if exists "bundle_items readable" on bundle_items;
create policy "bundle_items readable" on bundle_items for select to public
  using (true);

alter table categories enable row level security;
drop policy if exists "admin manage categories" on categories;
create policy "admin manage categories" on categories for all to public
  using (is_admin())
  with check (is_admin());
drop policy if exists "categories readable" on categories;
create policy "categories readable" on categories for select to public
  using (true);

alter table deal_documents enable row level security;
drop policy if exists "deal documents read" on deal_documents;
create policy "deal documents read" on deal_documents for select to public
  using ((is_deal_participant(deal_id) OR is_admin()));

alter table deal_events enable row level security;
drop policy if exists "deal events read" on deal_events;
create policy "deal events read" on deal_events for select to public
  using ((is_deal_participant(deal_id) OR is_admin()));

alter table deal_status_history enable row level security;
drop policy if exists "deal history read" on deal_status_history;
create policy "deal history read" on deal_status_history for select to public
  using ((is_deal_participant(deal_id) OR is_admin()));

alter table deals enable row level security;
drop policy if exists "deal initiator creates" on deals;
create policy "deal initiator creates" on deals for insert to public
  with check ((initiator_id = auth.uid()));
drop policy if exists "deal participants read" on deals;
create policy "deal participants read" on deals for select to public
  using (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR is_admin()));
drop policy if exists "deal participants update" on deals;
create policy "deal participants update" on deals for update to public
  using (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR is_admin()))
  with check (((initiator_id = auth.uid()) OR (counterparty_id = auth.uid()) OR is_admin()));

alter table fraud_flags enable row level security;
drop policy if exists "admin fraud" on fraud_flags;
create policy "admin fraud" on fraud_flags for all to public
  using (is_admin())
  with check (is_admin());

alter table listings_legacy_20260720 enable row level security;
drop policy if exists "listings public read" on listings_legacy_20260720;
create policy "listings public read" on listings_legacy_20260720 for select to public
  using ((((status = 'active'::text) AND (moderation_status = 'approved'::text)) OR (owner_id = auth.uid()) OR is_admin()));
drop policy if exists "owner manages listing" on listings_legacy_20260720;
create policy "owner manages listing" on listings_legacy_20260720 for all to public
  using (((owner_id = auth.uid()) OR is_admin()))
  with check (((owner_id = auth.uid()) OR is_admin()));

alter table messages enable row level security;
drop policy if exists "deal messages read" on messages;
create policy "deal messages read" on messages for select to public
  using ((is_deal_participant(deal_id) OR is_admin()));
drop policy if exists "deal messages send" on messages;
create policy "deal messages send" on messages for insert to public
  with check (((sender_id = auth.uid()) AND is_deal_participant(deal_id)));

alter table newsletter_subscribers enable row level security;
-- newsletter_subscribers: no policy. With RLS enabled that is deny-all to anon and authenticated.

alter table notifications enable row level security;
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for select to public
  using ((profile_id = auth.uid()));
drop policy if exists "own notifications update" on notifications;
create policy "own notifications update" on notifications for update to public
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

alter table order_items enable row level security;
drop policy if exists "own order items" on order_items;
create policy "own order items" on order_items for select to public
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid()))))));

alter table order_notes enable row level security;
drop policy if exists "admin order notes" on order_notes;
create policy "admin order notes" on order_notes for all to public
  using (is_admin())
  with check (is_admin());

alter table orders enable row level security;
drop policy if exists "own orders" on orders;
create policy "own orders" on orders for select to public
  using (((user_id = auth.uid()) OR is_admin()));

alter table organizations enable row level security;
drop policy if exists "orgs readable" on organizations;
create policy "orgs readable" on organizations for select to public
  using (true);
drop policy if exists "owner manages org" on organizations;
create policy "owner manages org" on organizations for all to public
  using (((owner_id = auth.uid()) OR is_admin()))
  with check (((owner_id = auth.uid()) OR is_admin()));

alter table products enable row level security;
drop policy if exists "admin manage products" on products;
create policy "admin manage products" on products for all to public
  using (is_admin())
  with check (is_admin());
drop policy if exists "products readable" on products;
create policy "products readable" on products for select to public
  using (((status = 'published'::text) OR is_admin()));

alter table saved_searches enable row level security;
drop policy if exists "create saved search" on saved_searches;
create policy "create saved search" on saved_searches for insert to public
  with check ((profile_id = auth.uid()));
drop policy if exists "delete saved search" on saved_searches;
create policy "delete saved search" on saved_searches for delete to public
  using ((profile_id = auth.uid()));
drop policy if exists "own saved searches" on saved_searches;
create policy "own saved searches" on saved_searches for select to public
  using ((profile_id = auth.uid()));

alter table schema_migrations enable row level security;
-- schema_migrations: no policy. With RLS enabled that is deny-all to anon and authenticated.

alter table settlement_events enable row level security;
drop policy if exists "settlement events read" on settlement_events;
create policy "settlement events read" on settlement_events for select to public
  using ((EXISTS ( SELECT 1
   FROM settlements s
  WHERE ((s.id = settlement_events.settlement_id) AND (is_deal_participant(s.deal_id) OR is_admin())))));

alter table settlement_milestones enable row level security;
drop policy if exists "settlement milestones read" on settlement_milestones;
create policy "settlement milestones read" on settlement_milestones for select to public
  using ((EXISTS ( SELECT 1
   FROM settlements s
  WHERE ((s.id = settlement_milestones.settlement_id) AND (is_deal_participant(s.deal_id) OR is_admin())))));

alter table settlements enable row level security;
drop policy if exists "settlement participants read" on settlements;
create policy "settlement participants read" on settlements for select to public
  using ((is_deal_participant(deal_id) OR is_admin()));

alter table subscriptions enable row level security;
drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions for select to public
  using (((profile_id = auth.uid()) OR is_admin()));

alter table trust_score_events enable row level security;
drop policy if exists "own trust events" on trust_score_events;
create policy "own trust events" on trust_score_events for select to public
  using (((profile_id = auth.uid()) OR is_admin()));

alter table user_reports enable row level security;
drop policy if exists "file report" on user_reports;
create policy "file report" on user_reports for insert to public
  with check ((reporter_id = auth.uid()));
drop policy if exists "read own reports" on user_reports;
create policy "read own reports" on user_reports for select to public
  using (((reporter_id = auth.uid()) OR is_admin()));

-- ============================================================ GRANTS
--
-- Not emitted, and the omission is deliberate rather than an oversight.
--
-- Supabase's default privileges give `anon` and `authenticated` all seven table
-- privileges on every new table in `public`, and in this database 51 of the 52
-- tables carry exactly that. It is not the hole it looks like: RLS is the
-- control, the grant only decides whether PostgREST will attempt the query at
-- all, and every one of those 51 tables has RLS enabled. Re-creating them
-- elsewhere reproduces the same grants without a line here.
--
-- `schema_migrations` is the one exception and is stated above: RLS enabled with
-- no policy, and `anon` and `authenticated` revoked outright, because it had RLS
-- DISABLED with the default grants and was therefore readable and writable
-- through the public API by anyone holding the anon key. See
-- supabase/migrations/20260728b_schema_migrations_rls.sql.
--
-- The lesson worth carrying: a default grant is only harmless while RLS is on.
-- Check both, on any table that is not created by a reviewed migration.

-- ============================================================ COMMENTS

comment on table schema_migrations is 'Ledger of which migration files have been applied to this database. Written only by scripts/apply-migration.mjs and scripts/db-query.mjs, both of which connect as postgres. RLS enabled with no policy, and anon and authenticated hold no privileges: this is the record auditors read, so nothing that reaches the public API may read or write it.';
