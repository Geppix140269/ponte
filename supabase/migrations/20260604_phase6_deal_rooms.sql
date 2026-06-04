-- ponte.trade — Phase 6: deal rooms
-- Date: 2026-06-04. Idempotent.
-- deals, deal_status_history, and messages already exist (Phase 1). This adds:
--   - per-party contact acceptance columns on deals
--   - deal_documents (shared files in a deal)
--   - deal_events (activity timeline)
--   - private ponte-deal-docs storage bucket
-- Participant access uses the existing is_deal_participant() helper (Phase 1).

-- ============================================================ DEALS (extend)

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name='deals' and column_name='initiator_accepted_contact') then
    alter table deals add column initiator_accepted_contact boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_name='deals' and column_name='counterparty_accepted_contact') then
    alter table deals add column counterparty_accepted_contact boolean default false;
  end if;
end $$;

-- ============================================================ DEAL DOCUMENTS

create table if not exists deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  uploader_id uuid references profiles(id) on delete set null,
  name text not null,
  path text not null,            -- object path in the ponte-deal-docs bucket
  size_bytes bigint,
  created_at timestamptz default now()
);
create index if not exists deal_documents_deal_idx on deal_documents(deal_id);

-- ============================================================ DEAL EVENTS (activity)

create table if not exists deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type text not null,            -- 'created','message','stage_change','document','contact_accepted','contact_unlocked'
  detail text,
  created_at timestamptz default now()
);
create index if not exists deal_events_deal_idx on deal_events(deal_id, created_at);

-- ============================================================ STORAGE BUCKET
-- Private. All access is mediated server-side (participant check + signed URLs),
-- so no broad storage policies are added.

insert into storage.buckets (id, name, public)
values ('ponte-deal-docs', 'ponte-deal-docs', false)
on conflict (id) do nothing;

-- ============================================================ RLS

alter table deal_documents enable row level security;
alter table deal_events    enable row level security;

drop policy if exists "deal documents read" on deal_documents;
create policy "deal documents read" on deal_documents
  for select using (is_deal_participant(deal_id) or is_admin());

drop policy if exists "deal events read" on deal_events;
create policy "deal events read" on deal_events
  for select using (is_deal_participant(deal_id) or is_admin());

-- Writes to documents/events happen via the service role in server actions.

-- Atomic completed-deal counter (called on a successful close).
create or replace function increment_completed_deals(p_profile uuid)
returns void language plpgsql security definer as $$
begin
  update profiles set completed_deals = coalesce(completed_deals,0) + 1, updated_at = now()
  where id = p_profile;
end;
$$;

-- ============================================================ DONE
