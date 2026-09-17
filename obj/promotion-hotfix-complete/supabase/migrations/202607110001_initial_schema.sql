create schema if not exists app;
create extension if not exists "pgcrypto";

create type public.app_role as enum ('principal', 'teacher', 'student_staff', 'administrator');
create type public.member_status as enum ('active', 'invited', 'disabled');
create type public.student_status as enum ('active', 'graduated', 'transferred', 'archived');
create type public.enrollment_status as enum ('active', 'completed', 'withdrawn');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.attendance_session_status as enum ('draft', 'submitted', 'locked');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  status public.member_status not null default 'active',
  department text,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  check (starts_on < ends_on)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (school_id, code)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  grade_id uuid not null references public.grades(id) on delete restrict,
  section_id uuid references public.sections(id) on delete set null,
  name text not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, teacher_id, class_id, subject_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  date_of_birth date not null,
  gender text,
  email text,
  phone text,
  address text,
  admission_date date not null,
  status public.student_status not null default 'active',
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, admission_number),
  check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  relationship text not null,
  email text,
  phone text not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, student_id, guardian_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, class_id, academic_year_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  attendance_date date not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  status public.attendance_session_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, attendance_date)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, class_id, attendance_date)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.school_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index school_members_school_role_idx on public.school_members (school_id, role);
create index students_school_status_idx on public.students (school_id, status);
create index students_school_name_idx on public.students (school_id, last_name, first_name);
create index enrollments_school_class_idx on public.enrollments (school_id, class_id, status);
create index teacher_assignments_teacher_idx on public.teacher_assignments (school_id, teacher_id);
create index attendance_records_school_date_idx on public.attendance_records (school_id, attendance_date);
create index activity_logs_school_created_idx on public.activity_logs (school_id, created_at desc);

create trigger schools_updated_at before update on public.schools for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger school_members_updated_at before update on public.school_members for each row execute function public.set_updated_at();
create trigger academic_years_updated_at before update on public.academic_years for each row execute function public.set_updated_at();
create trigger grades_updated_at before update on public.grades for each row execute function public.set_updated_at();
create trigger sections_updated_at before update on public.sections for each row execute function public.set_updated_at();
create trigger subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
create trigger classes_updated_at before update on public.classes for each row execute function public.set_updated_at();
create trigger teacher_assignments_updated_at before update on public.teacher_assignments for each row execute function public.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger guardians_updated_at before update on public.guardians for each row execute function public.set_updated_at();
create trigger enrollments_updated_at before update on public.enrollments for each row execute function public.set_updated_at();
create trigger attendance_sessions_updated_at before update on public.attendance_sessions for each row execute function public.set_updated_at();
create trigger attendance_records_updated_at before update on public.attendance_records for each row execute function public.set_updated_at();
create trigger school_settings_updated_at before update on public.school_settings for each row execute function public.set_updated_at();

create or replace function app.has_school_role(target_school_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members
    where school_id = target_school_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(allowed_roles)
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
    from public.school_members
    where school_id = target_school_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function app.is_teacher_for_class(target_school_id uuid, target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_assignments
    where school_id = target_school_id
      and class_id = target_class_id
      and teacher_id = auth.uid()
  );
$$;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_members enable row level security;
alter table public.academic_years enable row level security;
alter table public.grades enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.activity_logs enable row level security;
alter table public.school_settings enable row level security;

create policy schools_select_member on public.schools for select using (app.can_access_school(id));
create policy schools_update_admin on public.schools for update using (app.has_school_role(id, array['administrator']::public.app_role[]));

create policy profiles_select_self_or_school on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.school_members mine
    join public.school_members theirs on theirs.school_id = mine.school_id
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy members_select_member on public.school_members for select using (app.can_access_school(school_id));
create policy members_admin_insert on public.school_members for insert with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy members_admin_update on public.school_members for update using (app.has_school_role(school_id, array['administrator']::public.app_role[]));

create policy academic_read on public.academic_years for select using (app.can_access_school(school_id));
create policy academic_manage on public.academic_years for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy grades_read on public.grades for select using (app.can_access_school(school_id));
create policy grades_manage on public.grades for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy sections_read on public.sections for select using (app.can_access_school(school_id));
create policy sections_manage on public.sections for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy subjects_read on public.subjects for select using (app.can_access_school(school_id));
create policy subjects_manage on public.subjects for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy classes_read on public.classes for select using (app.can_access_school(school_id));
create policy classes_manage on public.classes for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

create policy teacher_assignments_read on public.teacher_assignments for select using (app.can_access_school(school_id));
create policy teacher_assignments_manage on public.teacher_assignments for all using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

create policy students_select_by_role on public.students for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or exists (
    select 1 from public.enrollments e
    where e.student_id = students.id
      and e.school_id = students.school_id
      and e.status = 'active'
      and app.is_teacher_for_class(students.school_id, e.class_id)
  )
);
create policy students_insert_staff on public.students for insert with check (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[]));
create policy students_update_staff on public.students for update using (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[]));

create policy guardians_select on public.guardians for select using (app.can_access_school(school_id));
create policy guardians_manage on public.guardians for all using (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[]));
create policy student_guardians_select on public.student_guardians for select using (app.can_access_school(school_id));
create policy student_guardians_manage on public.student_guardians for all using (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[]));

create policy enrollments_select on public.enrollments for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy enrollments_manage on public.enrollments for all using (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','student_staff']::public.app_role[]));

create policy attendance_sessions_select on public.attendance_sessions for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy attendance_sessions_submit on public.attendance_sessions for insert with check (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy attendance_sessions_update on public.attendance_sessions for update using (
  status <> 'locked'
  and (app.has_school_role(school_id, array['administrator']::public.app_role[]) or app.is_teacher_for_class(school_id, class_id))
) with check (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);

create policy attendance_records_select on public.attendance_records for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy attendance_records_submit on public.attendance_records for insert with check (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy attendance_records_update on public.attendance_records for update using (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
) with check (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);

create policy activity_read on public.activity_logs for select using (app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[]));
create policy activity_insert_member on public.activity_logs for insert with check (app.can_access_school(school_id));

create policy settings_select_admin on public.school_settings for select using (app.has_school_role(school_id, array['administrator']::public.app_role[]));
create policy settings_update_admin on public.school_settings for update using (app.has_school_role(school_id, array['administrator']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator']::public.app_role[]));

create or replace view public.student_directory
with (security_invoker = true)
as
select
  s.*,
  e.class_id,
  c.name as class_name,
  g.name as grade_name,
  sec.name as section_name,
  guardian.full_name as guardian_name,
  case
    when count(ar.id) = 0 then null
    else round(100.0 * count(ar.id) filter (where ar.status in ('present','late')) / count(ar.id), 1)
  end as attendance_rate
from public.students s
left join public.enrollments e on e.student_id = s.id and e.school_id = s.school_id and e.status = 'active'
left join public.classes c on c.id = e.class_id
left join public.grades g on g.id = c.grade_id
left join public.sections sec on sec.id = c.section_id
left join lateral (
  select gu.full_name
  from public.student_guardians sg
  join public.guardians gu on gu.id = sg.guardian_id
  where sg.student_id = s.id and sg.school_id = s.school_id
  order by sg.is_primary desc
  limit 1
) guardian on true
left join public.attendance_records ar on ar.student_id = s.id and ar.school_id = s.school_id
group by s.id, e.class_id, c.name, g.name, sec.name, guardian.full_name;

create or replace view public.student_guardian_details
with (security_invoker = true)
as
select
  sg.school_id,
  sg.student_id,
  sg.guardian_id,
  sg.is_primary,
  g.full_name,
  g.relationship,
  g.email,
  g.phone,
  g.emergency_contact_name,
  g.emergency_contact_phone
from public.student_guardians sg
join public.guardians g on g.id = sg.guardian_id;

create or replace view public.class_enrollment_counts
with (security_invoker = true)
as
select
  c.school_id,
  c.id as class_id,
  c.name as class_name,
  g.name as grade_name,
  count(e.id)::int as student_count
from public.classes c
join public.grades g on g.id = c.grade_id
left join public.enrollments e on e.class_id = c.id and e.status = 'active'
group by c.school_id, c.id, c.name, g.name;

create or replace view public.staff_directory
with (security_invoker = true)
as
select
  sm.id as member_id,
  sm.school_id,
  p.id as user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  sm.role,
  sm.status,
  sm.department,
  sm.job_title,
  count(ta.id)::int as assigned_classes
from public.school_members sm
join public.profiles p on p.id = sm.user_id
left join public.teacher_assignments ta on ta.teacher_id = p.id and ta.school_id = sm.school_id
group by sm.id, sm.school_id, p.id, p.full_name, p.email, p.avatar_url, sm.role, sm.status, sm.department, sm.job_title;
