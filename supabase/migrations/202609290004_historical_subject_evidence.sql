-- RES-03: retain subject membership when a combination is edited, and enroll
-- new upper-grade students only in their selected combination's subjects.
create table if not exists public.student_subject_enrollment_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  valid_from timestamptz not null,
  valid_to timestamptz,
  check (valid_to is null or valid_to >= valid_from)
);
create index if not exists student_subject_history_card_idx
  on public.student_subject_enrollment_history(school_id,class_id,student_id,subject_id,valid_from);
create unique index if not exists student_subject_history_active_idx
  on public.student_subject_enrollment_history(school_id,class_id,student_id,subject_id)
  where valid_to is null;
alter table public.student_subject_enrollment_history enable row level security;
drop policy if exists student_subject_history_read on public.student_subject_enrollment_history;
create policy student_subject_history_read on public.student_subject_enrollment_history
for select using (
  app.has_school_role(school_id,array['administrator','principal','student_staff']::public.app_role[])
  or app.is_teacher_for_class(school_id,class_id)
);
grant select on public.student_subject_enrollment_history to authenticated;

create or replace function public.record_student_subject_enrollment_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.student_subject_enrollment_history
      (school_id,student_id,class_id,subject_id,valid_from)
    values(new.school_id,new.student_id,new.class_id,new.subject_id,new.enrolled_at)
    on conflict (school_id,class_id,student_id,subject_id) where valid_to is null do nothing;
    return new;
  end if;
  update public.student_subject_enrollment_history set valid_to=greatest(now(),valid_from)
  where school_id=old.school_id and student_id=old.student_id and class_id=old.class_id
    and subject_id=old.subject_id and valid_to is null;
  if not found then
    -- Existing rows predate this trigger. Preserve their original enrolled_at.
    insert into public.student_subject_enrollment_history
      (school_id,student_id,class_id,subject_id,valid_from,valid_to)
    values(old.school_id,old.student_id,old.class_id,old.subject_id,old.enrolled_at,
      greatest(now(),old.enrolled_at));
  end if;
  return old;
end $$;
drop trigger if exists student_subject_enrollment_history_insert on public.student_subject_enrollments;
create trigger student_subject_enrollment_history_insert
after insert on public.student_subject_enrollments for each row
execute function public.record_student_subject_enrollment_history();
drop trigger if exists student_subject_enrollment_history_delete on public.student_subject_enrollments;
create trigger student_subject_enrollment_history_delete
after delete on public.student_subject_enrollments for each row
execute function public.record_student_subject_enrollment_history();

-- Seed only documented current memberships. Do not infer deleted legacy rows
-- from today's combination mapping.
insert into public.student_subject_enrollment_history
  (school_id,student_id,class_id,subject_id,valid_from)
select school_id,student_id,class_id,subject_id,enrolled_at
from public.student_subject_enrollments
on conflict (school_id,class_id,student_id,subject_id) where valid_to is null do nothing;

-- Combination edits upsert existing rows. Keep their original start time;
-- otherwise an unchanged subject appears to have been added today.
create or replace function public.preserve_student_subject_enrolled_at()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.school_id,new.student_id,new.class_id,new.subject_id)
     is distinct from (old.school_id,old.student_id,old.class_id,old.subject_id) then
    raise exception 'Change a subject enrollment by deleting and inserting its row';
  end if;
  new.enrolled_at := old.enrolled_at;
  return new;
end $$;
drop trigger if exists student_subject_enrollment_preserve_start on public.student_subject_enrollments;
create trigger student_subject_enrollment_preserve_start
before update on public.student_subject_enrollments for each row
execute function public.preserve_student_subject_enrolled_at();

create or replace function public.auto_enroll_class_subjects()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_major text; v_grade text; v_grade_no integer; v_custom_id uuid;
begin
  if new.status<>'active' then return new; end if;
  select coalesce(new.major,s.major),g.name into v_major,v_grade
  from public.students s
  join public.classes c on c.school_id=s.school_id and c.id=new.class_id
  join public.grades g on g.school_id=c.school_id and g.id=c.grade_id
  where s.school_id=new.school_id and s.id=new.student_id;
  v_grade_no := substring(v_grade from '([0-9]+)')::integer;

  if v_grade_no in (9,10,11,12) and v_major like 'custom:%' then
    if v_major !~ '^custom:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Invalid subject combination';
    end if;
    v_custom_id := substring(v_major from 8)::uuid;
    if not exists(select 1 from public.student_subject_combinations sc
      where sc.school_id=new.school_id and sc.id=v_custom_id and sc.is_active) then
      raise exception 'Student subject combination is unavailable';
    end if;
    insert into public.class_subjects(school_id,class_id,subject_id,is_class_specific)
    select new.school_id,new.class_id,scs.subject_id,false
    from public.student_subject_combination_subjects scs
    where scs.school_id=new.school_id and scs.combination_id=v_custom_id
    on conflict (school_id,class_id,subject_id) do nothing;
    insert into public.student_subject_enrollments(school_id,student_id,class_id,subject_id)
    select new.school_id,new.student_id,new.class_id,scs.subject_id
    from public.student_subject_combination_subjects scs
    where scs.school_id=new.school_id and scs.combination_id=v_custom_id
    on conflict (school_id,student_id,subject_id,class_id) do nothing;
    return new;
  end if;

  -- Existing non-custom behavior, with the fixed default-combination
  -- exclusions applied before the subject rows become historical evidence.
  insert into public.student_subject_enrollments(school_id,student_id,class_id,subject_id)
  select new.school_id,new.student_id,new.class_id,ta.subject_id
  from public.teacher_assignments ta
  join public.subjects sub on sub.school_id=ta.school_id and sub.id=ta.subject_id
  where ta.school_id=new.school_id and ta.class_id=new.class_id and ta.subject_id is not null
    and not (
      (v_grade_no in (9,10) and v_major='computer' and lower(sub.name)='biology')
      or (v_grade_no in (9,10) and v_major='biology' and lower(sub.name) in ('computer','computer science','computer studies'))
      or (v_grade_no in (11,12) and v_major='computer' and lower(sub.name) in ('biology','chemistry','statistics'))
      or (v_grade_no in (11,12) and v_major='biology' and lower(sub.name) in ('computer','computer science','computer studies','mathematics','maths','statistics'))
      or (v_grade_no in (11,12) and v_major='pre_engineering' and lower(sub.name) in ('biology','computer','computer science','computer studies','statistics'))
    )
  on conflict (school_id,student_id,subject_id,class_id) do nothing;
  return new;
end $$;

-- Major assignment can happen after a promotion inserts the new enrollment.
-- Use that active enrollment instead of students.class_id, which can still
-- point to the completed prior class. Existing subject removal remains in the
-- combination service, where the replacement list is already validated.
create or replace function public.sync_student_combination_subjects()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_enrollment record;
begin
  if new.major is null or new.status<>'active' then return new; end if;
  for v_enrollment in select e.class_id from public.enrollments e
    left join public.academic_years ay on ay.school_id=e.school_id and ay.id=e.academic_year_id
    where e.school_id=new.school_id and e.student_id=new.id and e.status='active'
    order by ay.starts_on desc nulls last,e.created_at desc limit 1 loop
    insert into public.class_subjects(school_id,class_id,subject_id,is_class_specific)
    select new.school_id,v_enrollment.class_id,scs.subject_id,false
    from public.student_subject_combinations sc
    join public.student_subject_combination_classes scc
      on scc.school_id=sc.school_id and scc.combination_id=sc.id and scc.class_id=v_enrollment.class_id
    join public.student_subject_combination_subjects scs
      on scs.school_id=sc.school_id and scs.combination_id=sc.id
    where sc.school_id=new.school_id and sc.is_active
      and (sc.combination_key=new.major or (sc.combination_key is null and new.major='custom:'||sc.id::text))
    on conflict (school_id,class_id,subject_id) do nothing;
    insert into public.student_subject_enrollments(school_id,student_id,subject_id,class_id)
    select distinct new.school_id,new.id,scs.subject_id,v_enrollment.class_id
    from public.student_subject_combinations sc
    join public.student_subject_combination_classes scc
      on scc.school_id=sc.school_id and scc.combination_id=sc.id and scc.class_id=v_enrollment.class_id
    join public.student_subject_combination_subjects scs
      on scs.school_id=sc.school_id and scs.combination_id=sc.id
    where sc.school_id=new.school_id and sc.is_active
      and (sc.combination_key=new.major or (sc.combination_key is null and new.major='custom:'||sc.id::text))
    on conflict (school_id,student_id,subject_id,class_id) do nothing;
  end loop;
  return new;
end $$;

notify pgrst, 'reload schema';
