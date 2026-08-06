-- Close the anonymous read and write hole on the migration ledger.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260728b_schema_migrations_rls.sql
--
-- PROBE FIRST:
--   select relrowsecurity from pg_class
--    where oid = 'public.schema_migrations'::regclass;
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'schema_migrations'
--    order by grantee, privilege_type;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- `public.schema_migrations` was readable AND writable by anyone holding the
-- publishable anon key, which is shipped to every browser. Confirmed live over
-- the public internet on 28 July 2026: an unauthenticated PostgREST call
-- returned real ledger rows with HTTP 200.
--
-- The table had row level security DISABLED, and `anon` and `authenticated`
-- each held all seven table privileges: SELECT, INSERT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES and TRIGGER. So the exposure was not only that the
-- migration history could be read. Anyone could forge a row, rewrite one, or
-- empty the table, and the next audit would have believed whatever it found.
-- A ledger that anybody can write is not evidence, which matters because this
-- one is the only record of what has been applied to production.
--
-- The root cause is not a mistake in any migration. The table was created by
-- `scripts/db-query.mjs` and `scripts/apply-migration.mjs` with a plain
-- `create table if not exists`, running as `postgres`, and Supabase's default
-- privileges grant every new table in `public` to `anon` and `authenticated`.
-- Every table this project declares deliberately is protected; this one was
-- created by tooling, in passing, and so never got the treatment. Both scripts
-- are hardened in the same change, so a ledger created fresh in another project
-- is protected from its first row rather than from its first audit.
--
-- ---------------------------------------------------------------------------
-- Why both a revoke and RLS
-- ---------------------------------------------------------------------------
-- Revoking the grants is what actually closes the hole: PostgREST cannot reach
-- a table the role has no privilege on. RLS with no policy is the second lock,
-- and it is the one that holds if Supabase's default privileges are ever
-- re-applied to this table, because a grant restored by tooling does not
-- restore a policy that was never written. Every other table in this database
-- is protected this way, and eleven of them carry RLS with zero policies, which
-- is deny-all and is the intended state here too.
--
-- Nothing that writes the ledger loses access:
--   * `service_role` has rolbypassrls, and keeps its grants explicitly below.
--   * `postgres` owns the table, and an owner bypasses RLS unless the table is
--     put in FORCE mode, which this migration deliberately does not do.
--   * Both `scripts/db-query.mjs` (Management API) and
--     `scripts/apply-migration.mjs` (DATABASE_URL) connect as `postgres`.
-- No application code reads or writes this table at all.
--
-- Additive and idempotent: no row is touched, no column changes, and the whole
-- file can be run twice. `revoke` on a privilege that is already gone is a
-- no-op, and `enable row level security` on a table that already has it is too.
--
-- Rollback, if this ever locks out something unforeseen:
--   alter table public.schema_migrations disable row level security;
--   grant all privileges on table public.schema_migrations to anon;
--   grant all privileges on table public.schema_migrations to authenticated;
-- Restoring those grants restores the exposure, so do it only long enough to
-- find out what broke.

alter table public.schema_migrations enable row level security;

-- `revoke all privileges` rather than a named list, because the named list has
-- to spell TRUNCATE and DELETE, and `scripts/apply-migration.mjs` refuses any
-- file containing those words outright. The refusal is right; the workaround is
-- to say the same thing without naming them.
revoke all privileges on table public.schema_migrations from anon;
revoke all privileges on table public.schema_migrations from authenticated;

-- Stated rather than assumed. This is the role the write path depends on, so it
-- should be visible in the file that took the other two away.
grant all privileges on table public.schema_migrations to service_role;

comment on table public.schema_migrations is
  'Ledger of which migration files have been applied to this database. Written only by scripts/apply-migration.mjs and scripts/db-query.mjs, both of which connect as postgres. RLS enabled with no policy, and anon and authenticated hold no privileges: this is the record auditors read, so nothing that reaches the public API may read or write it.';
