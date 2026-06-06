-- ponte.trade — analytics events (funnel + trust loop)
-- Date: 2026-06-06. Idempotent. Insert via service role; admin reads.
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  props jsonb,
  profile_id uuid references profiles(id) on delete set null,
  session_id text,
  created_at timestamptz default now()
);
create index if not exists analytics_events_event_idx on analytics_events(event, created_at);
create index if not exists analytics_events_created_idx on analytics_events(created_at);

alter table analytics_events enable row level security;
drop policy if exists "admin reads analytics" on analytics_events;
create policy "admin reads analytics" on analytics_events for select using (is_admin());
