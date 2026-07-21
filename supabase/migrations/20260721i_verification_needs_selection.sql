-- Verification status: 'needs_selection'.
--
-- A name only search can return many companies with the same name. Until now
-- that ended the run: the registry came back unavailable and the case went to
-- the review queue with a note saying a registration number was needed. The
-- candidates were already fetched, they were simply never shown.
--
-- 'needs_selection' is that case given its own name. The run is paused, not
-- finished, and not with the desk: it is waiting on the member to say which of
-- the matching companies they meant. The candidate list is stored in the
-- existing `verifications.registry` jsonb under `candidates`, so no new column
-- is needed.
--
-- Choosing a candidate resumes the SAME verification row. It does not open a
-- new one and it does not spend credits again, so `credit_ledger_id` is left
-- exactly as the first run wrote it.
--
-- Additive only. Nothing is dropped or recreated: `verifications` holds real
-- rows. Run in the Supabase SQL Editor. Safe to re-run.

-- The status check constraint has to be replaced rather than extended, because
-- Postgres has no "add a value to a check constraint". The old one is found by
-- what it constrains rather than by name, so this works whatever the original
-- constraint ended up being called, and re-running it is a no-op that simply
-- rebuilds the same rule.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'verifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
      and pg_get_constraintdef(oid) like '%auto_verified%'
  loop
    execute format('alter table verifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table verifications
  add constraint verifications_status_check
  check (status in (
    'pending',
    'auto_verified',
    'review',
    'verified',
    'rejected',
    'failed',
    'needs_selection'
  ));

-- No new columns, no new policies, no new indexes.
--
-- The candidate list lives in the `registry` jsonb that the run already writes.
-- The resume reads its case by primary key and user_id, which the existing
-- primary key already serves. And the existing verifications_own_read policy
-- already lets a member read their own paused case, while writes stay server
-- side only: a member must never be able to move their own case out of
-- 'needs_selection' from the client, because that is the guard that stops a
-- verification being run twice on one payment.
