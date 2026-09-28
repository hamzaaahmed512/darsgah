-- RES-01, RES-04, RES-05: protect approval, separate principal review from
-- teacher marking, and record absence without treating it as a missing mark.
alter table public.marks add column if not exists is_absent boolean not null default false;

alter table public.marks drop constraint if exists marks_absent_zero_check;
alter table public.marks add constraint marks_absent_zero_check
  check (not is_absent or (marks_obtained = 0 and grade = 'Absent'));

-- The exam shell and its queued approval are one database transaction.
create or replace function public.queue_new_exam_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if app.is_special_exam_type(new.exam_type) and new.status::text = 'pending_approval' then
    insert into public.result_approvals(school_id, exam_id, submitted_by, status, submitted_at)
      values(new.school_id, new.id, new.created_by, 'pending', coalesce(new.submitted_at, now()))
      on conflict (school_id, exam_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists exams_queue_new_approval on public.exams;
create trigger exams_queue_new_approval after insert on public.exams
  for each row execute function public.queue_new_exam_approval();

-- Regular marks and the existing auto-finalization are committed together.
create or replace function public.finalize_regular_exam_after_marks()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now();
begin
  update public.exams e set
    status = 'approved', approval_status = 'approved', submitted_at = v_now,
    uploaded_by_teacher_id = new.teacher_id,
    uploaded_by_teacher_name = (select full_name from public.profiles where id = new.teacher_id),
    uploaded_at = v_now, approved_at = v_now, finalized_at = v_now,
    approved_by_principal_id = null, approved_by_principal_name = null,
    rejection_reason = null
  where e.school_id = new.school_id and e.id = new.exam_id
    and not e.requires_approval;
  return new;
end;
$$;
drop trigger if exists marks_finalize_regular_exam on public.marks;
create trigger marks_finalize_regular_exam
  after insert or update of marks_obtained, is_absent, grade on public.marks
  for each row execute function public.finalize_regular_exam_after_marks();

create or replace function app.can_teacher_edit_exam(target_school_id uuid, target_exam_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.exams e
    where e.school_id = target_school_id and e.id = target_exam_id
      and e.created_by = auth.uid()
      and not app.has_school_role_key(e.school_id, array['principal'])
      and app.has_school_role_key(e.school_id, array['teacher','head_teacher'])
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
      and (
        (app.is_special_exam_type(e.exam_type) and e.status::text in ('pending_approval','rejected'))
        or (not app.is_special_exam_type(e.exam_type) and e.status::text in ('draft','approved'))
      )
  );
$$;

drop policy if exists exams_insert_teacher on public.exams;
create policy exams_insert_teacher on public.exams for insert with check (
  created_by = auth.uid()
  and not app.has_school_role_key(school_id, array['principal'])
  and app.has_school_role_key(school_id, array['teacher','head_teacher'])
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
  and not app.has_school_role_key(school_id, array['principal'])
  and app.has_school_role_key(school_id, array['teacher','head_teacher'])
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and (
    (app.is_special_exam_type(exam_type) and status::text in ('pending_approval','rejected'))
    or (not app.is_special_exam_type(exam_type) and status::text in ('draft','approved'))
  )
);

create or replace function public.review_special_exam(
  p_approval_id uuid, p_decision text, p_comment text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_approval public.result_approvals%rowtype;
  v_exam public.exams%rowtype;
  v_now timestamptz := now();
  v_roster_count integer;
  v_missing_count integer;
  v_subject_name text;
  v_grade_name text;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.'; end if;
  select * into v_approval from public.result_approvals where id = p_approval_id for update;
  if v_approval.id is null then raise exception 'Approval request not found.'; end if;
  if not app.has_school_role_key(v_approval.school_id, array['principal']) then
    raise exception 'Only the Principal can review special exams.';
  end if;
  if v_approval.status::text <> 'pending' then raise exception 'This exam has already been reviewed.'; end if;

  select * into v_exam from public.exams
    where id = v_approval.exam_id and school_id = v_approval.school_id for update;
  if not found or not app.is_special_exam_type(v_exam.exam_type) then
    raise exception 'This is not an approvable exam type.';
  end if;

  if p_decision = 'approved' then
    select name into v_subject_name from public.subjects
      where school_id = v_exam.school_id and id = v_exam.subject_id;
    select g.name into v_grade_name from public.classes c
      join public.grades g on g.id = c.grade_id and g.school_id = c.school_id
      where c.school_id = v_exam.school_id and c.id = v_exam.class_id;
    select count(distinct e.student_id)::integer,
           count(distinct e.student_id) filter (where m.id is null)::integer
      into v_roster_count, v_missing_count
    from public.enrollments e
    join public.students st on st.school_id = e.school_id and st.id = e.student_id
    join public.student_subject_enrollments sse
      on sse.school_id = e.school_id and sse.class_id = e.class_id
      and sse.student_id = e.student_id and sse.subject_id = v_exam.subject_id
    left join public.marks m
      on m.school_id = v_exam.school_id and m.exam_id = v_exam.id
      and m.student_id = e.student_id
    where e.school_id = v_exam.school_id and e.class_id = v_exam.class_id
      and e.status = 'active'
      and not (
        v_grade_name ~* '(9|10|11|12)' and (
          (coalesce(e.major, st.major) = 'biology' and lower(v_subject_name) in ('computer','computer science','computer studies'))
          or (coalesce(e.major, st.major) = 'biology' and v_grade_name ~* '(11|12)' and lower(v_subject_name) in ('mathematics','maths'))
          or (coalesce(e.major, st.major) = 'computer' and lower(v_subject_name) = 'biology')
          or (coalesce(e.major, st.major) = 'computer' and v_grade_name ~* '(11|12)' and lower(v_subject_name) = 'chemistry')
          or (coalesce(e.major, st.major) = 'pre_engineering' and lower(v_subject_name) in ('biology','computer','computer science','computer studies'))
          or (v_grade_name ~* '(11|12)' and lower(v_subject_name) = 'statistics')
        )
      );
    if v_roster_count = 0 then
      raise exception 'Cannot approve %: no enrolled students are assigned to this subject.', coalesce(v_subject_name, 'subject');
    end if;
    if v_missing_count > 0 then
      raise exception 'Cannot approve %: % enrolled student(s) are missing marks or Absent status.',
        coalesce(v_subject_name, 'subject'), v_missing_count;
    end if;
  end if;

  update public.result_approvals set status = p_decision::public.result_approval_status,
    principal_comment = nullif(trim(p_comment), ''), reviewed_by = auth.uid(), reviewed_at = v_now
    where id = p_approval_id;
  update public.exams set
    status = p_decision::public.exam_status,
    approval_status = p_decision::public.result_workflow_status,
    approved_by = case when p_decision = 'approved' then auth.uid() else null end,
    approved_by_principal_id = case when p_decision = 'approved' then auth.uid() else null end,
    approved_by_principal_name = case when p_decision = 'approved' then
      (select full_name from public.profiles where id = auth.uid()) else null end,
    approved_at = case when p_decision = 'approved' then v_now else null end,
    rejection_reason = case when p_decision = 'rejected' then nullif(trim(p_comment), '') else null end,
    finalized_at = case when p_decision = 'approved' then v_now else null end
    where id = v_exam.id;
  update public.marks set status = p_decision::public.mark_status
    where school_id = v_exam.school_id and exam_id = v_exam.id;
end;
$$;

revoke all on function public.review_special_exam(uuid,text,text) from public;
grant execute on function public.review_special_exam(uuid,text,text) to authenticated;
