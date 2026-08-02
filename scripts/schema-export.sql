-- =====================================================================
-- Ponte schema export, for the reconciliation report (DECISION-20 / 22)
--
-- RUN BY AN AUTHORISED HUMAN. Claude Code does not connect to production
-- and holds no credentials.
--
--   psql "$PRODUCTION_URL" -f scripts/schema-export.sql > schema-export.txt
--
-- Read it before you send it. If any section surprises you, do not send it.
--
-- ---------------------------------------------------------------------
-- WHAT THIS IS ALLOWED TO RETURN, AND WHY EACH QUERY IS INSIDE THE LINE
-- ---------------------------------------------------------------------
-- Every statement below is a SELECT against a system catalog. There is no
-- CREATE, no GRANT, no ALTER, no INSERT, no UPDATE, no DELETE and no ROLE
-- change anywhere in this file. A privilege change is a production write and
-- is out of scope even though it is not a data migration; that rule is why
-- this file asks for nothing to be granted in order to run it.
--
-- It returns: schema and catalog metadata, migration identifiers and
-- timestamps, RLS and storage policy definitions, indexes, constraints,
-- relationships, and CATALOG-ESTIMATED row counts.
--
-- It does not return: application, auth or storage-object rows; sampled
-- records; logs; object names; secrets; or any function body that could carry
-- one.
--
-- ON COUNTS. A SELECT grant that permits an exact COUNT(*) also permits
-- reading the rows. So section 9 reads `pg_class.reltuples`, which is the
-- planner's estimate held in the catalog and is not a read of the table. If a
-- finding genuinely turns on an exact count, it will be NAMED in the report
-- and you can run that one aggregate yourself. Nothing here asks for the
-- grant that would make exact counts possible.
--
-- ON FUNCTION BODIES. Section 7 deliberately returns a SHA-256 of each body
-- and not the body. That is enough to detect drift between production and the
-- repository, which is what the reconciliation needs, and it cannot leak an
-- embedded key, a webhook secret or a hard-coded address. Where a definition
-- must actually be read, the report will name the function and you can send
-- that one after reading it.
-- =====================================================================

\pset pager off
\pset footer off
\timing off

\echo '===== 0. IDENTITY AND VERSION ====='
select version() as server_version,
       current_database() as database,
       -- The role this export ran as, so the report can say what the reader
       -- could see. Not a credential.
       current_user as ran_as,
       now() at time zone 'utc' as exported_at_utc;

\echo ''
\echo '===== 1. SCHEMAS IN SCOPE ====='
select nspname as schema
from pg_namespace
where nspname not like 'pg\_%' and nspname <> 'information_schema'
order by 1;

\echo ''
\echo '===== 2. TABLES, COLUMNS, TYPES, NULLABILITY, DEFAULTS ====='
-- Column DEFAULTS are included because a default is part of the schema
-- contract and a drifted default is a real finding. A default expression is
-- authored SQL, not member data.
select c.table_schema,
       c.table_name,
       c.ordinal_position,
       c.column_name,
       c.data_type,
       coalesce(c.character_maximum_length::text, c.numeric_precision::text, '') as size,
       c.is_nullable,
       coalesce(c.column_default, '') as column_default,
       c.is_generated,
       coalesce(c.generation_expression, '') as generation_expression
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema in ('public', 'storage', 'auth', 'extensions')
  and t.table_type = 'BASE TABLE'
order by 1, 2, 3;

\echo ''
\echo '===== 3. CONSTRAINTS, INCLUDING CHECK EXPRESSIONS ====='
-- The CHECK expressions matter more than anything else in this export: the
-- Deal Room state machine and every status enum in Ponte are CHECK
-- constraints rather than Postgres enum types, so this is where the real
-- vocabulary lives. `pg_get_constraintdef` returns authored SQL.
select n.nspname as schema,
       t.relname as table_name,
       con.conname as constraint_name,
       case con.contype
         when 'c' then 'check' when 'f' then 'foreign key'
         when 'p' then 'primary key' when 'u' then 'unique'
         when 't' then 'trigger' when 'x' then 'exclusion'
         else con.contype::text end as kind,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class t on t.oid = con.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname in ('public', 'storage')
order by 1, 2, 3;

\echo ''
\echo '===== 4. INDEXES ====='
select schemaname as schema, tablename as table_name, indexname, indexdef
from pg_indexes
where schemaname in ('public', 'storage')
order by 1, 2, 3;

\echo ''
\echo '===== 5. ENUM TYPES ====='
-- Real Postgres enums, as distinct from the CHECK constraints in section 3.
-- Both are "the enum" in conversation and they drift differently.
select n.nspname as schema, t.typname as enum_type,
       string_agg(e.enumlabel, ', ' order by e.enumsortorder) as labels
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname not like 'pg\_%'
group by 1, 2
order by 1, 2;

\echo ''
\echo '===== 6. ROW LEVEL SECURITY: WHETHER IT IS ON ====='
-- RLS is the mandatory permission boundary for the Deal Room, so "is it
-- enabled" is a separate question from "what policies exist" and both have to
-- be answered. A table with policies and RLS disabled is wide open.
select n.nspname as schema, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname in ('public', 'storage')
order by 1, 2;

\echo ''
\echo '===== 6b. ROW LEVEL SECURITY: THE POLICIES ====='
select schemaname as schema, tablename as table_name, policyname,
       permissive, roles, cmd,
       coalesce(qual, '') as using_expression,
       coalesce(with_check, '') as with_check_expression
from pg_policies
where schemaname in ('public', 'storage')
order by 1, 2, 3;

\echo ''
\echo '===== 7. FUNCTIONS: SIGNATURES, SECURITY AND A BODY DIGEST ====='
-- The DIGEST, not the body. Enough to prove drift against the repository,
-- and incapable of leaking an embedded secret. `prosecdef` is the one that
-- matters most: a SECURITY DEFINER function bypasses RLS by design, so the
-- report has to be able to list them.
select n.nspname as schema,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as returns,
       p.prosecdef as security_definer,
       l.lanname as language,
       encode(sha256(convert_to(coalesce(p.prosrc, ''), 'UTF8')), 'hex') as body_sha256,
       length(coalesce(p.prosrc, '')) as body_length
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname in ('public', 'storage')
order by 1, 2, 3;

\echo ''
\echo '===== 8. VIEWS: NAMES AND A DEFINITION DIGEST ====='
-- Same reasoning as section 7. A view definition can embed a filter that
-- names a member, so the digest travels and the text does not.
select n.nspname as schema, c.relname as view_name,
       encode(sha256(convert_to(pg_get_viewdef(c.oid, true), 'UTF8')), 'hex') as definition_sha256,
       c.relkind = 'm' as is_materialized
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('v', 'm') and n.nspname in ('public', 'storage')
order by 1, 2;

\echo ''
\echo '===== 9. CATALOG-ESTIMATED ROW COUNTS ====='
-- `reltuples` is the planner's estimate, held in the catalog. This is NOT a
-- read of any table: it does not touch a single row and cannot return one.
-- -1 means the table has never been analysed, which is itself a finding.
select n.nspname as schema, c.relname as table_name,
       c.reltuples::bigint as estimated_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
       s.last_analyze at time zone 'utc' as last_analyze_utc,
       s.last_autoanalyze at time zone 'utc' as last_autoanalyze_utc
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where c.relkind = 'r' and n.nspname in ('public', 'storage')
order by 1, 2;

\echo ''
\echo '===== 10. MIGRATION HISTORY, AS PRODUCTION RECORDS IT ====='
-- Identifiers, order and timestamps. The `name` column is a filename.
-- Supabase has used two locations for this table across CLI versions, so both
-- are attempted and one is expected to error harmlessly. An error here is a
-- finding, not a failure: it tells the report which lineage store is real.
\echo '--- 10a. supabase_migrations.schema_migrations ---'
select version, coalesce(name, '') as name
from supabase_migrations.schema_migrations
order by version;

\echo '--- 10b. public.schema_migrations, if the older location is in use ---'
select *
from public.schema_migrations
order by 1;

\echo ''
\echo '===== 11. EXTENSIONS ====='
select e.extname, e.extversion, n.nspname as schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by 1;

\echo ''
\echo '===== 12. STORAGE BUCKETS ====='
-- Bucket CONFIGURATION only. `storage.objects` is never selected: an object
-- name is member data, and a filename routinely carries a company name.
-- `public` is the column the report cares about most.
select id, name, public, file_size_limit, allowed_mime_types,
       created_at at time zone 'utc' as created_at_utc
from storage.buckets
order by name;

\echo ''
\echo '===== 13. TRIGGERS ====='
select n.nspname as schema, c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('public', 'storage')
order by 1, 2, 3;

\echo ''
\echo '===== END OF EXPORT ====='
\echo 'Read this file before sending it. It should contain no member records,'
\echo 'no object names, no function bodies and no secrets. If it does, stop.'
