-- Who is submitting and how close they sit to the goods (or the money).
-- Feeds the desk view and the AI vetting co-pilot. Safe to re-run.

alter table listings add column if not exists submitter_role text;
alter table listings add column if not exists chain_depth text;
