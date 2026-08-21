-- Onboarding wizard support: class-subject links, elective flag, completion tracking.

alter table public.subjects
  add column if not exists is_elective boolean not null default false;

alter table public.schools
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  is_class_specific boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, class_id, subject_id)
);

create index if not exists class_subjects_school_class_idx
  on public.class_subjects (school_id, class_id);

create index if not exists class_subjects_school_subject_idx
  on public.class_subjects (school_id, subject_id);

-- A subject is available to a class when linked in class_subjects or assigned via teacher_assignments.
create or replace function public.assert_student_subject_enrollment_valid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.enrollments e
    where e.school_id = new.school_id
      and e.student_id = new.student_id
      and e.class_id = new.class_id
      and e.status = 'active'
  ) then
    raise exception 'Student must have an active enrollment in this class';
  end if;

  if not exists (
    select 1 from public.class_subjects cs
    where cs.school_id = new.school_id
      and cs.class_id = new.class_id
      and cs.subject_id = new.subject_id
  ) and not exists (
    select 1 from public.teacher_assignments ta
    where ta.school_id = new.school_id
      and ta.class_id = new.class_id
      and ta.subject_id = new.subject_id
  ) then
    raise exception 'Subject must be assigned to this class before enrolling students';
  end if;

  return new;
end; $$;

alter table public.class_subjects enable row level security;

create policy class_subjects_read on public.class_subjects for select using (
  app.can_access_school(school_id)
);

create policy class_subjects_manage on public.class_subjects for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);
