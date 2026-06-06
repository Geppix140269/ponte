-- ponte.trade — Settlement / clearing architecture hooks (P0)
-- Date: 2026-06-05. Idempotent. NO money moves: this only adds the data model
-- so the deal room is settlement-ready. A regulated escrow/EMI partner is wired
-- later behind the SettlementProvider interface (lib/settlement).

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  currency text not null default 'USD',
  total_cents bigint not null,
  fee_bps int not null default 60,
  status text not null default 'draft'
    check (status in ('draft','funded','partially_released','released','refunded','disputed','cancelled')),
  provider text default 'mock',
  provider_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists settlements_deal_idx on settlements(deal_id);

create table if not exists settlement_milestones (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references settlements(id) on delete cascade,
  seq int not null,
  label text not null,
  amount_cents bigint not null,
  trigger_type text not null
    check (trigger_type in ('deposit','shipment','arrival','inspection','custom')),
  required_doc_type text,
  status text not null default 'pending'
    check (status in ('pending','funded','ready','released','refunded','disputed')),
  released_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists settlement_milestones_idx on settlement_milestones(settlement_id, seq);

create table if not exists settlement_events (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references settlements(id) on delete cascade,
  milestone_id uuid references settlement_milestones(id) on delete set null,
  actor_id uuid references profiles(id) on delete set null,
  type text not null,
  detail text,
  created_at timestamptz default now()
);
create index if not exists settlement_events_idx on settlement_events(settlement_id, created_at);

drop trigger if exists touch_settlements on settlements;
create trigger touch_settlements before update on settlements
  for each row execute function touch_updated_at();

alter table settlements           enable row level security;
alter table settlement_milestones enable row level security;
alter table settlement_events     enable row level security;

drop policy if exists "settlement participants read" on settlements;
create policy "settlement participants read" on settlements
  for select using (is_deal_participant(deal_id) or is_admin());

drop policy if exists "settlement milestones read" on settlement_milestones;
create policy "settlement milestones read" on settlement_milestones
  for select using (exists (
    select 1 from settlements s where s.id = settlement_id
      and (is_deal_participant(s.deal_id) or is_admin())
  ));

drop policy if exists "settlement events read" on settlement_events;
create policy "settlement events read" on settlement_events
  for select using (exists (
    select 1 from settlements s where s.id = settlement_id
      and (is_deal_participant(s.deal_id) or is_admin())
  ));
