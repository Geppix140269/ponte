-- ponte.trade — verification tier (0-IV) on profiles
-- Date: 2026-06-05. Idempotent.
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='verification_tier') then
    alter table profiles add column verification_tier int default 0
      check (verification_tier between 0 and 4);
  end if;
end $$;
