alter table public.classes
  add column if not exists head_teacher_id uuid references public.profiles(id) on delete restrict;

update public.classes c
set head_teacher_id = ta.teacher_id
from (
  select distinct on (school_id, class_id)
    school_id,
    class_id,
    teacher_id
  from public.teacher_assignments
  order by school_id, class_id, created_at
) ta
where ta.school_id = c.school_id
  and ta.class_id = c.id
  and c.head_teacher_id is null;

update public.classes c
set head_teacher_id = sm.user_id
from (
  select distinct on (school_id)
    school_id,
    user_id
  from public.school_members
  where role = 'teacher'
    and status = 'active'
  order by school_id, created_at
) sm
where sm.school_id = c.school_id
  and c.head_teacher_id is null;

alter table public.classes
  alter column head_teacher_id set not null;

create index if not exists classes_school_head_teacher_idx
  on public.classes (school_id, head_teacher_id);

create or replace function public.ensure_class_head_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.school_members sm
    where sm.school_id = new.school_id
      and sm.user_id = new.head_teacher_id
      and sm.role = 'teacher'
      and sm.status = 'active'
  ) then
    raise exception 'Head teacher must be an active teacher in this school.';
  end if;

  return new;
end;
$$;

drop trigger if exists classes_head_teacher_guard on public.classes;
create trigger classes_head_teacher_guard
  before insert or update of school_id, head_teacher_id on public.classes
  for each row execute function public.ensure_class_head_teacher();

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
  )
  or exists (
    select 1
    from public.classes
    where school_id = target_school_id
      and id = target_class_id
      and head_teacher_id = auth.uid()
  );
$$;

create or replace function app.is_head_teacher_for_class(target_school_id uuid, target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes
    where school_id = target_school_id
      and id = target_class_id
      and head_teacher_id = auth.uid()
  );
$$;

drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff on public.students for insert with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists guardians_manage on public.guardians;
create policy guardians_manage on public.guardians for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists student_guardians_manage on public.student_guardians;
create policy student_guardians_manage on public.student_guardians for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists enrollments_manage on public.enrollments;
create policy enrollments_manage on public.enrollments for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists attendance_sessions_submit on public.attendance_sessions;
create policy attendance_sessions_submit on public.attendance_sessions for insert with check (
  app.is_head_teacher_for_class(school_id, class_id)
);

drop policy if exists attendance_sessions_update on public.attendance_sessions;

drop policy if exists attendance_records_submit on public.attendance_records;
create policy attendance_records_submit on public.attendance_records for insert with check (
  app.is_head_teacher_for_class(school_id, class_id)
);

drop policy if exists attendance_records_update on public.attendance_records;
