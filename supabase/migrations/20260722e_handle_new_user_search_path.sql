-- The signup trigger has never worked in production, and said nothing.
--
-- Run: node scripts/db-query.mjs --file supabase/migrations/20260722e_handle_new_user_search_path.sql
--
-- ---------------------------------------------------------------------------
-- What was actually happening
-- ---------------------------------------------------------------------------
-- Found by signing up a real test account end to end on 2026-07-22. The
-- account was created, and then: no profiles row, and no grant_signup row in
-- credit_ledger. The gate's own credits line reported the truth, "You have 0
-- credits", which is how it surfaced at all.
--
-- handle_new_user() is SECURITY DEFINER with no search_path of its own, so it
-- runs with whatever search_path the caller has. The caller is GoTrue
-- inserting into auth.users, and that search_path does not include public.
-- `insert into profiles` therefore fails to resolve the table, raises, and is
-- caught by the function's own `exception when others` handler, which logs a
-- warning and returns new.
--
-- The handler was written so a failed credit grant could never block an
-- account being created, which is the right instinct. Its blast radius was
-- simply too wide: it also swallowed the profile insert, and turned a hard
-- failure into a silent one for every member who has ever signed up.
--
-- spend_credits() already does this correctly: SECURITY DEFINER with
-- `set search_path = public`. This brings handle_new_user() into line.
--
-- Additive and reversible. No data is touched here; the backfill for accounts
-- created while this was broken is separate, below.

alter function public.handle_new_user() set search_path = public;

-- ---------------------------------------------------------------------------
-- Backfill the accounts that signed up while it was broken
-- ---------------------------------------------------------------------------
-- Every existing auth user without a profiles row gets one now. `full_name`
-- comes from the signup metadata where there is any, exactly as the trigger
-- would have set it.
insert into profiles (id, full_name)
select u.id, u.raw_user_meta_data->>'full_name'
  from auth.users u
  left join profiles p on p.id = u.id
 where p.id is null
    on conflict (id) do nothing;

-- And the credits they were promised. The `not exists` guard is the same one
-- the trigger uses, so running this twice cannot mint a second grant.
insert into credit_ledger (user_id, delta, reason, ref)
select u.id, 3, 'grant_signup', 'signup_backfill'
  from auth.users u
 where not exists (
   select 1 from credit_ledger cl
    where cl.user_id = u.id and cl.reason = 'grant_signup'
 );
