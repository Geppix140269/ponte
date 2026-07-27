-- Issue 42 Phase A - read-only production reconciliation probe
--
-- Purpose:
--   Record the current production schema, policies, lifecycle values, active
--   counts, HS coverage, provenance and drift before any Phase B contract or
--   database migration is proposed.
--
-- Safety:
--   Every executable statement in this file is SELECT-only.
--   Run through an authorised production read connection or Supabase SQL editor.
--   Do not add UPDATE, INSERT, DELETE, ALTER, DROP, CREATE, GRANT or SECURITY
--   DEFINER statements to this file.
--
-- Execution record to capture with the output:
--   project/ref:
--   executed_at UTC:
--   executed_by:
--   database role:
--   deployed application commit:
--
-- Some sections use columns expected from the current repository. Run sections
-- 1-4 first. If a later section fails because production differs, record the
-- error as schema drift and do not modify production to make the probe pass.

-- ============================================================================
-- 1. Server identity and timestamp
-- ============================================================================

select
  current_database() as database_name,
  current_user as database_user,
  current_setting('server_version') as server_version,
  now() at time zone 'utc' as probed_at_utc;

-- ============================================================================
-- 2. Relevant table existence, RLS and estimated size
-- ============================================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relname in (
    'listings',
    'desk_radar',
    'signal_investigations',
    'listing_connections',
    'profiles',
    'verifications',
    'hs_codes',
    'anonymous_drafts',
    'tombstones',
    'schema_migrations'
  )
order by c.relname;

-- ============================================================================
-- 3. Columns and types
-- ============================================================================

select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'listings',
    'desk_radar',
    'signal_investigations',
    'listing_connections',
    'profiles',
    'verifications',
    'hs_codes',
    'anonymous_drafts',
    'tombstones'
  )
order by table_name, ordinal_position;

-- Focused type check for a known repository ambiguity. The seed script writes
-- profiles.verification_level as a text enum, while the current publication
-- eligibility code converts it with JavaScript Number(...). Record the live type
-- and stored values before any remediation is considered.
select
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('verification_level', 'business_verification_id');

-- ============================================================================
-- 4. Constraints, indexes, triggers, policies and relevant functions
-- ============================================================================

select
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'listings', 'desk_radar', 'signal_investigations',
    'listing_connections', 'profiles', 'verifications', 'hs_codes'
  )
order by c.relname, con.conname;

select
  tablename as table_name,
  indexname as index_name,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'listings', 'desk_radar', 'signal_investigations',
    'listing_connections', 'profiles', 'verifications', 'hs_codes'
  )
order by tablename, indexname;

select
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'listings', 'desk_radar', 'signal_investigations',
    'listing_connections', 'profiles', 'verifications'
  )
order by event_object_table, trigger_name, event_manipulation;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'listings', 'desk_radar', 'signal_investigations',
    'listing_connections', 'profiles', 'verifications', 'hs_codes'
  )
order by tablename, policyname;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_admin',
    'sync_investigation_count',
    'handle_new_user'
  )
order by p.proname, arguments;

-- ============================================================================
-- 5. Migration ledger
-- ============================================================================

select *
from public.schema_migrations
order by 1;

-- If the ledger table has a different shape or name, record that as drift rather
-- than changing it during this probe.

-- ============================================================================
-- 6. Stored lifecycle and legacy classification vocabularies
-- ============================================================================

select status, count(*) as records
from public.listings
group by status
order by status;

select type, count(*) as records
from public.listings
group by type
order by type;

select status, side, count(*) as records
from public.desk_radar
group by status, side
order by status, side;

select request_kind, status, count(*) as records
from public.signal_investigations
group by request_kind, status
order by request_kind, status;

select
  verification_level::text as verification_level,
  count(*) as profiles
from public.profiles
group by verification_level::text
order by verification_level::text;

select purpose, status, count(*) as verifications
from public.verifications
group by purpose, status
order by purpose, status;

-- ============================================================================
-- 7. Raw counts and date ranges
-- ============================================================================

select
  count(*) as total_listings,
  min(created_at) as earliest_created_at,
  max(created_at) as latest_created_at,
  count(*) filter (where desk_managed is true) as desk_managed
from public.listings;

select
  count(*) as total_signals,
  min(spotted_at) as earliest_spotted_at,
  max(spotted_at) as latest_spotted_at,
  count(*) filter (where canonical_signal_id is not null) as canonical_ids,
  count(*) filter (where import_batch is not null) as imported_rows
from public.desk_radar;

select
  count(*) as total_investigations,
  min(created_at) as earliest_created_at,
  max(created_at) as latest_created_at
from public.signal_investigations;

-- ============================================================================
-- 8. Public Market Signal count using current application semantics
-- ============================================================================

select
  count(*) as currently_public_signals,
  count(*) filter (where side = 'requirement') as requirements,
  count(*) filter (where side = 'offer') as offers,
  count(*) filter (where hs_code is not null) as with_hs_code,
  count(*) filter (where hs_code is null) as without_hs_code,
  min(spotted_at) as oldest_spotted_at,
  max(spotted_at) as newest_spotted_at,
  min(public_expires_at) as next_or_oldest_public_expiry,
  max(public_expires_at) as latest_public_expiry
from public.desk_radar
where status = 'approved_signal'
  and (public_expires_at is null or public_expires_at > now());

-- Approved signal rows whose stored status and public expiry disagree.
select
  status,
  count(*) as records
from public.desk_radar
where
  (status = 'approved_signal' and public_expires_at is not null and public_expires_at <= now())
  or (status <> 'approved_signal' and public_expires_at is not null and public_expires_at > now())
group by status
order by status;

-- ============================================================================
-- 9. Member listing visibility layers
-- ============================================================================

-- Layer 1: what the current head count reports.
select count(*) as approved_status_count
from public.listings
where status = 'approved';

-- Layer 2: status plus validity and 90-day reconfirmation, matching the current
-- row-level public currency rule.
select count(*) as approved_and_current_count
from public.listings l
where l.status = 'approved'
  and (l.valid_until is null or l.valid_until > current_date)
  and l.reconfirmed_at is not null
  and l.reconfirmed_at > now() - interval '90 days';

-- Layer 3: status, currency and bound passing member-business verification.
-- This reports eligibility without making assumptions about the meaning of the
-- profile verification_level enum.
select count(*) as approved_current_and_bound_verification_count
from public.listings l
join public.profiles p on p.id = l.user_id
join public.verifications v on v.id = p.business_verification_id
where l.status = 'approved'
  and (l.valid_until is null or l.valid_until > current_date)
  and l.reconfirmed_at is not null
  and l.reconfirmed_at > now() - interval '90 days'
  and v.purpose = 'member_business'
  and v.status in ('auto_verified', 'verified');

-- Level values on owners of approved/current records. This is the evidence
-- needed to reconcile the text enum with the current Number(...) code path.
select
  p.verification_level::text as verification_level,
  count(*) as approved_current_listings
from public.listings l
join public.profiles p on p.id = l.user_id
where l.status = 'approved'
  and (l.valid_until is null or l.valid_until > current_date)
  and l.reconfirmed_at is not null
  and l.reconfirmed_at > now() - interval '90 days'
group by p.verification_level::text
order by p.verification_level::text;

-- Records counted by the head count but hidden by at least one row-level current
-- rule, before considering owner verification.
select
  count(*) filter (where valid_until is not null and valid_until <= current_date) as expired_by_valid_until,
  count(*) filter (
    where reconfirmed_at is null
       or reconfirmed_at <= now() - interval '90 days'
  ) as stale_by_reconfirmation,
  count(*) filter (
    where (valid_until is not null and valid_until <= current_date)
       or reconfirmed_at is null
       or reconfirmed_at <= now() - interval '90 days'
  ) as hidden_by_either_current_rule
from public.listings
where status = 'approved';

-- ============================================================================
-- 10. Legacy member types versus accepted canonical intents
-- ============================================================================

select
  type,
  count(*) as total,
  count(*) filter (where status = 'approved') as approved,
  count(*) filter (where hs_code is not null) as with_hs_code,
  count(*) filter (where product is null or btrim(product) = '') as missing_product
from public.listings
group by type
order by type;

-- Service rows reveal whether the current product/HS-shaped composer has stored
-- product classifications on services.
select
  count(*) as service_rows,
  count(*) filter (where hs_code is not null) as service_rows_with_hs,
  count(*) filter (where origin is not null) as service_rows_with_origin,
  count(*) filter (where destination is not null) as service_rows_with_destination,
  count(*) filter (where status = 'approved') as approved_service_rows
from public.listings
where type = 'service';

-- Search for possible latent distribution records by legacy wording only. This
-- is discovery evidence, not a classification or backfill instruction.
select
  id,
  ref,
  type,
  status,
  product,
  created_at
from public.listings
where coalesce(product, '') || ' ' || coalesce(details, '') ilike any (
  array[
    '%distributor%', '%distribution%', '%commercial agent%', '%representative%',
    '%representation%', '%reseller%', '%route to market%', '%market entry partner%'
  ]
)
order by created_at desc
limit 200;

select
  id,
  canonical_signal_id,
  side,
  status,
  product,
  category,
  spotted_at
from public.desk_radar
where coalesce(product, '') || ' ' || coalesce(summary_line, '') || ' ' || coalesce(ai_description, '') ilike any (
  array[
    '%distributor%', '%distribution%', '%commercial agent%', '%representative%',
    '%representation%', '%reseller%', '%route to market%', '%market entry partner%'
  ]
)
order by spotted_at desc
limit 200;

-- ============================================================================
-- 11. HS and sector coverage
-- ============================================================================

select
  count(*) as hs_catalog_rows,
  count(distinct chapter) as hs_chapters,
  min(code) as first_code,
  max(code) as last_code
from public.hs_codes;

select
  'listings' as source,
  count(*) as active_records,
  count(*) filter (where hs_code is not null) as with_hs_code,
  count(*) filter (where hs_code is null) as without_hs_code,
  round(
    100.0 * count(*) filter (where hs_code is not null) / nullif(count(*), 0),
    2
  ) as hs_coverage_pct
from public.listings
where status = 'approved'
union all
select
  'desk_radar' as source,
  count(*) as active_records,
  count(*) filter (where hs_code is not null) as with_hs_code,
  count(*) filter (where hs_code is null) as without_hs_code,
  round(
    100.0 * count(*) filter (where hs_code is not null) / nullif(count(*), 0),
    2
  ) as hs_coverage_pct
from public.desk_radar
where status = 'approved_signal'
  and (public_expires_at is null or public_expires_at > now());

-- Coverage by two-digit chapter for public records.
select
  source,
  chapter,
  count(*) as records
from (
  select 'listings'::text as source, left(regexp_replace(hs_code, '[^0-9]', '', 'g'), 2) as chapter
  from public.listings
  where status = 'approved' and hs_code is not null
  union all
  select 'desk_radar'::text as source, left(regexp_replace(hs_code, '[^0-9]', '', 'g'), 2) as chapter
  from public.desk_radar
  where status = 'approved_signal'
    and (public_expires_at is null or public_expires_at > now())
    and hs_code is not null
) x
group by source, chapter
order by source, chapter;

-- Records in the deliberately unassigned HS chapters.
select
  source,
  chapter,
  count(*) as records
from (
  select 'listings'::text as source, left(regexp_replace(hs_code, '[^0-9]', '', 'g'), 2) as chapter
  from public.listings
  where status = 'approved' and hs_code is not null
  union all
  select 'desk_radar'::text as source, left(regexp_replace(hs_code, '[^0-9]', '', 'g'), 2) as chapter
  from public.desk_radar
  where status = 'approved_signal'
    and (public_expires_at is null or public_expires_at > now())
    and hs_code is not null
) x
where chapter in ('71', '91', '92')
group by source, chapter
order by source, chapter;

-- HS values that do not resolve to the official catalog.
select 'listings' as source, l.hs_code, count(*) as records
from public.listings l
left join public.hs_codes h on h.code = regexp_replace(l.hs_code, '[^0-9]', '', 'g')
where l.hs_code is not null and h.code is null
group by l.hs_code
union all
select 'desk_radar' as source, d.hs_code, count(*) as records
from public.desk_radar d
left join public.hs_codes h on h.code = regexp_replace(d.hs_code, '[^0-9]', '', 'g')
where d.hs_code is not null and h.code is null
group by d.hs_code
order by source, hs_code;

-- Imported public signals that have source categories but no HS classification.
select
  import_batch,
  category,
  count(*) as records
from public.desk_radar
where status = 'approved_signal'
  and (public_expires_at is null or public_expires_at > now())
  and hs_code is null
  and category is not null
  and btrim(category) <> ''
group by import_batch, category
order by import_batch, records desc, category;

-- ============================================================================
-- 12. Provenance coverage and source batches
-- ============================================================================

select
  import_batch,
  source_platform,
  status,
  count(*) as records,
  count(*) filter (where canonical_signal_id is not null) as with_canonical_id,
  count(*) filter (where source_url is not null) as with_source_url,
  count(*) filter (where raw_description is not null) as with_raw_description,
  count(*) filter (where import_meta is not null) as with_import_meta,
  min(spotted_at) as earliest_spotted_at,
  max(spotted_at) as latest_spotted_at,
  min(public_expires_at) as earliest_public_expiry,
  max(public_expires_at) as latest_public_expiry
from public.desk_radar
group by import_batch, source_platform, status
order by import_batch nulls first, source_platform nulls first, status;

-- Provenance gaps on imported rows.
select
  count(*) filter (where canonical_signal_id is null) as no_canonical_id,
  count(*) filter (where source_platform is null) as no_source_platform,
  count(*) filter (where source_url is null) as no_source_url,
  count(*) filter (where import_meta is null) as no_import_meta,
  count(*) filter (where dedupe_key is null) as no_dedupe_key
from public.desk_radar
where import_batch is not null;

-- ============================================================================
-- 13. Duplicate and identity checks
-- ============================================================================

select canonical_signal_id, count(*) as duplicates
from public.desk_radar
where canonical_signal_id is not null
group by canonical_signal_id
having count(*) > 1
order by duplicates desc, canonical_signal_id;

select dedupe_key, count(*) as duplicates
from public.desk_radar
where dedupe_key is not null
group by dedupe_key
having count(*) > 1
order by duplicates desc, dedupe_key;

select signal_id, requester_id, request_kind, count(*) as duplicates
from public.signal_investigations
group by signal_id, requester_id, request_kind
having count(*) > 1
order by duplicates desc;

-- Reconcile the denormalised investigation count with the true rows.
select
  d.id as signal_id,
  d.investigation_count as stored_count,
  count(i.id) as actual_count
from public.desk_radar d
left join public.signal_investigations i on i.signal_id = d.id
group by d.id, d.investigation_count
having d.investigation_count <> count(i.id)
order by d.id;

-- ============================================================================
-- 14. Signal action versus standalone member inventory
-- ============================================================================

select
  request_kind,
  requester_type,
  count(*) as records,
  count(*) filter (where capability is not null and btrim(capability) <> '') as with_capability,
  count(*) filter (where establish_goal is not null and btrim(establish_goal) <> '') as with_establish_goal,
  count(*) filter (where contact_phone is not null and btrim(contact_phone) <> '') as with_phone
from public.signal_investigations
group by request_kind, requester_type
order by request_kind, requester_type;

-- This probe deliberately does not count capability declarations as Member
-- Opportunities. It records them as actions linked to Market Signals.

-- ============================================================================
-- 15. Production evidence summary values for the Phase A report
-- ============================================================================

with
public_signals as (
  select count(*)::bigint as n
  from public.desk_radar
  where status = 'approved_signal'
    and (public_expires_at is null or public_expires_at > now())
),
approved_listings as (
  select count(*)::bigint as n
  from public.listings
  where status = 'approved'
),
current_listings as (
  select count(*)::bigint as n
  from public.listings
  where status = 'approved'
    and (valid_until is null or valid_until > current_date)
    and reconfirmed_at is not null
    and reconfirmed_at > now() - interval '90 days'
),
service_listings as (
  select count(*)::bigint as n
  from public.listings
  where status = 'approved' and type = 'service'
),
classified_signals as (
  select count(*)::bigint as n
  from public.desk_radar
  where status = 'approved_signal'
    and (public_expires_at is null or public_expires_at > now())
    and hs_code is not null
)
select
  public_signals.n as public_market_signals,
  approved_listings.n as approved_listing_head_count,
  current_listings.n as approved_current_listing_count_before_owner_eligibility,
  service_listings.n as approved_legacy_service_listings,
  classified_signals.n as public_signals_with_hs_code
from public_signals, approved_listings, current_listings, service_listings, classified_signals;
