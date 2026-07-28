-- Journey 3 (Check & Verify): ensure the verifications.status CHECK allows
-- 'needs_selection', which the K08 resume path depends on.
--
-- Migration 20260721i introduced this value but, per the note in
-- lib/verification/pipeline.ts, was not applied to production, causing 23514
-- rejections. This re-applies it safely.
--
-- Additive and idempotent: it only widens the allowed set, and running it more
-- than once is a no-op. Rollback: drop the constraint this migration adds
-- (verifications_status_check) and restore the narrower one (without
-- 'needs_selection'). No data is changed.
--
-- Drops EVERY existing check constraint on public.verifications whose
-- definition mentions "status", by name, whatever that name actually is in
-- production. A name-only drop (as an earlier version of this migration did)
-- is not safe: if the live constraint were named anything other than the
-- assumed 'verifications_status_check', the drop would silently no-op and the
-- old, narrower constraint would keep rejecting 'needs_selection' even after
-- this migration ran, because Postgres requires every CHECK constraint on a
-- table to pass, not just the newest one.
do $$
declare
  con record;
begin
  for con in
    select pgc.conname
    from pg_constraint pgc
    join pg_class rel on rel.oid = pgc.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'verifications'
      and pgc.contype = 'c'
      and pg_get_constraintdef(pgc.oid) ilike '%status%'
  loop
    execute format('alter table public.verifications drop constraint %I', con.conname);
  end loop;

  alter table public.verifications
    add constraint verifications_status_check
    check (status in ('pending', 'auto_verified', 'review', 'failed', 'needs_selection'));
end
$$;
