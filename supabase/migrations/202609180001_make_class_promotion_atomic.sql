-- Keep validation, enrollment changes, and promotion markers atomic.
create or replace function public.promote_class_students(
  p_school_id uuid, p_class_ids uuid[], p_promoted_student_ids uuid[],
  p_retained_student_ids uuid[], p_graduate_student_ids uuid[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public, app as $$
declare
  v_source record; v_year record; v_next_year uuid; v_next_grade uuid;
  v_target uuid; v_retained uuid; v_new_year boolean := false;
  v_start date; v_end date; v_name text; v_class_count integer;
  v_roster_count integer; v_decision_count integer;
begin
  if auth.uid() is null or not ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), p_school_id))) then
    raise exception 'Not authorized.';
  end if;
  p_class_ids := coalesce(p_class_ids, '{}');
  p_promoted_student_ids := coalesce(p_promoted_student_ids, '{}');
  p_retained_student_ids := coalesce(p_retained_student_ids, '{}');
  p_graduate_student_ids := coalesce(p_graduate_student_ids, '{}');
  if cardinality(p_class_ids) = 0 then raise exception 'Select at least one class.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_school_id::text, 0));
  select count(distinct c.id) into v_class_count from public.classes c
    where c.school_id = p_school_id and c.id = any(p_class_ids);
  if v_class_count <> (select count(distinct id) from unnest(p_class_ids) ids(id)) then
    raise exception 'One or more selected classes were not found.';
  end if;
  select ay.* into v_year from public.classes c join public.academic_years ay on ay.id = c.academic_year_id
    where c.school_id = p_school_id and c.id = any(p_class_ids) limit 1;
  if exists (select 1 from public.classes c where c.school_id = p_school_id and c.id = any(p_class_ids) and c.academic_year_id <> v_year.id) then
    raise exception 'Promote classes from one academic year at a time.';
  end if;
  if exists (select 1 from public.class_promotions cp where cp.school_id = p_school_id and cp.source_class_id = any(p_class_ids)) then
    raise exception 'One or more selected classes have already been promoted.';
  end if;
  if cardinality(p_promoted_student_ids) <> (select count(distinct id) from unnest(p_promoted_student_ids) ids(id))
    or cardinality(p_retained_student_ids) <> (select count(distinct id) from unnest(p_retained_student_ids) ids(id))
    or cardinality(p_graduate_student_ids) <> (select count(distinct id) from unnest(p_graduate_student_ids) ids(id))
    or p_promoted_student_ids && p_retained_student_ids or p_promoted_student_ids && p_graduate_student_ids
    or p_retained_student_ids && p_graduate_student_ids then
    raise exception 'Each student must have exactly one promotion decision.';
  end if;
  select count(distinct student_id) into v_roster_count from public.enrollments
    where school_id = p_school_id and class_id = any(p_class_ids) and status = 'active';
  select count(distinct student_id) into v_decision_count from public.enrollments
    where school_id = p_school_id and class_id = any(p_class_ids) and status = 'active'
      and student_id = any(p_promoted_student_ids || p_retained_student_ids || p_graduate_student_ids);
  if v_decision_count <> v_roster_count or v_decision_count <> cardinality(p_promoted_student_ids) + cardinality(p_retained_student_ids) + cardinality(p_graduate_student_ids) then
    raise exception 'The class roster changed. Reopen the promotion dialog and review every active student.';
  end if;

  select id into v_next_year from public.academic_years where school_id = p_school_id and starts_on > v_year.starts_on order by starts_on limit 1;
  if v_next_year is null then
    v_start := (v_year.starts_on + interval '1 year')::date; v_end := (v_year.ends_on + interval '1 year')::date;
    v_name := extract(year from v_start)::text || '-' || extract(year from v_end)::text;
    update public.academic_years set is_active = false where school_id = p_school_id and is_active;
    insert into public.academic_years(school_id,name,starts_on,ends_on,is_active) values(p_school_id,v_name,v_start,v_end,true) returning id into v_next_year;
    v_new_year := true;
  else
    update public.academic_years set is_active = (id = v_next_year) where school_id = p_school_id;
  end if;

  for v_source in select c.*, g.sort_order from public.classes c join public.grades g on g.id=c.grade_id
    where c.school_id=p_school_id and c.id=any(p_class_ids) loop
    v_next_grade := null; v_target := null; v_retained := null;
    select id into v_next_grade from public.grades where school_id=p_school_id and sort_order>v_source.sort_order order by sort_order limit 1;
    if v_next_grade is null and exists (select 1 from public.enrollments where class_id=v_source.id and status='active' and student_id=any(p_promoted_student_ids)) then
      raise exception 'Students in the final grade must be graduated, not promoted.';
    end if;
    if v_next_grade is not null and exists (select 1 from public.enrollments where class_id=v_source.id and status='active' and student_id=any(p_graduate_student_ids)) then
      raise exception 'Only students in the final grade can be graduated.';
    end if;
    if v_next_grade is not null and exists (select 1 from public.enrollments where class_id=v_source.id and status='active' and student_id=any(p_promoted_student_ids)) then
      select id into v_target from public.classes where school_id=p_school_id and academic_year_id=v_next_year and grade_id=v_next_grade and section_id is not distinct from v_source.section_id;
      if v_target is null then
        insert into public.classes(school_id,academic_year_id,grade_id,section_id,name,room)
          select p_school_id,v_next_year,g.id,v_source.section_id,concat(g.name,case when s.name is null then '' else ' '||s.name end),v_source.room
          from public.grades g left join public.sections s on s.id=v_source.section_id where g.id=v_next_grade returning id into v_target;
      end if;
      insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status)
        select p_school_id,e.student_id,v_target,v_next_year,'active' from public.enrollments e
        where e.class_id=v_source.id and e.status='active' and e.student_id=any(p_promoted_student_ids) on conflict do nothing;
      update public.students s set status='active' where s.school_id=p_school_id and exists
        (select 1 from public.enrollments e where e.class_id=v_source.id and e.status='active' and e.student_id=s.id and e.student_id=any(p_promoted_student_ids));
    end if;
    if exists (select 1 from public.enrollments where class_id=v_source.id and status='active' and student_id=any(p_retained_student_ids)) then
      select id into v_retained from public.classes where school_id=p_school_id and academic_year_id=v_next_year and grade_id=v_source.grade_id and section_id is not distinct from v_source.section_id;
      if v_retained is null then
        insert into public.classes(school_id,academic_year_id,grade_id,section_id,name,room)
          values(p_school_id,v_next_year,v_source.grade_id,v_source.section_id,v_source.name,v_source.room) returning id into v_retained;
      end if;
      insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status)
        select p_school_id,e.student_id,v_retained,v_next_year,'active' from public.enrollments e
        where e.class_id=v_source.id and e.status='active' and e.student_id=any(p_retained_student_ids) on conflict do nothing;
      update public.students s set status='active' where s.school_id=p_school_id and exists
        (select 1 from public.enrollments e where e.class_id=v_source.id and e.status='active' and e.student_id=s.id and e.student_id=any(p_retained_student_ids));
    end if;
  end loop;
  update public.enrollments set status='completed',ends_on=current_date where school_id=p_school_id and class_id=any(p_class_ids) and status='active'
    and student_id=any(p_promoted_student_ids||p_retained_student_ids||p_graduate_student_ids);
  update public.students set status='graduated' where school_id=p_school_id and id=any(p_graduate_student_ids);
  insert into public.class_promotions(school_id,source_class_id,promoted_by) select p_school_id,id,auth.uid() from unnest(p_class_ids) ids(id);
  return jsonb_build_object('academicYearId',v_next_year,'createdYear',v_new_year);
end; $$;
grant execute on function public.promote_class_students(uuid,uuid[],uuid[],uuid[],uuid[]) to authenticated;
