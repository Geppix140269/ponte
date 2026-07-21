-- Try-before-register flow: members can keep a listing as a draft and
-- submit it later. Run in the Supabase SQL Editor. Safe to re-run.

-- Allow the 'draft' status.
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected', 'closed'));

-- Members may insert drafts as well as submissions.
drop policy if exists "Members create own listings" on listings;
create policy "Members create own listings"
  on listings for insert to authenticated
  with check (auth.uid() = user_id and status in ('draft', 'submitted'));

-- Members may promote their own draft to submitted (nothing else).
drop policy if exists "Members submit own drafts" on listings;
create policy "Members submit own drafts"
  on listings for update to authenticated
  using (auth.uid() = user_id and status = 'draft')
  with check (auth.uid() = user_id and status in ('draft', 'submitted'));
