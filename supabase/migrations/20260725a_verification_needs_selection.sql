-- Journey 3 (Check & Verify): ensure the verifications.status CHECK allows
-- 'needs_selection', which the K08 resume path depends on.
--
-- Migration 20260721i introduced this value but, per the note in
-- lib/verification/pipeline.ts, was not applied to production, causing 23514
-- rejections. This re-applies it safely.
--
-- Additive and idempotent: it only widens the allowed set, and running it more
-- than once is a no-op. Rollback: drop this constraint and restore the narrower
-- one (without 'needs_selection'). No data is changed.
--
-- Verify the live constraint NAME before applying (it is assumed to be
-- verifications_status_check); adjust the drop below if production differs.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'verifications'
      and constraint_name = 'verifications_status_check'
  ) then
    alter table public.verifications drop constraint verifications_status_check;
  end if;

  alter table public.verifications
    add constraint verifications_status_check
    check (status in ('pending', 'auto_verified', 'review', 'failed', 'needs_selection'));
end
$$;
