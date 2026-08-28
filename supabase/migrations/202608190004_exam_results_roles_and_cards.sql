-- Teacher-owned exams, the four principal-approved types, and registrar result cards.

alter table public.exams
  add column if not exists month smallint,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null;

-- Preserve an auditable list of rows whose legacy approval semantics change.
create table if not exists public.exam_workflow_migration_flags (
  exam_id uuid primary key references public.exams(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  legacy_exam_type text not null,
  legacy_status text not null,
  legacy_requires_approval boolean not null,
  migration_effect text not null,
  flagged_at timestamptz not null default now()
);

insert into public.exam_workflow_migration_flags (
  exam_id, school_id, legacy_exam_type, legacy_status, legacy_requires_approval, migration_effect
)
select
  id,
  school_id,
  exam_type::text,
  status::text,
  requires_approval,
  case
    when exam_type::text = 'monthly' and month is null then 'Monthly exam month inferred from exam_date'
    when exam_type::text in ('mid_term','final_term','pre_board','annual_exam') then 'Legacy major type is now a regular assessment; unapproved rows return to draft'
    when requires_approval then 'Approval requirement removed because this is not one of the four supported special types'
    when exam_type::text not in ('monthly','first_term','second_term','third_term') and status::text not in ('draft','approved') then 'Regular assessment status normalized to draft'
    else 'Workflow metadata normalized'
  end
from public.exams
where (exam_type::text = 'monthly' and month is null)
   or exam_type::text in ('mid_term','final_term','pre_board','annual_exam')
   or requires_approval <> (exam_type::text in ('monthly','first_term','second_term','third_term'))
   or (exam_type::text not in ('monthly','first_term','second_term','third_term') and status::text not in ('draft','approved'))
on conflict (exam_id) do nothing;

update public.exams
set month = extract(month from exam_date)::smallint
where exam_type::text = 'monthly' and month is null;

-- Legacy major types no longer require principal approval. Approved history remains
-- final; unfinished legacy workflows return to the teacher as drafts.
update public.exams
set
  requires_approval = false,
  assessment_category = 'regular',
  is_special = false,
  status = case when status::text = 'approved' then 'approved'::public.exam_status else 'draft'::public.exam_status end,
  approval_status = case when status::text = 'approved' then 'approved'::public.result_workflow_status else 'draft'::public.result_workflow_status end,
  approved_by = case when status::text = 'approved' then coalesce(approved_by, approved_by_principal_id) else null end,
  approved_at = case when status::text = 'approved' then approved_at else null end
where exam_type::text in ('mid_term','final_term','pre_board','annual_exam');

update public.exams
set
  requires_approval = exam_type::text in ('monthly','first_term','second_term','third_term'),
  assessment_category = case
    when exam_type::text in ('monthly','first_term','second_term','third_term') then 'major'::public.assessment_category
    else 'regular'::public.assessment_category
  end,
  is_special = exam_type::text in ('monthly','first_term','second_term','third_term'),
  status = case
    when exam_type::text in ('monthly','first_term','second_term','third_term') and status::text in ('draft','submitted') then 'pending_approval'::public.exam_status
    else status
  end,
  approved_by = coalesce(approved_by, approved_by_principal_id)
where exam_type::text not in ('mid_term','final_term','pre_board','annual_exam');

update public.exams
set approval_status = case status::text
  when 'pending_approval' then 'pending_approval'::public.result_workflow_status
  when 'approved' then 'approved'::public.result_workflow_status
  when 'rejected' then 'rejected'::public.result_workflow_status
  else 'draft'::public.result_workflow_status
end;

update public.exams
set status = 'draft', approval_status = 'draft', approved_by = null, approved_at = null
where exam_type::text not in ('monthly','first_term','second_term','third_term')
  and status::text not in ('draft','approved');

insert into public.result_approvals (school_id, exam_id, submitted_by, status, submitted_at)
select e.school_id, e.id, coalesce(e.uploaded_by_teacher_id, e.created_by), 'pending', coalesce(e.uploaded_at, e.created_at)
from public.exams e
where e.exam_type::text in ('monthly','first_term','second_term','third_term') and e.status::text = 'pending_approval'
on conflict (school_id, exam_id) do update set status = 'pending', reviewed_by = null, reviewed_at = null;

update public.marks m
set status = case when e.status::text = 'approved' then 'approved'::public.mark_status else 'draft'::public.mark_status end
from public.exams e
where e.id = m.exam_id
  and e.exam_type::text in ('mid_term','final_term','pre_board','annual_exam');

alter table public.exams drop constraint if exists exams_special_month_check;
alter table public.exams add constraint exams_special_month_check check (
  (exam_type::text = 'monthly' and month between 1 and 12)
  or (exam_type::text <> 'monthly' and month is null)
);

alter table public.exams drop constraint if exists exams_special_workflow_check;
alter table public.exams add constraint exams_special_workflow_check check (
  (
    exam_type::text in ('monthly','first_term','second_term','third_term')
    and requires_approval
    and assessment_category::text = 'major'
    and status::text in ('pending_approval','approved','rejected')
  ) or (
    exam_type::text not in ('monthly','first_term','second_term','third_term')
    and not requires_approval
    and assessment_category::text = 'regular'
    and status::text in ('draft','approved')
  )
);

alter table public.exams drop constraint if exists exams_approval_status_sync_check;
alter table public.exams add constraint exams_approval_status_sync_check check (
  approval_status::text = status::text
);

create index if not exists exams_result_card_filter_idx
  on public.exams (school_id, class_id, exam_type, month, status)
  where requires_approval = true;

create or replace function app.is_special_exam_type(value public.exam_type)
returns boolean language sql immutable as $$
  select value::text in ('monthly','first_term','second_term','third_term');
$$;

create or replace function app.can_teacher_edit_exam(target_school_id uuid, target_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.exams e
    where e.school_id = target_school_id
      and e.id = target_exam_id
      and e.created_by = auth.uid()
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
      and (
        (app.is_special_exam_type(e.exam_type) and e.status::text in ('pending_approval','rejected'))
        or (not app.is_special_exam_type(e.exam_type) and e.status::text in ('draft','approved'))
      )
  );
$$;

-- Prevent a principal from editing exam content and prevent non-principals from
-- deciding a special workflow, even if another permissive policy is added later.
create or replace function public.guard_exam_workflow_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_principal boolean := app.has_school_role_key(old.school_id, array['principal']);
  v_special boolean := app.is_special_exam_type(old.exam_type);
begin
  if v_special and new.status::text in ('approved','rejected') and new.status is distinct from old.status and not v_is_principal then
    raise exception 'Only the Principal can approve or reject a special exam.';
  end if;

  if v_is_principal and row(
    new.school_id,new.class_id,new.subject_id,new.exam_type,new.title,new.term,new.exam_date,new.max_marks,
    new.created_by,new.month,new.requires_approval,new.assessment_category
  ) is distinct from row(
    old.school_id,old.class_id,old.subject_id,old.exam_type,old.title,old.term,old.exam_date,old.max_marks,
    old.created_by,old.month,old.requires_approval,old.assessment_category
  ) then
    raise exception 'The Principal may review special exams but may not edit their content.';
  end if;
  return new;
end;
$$;

drop trigger if exists exams_guard_workflow_update on public.exams;
create trigger exams_guard_workflow_update before update on public.exams
for each row execute function public.guard_exam_workflow_update();

-- Replace broad tenant-read and principal-write policies with role-scoped access.
drop policy if exists exams_read on public.exams;
drop policy if exists exams_insert_teacher on public.exams;
drop policy if exists exams_insert_principal_special on public.exams;
drop policy if exists exams_update_teacher on public.exams;
drop policy if exists exams_update_principal on public.exams;

create policy exams_read_teacher on public.exams for select using (
  created_by = auth.uid()
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
);
create policy exams_read_principal on public.exams for select using (
  app.has_school_role_key(school_id, array['principal']) and app.is_special_exam_type(exam_type)
);
create policy exams_read_registrar on public.exams for select using (
  app.has_school_role_key(school_id, array['student_staff'])
  and app.is_special_exam_type(exam_type) and status::text = 'approved'
);
create policy exams_read_administrator on public.exams for select using (
  app.has_school_role_key(school_id, array['administrator'])
);
create policy exams_insert_teacher on public.exams for insert with check (
  created_by = auth.uid()
  and app.has_school_role_key(school_id, array['teacher','head_teacher'])
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and assigned_teacher_id is null
  and (
    (app.is_special_exam_type(exam_type) and status::text = 'pending_approval' and requires_approval and is_special)
    or (not app.is_special_exam_type(exam_type) and status::text = 'draft' and not requires_approval and not is_special)
  )
);
create policy exams_update_teacher on public.exams for update using (
  app.can_teacher_edit_exam(school_id, id)
) with check (
  created_by = auth.uid()
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and (
    (app.is_special_exam_type(exam_type) and status::text in ('pending_approval','rejected'))
    or (not app.is_special_exam_type(exam_type) and status::text in ('draft','approved'))
  )
);

drop policy if exists marks_read on public.marks;
drop policy if exists marks_insert_teacher on public.marks;
drop policy if exists marks_update_teacher on public.marks;
drop policy if exists marks_update_principal on public.marks;
create policy marks_read_teacher on public.marks for select using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.exams e where e.id = exam_id and e.school_id = marks.school_id
      and e.created_by = auth.uid()
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  )
);
create policy marks_read_principal on public.marks for select using (
  app.has_school_role_key(school_id, array['principal'])
  and exists (select 1 from public.exams e where e.id = exam_id and app.is_special_exam_type(e.exam_type))
);
create policy marks_read_registrar on public.marks for select using (
  app.has_school_role_key(school_id, array['student_staff'])
  and exists (
    select 1 from public.exams e where e.id = exam_id and e.school_id = marks.school_id
      and app.is_special_exam_type(e.exam_type) and e.status::text = 'approved'
  )
);
create policy marks_read_administrator on public.marks for select using (
  app.has_school_role_key(school_id, array['administrator'])
);
create policy marks_insert_teacher on public.marks for insert with check (
  teacher_id = auth.uid() and app.can_teacher_edit_exam(school_id, exam_id)
  and exists (
    select 1 from public.exams e where e.id = exam_id and e.school_id = marks.school_id
      and e.class_id = marks.class_id and e.subject_id = marks.subject_id
  )
);
create policy marks_update_teacher on public.marks for update using (
  teacher_id = auth.uid() and app.can_teacher_edit_exam(school_id, exam_id)
) with check (
  teacher_id = auth.uid() and app.can_teacher_edit_exam(school_id, exam_id)
);

drop policy if exists result_approvals_read on public.result_approvals;
drop policy if exists result_approvals_insert_teacher on public.result_approvals;
drop policy if exists result_approvals_update_principal on public.result_approvals;
drop policy if exists result_approvals_resubmit_teacher on public.result_approvals;
create policy result_approvals_read_teacher on public.result_approvals for select using (submitted_by = auth.uid());
create policy result_approvals_read_principal on public.result_approvals for select using (
  app.has_school_role_key(school_id, array['principal'])
);
create policy result_approvals_insert_teacher on public.result_approvals for insert with check (
  submitted_by = auth.uid() and status::text = 'pending'
  and exists (
    select 1 from public.exams e where e.id = exam_id and e.school_id = result_approvals.school_id
      and e.created_by = auth.uid() and app.is_special_exam_type(e.exam_type)
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  )
);
create policy result_approvals_resubmit_teacher on public.result_approvals for update using (
  submitted_by = auth.uid() and status::text = 'rejected'
) with check (
  submitted_by = auth.uid() and status::text = 'pending'
  and exists (
    select 1 from public.exams e where e.id = result_approvals.exam_id
      and e.school_id = result_approvals.school_id and e.created_by = auth.uid()
      and app.is_special_exam_type(e.exam_type)
  )
);

-- The review is atomic and exposes no general-purpose principal update path.
create or replace function public.review_special_exam(
  p_approval_id uuid,
  p_decision text,
  p_comment text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_approval public.result_approvals%rowtype;
  v_exam public.exams%rowtype;
  v_now timestamptz := now();
  v_roster_count integer;
  v_mark_count integer;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision.'; end if;

  select * into v_approval from public.result_approvals where id = p_approval_id for update;
  if v_approval.id is null then raise exception 'Approval request not found.'; end if;
  if not app.has_school_role_key(v_approval.school_id, array['principal']) then raise exception 'Only the Principal can review special exams.'; end if;
  if v_approval.status::text <> 'pending' then raise exception 'This exam has already been reviewed.'; end if;

  select * into v_exam from public.exams where id = v_approval.exam_id and school_id = v_approval.school_id for update;
  if not app.is_special_exam_type(v_exam.exam_type) then raise exception 'This is not an approvable exam type.'; end if;

  if p_decision = 'approved' then
    select count(*) into v_roster_count from public.student_subject_enrollments
      where school_id = v_exam.school_id and class_id = v_exam.class_id and subject_id = v_exam.subject_id;
    select count(*) into v_mark_count from public.marks where school_id = v_exam.school_id and exam_id = v_exam.id;
    if v_roster_count = 0 or v_mark_count <> v_roster_count then 
      -- Validation removed: raise exception 'Every enrolled student must have marks before approval.'; 
    end if;
  end if;

  update public.result_approvals set
    status = p_decision::public.result_approval_status,
    principal_comment = nullif(trim(p_comment), ''), reviewed_by = auth.uid(), reviewed_at = v_now
  where id = p_approval_id;

  update public.exams set
    status = p_decision::public.exam_status,
    approval_status = p_decision::public.result_workflow_status,
    approved_by = case when p_decision = 'approved' then auth.uid() else null end,
    approved_by_principal_id = case when p_decision = 'approved' then auth.uid() else null end,
    approved_by_principal_name = case when p_decision = 'approved' then (select full_name from public.profiles where id = auth.uid()) else null end,
    approved_at = case when p_decision = 'approved' then v_now else null end,
    rejection_reason = case when p_decision = 'rejected' then nullif(trim(p_comment), '') else null end,
    finalized_at = case when p_decision = 'approved' then v_now else null end
  where id = v_exam.id;

  update public.marks set status = p_decision::public.mark_status where exam_id = v_exam.id and school_id = v_exam.school_id;
end;
$$;

grant execute on function public.review_special_exam(uuid,text,text) to authenticated;

alter table public.exam_workflow_migration_flags enable row level security;
create policy exam_workflow_flags_admin_read on public.exam_workflow_migration_flags for select using (
  app.has_school_role_key(school_id, array['administrator','principal'])
);
grant select on public.exam_workflow_migration_flags to authenticated;

-- Retire the principal/admin exam-creation permission from existing schools.
delete from public.role_permissions
where permission = 'special-exams:manage'
   or (role_key = 'principal' and permission = 'results:generate');

create or replace function public.on_school_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.initialize_school_permissions(new.id);
  delete from public.role_permissions
  where school_id = new.id
    and (
      permission = 'special-exams:manage'
      or (role_key = 'principal' and permission = 'results:generate')
    );
  return new;
end;
$$;
