-- ponte.trade — Phase 2: subscriptions + usage metering
-- Date: 2026-06-04
-- Adds recurring-subscription tracking and the ADAMftd monthly usage counter
-- that plan limits are enforced against. Builds on the Phase 1 profiles columns
-- (plan, role, account_type). Idempotent and safe to re-run.

-- ============================================================ PROFILES (extend)

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='plan_status') then
    alter table profiles add column plan_status text default 'inactive'
      check (plan_status in ('inactive','trialing','active','past_due','canceled'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='stripe_subscription_id') then
    alter table profiles add column stripe_subscription_id text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='plan_renews_at') then
    alter table profiles add column plan_renews_at timestamptz;
  end if;
end $$;

-- ============================================================ SUBSCRIPTIONS

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('starter','pro','enterprise')),
  status text not null default 'inactive'
    check (status in ('inactive','trialing','active','past_due','canceled')),
  billing_interval text check (billing_interval in ('month','year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_profile_idx on subscriptions(profile_id);
create unique index if not exists subscriptions_active_unique
  on subscriptions(profile_id) where status in ('active','trialing','past_due');

-- ============================================================ ADAMFTD USAGE
-- One row per profile per calendar month. The verification flow increments
-- checks_used; plan limits (PLAN_LIMITS in lib/types/network.ts) are checked
-- against it.

create table if not exists adamftd_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  period text not null,            -- 'YYYY-MM'
  checks_used int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists adamftd_usage_unique on adamftd_usage(profile_id, period);

-- ============================================================ updated_at TRIGGERS

do $$
declare t text;
begin
  foreach t in array array['subscriptions','adamftd_usage'] loop
    execute format('drop trigger if exists touch_%1$s on %1$s;', t);
    execute format(
      'create trigger touch_%1$s before update on %1$s
       for each row execute function touch_updated_at();', t);
  end loop;
end $$;

-- ============================================================ RLS

alter table subscriptions enable row level security;
alter table adamftd_usage enable row level security;

-- Owner reads own subscription; admin all. Writes happen via the service-role
-- key in the Stripe webhook (bypasses RLS).
drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions
  for select using (profile_id = auth.uid() or is_admin());

drop policy if exists "own usage" on adamftd_usage;
create policy "own usage" on adamftd_usage
  for select using (profile_id = auth.uid() or is_admin());

-- ============================================================ DONE
