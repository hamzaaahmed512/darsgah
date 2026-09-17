-- Add profile columns for address and emergency contacts
alter table public.profiles
  add column if not exists address text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

-- Add new member status values
do $$
begin
  alter type public.member_status add value if not exists 'inactive';
  alter type public.member_status add value if not exists 'archived';
exception when duplicate_object then null;
end $$;

-- Create teacher employment details table
create table if not exists public.teacher_employment_details (
  teacher_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  designation text,
  department text,
  joining_date date not null default current_date,
  monthly_salary numeric not null default 0 check (monthly_salary >= 0),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'cheque')),
  salary_start_date date not null default current_date,
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create salary history table
create table if not exists public.salary_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  previous_salary numeric not null check (previous_salary >= 0),
  new_salary numeric not null check (new_salary >= 0),
  action_type text not null check (action_type in ('initial', 'increase', 'decrease')),
  effective_date date not null default current_date,
  approved_by uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now()
);

-- Create salary adjustments table
create table if not exists public.salary_adjustments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('bonus', 'deduction')),
  reason text not null,
  effective_date date not null default current_date,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Create payroll table
create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  base_salary numeric not null check (base_salary >= 0),
  total_bonus numeric not null default 0 check (total_bonus >= 0),
  total_deductions numeric not null default 0 check (total_deductions >= 0),
  net_salary numeric not null check (net_salary >= 0),
  status text not null default 'generated' check (status in ('generated', 'paid')),
  payment_date date,
  approved_by uuid references public.profiles(id) on delete set null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, teacher_id, month)
);

-- Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  description text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  type text not null check (type in ('general', 'academic', 'holiday', 'emergency', 'meeting', 'examination', 'urgent')),
  audience_type text not null check (audience_type in ('all', 'teachers', 'registrar', 'admin', 'class', 'department', 'roles')),
  audience_value text,
  publish_date date not null default current_date,
  expiry_date date,
  attachment_url text,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create announcement reads table
create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (school_id, announcement_id, user_id)
);

-- Enable RLS
alter table public.teacher_employment_details enable row level security;
alter table public.salary_history enable row level security;
alter table public.salary_adjustments enable row level security;
alter table public.payroll enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- Add updated_at triggers
drop trigger if exists teacher_employment_details_updated_at on public.teacher_employment_details;
create trigger teacher_employment_details_updated_at before update on public.teacher_employment_details for each row execute function public.set_updated_at();

drop trigger if exists payroll_updated_at on public.payroll;
create trigger payroll_updated_at before update on public.payroll for each row execute function public.set_updated_at();

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();

-- RLS Policies
-- teacher_employment_details
create policy teacher_employment_select_self on public.teacher_employment_details
  for select using (teacher_id = auth.uid());

create policy teacher_employment_all_admin on public.teacher_employment_details
  for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- salary_history
create policy salary_history_select_self on public.salary_history
  for select using (teacher_id = auth.uid());

create policy salary_history_all_admin on public.salary_history
  for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- salary_adjustments
create policy salary_adjustments_select_self on public.salary_adjustments
  for select using (teacher_id = auth.uid());

create policy salary_adjustments_all_admin on public.salary_adjustments
  for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- payroll
create policy payroll_select_self on public.payroll
  for select using (teacher_id = auth.uid());

create policy payroll_all_admin on public.payroll
  for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- announcements
create policy announcements_select on public.announcements
  for select using (app.can_access_school(school_id));

create policy announcements_all_admin on public.announcements
  for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- announcement_reads
create policy announcement_reads_select on public.announcement_reads
  for select using (user_id = auth.uid());

create policy announcement_reads_insert on public.announcement_reads
  for insert with check (user_id = auth.uid());

-- Recreate Student write RLS policies (revoking write access for Registrar, keeping it for Principal and Admin)
drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff on public.students
  for insert with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

drop policy if exists students_update_staff on public.students;
create policy students_update_staff on public.students
  for update using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- Stored Procedure to generate monthly payroll
create or replace function public.generate_monthly_payroll(
  p_school_id uuid,
  p_month text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_bonus numeric;
  v_deduction numeric;
  v_payroll_exists boolean;
begin
  for r in (
    select sm.user_id, ted.monthly_salary
    from public.school_members sm
    join public.teacher_employment_details ted on ted.teacher_id = sm.user_id
    where sm.school_id = p_school_id
      and sm.role = 'teacher'
      and sm.status = 'active'
      and ted.employment_status = 'active'
  ) loop
    select exists (
      select 1 from public.payroll
      where school_id = p_school_id
        and teacher_id = r.user_id
        and month = p_month
    ) into v_payroll_exists;

    if not v_payroll_exists then
      select coalesce(sum(amount), 0)
      into v_bonus
      from public.salary_adjustments
      where school_id = p_school_id
        and teacher_id = r.user_id
        and type = 'bonus'
        and to_char(effective_date, 'YYYY-MM') = p_month;

      select coalesce(sum(amount), 0)
      into v_deduction
      from public.salary_adjustments
      where school_id = p_school_id
        and teacher_id = r.user_id
        and type = 'deduction'
        and to_char(effective_date, 'YYYY-MM') = p_month;

      insert into public.payroll (
        school_id,
        teacher_id,
        month,
        base_salary,
        total_bonus,
        total_deductions,
        net_salary,
        status,
        approved_by
      ) values (
        p_school_id,
        r.user_id,
        p_month,
        r.monthly_salary,
        v_bonus,
        v_deduction,
        greatest(0, r.monthly_salary + v_bonus - v_deduction),
        'generated',
        p_actor_id
      );
    end if;
  end loop;
end;
$$;
