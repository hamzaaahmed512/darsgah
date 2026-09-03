-- Allow school leadership to return an already approved result to its teacher.
-- The existing rejected enum value is the persisted representation of the
-- user-facing "Returned" state, preserving compatibility with older clients.
create or replace function public.return_approved_exam(
  p_exam_id uuid,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam public.exams%rowtype;
  v_school_id uuid;
  v_now timestamptz := now();
begin
  if nullif(trim(p_comment), '') is null then
    raise exception 'A reason is required when returning an approved result.';
  end if;

  select * into v_exam from public.exams where id = p_exam_id for update;
  if v_exam.id is null then raise exception 'Result not found.'; end if;
  v_school_id := v_exam.school_id;

  if not app.has_school_role_key(v_school_id, array['principal','administrator']) then
    raise exception 'Only a Principal or Administrator can return approved results.';
  end if;
  if v_exam.status::text <> 'approved' or v_exam.approval_status::text <> 'approved' then
    raise exception 'Only an approved result can be returned for revision.';
  end if;

  update public.result_approvals
  set status = 'rejected', principal_comment = trim(p_comment),
      reviewed_by = auth.uid(), reviewed_at = v_now
  where school_id = v_school_id and exam_id = p_exam_id;

  update public.exams
  set status = 'rejected', approval_status = 'rejected',
      rejection_reason = trim(p_comment), approved_by = null,
      approved_by_principal_id = null, approved_by_principal_name = null,
      approved_at = null, finalized_at = null
  where id = p_exam_id and school_id = v_school_id;

  update public.marks
  set status = 'rejected'
  where exam_id = p_exam_id and school_id = v_school_id;

  insert into public.announcements (
    school_id, title, description, priority, type, audience_type,
    audience_value, publish_date, expiry_date, created_by
  ) values (
    v_school_id,
    'Result returned for revision',
    format('%s was returned for revision.%sPrincipal comment: %s', v_exam.title, chr(10), trim(p_comment)),
    'high',
    'urgent',
    'roles',
    'user:' || coalesce(v_exam.uploaded_by_teacher_id, v_exam.created_by)::text,
    (v_now at time zone 'Asia/Karachi')::date,
    null,
    auth.uid()
  );
end;
$$;

grant execute on function public.return_approved_exam(uuid,text) to authenticated;
