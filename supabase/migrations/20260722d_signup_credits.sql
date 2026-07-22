-- Grant the free credits at signup.
--
-- Additive: replaces one function body and adds nothing destructive.
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260722d_signup_credits.sql
--
-- ---------------------------------------------------------------------------
-- Why this is a trigger and not application code
-- ---------------------------------------------------------------------------
-- lib/credits.ts has exported grantCredits since July and nothing has ever
-- called it. 'grant_signup' has been a declared reason in the ledger the whole
-- time with no code path that writes it. Every credit that exists in
-- production got there by somebody hand-editing the ledger in the SQL editor:
-- two admin_adjust rows, and seven verification spends against them.
--
-- So the verification product, the one thing on the platform that costs money,
-- has been unreachable for every member who was not Giuseppe.
--
-- Putting the grant in a route means it fires only on the paths that remember
-- to call it, and the OTP flow, the Google flow and any future provider are
-- three separate places to forget. The trigger fires on the row being created,
-- which is the actual event, once, whatever created it.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  -- Free tier allowance. Enough to run one counterparty verification, which
  -- costs two, and see what the product actually does before paying for it.
  --
  -- The `not exists` guard makes this idempotent. A member who is deleted and
  -- signs up again on the same id does not get a second grant, and a replay of
  -- the trigger cannot mint credits.
  if not exists (
    select 1 from credit_ledger
     where user_id = new.id and reason = 'grant_signup'
  ) then
    insert into credit_ledger (user_id, delta, reason, ref)
    values (new.id, 3, 'grant_signup', 'signup');
  end if;

  return new;
exception when others then
  -- A failure to grant credits must never stop an account being created.
  -- Signing up is the more important half of this transaction, and a missing
  -- grant is fixable afterwards by an admin adjustment.
  raise warning 'signup credit grant failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- Backfill the members who signed up before this existed. Same guard, so
-- running it twice grants nothing twice.
insert into credit_ledger (user_id, delta, reason, ref)
select p.id, 3, 'grant_signup', 'backfill-2026-07-22'
  from profiles p
 where not exists (
   select 1 from credit_ledger c
    where c.user_id = p.id and c.reason = 'grant_signup'
 );

-- ---------------------------------------------------------------------------
-- Credit purchases
-- ---------------------------------------------------------------------------
-- One row per Stripe checkout, so fulfilment is idempotent. Stripe retries a
-- webhook until it gets a 2xx, and without a record of what has already been
-- fulfilled a retry grants the credits twice.
create table if not exists credit_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references profiles on delete set null,
  stripe_session_id  text unique not null,
  pack               text not null,
  credits            int not null check (credits > 0),
  amount_cents       int not null check (amount_cents > 0),
  currency           text not null default 'usd',
  status             text not null default 'pending'
                       check (status in ('pending', 'paid', 'fulfilled', 'failed')),
  ledger_id          uuid references credit_ledger (id),
  created_at         timestamptz not null default now(),
  fulfilled_at       timestamptz
);

create index if not exists credit_purchases_user_idx
  on credit_purchases (user_id, created_at desc);

alter table credit_purchases enable row level security;

-- A member sees their own receipts. Nobody writes from the client: purchases
-- are created by a server route and fulfilled by the Stripe webhook, both
-- holding the service role.
drop policy if exists credit_purchases_own_read on credit_purchases;
create policy credit_purchases_own_read on credit_purchases
  for select using (auth.uid() = user_id);

comment on table credit_purchases is
  'One row per Stripe checkout. stripe_session_id is unique so webhook retries cannot grant the same credits twice.';
