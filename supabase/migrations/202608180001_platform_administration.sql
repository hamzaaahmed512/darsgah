-- GetDarsgah platform administration. Platform admins are separate from school roles.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools
  add column if not exists platform_status text not null default 'active'
    check (platform_status in ('trial', 'active', 'suspended', 'archived')),
  add column if not exists subscription_plan text not null default 'school'
    check (subscription_plan in ('school', 'network', 'custom')),
  add column if not exists billing_status text not null default 'trialing'
    check (billing_status in ('trialing', 'active', 'past_due', 'cancelled')),
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists archived_at timestamptz;

create table if not exists public.platform_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists schools_platform_status_idx on public.schools (platform_status, created_at desc);
create index if not exists schools_billing_status_idx on public.schools (billing_status, subscription_ends_at);
create index if not exists platform_audit_school_created_idx on public.platform_audit_logs (school_id, created_at desc);

alter table public.platform_admins enable row level security;
alter table public.platform_audit_logs enable row level security;

-- Portal reads and writes use the server-only service role after explicit admin authorization.
-- Tenant users receive no direct policies for platform administration tables.

drop trigger if exists platform_admins_updated_at on public.platform_admins;
create trigger platform_admins_updated_at before update on public.platform_admins
for each row execute function public.set_updated_at();

-- Suspended and archived schools lose tenant access at the RLS boundary.
create or replace function app.has_school_role(target_school_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members sm
    join public.schools s on s.id = sm.school_id
    where sm.school_id = target_school_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
      and sm.role = any(allowed_roles)
      and s.platform_status in ('trial', 'active')
  );
$$;

create or replace function app.can_access_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members sm
    join public.schools s on s.id = sm.school_id
    where sm.school_id = target_school_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
      and s.platform_status in ('trial', 'active')
  );
$$;

revoke all on public.platform_admins from anon, authenticated;
revoke all on public.platform_audit_logs from anon, authenticated;
