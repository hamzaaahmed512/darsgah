-- Delete a grade and its class sections atomically, while retaining academic
-- and financial history. Shared section names are not owned by a grade.
create or replace function public.delete_grade_with_classes(p_school_id uuid, p_grade_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_ids uuid[];
  v_class_count integer;
begin
  if not ('classes:manage' = any(app.get_resolved_permissions(auth.uid(), p_school_id)))
     or not app.has_school_role(p_school_id, array['administrator', 'principal']::public.app_role[]) then
    raise exception 'You do not have permission to delete grades.';
  end if;

  perform 1 from public.grades
  where id = p_grade_id and school_id = p_school_id
  for update;
  if not found then
    raise exception 'Grade not found.';
  end if;

  perform 1 from public.classes
  where school_id = p_school_id and grade_id = p_grade_id
  for update;

  select coalesce(array_agg(id), '{}'::uuid[]), count(*)
  into v_class_ids, v_class_count
  from public.classes
  where school_id = p_school_id and grade_id = p_grade_id;

  if exists (select 1 from public.students where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.enrollments where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.attendance_sessions where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.attendance_records where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.exams where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.marks where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.fee_structures where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.student_fee_accounts where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.fee_challans where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.student_subject_enrollments where school_id = p_school_id and class_id = any(v_class_ids))
     or exists (select 1 from public.class_promotions where school_id = p_school_id and source_class_id = any(v_class_ids)) then
    raise exception 'This grade has student, attendance, exam, fee, or promotion history. Move or retain those records before deleting it.';
  end if;

  -- Class configuration (teacher assignments, subjects, combinations and
  -- allowed majors) follows its existing ON DELETE CASCADE relationships.
  delete from public.classes where school_id = p_school_id and grade_id = p_grade_id;
  delete from public.grades where school_id = p_school_id and id = p_grade_id;
  return v_class_count;
exception
  when foreign_key_violation then
    raise exception 'This grade has related records and cannot be deleted until they are moved or removed.';
end;
$$;

revoke all on function public.delete_grade_with_classes(uuid, uuid) from public, anon;
grant execute on function public.delete_grade_with_classes(uuid, uuid) to authenticated;
