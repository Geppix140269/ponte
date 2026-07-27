-- Issue 42 Phase A - compact read-only production follow-up probe
--
-- This is the low-friction companion to PRODUCTION-PROBE.sql.
-- It returns ONE result table with one JSON payload per section, so the complete
-- result can be copied or exported in one action from the Supabase SQL Editor.
--
-- Safety: SELECT-only. It does not expose contact details, raw descriptions,
-- counterparty identities, source URLs or individual member records.

with
relevant_tables as (
  select unnest(array[
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
  ]) as table_name
),
table_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', r.table_name,
    'exists', c.oid is not null,
    'rls_enabled', coalesce(c.relrowsecurity, false),
    'rls_forced', coalesce(c.relforcerowsecurity, false),
    'estimated_rows', coalesce(c.reltuples::bigint, 0)
  ) order by r.table_name), '[]'::jsonb) as payload
  from relevant_tables r
  left join pg_class c on c.relname = r.table_name and c.relkind in ('r', 'p')
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
),
column_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', table_name,
    'position', ordinal_position,
    'column', column_name,
    'data_type', data_type,
    'udt_name', udt_name,
    'nullable', is_nullable,
    'default', column_default
  ) order by table_name, ordinal_position), '[]'::jsonb) as payload
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (select table_name from relevant_tables where table_name <> 'schema_migrations')
),
constraint_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', c.relname,
    'name', con.conname,
    'type', con.contype,
    'definition', pg_get_constraintdef(con.oid, true)
  ) order by c.relname, con.conname), '[]'::jsonb) as payload
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'listings', 'desk_radar', 'signal_investigations',
      'listing_connections', 'profiles', 'verifications', 'hs_codes'
    )
),
index_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', tablename,
    'name', indexname,
    'definition', indexdef
  ) order by tablename, indexname), '[]'::jsonb) as payload
  from pg_indexes
  where schemaname = 'public'
    and tablename in (
      'listings', 'desk_radar', 'signal_investigations',
      'listing_connections', 'profiles', 'verifications', 'hs_codes'
    )
),
trigger_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', event_object_table,
    'name', trigger_name,
    'event', event_manipulation,
    'timing', action_timing,
    'statement', action_statement
  ) order by event_object_table, trigger_name, event_manipulation), '[]'::jsonb) as payload
  from information_schema.triggers
  where trigger_schema = 'public'
    and event_object_table in (
      'listings', 'desk_radar', 'signal_investigations',
      'listing_connections', 'profiles', 'verifications'
    )
),
policy_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', tablename,
    'name', policyname,
    'permissive', permissive,
    'roles', roles,
    'command', cmd,
    'using', qual,
    'with_check', with_check
  ) order by tablename, policyname), '[]'::jsonb) as payload
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'listings', 'desk_radar', 'signal_investigations',
      'listing_connections', 'profiles', 'verifications', 'hs_codes'
    )
),
function_inventory as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.proname,
    'arguments', pg_get_function_identity_arguments(p.oid),
    'security_definer', p.prosecdef,
    'settings', p.proconfig
  ) order by p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb) as payload
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_admin', 'sync_investigation_count', 'handle_new_user')
),
listing_statuses as (
  select coalesce(jsonb_object_agg(status, records order by status), '{}'::jsonb) as payload
  from (select status, count(*) as records from public.listings group by status) x
),
listing_types as (
  select coalesce(jsonb_object_agg(type, records order by type), '{}'::jsonb) as payload
  from (select type, count(*) as records from public.listings group by type) x
),
signal_status_sides as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'status', status,
    'side', side,
    'records', records
  ) order by status, side), '[]'::jsonb) as payload
  from (
    select status, side, count(*) as records
    from public.desk_radar
    group by status, side
  ) x
),
investigation_vocab as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'request_kind', request_kind,
    'status', status,
    'records', records
  ) order by request_kind, status), '[]'::jsonb) as payload
  from (
    select request_kind, status, count(*) as records
    from public.signal_investigations
    group by request_kind, status
  ) x
),
verification_levels as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'verification_level', coalesce(verification_level::text, '<null>'),
    'profiles', profiles
  ) order by coalesce(verification_level::text, '<null>')), '[]'::jsonb) as payload
  from (
    select verification_level, count(*) as profiles
    from public.profiles
    group by verification_level
  ) x
),
verification_vocab as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'purpose', coalesce(purpose, '<null>'),
    'status', coalesce(status, '<null>'),
    'records', records
  ) order by coalesce(purpose, '<null>'), coalesce(status, '<null>')), '[]'::jsonb) as payload
  from (
    select purpose, status, count(*) as records
    from public.verifications
    group by purpose, status
  ) x
),
public_signals as (
  select *
  from public.desk_radar
  where status = 'approved_signal'
    and (public_expires_at is null or public_expires_at > now())
),
listing_visibility as (
  select jsonb_build_object(
    'approved_head', (select count(*) from public.listings where status = 'approved'),
    'approved_current', (
      select count(*)
      from public.listings l
      where l.status = 'approved'
        and (l.valid_until is null or l.valid_until > current_date)
        and l.reconfirmed_at is not null
        and l.reconfirmed_at > now() - interval '90 days'
    ),
    'approved_current_bound_passing_business_verification', (
      select count(*)
      from public.listings l
      join public.profiles p on p.id = l.user_id
      join public.verifications v on v.id = p.business_verification_id
      where l.status = 'approved'
        and (l.valid_until is null or l.valid_until > current_date)
        and l.reconfirmed_at is not null
        and l.reconfirmed_at > now() - interval '90 days'
        and v.purpose = 'member_business'
        and v.status in ('auto_verified', 'verified')
    ),
    'approved_owner_levels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'verification_level', coalesce(verification_level, '<null>'),
        'records', records
      ) order by coalesce(verification_level, '<null>')), '[]'::jsonb)
      from (
        select p.verification_level::text as verification_level, count(*) as records
        from public.listings l
        join public.profiles p on p.id = l.user_id
        where l.status = 'approved'
          and (l.valid_until is null or l.valid_until > current_date)
          and l.reconfirmed_at is not null
          and l.reconfirmed_at > now() - interval '90 days'
        group by p.verification_level::text
      ) levels
    )
  ) as payload
),
record_counts as (
  select jsonb_build_object(
    'total_listings', (select count(*) from public.listings),
    'desk_managed_listings', (select count(*) from public.listings where desk_managed is true),
    'total_signals', (select count(*) from public.desk_radar),
    'public_signals', (select count(*) from public_signals),
    'public_signal_requirements', (select count(*) from public_signals where side = 'requirement'),
    'public_signal_offers', (select count(*) from public_signals where side = 'offer'),
    'total_investigations', (select count(*) from public.signal_investigations),
    'approved_legacy_service_listings', (
      select count(*) from public.listings where status = 'approved' and type = 'service'
    ),
    'all_legacy_service_rows', (
      select count(*) from public.listings where type = 'service'
    )
  ) as payload
),
hs_coverage as (
  select jsonb_build_object(
    'catalog_rows', (select count(*) from public.hs_codes),
    'catalog_chapters', (select count(distinct chapter) from public.hs_codes),
    'approved_listings', (select count(*) from public.listings where status = 'approved'),
    'approved_listings_with_hs', (
      select count(*) from public.listings where status = 'approved' and hs_code is not null
    ),
    'public_signals', (select count(*) from public_signals),
    'public_signals_with_hs', (select count(*) from public_signals where hs_code is not null),
    'public_signals_without_hs', (select count(*) from public_signals where hs_code is null),
    'public_signals_with_source_category_without_hs', (
      select count(*) from public_signals
      where hs_code is null and category is not null and btrim(category) <> ''
    ),
    'approved_records_in_unassigned_chapters_71_91_92', (
      select count(*)
      from (
        select hs_code from public.listings where status = 'approved' and hs_code is not null
        union all
        select hs_code from public_signals where hs_code is not null
      ) q
      where left(regexp_replace(hs_code, '[^0-9]', '', 'g'), 2) in ('71', '91', '92')
    ),
    'invalid_listing_hs_values', (
      select count(distinct l.hs_code)
      from public.listings l
      left join public.hs_codes h on h.code = regexp_replace(l.hs_code, '[^0-9]', '', 'g')
      where l.hs_code is not null and h.code is null
    ),
    'invalid_signal_hs_values', (
      select count(distinct d.hs_code)
      from public.desk_radar d
      left join public.hs_codes h on h.code = regexp_replace(d.hs_code, '[^0-9]', '', 'g')
      where d.hs_code is not null and h.code is null
    )
  ) as payload
),
source_batches as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'import_batch', coalesce(import_batch, '<null>'),
    'source_platform', coalesce(source_platform, '<null>'),
    'status', status,
    'records', records,
    'with_canonical_id', with_canonical_id,
    'with_source_url', with_source_url,
    'with_raw_description', with_raw_description,
    'with_import_meta', with_import_meta,
    'earliest_spotted_at', earliest_spotted_at,
    'latest_spotted_at', latest_spotted_at,
    'earliest_public_expiry', earliest_public_expiry,
    'latest_public_expiry', latest_public_expiry
  ) order by coalesce(import_batch, '<null>'), coalesce(source_platform, '<null>'), status), '[]'::jsonb) as payload
  from (
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
  ) x
),
provenance_gaps as (
  select jsonb_build_object(
    'imported_rows', count(*),
    'no_canonical_id', count(*) filter (where canonical_signal_id is null),
    'no_source_platform', count(*) filter (where source_platform is null),
    'no_source_url', count(*) filter (where source_url is null),
    'no_import_meta', count(*) filter (where import_meta is null),
    'no_dedupe_key', count(*) filter (where dedupe_key is null)
  ) as payload
  from public.desk_radar
  where import_batch is not null
),
duplicate_checks as (
  select jsonb_build_object(
    'duplicate_canonical_id_groups', (
      select count(*) from (
        select canonical_signal_id
        from public.desk_radar
        where canonical_signal_id is not null
        group by canonical_signal_id
        having count(*) > 1
      ) x
    ),
    'duplicate_dedupe_key_groups', (
      select count(*) from (
        select dedupe_key
        from public.desk_radar
        where dedupe_key is not null
        group by dedupe_key
        having count(*) > 1
      ) x
    ),
    'duplicate_investigation_request_groups', (
      select count(*) from (
        select signal_id, requester_id, request_kind
        from public.signal_investigations
        group by signal_id, requester_id, request_kind
        having count(*) > 1
      ) x
    ),
    'investigation_count_mismatches', (
      select count(*) from (
        select d.id
        from public.desk_radar d
        left join public.signal_investigations i on i.signal_id = d.id
        group by d.id, d.investigation_count
        having d.investigation_count <> count(i.id)
      ) x
    )
  ) as payload
),
keyword_discovery as (
  select jsonb_build_object(
    'possible_distribution_listings', (
      select count(*)
      from public.listings
      where coalesce(product, '') || ' ' || coalesce(details, '') ilike any (
        array[
          '%distributor%', '%distribution%', '%commercial agent%', '%representative%',
          '%representation%', '%reseller%', '%route to market%', '%market entry partner%'
        ]
      )
    ),
    'possible_distribution_signals', (
      select count(*)
      from public.desk_radar
      where coalesce(product, '') || ' ' || coalesce(summary_line, '') || ' ' || coalesce(ai_description, '') ilike any (
        array[
          '%distributor%', '%distribution%', '%commercial agent%', '%representative%',
          '%representation%', '%reseller%', '%route to market%', '%market entry partner%'
        ]
      )
    ),
    'warning', 'Keyword discovery only; these counts are not canonical classification.'
  ) as payload
)
select 1 as section_order, 'server' as section, jsonb_build_object(
  'database_name', current_database(),
  'database_user', current_user,
  'server_version', current_setting('server_version'),
  'probed_at_utc', now() at time zone 'utc'
) as payload
union all select 2, 'tables', payload from table_inventory
union all select 3, 'columns', payload from column_inventory
union all select 4, 'constraints', payload from constraint_inventory
union all select 5, 'indexes', payload from index_inventory
union all select 6, 'triggers', payload from trigger_inventory
union all select 7, 'policies', payload from policy_inventory
union all select 8, 'functions', payload from function_inventory
union all select 9, 'vocabularies', jsonb_build_object(
  'listing_statuses', (select payload from listing_statuses),
  'listing_types', (select payload from listing_types),
  'signal_status_sides', (select payload from signal_status_sides),
  'investigations', (select payload from investigation_vocab),
  'verification_levels', (select payload from verification_levels),
  'verifications', (select payload from verification_vocab)
)
union all select 10, 'record_counts', payload from record_counts
union all select 11, 'listing_visibility', payload from listing_visibility
union all select 12, 'hs_coverage', payload from hs_coverage
union all select 13, 'source_batches', payload from source_batches
union all select 14, 'provenance_gaps', payload from provenance_gaps
union all select 15, 'duplicate_checks', payload from duplicate_checks
union all select 16, 'keyword_discovery', payload from keyword_discovery
order by section_order;