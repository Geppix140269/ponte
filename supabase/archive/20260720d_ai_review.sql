-- AI vetting co-pilot: stores the structured review Claude produces for
-- each listing. Run in the Supabase SQL Editor. Safe to re-run.

alter table listings add column if not exists ai_review jsonb;
alter table listings add column if not exists ai_reviewed_at timestamptz;
