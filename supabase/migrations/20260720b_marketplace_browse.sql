-- Marketplace Phase 2: the browsable board.
-- Run in the Supabase SQL Editor after the Phase 1 migration.
--
-- Signed-in users may read APPROVED listings in full. Visitors get only
-- server-rendered teasers (the anon key can read nothing directly).

drop policy if exists "Authenticated read approved listings" on listings;
create policy "Authenticated read approved listings"
  on listings for select
  to authenticated
  using (status = 'approved');
