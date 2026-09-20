-- Server actions use the service role after validating membership and authority.
-- Ordinary authenticated clients must not write the privilege tables directly.
revoke insert, update, delete on public.custom_roles, public.role_permissions,
  public.user_permission_overrides from authenticated;
drop policy if exists custom_roles_all_admin on public.custom_roles;
drop policy if exists role_permissions_all_admin on public.role_permissions;
drop policy if exists user_permission_overrides_all_admin on public.user_permission_overrides;

create or replace function public.guard_school_member_privileges()
returns trigger language plpgsql security definer set search_path = public, app as $$
declare v_actor_role public.app_role;
declare v_custom_base text;
begin
  if auth.role() = 'service_role' then return new; end if;
  select role into v_actor_role from public.school_members
    where school_id = new.school_id and user_id = auth.uid() and status = 'active'
    limit 1;
  if v_actor_role is null then raise exception 'Unauthorized member change'; end if;
  if new.custom_role_id is not null then
    select base_role into v_custom_base from public.custom_roles
      where id = new.custom_role_id and school_id = new.school_id;
    if v_custom_base is null or v_custom_base = 'principal'
      or (v_actor_role <> 'principal' and v_custom_base = 'administrator') then
      raise exception 'Protected custom role assignment';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.role = 'principal' or (new.role = 'administrator' and v_actor_role <> 'principal') then
      raise exception 'Protected role assignment';
    end if;
  else
    if old.school_id <> new.school_id or old.user_id <> new.user_id then
      raise exception 'Member identity cannot change';
    end if;
    if new.role = 'principal' and old.role <> 'principal' then raise exception 'Protected role assignment'; end if;
    if v_actor_role <> 'principal' and
      (old.user_id = auth.uid() or old.role in ('principal', 'administrator')
        or new.role in ('principal', 'administrator')) then
      raise exception 'Protected member change';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists school_member_privilege_guard on public.school_members;
create trigger school_member_privilege_guard before insert or update on public.school_members
for each row execute function public.guard_school_member_privileges();
