-- Subject eligibility is class-subject based. A teacher assignment controls who
-- may mark the subject, but must not determine whether a student may study it.
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
  ) then
    raise exception 'Subject must belong to this class before enrolling students';
  end if;
  return new;
end; $$;

-- Keep direct subject associations synchronized when a student's combination
-- changes, including updates performed outside the Next.js application.
create or replace function public.sync_student_combination_subjects()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.class_id is null or new.major is null or new.status <> 'active' then
    return new;
  end if;

  insert into public.student_subject_enrollments (school_id, student_id, subject_id, class_id)
  select distinct new.school_id, new.id, scs.subject_id, new.class_id
  from public.student_subject_combinations sc
  join public.student_subject_combination_classes scc
    on scc.school_id = sc.school_id and scc.combination_id = sc.id and scc.class_id = new.class_id
  join public.student_subject_combination_subjects scs
    on scs.school_id = sc.school_id and scs.combination_id = sc.id
  where sc.school_id = new.school_id
    and sc.is_active = true
    and (
      (sc.combination_key is not null and sc.combination_key = new.major)
      or (sc.combination_key is null and new.major = 'custom:' || sc.id::text)
    )
  on conflict (school_id, student_id, subject_id, class_id) do nothing;

  return new;
end; $$;

drop trigger if exists students_sync_combination_subjects on public.students;
create trigger students_sync_combination_subjects
after insert or update of major, class_id, status on public.students
for each row execute function public.sync_student_combination_subjects();

-- Backfill every school's currently active custom/default combination mappings.
insert into public.student_subject_enrollments (school_id, student_id, subject_id, class_id)
select distinct s.school_id, s.id, scs.subject_id, e.class_id
from public.students s
join public.enrollments e
  on e.school_id = s.school_id and e.student_id = s.id and e.status = 'active'
join public.student_subject_combinations sc
  on sc.school_id = s.school_id and sc.is_active = true
join public.student_subject_combination_classes scc
  on scc.school_id = sc.school_id and scc.combination_id = sc.id and scc.class_id = e.class_id
join public.student_subject_combination_subjects scs
  on scs.school_id = sc.school_id and scs.combination_id = sc.id
where s.status = 'active'
  and (
    (sc.combination_key is not null and sc.combination_key = s.major)
    or (sc.combination_key is null and s.major = 'custom:' || sc.id::text)
  )
on conflict (school_id, student_id, subject_id, class_id) do nothing;
