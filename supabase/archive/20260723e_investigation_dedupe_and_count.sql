-- Block D follow-up: make investigation requests idempotent and the count
-- atomic.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260723e_investigation_dedupe_and_count.sql
--
-- PROBE FIRST:
--   select count(*) from signal_investigations;                 -- expect 0 dups
--   select conname from pg_constraint
--    where conrelid = 'public.signal_investigations'::regclass;
--   select tgname from pg_trigger
--    where tgrelid = 'public.signal_investigations'::regclass and not tgisinternal;
--
-- ---------------------------------------------------------------------------
-- Why this migration exists
-- ---------------------------------------------------------------------------
-- Block D added signal_investigations and maintained desk_radar.investigation_count
-- from application code (insert, then recompute-and-write). Two gaps:
--
--   1. Nothing stopped one member opening the same request twice on the same
--      signal, so a repeat click, a retry or two concurrent submissions could
--      create duplicate rows and inflate the count.
--   2. The insert and the count write were separate statements, so a failure
--      between them could leave the count stale.
--
-- Both are closed here at the database, not in the application:
--
--   * A UNIQUE (signal_id, requester_id) constraint makes a duplicate request a
--     no-op: the second insert fails, so the whole statement (and the trigger
--     below) never runs. One request per member per signal, enforced.
--   * A trigger recomputes investigation_count as the true row count in the
--     SAME transaction as the insert or delete. It can never be inconsistent
--     with the rows, whatever the application does or fails to do.
--
-- Additive and idempotent: the constraint is dropped-if-exists then added, the
-- function is create-or-replace, the trigger is dropped-if-exists then created.
-- Production has zero investigation rows, so adding the unique constraint
-- cannot fail on existing duplicates.
--
-- Rollback: drop the trigger, the function and the unique constraint. The
-- column and table are untouched.

-- ===========================================================================
-- 1. One investigation request per member per signal
-- ===========================================================================
alter table signal_investigations
  drop constraint if exists signal_investigations_unique_requester;
alter table signal_investigations
  add constraint signal_investigations_unique_requester unique (signal_id, requester_id);

-- ===========================================================================
-- 2. Keep investigation_count atomic with the rows
-- ===========================================================================
-- security definer so the trigger may update desk_radar (which the inserting
-- member cannot write under RLS). search_path pinned so the definer context
-- resolves only the public schema.
create or replace function sync_investigation_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.signal_id, old.signal_id);
begin
  update desk_radar
     set investigation_count = (
       select count(*) from signal_investigations where signal_id = target
     )
   where id = target;
  return null;  -- after trigger; return value is ignored
end;
$$;

drop trigger if exists trg_sync_investigation_count on signal_investigations;
create trigger trg_sync_investigation_count
  after insert or delete on signal_investigations
  for each row execute function sync_investigation_count();

comment on function sync_investigation_count() is
  'Recomputes desk_radar.investigation_count as the true row count, in the same transaction as the signal_investigations insert/delete (brief Block D follow-up). Never inconsistent with the rows.';
