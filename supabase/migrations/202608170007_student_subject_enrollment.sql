-- Explicit subject enrollment: class membership alone never implies that a
-- student studies every subject assigned to the class.
create table if not exists public.student_subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references public.profiles(id) on delete set null,
  unique (school_id, student_id, subject_id, class_id)
);

create index if not exists student_subject_enrollments_school_class_subject_idx
  on public.student_subject_enrollments (school_id, class_id, subject_id, student_id);
create index if not exists student_subject_enrollments_school_student_idx
  on public.student_subject_enrollments (school_id, student_id, class_id);
-- One assigned teacher owns a given subject/class. Resolve any existing
-- duplicate subject assignments before running this migration.
create unique index if not exists teacher_assignments_school_class_subject_unique_idx
  on public.teacher_assignments (school_id, class_id, subject_id) where subject_id is not null;

-- Keep enrollments valid even when writes originate outside the Next.js app.
create or replace function public.assert_student_subject_enrollment_valid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.enrollments e where e.school_id = new.school_id and e.student_id = new.student_id and e.class_id = new.class_id and e.status = 'active') then
    raise exception 'Student must have an active enrollment in this class';
  end if;
  if not exists (select 1 from public.teacher_assignments ta where ta.school_id = new.school_id and ta.class_id = new.class_id and ta.subject_id = new.subject_id) then
    raise exception 'Subject must be assigned to this class before enrolling students';
  end if;
  return new;
end; $$;
drop trigger if exists student_subject_enrollments_validate on public.student_subject_enrollments;
create trigger student_subject_enrollments_validate before insert or update on public.student_subject_enrollments
for each row execute function public.assert_student_subject_enrollment_valid();

alter table public.student_subject_enrollments enable row level security;
create policy student_subject_enrollments_read on public.student_subject_enrollments for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_teacher_for_class(school_id, class_id)
);
create policy student_subject_enrollments_manage on public.student_subject_enrollments for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- Principals use the Subjects page to manage the pre-existing structures too.
drop policy if exists subjects_manage on public.subjects;
create policy subjects_manage on public.subjects for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));
drop policy if exists teacher_assignments_manage on public.teacher_assignments;
create policy teacher_assignments_manage on public.teacher_assignments for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

-- Final enforcement for direct mark writes. The service also validates this,
-- but the trigger protects RPC/API callers and future clients.
create or replace function public.assert_mark_student_subject_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.student_subject_enrollments sse where sse.school_id = new.school_id and sse.student_id = new.student_id and sse.class_id = new.class_id and sse.subject_id = new.subject_id) then
    raise exception 'Student is not enrolled in this subject';
  end if;
  return new;
end; $$;
drop trigger if exists marks_student_subject_enrollment on public.marks;
create trigger marks_student_subject_enrollment before insert or update on public.marks
for each row execute function public.assert_mark_student_subject_enrollment();
