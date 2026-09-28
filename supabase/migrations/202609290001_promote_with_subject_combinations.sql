-- Assign the 9/11 subject choices in the same transaction as promotion.
-- The existing promotion function remains available for other grades.
alter table public.enrollments add column if not exists major text;

update public.enrollments e set major = s.major
from public.students s
where e.school_id = s.school_id and e.student_id = s.id and e.major is null and e.status = 'active';

create or replace function public.snapshot_enrollment_combination()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.major is null then
    select major into new.major from public.students where school_id = new.school_id and id = new.student_id;
  end if;
  return new;
end; $$;

drop trigger if exists enrollments_snapshot_combination on public.enrollments;
create trigger enrollments_snapshot_combination
before insert on public.enrollments
for each row execute function public.snapshot_enrollment_combination();

create or replace function public.sync_active_enrollment_combination()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.major is distinct from old.major then
    update public.enrollments set major = new.major
      where school_id = new.school_id and student_id = new.id and status = 'active';
  end if;
  return new;
end; $$;

drop trigger if exists students_sync_active_enrollment_combination on public.students;
create trigger students_sync_active_enrollment_combination
after update of major on public.students
for each row execute function public.sync_active_enrollment_combination();

create or replace function public.promote_class_students_with_combinations(
  p_school_id uuid, p_class_ids uuid[], p_promoted_student_ids uuid[],
  p_retained_student_ids uuid[], p_graduate_student_ids uuid[], p_student_majors jsonb
) returns jsonb language plpgsql security definer set search_path = public, app as $$
declare
  v_choice record;
  v_student_id uuid;
  v_source_class_id uuid;
  v_grade text;
  v_target_class_id uuid;
  v_target_grade_id uuid;
  v_target_grade text;
  v_result jsonb;
begin
  if auth.uid() is null or not ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), p_school_id))) then
    raise exception 'Not authorized.';
  end if;
  if jsonb_typeof(p_student_majors) is distinct from 'object' then
    raise exception 'Choose one subject combination for every promoted student.';
  end if;
  if (select count(*) from jsonb_object_keys(p_student_majors)) <> cardinality(p_promoted_student_ids) then
    raise exception 'Choose one subject combination for every promoted student.';
  end if;

  for v_choice in select key, value from jsonb_each_text(p_student_majors) loop
    v_student_id := v_choice.key::uuid;
    if not v_student_id = any(p_promoted_student_ids) then
      raise exception 'Combination assignment is outside the promotion roster.';
    end if;
    select e.class_id, g.name into v_source_class_id, v_grade
      from public.enrollments e
      join public.classes c on c.id = e.class_id and c.school_id = e.school_id
      join public.grades g on g.id = c.grade_id and g.school_id = c.school_id
      where e.school_id = p_school_id and e.student_id = v_student_id
        and e.class_id = any(p_class_ids) and e.status = 'active'
      limit 1;
    if v_source_class_id is null or v_grade !~* '(^|[^0-9])(8|10)(th|st)?($|[^0-9])' then
      raise exception 'Combination assignment requires an active student entering Grade 9 or 11.';
    end if;
  end loop;

  v_result := public.promote_class_students(p_school_id, p_class_ids, p_promoted_student_ids, p_retained_student_ids, p_graduate_student_ids);
  for v_choice in select key, value from jsonb_each_text(p_student_majors) loop
    v_student_id := v_choice.key::uuid;
    select e.class_id, c.grade_id, g.name into v_target_class_id, v_target_grade_id, v_target_grade from public.enrollments e
      join public.classes c on c.id = e.class_id and c.school_id = e.school_id
      join public.grades g on g.id = c.grade_id and g.school_id = c.school_id
      where e.school_id = p_school_id and e.student_id = v_student_id
        and e.academic_year_id = (v_result->>'academicYearId')::uuid and e.status = 'active'
      order by e.created_at desc limit 1;
    if v_target_class_id is null then raise exception 'Promotion did not create the expected new enrollment.'; end if;
    if v_target_grade !~* '(^|[^0-9])(9|11)(th|st)?($|[^0-9])' then
      raise exception 'Subject combinations must be assigned when entering Grade 9 or 11.';
    end if;
    if v_choice.value like 'custom:%' then
      if v_choice.value !~ '^custom:[0-9a-fA-F-]{36}$' then
        raise exception 'That subject combination is unavailable for the new grade.';
      end if;
      if not exists (
        select 1 from public.student_subject_combinations sc
        join public.student_subject_combination_classes scc on scc.combination_id = sc.id and scc.school_id = sc.school_id
        join public.classes c on c.id = scc.class_id and c.school_id = scc.school_id
        where sc.school_id = p_school_id and sc.is_active
          and sc.id = substring(v_choice.value from 8)::uuid and c.grade_id = v_target_grade_id
      ) then
        raise exception 'That subject combination is unavailable for the new grade.';
      end if;
      insert into public.student_subject_combination_classes (school_id, combination_id, class_id)
        values (p_school_id, substring(v_choice.value from 8)::uuid, v_target_class_id)
        on conflict (combination_id, class_id) do nothing;
    elsif v_choice.value not in ('biology', 'computer')
       and not (v_target_grade ~* '11' and v_choice.value = 'pre_engineering') then
      raise exception 'That subject combination is unavailable for the new grade.';
    end if;
    if exists (select 1 from public.class_allowed_majors cam where cam.school_id = p_school_id and cam.class_id = v_target_class_id)
       and not exists (select 1 from public.class_allowed_majors cam where cam.school_id = p_school_id and cam.class_id = v_target_class_id and cam.major_key = v_choice.value) then
      raise exception 'That subject combination is not offered in the new class.';
    end if;
    update public.students set major = v_choice.value where school_id = p_school_id and id = v_student_id;
    update public.enrollments set major = v_choice.value
      where school_id = p_school_id and student_id = v_student_id and class_id = v_target_class_id
        and academic_year_id = (v_result->>'academicYearId')::uuid;
  end loop;
  return v_result;
end; $$;

revoke all on function public.promote_class_students_with_combinations(uuid,uuid[],uuid[],uuid[],uuid[],jsonb) from public;
grant execute on function public.promote_class_students_with_combinations(uuid,uuid[],uuid[],uuid[],uuid[],jsonb) to authenticated;

-- A custom combination already selected in 9th or 11th must remain available
-- in the promoted 10th or 12th class, including when that class is new.
create or replace function public.carry_promoted_custom_combination()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_major text;
begin
  if new.status <> 'active' then return new; end if;
  select major into v_major from public.students where school_id = new.school_id and id = new.student_id;
  if v_major is null or v_major !~ '^custom:[0-9a-fA-F-]{36}$' then return new; end if;
  insert into public.student_subject_combination_classes (school_id, combination_id, class_id)
  select new.school_id, sc.id, new.class_id
  from public.classes target
  join public.grades target_grade on target_grade.id = target.grade_id and target_grade.school_id = target.school_id
  join public.enrollments prior on prior.school_id = new.school_id and prior.student_id = new.student_id and prior.class_id <> new.class_id and prior.status = 'active'
  join public.classes source on source.id = prior.class_id and source.school_id = prior.school_id
  join public.grades source_grade on source_grade.id = source.grade_id and source_grade.school_id = source.school_id
  join public.student_subject_combinations sc on sc.school_id = new.school_id and sc.id = substring(v_major from 8)::uuid and sc.is_active
  join public.student_subject_combination_classes scc on scc.school_id = sc.school_id and scc.combination_id = sc.id and scc.class_id = source.id
  where target.id = new.class_id and target.school_id = new.school_id
    and ((source_grade.name ~* '(^|[^0-9])9(th)?($|[^0-9])' and target_grade.name ~* '(^|[^0-9])10(th)?($|[^0-9])')
      or (source_grade.name ~* '(^|[^0-9])11(th)?($|[^0-9])' and target_grade.name ~* '(^|[^0-9])12(th)?($|[^0-9])'))
  on conflict (combination_id, class_id) do nothing;
  return new;
end; $$;

drop trigger if exists enrollments_carry_promoted_custom_combination on public.enrollments;
create trigger enrollments_carry_promoted_custom_combination
after insert on public.enrollments
for each row execute function public.carry_promoted_custom_combination();
