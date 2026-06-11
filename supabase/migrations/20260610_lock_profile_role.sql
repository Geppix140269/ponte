-- URGENT SECURITY FIX — ponte.trade
-- Privilege escalation: any logged-in user could run
--   update profiles set role = 'admin' where id = <their own id>
-- via the public data API and then reach /admin.
--
-- Root cause: the profiles UPDATE policy lets a user edit their own row,
-- including the `role` column. This trigger blocks any attempt by an end
-- user (the PostgREST `anon` / `authenticated` roles) to set or change
-- `role`. The server (service_role) and the SQL editor (postgres/owner)
-- are unaffected, so admin promotion via the make-admin script or this
-- editor still works.
--
-- Run in the Supabase SQL editor (paste and execute).

begin;

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.role is distinct from old.role)
     or (tg_op = 'INSERT' and coalesce(new.role, 'customer') <> 'customer')
  then
    -- Only the two PostgREST end-user roles are blocked. service_role,
    -- postgres, supabase_admin, etc. are trusted and pass through.
    if current_user in ('anon', 'authenticated') then
      raise exception 'Not authorized to set profile role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

commit;

-- After running: a normal user trying to set role='admin' gets
-- "Not authorized to set profile role". Promote real admins with
-- scripts/make-admin.mjs (service role) or directly in this editor.
