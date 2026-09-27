-- Resolve post-login routing in one authenticated database round trip.
-- This avoids separate profile, membership, and platform-admin lookups and lets
-- the application navigate directly to the user's final workspace.
create or replace function public.get_auth_routing_context()
returns table (
  must_change_password boolean,
  school_role public.app_role,
  is_platform_admin boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select p.must_change_password
      from public.profiles p
      where p.id = (select auth.uid())
    ), false),
    (
      select sm.role
      from public.school_members sm
      where sm.user_id = (select auth.uid())
        and sm.status = 'active'
      order by sm.created_at
      limit 1
    ),
    exists (
      select 1
      from public.platform_admins pa
      where pa.user_id = (select auth.uid())
        and pa.status = 'active'
    )
  where (select auth.uid()) is not null;
$$;

revoke all on function public.get_auth_routing_context() from public, anon;
grant execute on function public.get_auth_routing_context() to authenticated;
