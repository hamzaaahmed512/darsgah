-- ─── Custom Roles & Permissions Migration ─────────────────────────────────────
-- Adds flexible role/permission system with user-level overrides
-- and profile improvements (personal_email field)

-- 1. Add personal_email to profiles
alter table public.profiles
  add column if not exists personal_email text check (personal_email is null or personal_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

-- 2. Create custom_roles table for school-specific roles
create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  base_role public.app_role not null default 'teacher',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger custom_roles_updated_at before update on public.custom_roles
  for each row execute function public.set_updated_at();

-- 3. Create role_permissions table (customizable permissions per role per school)
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  role_key text not null,   -- Either a standard role name or custom_role_id::text
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, role_key, permission)
);

-- 4. Create user_permission_overrides table (per-user permission grants/revokes)
create table if not exists public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id, permission)
);

create trigger user_permission_overrides_updated_at before update on public.user_permission_overrides
  for each row execute function public.set_updated_at();

-- 5. Add custom_role_id to school_members (optional, null = standard role)
alter table public.school_members
  add column if not exists custom_role_id uuid references public.custom_roles(id) on delete set null;

-- 6. Enable RLS on new tables
alter table public.custom_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;

-- 7. RLS Policies for custom_roles
create policy custom_roles_select on public.custom_roles
  for select using (app.can_access_school(school_id));

create policy custom_roles_all_admin on public.custom_roles
  for all using (app.has_school_role(school_id, array['administrator']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

-- 8. RLS Policies for role_permissions
create policy role_permissions_select on public.role_permissions
  for select using (app.can_access_school(school_id));

create policy role_permissions_all_admin on public.role_permissions
  for all using (app.has_school_role(school_id, array['administrator']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

-- 9. RLS Policies for user_permission_overrides
create policy user_permission_overrides_select_self on public.user_permission_overrides
  for select using (user_id = auth.uid() or app.has_school_role(school_id, array['administrator']::public.app_role[]));

create policy user_permission_overrides_all_admin on public.user_permission_overrides
  for all using (app.has_school_role(school_id, array['administrator']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

-- 10. Recreate staff_directory view to include new fields
drop view if exists public.staff_directory;

create or replace view public.staff_directory
with (security_invoker = true)
as
select
  sm.id as member_id,
  sm.school_id,
  p.id as user_id,
  p.full_name,
  p.email,
  p.personal_email,
  p.avatar_url,
  p.phone,
  p.bio,
  p.must_change_password,
  sm.role,
  sm.status,
  sm.department,
  sm.job_title,
  sm.custom_role_id,
  cr.name as custom_role_name,
  count(ta.id)::int as assigned_classes
from public.school_members sm
join public.profiles p on p.id = sm.user_id
left join public.custom_roles cr on cr.id = sm.custom_role_id
left join public.teacher_assignments ta on ta.teacher_id = p.id and ta.school_id = sm.school_id
group by sm.id, sm.school_id, p.id, p.full_name, p.email, p.personal_email, p.avatar_url, p.phone, p.bio,
         p.must_change_password, sm.role, sm.status, sm.department, sm.job_title, sm.custom_role_id, cr.name;

-- 11. Function to get all resolved permissions for a user in a school
create or replace function app.get_resolved_permissions(p_user_id uuid, p_school_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_custom_role_id uuid;
  v_permissions text[];
  v_overrides record;
  v_role_key text;
begin
  -- Get user's role and custom role from school_members
  select role, custom_role_id
  into v_role, v_custom_role_id
  from public.school_members
  where school_id = p_school_id
    and user_id = p_user_id
    and status = 'active'
  limit 1;

  if v_role is null then
    return array[]::text[];
  end if;

  -- Determine role key for permission lookup
  if v_custom_role_id is not null then
    v_role_key := v_custom_role_id::text;
  else
    v_role_key := v_role::text;
  end if;

  -- Get permissions from role_permissions table (customized)
  select array_agg(permission) into v_permissions
  from public.role_permissions
  where school_id = p_school_id
    and role_key = v_role_key
    and granted = true;

  -- If no customized permissions found, fall back to defaults for standard roles
  if v_permissions is null then
    v_permissions := case v_role
      when 'administrator' then array[
        'dashboard:view','students:view','students:create','students:update','students:archive',
        'attendance:view','staff:view','staff:manage','academics:view','academics:manage',
        'results:view','results:generate','reports:view','activity:view','settings:manage',
        'users:manage','approvals:view','approvals:review','teachers:manage','classes:manage',
        'finance:view','finance:manage','payroll:view','payroll:manage','announcements:view'
      ]
      when 'principal' then array[
        'dashboard:view','students:view','students:create','students:update','students:archive',
        'attendance:view','staff:view','academics:view','marks:approve','results:view',
        'results:generate','reports:view','activity:view','approvals:view','approvals:review',
        'teachers:manage','classes:manage','finance:view','finance:manage','payroll:view',
        'payroll:manage','announcements:view','announcements:manage'
      ]
      when 'teacher' then array[
        'dashboard:view','students:view','attendance:view','attendance:submit','academics:view',
        'marks:manage','results:view','payroll:view','announcements:view'
      ]
      when 'student_staff' then array[
        'dashboard:view','students:view','attendance:view','results:view','results:generate',
        'reports:view','approvals:view','finance:view','announcements:view'
      ]
      else array[]::text[]
    end;
  end if;

  -- Apply user-level overrides (granted=true adds, granted=false removes)
  for v_overrides in
    select permission, granted
    from public.user_permission_overrides
    where school_id = p_school_id
      and user_id = p_user_id
  loop
    if v_overrides.granted then
      -- Add permission if not already present
      if not (v_overrides.permission = any(v_permissions)) then
        v_permissions := v_permissions || v_overrides.permission;
      end if;
    else
      -- Remove permission if present
      v_permissions := array_remove(v_permissions, v_overrides.permission);
    end if;
  end loop;

  return coalesce(v_permissions, array[]::text[]);
end;
$$;

-- 12. Function to initialize default role_permissions for a new school
create or replace function public.initialize_school_permissions(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_permission text;
  v_default_permissions jsonb := '{
    "administrator": ["dashboard:view","students:view","students:create","students:update","students:archive","attendance:view","staff:view","staff:manage","academics:view","academics:manage","results:view","results:generate","reports:view","activity:view","settings:manage","users:manage","approvals:view","approvals:review","teachers:manage","classes:manage","finance:view","finance:manage","payroll:view","payroll:manage","announcements:view"],
    "principal": ["dashboard:view","students:view","students:create","students:update","students:archive","attendance:view","staff:view","academics:view","marks:approve","results:view","results:generate","reports:view","activity:view","approvals:view","approvals:review","teachers:manage","classes:manage","finance:view","finance:manage","payroll:view","payroll:manage","announcements:view","announcements:manage"],
    "teacher": ["dashboard:view","students:view","attendance:view","attendance:submit","academics:view","marks:manage","results:view","payroll:view","announcements:view"],
    "student_staff": ["dashboard:view","students:view","attendance:view","results:view","results:generate","reports:view","approvals:view","finance:view","announcements:view"]
  }'::jsonb;
begin
  for v_role in select jsonb_object_keys(v_default_permissions)
  loop
    for v_permission in select jsonb_array_elements_text(v_default_permissions -> v_role)
    loop
      insert into public.role_permissions (school_id, role_key, permission, granted)
      values (p_school_id, v_role, v_permission, true)
      on conflict (school_id, role_key, permission) do nothing;
    end loop;
  end loop;
end;
$$;

-- 13. Seed default permissions for any existing schools (if applied to an existing database)
select public.initialize_school_permissions(id) from public.schools;

-- 14. Trigger to auto-initialize permissions for any new school
create or replace function public.on_school_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.initialize_school_permissions(new.id);
  return new;
end;
$$;

drop trigger if exists school_initialize_permissions on public.schools;
create trigger school_initialize_permissions
  after insert on public.schools
  for each row execute function public.on_school_created();
