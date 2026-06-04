-- ponte.trade — Phase 3: ADAMftd cache payload + atomic usage metering
-- Date: 2026-06-04. Idempotent.

-- Store the full verification result for faithful cache reuse.
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name='adamftd_verification_checks' and column_name='result_json') then
    alter table adamftd_verification_checks add column result_json jsonb;
  end if;
end $$;

-- Atomic monthly usage increment (avoids read-modify-write races).
create or replace function increment_adamftd_usage(p_profile uuid, p_period text)
returns void language plpgsql security definer as $$
begin
  insert into adamftd_usage (profile_id, period, checks_used)
  values (p_profile, p_period, 1)
  on conflict (profile_id, period)
  do update set checks_used = adamftd_usage.checks_used + 1, updated_at = now();
end;
$$;
