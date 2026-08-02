-- =====================================================================
-- Ponte schema export, WEB EDITOR version (DECISION-20 / DECISION-22)
--
-- RUN BY AN AUTHORISED HUMAN, in the Supabase dashboard SQL editor.
-- Claude Code does not connect to production and holds no credentials.
--
--   1. Paste this whole file into the SQL editor.
--   2. Run it.
--   3. One row, one column, named `ponte_schema_export`. Copy that cell.
--
-- ---------------------------------------------------------------------
-- WHY THIS EXISTS ALONGSIDE scripts/schema-export.sql
--
-- The psql version is thirteen separate statements interleaved with \pset,
-- \timing and \echo. Those are psql META-COMMANDS: the server never sees them,
-- and the web editor does not implement them. Worse, the editor returns only
-- the LAST result set from a multi-statement paste, so twelve of the thirteen
-- sections would be silently discarded - which is the failure mode that looks
-- like success.
--
-- So this is ONE statement returning ONE row and ONE column. Every section is
-- a named key in a single jsonb document. One paste, one result, one copy,
-- nothing silently dropped.
--
-- Keep the psql version. It is easier to read section by section and it is the
-- better tool for anyone with a terminal.
--
-- ---------------------------------------------------------------------
-- THE BOUNDARY IS IDENTICAL, and it is the point of the whole exercise
--
-- No CREATE, no GRANT, no ALTER, no INSERT, no UPDATE, no DELETE, no ROLE
-- change. A privilege change is a production write and is not exempt for not
-- being a data migration.
--
--   counts        `pg_class.reltuples`, the planner's catalog estimate. An
--                 exact COUNT(*) needs a grant that can also read rows, so
--                 asking for one would ask for the access this boundary exists
--                 to avoid.
--   bodies        function sources and view definitions travel as SHA-256
--                 DIGESTS. Enough to prove drift against the repository,
--                 incapable of carrying an embedded key or hard-coded address.
--   storage       `storage.buckets` yes, `storage.objects` NEVER. An object
--                 NAME is member data, and a filename in this product
--                 routinely carries a company name.
--
-- No application, auth or storage-object row is selected anywhere below.
--
-- ---------------------------------------------------------------------
-- IF THE RESULT LOOKS TRUNCATED
--
-- The editor may clip a very large cell in its display. The copy button takes
-- the whole value. If in doubt, wrap the outer call in `jsonb_pretty(...)` and
-- check the closing brace is present before sending.
-- =====================================================================

select jsonb_build_object(

  -- 0. Identity and version -------------------------------------------
  'meta', jsonb_build_object(
    'server_version', version(),
    'database', current_database(),
    -- The role this ran as, so the report can state what the reader could see.
    -- Not a credential.
    'ran_as', current_user,
    'exported_at_utc', (now() at time zone 'utc')
  ),

  -- 1. Schemas in scope -----------------------------------------------
  'schemas', (
    select coalesce(jsonb_agg(nspname order by nspname), '[]'::jsonb)
    from pg_namespace
    where nspname not like 'pg\_%' and nspname <> 'information_schema'
  ),

  -- 2. Tables, columns, types, nullability, defaults -------------------
  -- Defaults are included because a default is part of the schema contract and
  -- a drifted default is a real finding. A default expression is authored SQL,
  -- not member data.
  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', c.table_schema, 'table', c.table_name, 'pos', c.ordinal_position,
      'column', c.column_name, 'type', c.data_type,
      'size', coalesce(c.character_maximum_length::text, c.numeric_precision::text, ''),
      'nullable', c.is_nullable, 'default', coalesce(c.column_default, ''),
      'generated', c.is_generated, 'generation', coalesce(c.generation_expression, '')
    ) order by c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb)
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema in ('public', 'storage', 'auth', 'extensions')
      and t.table_type = 'BASE TABLE'
  ),

  -- 3. Constraints, including CHECK expressions -------------------------
  -- These matter more than anything else here: the Deal Room state machine and
  -- every status enum in Ponte are CHECK constraints rather than Postgres enum
  -- types, so this is where the real vocabulary lives.
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', t.relname, 'name', con.conname,
      'kind', case con.contype
        when 'c' then 'check' when 'f' then 'foreign key'
        when 'p' then 'primary key' when 'u' then 'unique'
        when 't' then 'trigger' when 'x' then 'exclusion'
        else con.contype::text end,
      'definition', pg_get_constraintdef(con.oid)
    ) order by n.nspname, t.relname, con.conname), '[]'::jsonb)
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname in ('public', 'storage')
  ),

  -- 4. Indexes ----------------------------------------------------------
  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', indexname, 'definition', indexdef
    ) order by schemaname, tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname in ('public', 'storage')
  ),

  -- 5. Enum types -------------------------------------------------------
  -- Real Postgres enums, as distinct from the CHECK constraints in section 3.
  -- Both are "the enum" in conversation and they drift differently.
  'enum_types', (
    select coalesce(jsonb_agg(e order by e->>'schema', e->>'name'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'schema', n.nspname, 'name', t.typname,
        'labels', jsonb_agg(en.enumlabel order by en.enumsortorder)
      ) as e
      from pg_type t
      join pg_enum en on en.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname not like 'pg\_%'
      group by n.nspname, t.typname
    ) s
  ),

  -- 6. RLS: whether it is ON -------------------------------------------
  -- Separate from the policy list on purpose. A table with policies and RLS
  -- disabled is wide open, and reading only pg_policies would show a full
  -- policy list on a table enforcing none.
  'rls_enabled', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname,
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity
    ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r' and n.nspname in ('public', 'storage')
  ),

  -- 6b. RLS: the policies ------------------------------------------------
  'rls_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname,
      'permissive', permissive, 'roles', roles, 'cmd', cmd,
      'using', coalesce(qual, ''), 'with_check', coalesce(with_check, '')
    ) order by schemaname, tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname in ('public', 'storage')
  ),

  -- 7. Functions: signatures, security, and a body DIGEST ---------------
  -- The digest, not the body. `prosecdef` is the one that matters most: a
  -- SECURITY DEFINER function bypasses RLS by design, so the report has to be
  -- able to list them.
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'returns', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef, 'language', l.lanname,
      'body_sha256', encode(sha256(convert_to(coalesce(p.prosrc, ''), 'UTF8')), 'hex'),
      'body_length', length(coalesce(p.prosrc, ''))
    ) order by n.nspname, p.proname), '[]'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname in ('public', 'storage')
  ),

  -- 8. Views: names and a definition DIGEST ------------------------------
  -- Same reasoning as section 7. A view definition can embed a filter that
  -- names a member, so the digest travels and the text does not.
  'views', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', c.relname,
      'definition_sha256', encode(sha256(convert_to(pg_get_viewdef(c.oid, true), 'UTF8')), 'hex'),
      'materialized', c.relkind = 'm'
    ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('v', 'm') and n.nspname in ('public', 'storage')
  ),

  -- 9. Catalog-ESTIMATED row counts --------------------------------------
  -- `reltuples` is the planner's estimate held in the catalog. This is NOT a
  -- read of any table: it does not touch a single row and cannot return one.
  -- -1 means the table has never been analysed, which is itself a finding.
  'table_estimates', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname,
      'estimated_rows', c.reltuples::bigint,
      'total_size', pg_size_pretty(pg_total_relation_size(c.oid)),
      'last_analyze_utc', (s.last_analyze at time zone 'utc'),
      'last_autoanalyze_utc', (s.last_autoanalyze at time zone 'utc')
    ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where c.relkind = 'r' and n.nspname in ('public', 'storage')
  ),

  -- 10. Migration history, as production records it -----------------------
  -- Identifiers, order and timestamps. `name` is a filename.
  --
  -- Supabase has used two locations across CLI versions. In psql a missing
  -- table errors harmlessly and the other statements still run; inside ONE
  -- statement an error would lose the entire export. So both are read through
  -- `to_regclass`, which returns null for a table that is not there, and the
  -- absence is REPORTED rather than fatal. Which of the two exists is itself a
  -- finding: it says which lineage store is real.
  'migrations_supabase_schema', (
    select case when to_regclass('supabase_migrations.schema_migrations') is null then null
    else (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.version), '[]'::jsonb)
      from (select version, name from supabase_migrations.schema_migrations) m
    ) end
  ),
  'migrations_public_schema', (
    select case when to_regclass('public.schema_migrations') is null then null
    else (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from public.schema_migrations m) end
  ),

  -- 11. Extensions ---------------------------------------------------------
  'extensions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', e.extname, 'version', e.extversion, 'schema', n.nspname
    ) order by e.extname), '[]'::jsonb)
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  ),

  -- 12. Storage buckets -----------------------------------------------------
  -- Bucket CONFIGURATION only. `storage.objects` is never selected. `public`
  -- is the column the report cares about most.
  'storage_buckets', (
    select case when to_regclass('storage.buckets') is null then null
    else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'public', b.public,
        'file_size_limit', b.file_size_limit, 'allowed_mime_types', b.allowed_mime_types,
        'created_at_utc', (b.created_at at time zone 'utc')
      ) order by b.name), '[]'::jsonb)
      from storage.buckets b
    ) end
  ),

  -- 13. Triggers -------------------------------------------------------------
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid)
    ) order by n.nspname, c.relname, t.tgname), '[]'::jsonb)
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname in ('public', 'storage')
  )

) as ponte_schema_export;
