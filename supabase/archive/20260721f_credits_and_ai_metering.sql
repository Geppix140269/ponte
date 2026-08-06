-- Credits ledger and real AI metering.
--
-- Prerequisite for the verification pipeline: every verification is a credits
-- spend, and every AI call has to be attributable and costed. The existing
-- ai_usage table counts invocations per feature, which cannot answer "what did
-- this verification cost". This adds the two things that can.
--
-- Additive only. ai_usage is left exactly as it is, so the current freemium
-- gate keeps working unchanged.
--
-- Run in the Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Credits ledger
-- ---------------------------------------------------------------------------
-- Append only. A balance is the sum of the rows, never a stored number that
-- can drift out of step with its history. Positive delta grants, negative
-- spends.
create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  -- Guests buy a single certificate without an account, so user_id is null and
  -- the Stripe session identifies them instead.
  guest_email text,
  delta int not null,
  reason text not null,           -- 'grant_signup' | 'purchase' | 'spend_verification' | 'refund_failed' | 'admin_adjust'
  ref text,                       -- stripe session, verification id, whatever explains it
  created_at timestamptz not null default now(),
  constraint credit_ledger_has_owner check (user_id is not null or guest_email is not null),
  constraint credit_ledger_delta_nonzero check (delta <> 0)
);

create index if not exists credit_ledger_user_idx on credit_ledger (user_id, created_at desc);
create index if not exists credit_ledger_ref_idx on credit_ledger (ref);

alter table credit_ledger enable row level security;

-- A member may read their own history. Nobody writes from the client: grants
-- and spends are server side only, through the service role.
drop policy if exists credit_ledger_own_read on credit_ledger;
create policy credit_ledger_own_read on credit_ledger
  for select using (auth.uid() = user_id);

create or replace function credit_balance(p_user_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(delta), 0)::int from credit_ledger where user_id = p_user_id;
$$;

-- Spend atomically. Returns the new ledger row id, or raises if the balance
-- would go negative. Doing the check and the insert in one statement under a
-- row lock is what stops two concurrent verifications both passing a balance
-- check and overdrawing.
create or replace function spend_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_ref text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  -- Lock this user's ledger rows so a concurrent spend cannot interleave.
  perform 1 from credit_ledger where user_id = p_user_id for update;

  select coalesce(sum(delta), 0)::int into v_balance
    from credit_ledger where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient credits: have %, need %', v_balance, p_amount
      using errcode = 'P0001';
  end if;

  insert into credit_ledger (user_id, delta, reason, ref)
  values (p_user_id, -p_amount, p_reason, p_ref)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- AI call metering
-- ---------------------------------------------------------------------------
-- One row per model call, with real token counts, so a verification's cost is
-- a fact rather than an estimate. This is what lets credit pricing be checked
-- against what the model actually costs.
create table if not exists ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete set null,
  feature text not null,          -- 'vet_listing' | 'verification_reconcile' | 'sanctions_triage' | ...
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  ok boolean not null default true,
  error text,
  duration_ms int,
  ref text,                       -- verification id, listing id, whatever this was for
  created_at timestamptz not null default now()
);

create index if not exists ai_calls_ref_idx on ai_calls (ref);
create index if not exists ai_calls_feature_idx on ai_calls (feature, created_at desc);

alter table ai_calls enable row level security;
-- No policies: server side only.
