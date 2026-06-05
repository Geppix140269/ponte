-- ponte.trade — drop "broker", reposition around real buyers and sellers
-- Date: 2026-06-05. Safe to re-run.
-- Treats any existing "broker" account as a principal "trader", tightens the
-- account_type values to {buyer, seller, trader, enterprise}, and renames the
-- verified_broker status column to verified_trader.

-- 1. Migrate existing brokers to traders.
update profiles set account_type = 'trader' where account_type = 'broker';

-- 2. Rebuild the account_type check constraint without 'broker'.
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'profiles'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%account_type%';
  if cname is not null then
    execute format('alter table profiles drop constraint %I', cname);
  end if;
end $$;

alter table profiles add constraint profiles_account_type_check
  check (account_type in ('buyer','seller','trader','enterprise'));

-- 3. Rename verified_broker -> verified_trader (guarded).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='profiles' and column_name='verified_broker')
     and not exists (select 1 from information_schema.columns
             where table_name='profiles' and column_name='verified_trader') then
    alter table profiles rename column verified_broker to verified_trader;
  end if;
end $$;
