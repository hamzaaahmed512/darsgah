-- Allow principals with active teaching assignments to use the teacher assessment workflow.
-- The assignment check keeps ordinary principals out of teacher-owned assessment writes.

drop policy if exists exams_insert_teacher on public.exams;
create policy exams_insert_teacher on public.exams for insert with check (
  created_by = auth.uid()
  and (
    app.has_school_role_key(school_id, array['teacher','head_teacher'])
    or (
      app.has_school_role_key(school_id, array['principal'])
      and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
    )
  )
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and assigned_teacher_id is null
  and (
    (app.is_special_exam_type(exam_type) and status::text = 'pending_approval' and requires_approval and is_special)
    or (not app.is_special_exam_type(exam_type) and status::text = 'draft' and not requires_approval and not is_special)
  )
);

drop policy if exists exams_update_teacher on public.exams;
create policy exams_update_teacher on public.exams for update using (
  app.can_teacher_edit_exam(school_id, id)
) with check (
  created_by = auth.uid()
  and (
    app.has_school_role_key(school_id, array['teacher','head_teacher'])
    or (
      app.has_school_role_key(school_id, array['principal'])
      and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
    )
  )
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and (
    (app.is_special_exam_type(exam_type) and status::text in ('pending_approval','rejected'))
    or (not app.is_special_exam_type(exam_type) and status::text in ('draft','approved'))
  )
);
