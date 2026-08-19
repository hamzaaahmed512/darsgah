-- Sample results data for testing the approval workflow.
-- Safe to re-run: uses fixed exam UUIDs and upserts.

do $$
declare
  v_school_id uuid := '00000000-0000-0000-0000-000000000001';
  v_teacher_id uuid := '33333333-3333-3333-3333-333333333333';
  v_principal_id uuid := '11111111-1111-1111-1111-111111111111';
  v_class_10a uuid := '50000000-0000-0000-0000-000000000002';
  v_class_11a uuid := '50000000-0000-0000-0000-000000000003';
  v_math uuid := '40000000-0000-0000-0000-000000000001';
  v_term text := 'Term 1';
  v_teacher_name text := 'Miles Henderson';
  v_principal_name text := 'Jane Doe';
  v_now timestamptz := now();
  v_uploaded timestamptz := now() - interval '3 days';
  v_approved timestamptz := now() - interval '1 day';
  v_rejected timestamptz := now() - interval '2 days';
  v_student record;
  v_idx integer := 0;
  v_scores numeric[] := array[92, 84, 76, 68, 55, 88, 79, 71, 63, 48];
begin
  -- Grade 10A: Quiz (regular, auto-approved)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at, finalized_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at,
    approved_at
  ) values (
    '60000000-0000-0000-0000-000000000001', v_school_id, v_class_10a, v_math, 'quiz', 'Quiz 1 - Algebra Basics', v_term, current_date - 14, 100,
    v_teacher_id, 'approved', v_uploaded, v_uploaded,
    false, 'regular', 'approved',
    v_teacher_id, v_teacher_name, v_uploaded,
    v_uploaded
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    approved_at = excluded.approved_at;

  -- Grade 10A: Class Test (regular, auto-approved)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at, finalized_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at,
    approved_at
  ) values (
    '60000000-0000-0000-0000-000000000002', v_school_id, v_class_10a, v_math, 'class_test', 'Class Test - Linear Equations', v_term, current_date - 10, 50,
    v_teacher_id, 'approved', v_uploaded, v_uploaded,
    false, 'regular', 'approved',
    v_teacher_id, v_teacher_name, v_uploaded - interval '2 days',
    v_uploaded - interval '2 days'
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    approved_at = excluded.approved_at;

  -- Grade 10A: 1st Term (pending Principal approval)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at
  ) values (
    '60000000-0000-0000-0000-000000000003', v_school_id, v_class_10a, v_math, 'first_term', '1st Term Examination', v_term, current_date - 5, 100,
    v_teacher_id, 'pending_approval', v_now - interval '6 hours',
    true, 'major', 'pending_approval',
    v_teacher_id, v_teacher_name, v_now - interval '6 hours'
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    submitted_at = excluded.submitted_at;

  -- Grade 10A: 3rd Term (rejected)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at,
    rejection_reason
  ) values (
    '60000000-0000-0000-0000-000000000004', v_school_id, v_class_10a, v_math, 'third_term', '3rd Term Examination', v_term, current_date - 3, 100,
    v_teacher_id, 'rejected', v_rejected,
    true, 'major', 'rejected',
    v_teacher_id, v_teacher_name, v_rejected,
    'Several marks appear inconsistent with class performance. Please review and resubmit.'
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    submitted_at = excluded.submitted_at,
    rejection_reason = excluded.rejection_reason;

  -- Grade 11A: 1st Term (approved by Principal)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at, finalized_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at,
    approved_by_principal_id, approved_by_principal_name, approved_at
  ) values (
    '60000000-0000-0000-0000-000000000005', v_school_id, v_class_11a, v_math, 'first_term', '1st Term Examination', v_term, current_date - 7, 100,
    v_teacher_id, 'approved', v_uploaded, v_approved,
    true, 'major', 'approved',
    v_teacher_id, v_teacher_name, v_uploaded,
    v_principal_id, v_principal_name, v_approved
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    approved_by_principal_id = excluded.approved_by_principal_id,
    approved_by_principal_name = excluded.approved_by_principal_name,
    approved_at = excluded.approved_at,
    finalized_at = excluded.finalized_at;

  -- Grade 11A: 3rd Term (approved by Principal)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, max_marks,
    created_by, status, submitted_at, finalized_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at,
    approved_by_principal_id, approved_by_principal_name, approved_at
  ) values (
    '60000000-0000-0000-0000-000000000006', v_school_id, v_class_11a, v_math, 'third_term', '3rd Term Examination', v_term, current_date - 4, 100,
    v_teacher_id, 'approved', v_uploaded, v_approved,
    true, 'major', 'approved',
    v_teacher_id, v_teacher_name, v_uploaded - interval '1 day',
    v_principal_id, v_principal_name, v_approved
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    approved_by_principal_id = excluded.approved_by_principal_id,
    approved_by_principal_name = excluded.approved_by_principal_name,
    approved_at = excluded.approved_at,
    finalized_at = excluded.finalized_at;

  -- Grade 11A: Monthly Test (major, pending approval)
  insert into public.exams (
    id, school_id, class_id, subject_id, exam_type, title, term, exam_date, month, max_marks,
    created_by, status, submitted_at,
    requires_approval, assessment_category, approval_status,
    uploaded_by_teacher_id, uploaded_by_teacher_name, uploaded_at
  ) values (
    '60000000-0000-0000-0000-000000000007', v_school_id, v_class_11a, v_math, 'monthly', 'Monthly Test', v_term, current_date - 2, extract(month from current_date - 2)::int, 50,
    v_teacher_id, 'pending_approval', v_now - interval '2 hours',
    true, 'major', 'pending_approval',
    v_teacher_id, v_teacher_name, v_now - interval '2 hours'
  )
  on conflict (id) do update set
    status = excluded.status,
    approval_status = excluded.approval_status,
    requires_approval = excluded.requires_approval,
    assessment_category = excluded.assessment_category,
    uploaded_by_teacher_id = excluded.uploaded_by_teacher_id,
    uploaded_by_teacher_name = excluded.uploaded_by_teacher_name,
    uploaded_at = excluded.uploaded_at,
    submitted_at = excluded.submitted_at,
    month = excluded.month;

  update public.exams
  set
    is_special = true,
    approved_by = case when status = 'approved' then v_principal_id else null end
  where id in (
    '60000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000004',
    '60000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000006',
    '60000000-0000-0000-0000-000000000007'
  );

  -- Result approval queue entries
  insert into public.result_approvals (id, school_id, exam_id, submitted_by, status, submitted_at)
  values
    ('70000000-0000-0000-0000-000000000001', v_school_id, '60000000-0000-0000-0000-000000000003', v_teacher_id, 'pending', v_now - interval '6 hours'),
    ('70000000-0000-0000-0000-000000000002', v_school_id, '60000000-0000-0000-0000-000000000004', v_teacher_id, 'rejected', v_rejected),
    ('70000000-0000-0000-0000-000000000003', v_school_id, '60000000-0000-0000-0000-000000000005', v_teacher_id, 'approved', v_uploaded),
    ('70000000-0000-0000-0000-000000000004', v_school_id, '60000000-0000-0000-0000-000000000006', v_teacher_id, 'approved', v_uploaded - interval '1 day'),
    ('70000000-0000-0000-0000-000000000005', v_school_id, '60000000-0000-0000-0000-000000000007', v_teacher_id, 'pending', v_now - interval '2 hours')
  on conflict (school_id, exam_id) do update set
    status = excluded.status,
    submitted_at = excluded.submitted_at;

  update public.result_approvals
  set reviewed_by = v_principal_id, reviewed_at = v_approved, principal_comment = 'Verified and approved.'
  where id in ('70000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004');

  update public.result_approvals
  set reviewed_by = v_principal_id, reviewed_at = v_rejected, principal_comment = 'Several marks appear inconsistent with class performance. Please review and resubmit.'
  where id = '70000000-0000-0000-0000-000000000002';

  -- Marks for Grade 10A exams
  v_idx := 0;
  for v_student in
    select e.student_id
    from public.enrollments e
    where e.school_id = v_school_id and e.class_id = v_class_10a and e.status = 'active'
    order by e.created_at
  loop
    v_idx := v_idx + 1;
    insert into public.marks (school_id, exam_id, student_id, class_id, subject_id, teacher_id, marks_obtained, grade, status)
    values
      (v_school_id, '60000000-0000-0000-0000-000000000001', v_student.student_id, v_class_10a, v_math, v_teacher_id, v_scores[((v_idx - 1) % 10) + 1], case when v_scores[((v_idx - 1) % 10) + 1] >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] >= 50 then 'D' else 'F' end, 'approved'),
      (v_school_id, '60000000-0000-0000-0000-000000000002', v_student.student_id, v_class_10a, v_math, v_teacher_id, round(v_scores[((v_idx - 1) % 10) + 1] * 0.5, 2), case when v_scores[((v_idx - 1) % 10) + 1] >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] >= 50 then 'D' else 'F' end, 'approved'),
      (v_school_id, '60000000-0000-0000-0000-000000000003', v_student.student_id, v_class_10a, v_math, v_teacher_id, v_scores[((v_idx - 1) % 10) + 1] - 3, case when v_scores[((v_idx - 1) % 10) + 1] - 3 >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] - 3 >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] - 3 >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] - 3 >= 50 then 'D' else 'F' end, 'draft'),
      (v_school_id, '60000000-0000-0000-0000-000000000004', v_student.student_id, v_class_10a, v_math, v_teacher_id, v_scores[((v_idx - 1) % 10) + 1] - 8, case when v_scores[((v_idx - 1) % 10) + 1] - 8 >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] - 8 >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] - 8 >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] - 8 >= 50 then 'D' else 'F' end, 'rejected')
    on conflict (school_id, exam_id, student_id) do update set
      marks_obtained = excluded.marks_obtained,
      grade = excluded.grade,
      status = excluded.status;
  end loop;

  -- Marks for Grade 11A exams
  v_idx := 0;
  for v_student in
    select e.student_id
    from public.enrollments e
    where e.school_id = v_school_id and e.class_id = v_class_11a and e.status = 'active'
    order by e.created_at
  loop
    v_idx := v_idx + 1;
    insert into public.marks (school_id, exam_id, student_id, class_id, subject_id, teacher_id, marks_obtained, grade, status)
    values
      (v_school_id, '60000000-0000-0000-0000-000000000005', v_student.student_id, v_class_11a, v_math, v_teacher_id, v_scores[((v_idx - 1) % 10) + 1] + 2, case when v_scores[((v_idx - 1) % 10) + 1] + 2 >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] + 2 >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] + 2 >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] + 2 >= 50 then 'D' else 'F' end, 'approved'),
      (v_school_id, '60000000-0000-0000-0000-000000000006', v_student.student_id, v_class_11a, v_math, v_teacher_id, v_scores[((v_idx - 1) % 10) + 1], case when v_scores[((v_idx - 1) % 10) + 1] >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] >= 50 then 'D' else 'F' end, 'approved'),
      (v_school_id, '60000000-0000-0000-0000-000000000007', v_student.student_id, v_class_11a, v_math, v_teacher_id, round((v_scores[((v_idx - 1) % 10) + 1] + 5) * 0.5, 2), case when v_scores[((v_idx - 1) % 10) + 1] + 5 >= 80 then 'A' when v_scores[((v_idx - 1) % 10) + 1] + 5 >= 70 then 'B' when v_scores[((v_idx - 1) % 10) + 1] + 5 >= 60 then 'C' when v_scores[((v_idx - 1) % 10) + 1] + 5 >= 50 then 'D' else 'F' end, 'draft')
    on conflict (school_id, exam_id, student_id) do update set
      marks_obtained = excluded.marks_obtained,
      grade = excluded.grade,
      status = excluded.status;
  end loop;

  insert into public.activity_logs (school_id, actor_id, action, entity_type, entity_id, metadata) values
    (v_school_id, v_teacher_id, 'exam_created', 'exam', '60000000-0000-0000-0000-000000000001', '{"exam_type":"quiz","title":"Quiz 1 - Algebra Basics"}'),
    (v_school_id, v_teacher_id, 'exam_queued_for_approval', 'exam', '60000000-0000-0000-0000-000000000003', '{"exam_type":"first_term"}'),
    (v_school_id, v_principal_id, 'exam_approved', 'exam', '60000000-0000-0000-0000-000000000005', '{"exam_type":"first_term"}'),
    (v_school_id, v_principal_id, 'exam_rejected', 'exam', '60000000-0000-0000-0000-000000000004', '{"exam_type":"third_term"}')
  on conflict do nothing;
end $$;
