-- Keep class promotion authorization aligned with the application's
-- classes:manage permission, including custom roles and user overrides.
create or replace function public.promote_class_students(
  p_school_id uuid, p_class_ids uuid[], p_promoted_student_ids uuid[], p_retained_student_ids uuid[], p_graduate_student_ids uuid[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public, app as $$
declare v_source record; v_next_year uuid; v_next_grade uuid; v_new_year boolean := false; v_start date; v_end date; v_name text; v_target uuid; v_retained uuid; begin
  if auth.uid() is null or not ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), p_school_id))) then raise exception 'Not authorized.'; end if;
  select c.academic_year_id, ay.starts_on, ay.ends_on, ay.name, c.grade_id into v_source from public.classes c join public.academic_years ay on ay.id=c.academic_year_id where c.school_id=p_school_id and c.id=any(p_class_ids) limit 1;
  if not found then raise exception 'Source class not found.'; end if;
  select id into v_next_year from public.academic_years where school_id=p_school_id and starts_on > v_source.starts_on order by starts_on limit 1;
  if v_next_year is null then v_start := (v_source.starts_on + interval '1 year')::date; v_end := (v_source.ends_on + interval '1 year')::date; v_name := extract(year from v_start)::text || '-' || extract(year from v_end)::text; insert into public.academic_years(school_id,name,starts_on,ends_on,is_active) values(p_school_id,v_name,v_start,v_end,true) returning id into v_next_year; v_new_year := true; else update public.academic_years set is_active=false where school_id=p_school_id and id<>v_next_year; update public.academic_years set is_active=true where id=v_next_year; end if;
  for v_source in select c.*, g.sort_order from public.classes c join public.grades g on g.id=c.grade_id where c.school_id=p_school_id and c.id=any(p_class_ids) loop
    select id into v_next_grade from public.grades where school_id=p_school_id and sort_order>v_source.sort_order order by sort_order limit 1;
    if array_length(p_promoted_student_ids,1) is not null and v_next_grade is null then raise exception 'Create the next grade before promoting students.'; end if;
    if v_next_grade is not null then select id into v_target from public.classes where school_id=p_school_id and academic_year_id=v_next_year and grade_id=v_next_grade and section_id is not distinct from v_source.section_id; if v_target is null then insert into public.classes(school_id,academic_year_id,grade_id,section_id,name,room) select p_school_id,v_next_year,g.id,v_source.section_id,concat(g.name,case when s.name is null then '' else ' '||s.name end),v_source.room from public.grades g left join public.sections s on s.id=v_source.section_id where g.id=v_next_grade returning id into v_target; end if; insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status) select p_school_id,e.student_id,v_target,v_next_year,'active' from public.enrollments e where e.class_id=v_source.id and e.student_id=any(p_promoted_student_ids) on conflict do nothing; update public.students set class_id=v_target where school_id=p_school_id and id=any(p_promoted_student_ids); end if;
    select id into v_retained from public.classes where school_id=p_school_id and academic_year_id=v_next_year and grade_id=v_source.grade_id and section_id is not distinct from v_source.section_id; if v_retained is null then insert into public.classes(school_id,academic_year_id,grade_id,section_id,name,room) values(p_school_id,v_next_year,v_source.grade_id,v_source.section_id,v_source.name,v_source.room) returning id into v_retained; end if; insert into public.enrollments(school_id,student_id,class_id,academic_year_id,status) select p_school_id,e.student_id,v_retained,v_next_year,'active' from public.enrollments e where e.class_id=v_source.id and e.student_id=any(p_retained_student_ids) on conflict do nothing; update public.students set class_id=v_retained where school_id=p_school_id and id=any(p_retained_student_ids);
  end loop;
  update public.enrollments set status='completed', ends_on=current_date where school_id=p_school_id and class_id=any(p_class_ids) and student_id=any(p_promoted_student_ids||p_retained_student_ids||p_graduate_student_ids); update public.students set status='graduated',class_id=null where school_id=p_school_id and id=any(p_graduate_student_ids); return jsonb_build_object('academicYearId',v_next_year,'createdYear',v_new_year); end; $$;

grant execute on function public.promote_class_students(uuid,uuid[],uuid[],uuid[],uuid[]) to authenticated;

drop policy if exists class_promotions_manage on public.class_promotions;
create policy class_promotions_manage on public.class_promotions for all
using ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), school_id)))
with check ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), school_id)));
