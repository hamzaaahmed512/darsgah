-- Extend exam types and add result workflow tracking columns.

do $$
begin
  alter type public.exam_type add value if not exists 'class_test';
  alter type public.exam_type add value if not exists 'assignment';
  alter type public.exam_type add value if not exists 'presentation';
  alter type public.exam_type add value if not exists 'lab';
  alter type public.exam_type add value if not exists 'viva';
  alter type public.exam_type add value if not exists 'attendance';
  alter type public.exam_type add value if not exists 'pre_board';
  alter type public.exam_type add value if not exists 'annual_exam';
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.assessment_category as enum ('regular', 'major');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.result_workflow_status as enum ('draft', 'uploaded', 'pending_approval', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

alter table public.exams
  add column if not exists requires_approval boolean not null default false,
  add column if not exists assessment_category public.assessment_category not null default 'regular',
  add column if not exists approval_status public.result_workflow_status not null default 'draft',
  add column if not exists uploaded_by_teacher_id uuid references public.profiles(id) on delete set null,
  add column if not exists uploaded_by_teacher_name text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists approved_by_principal_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_by_principal_name text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text;

-- Backfill existing rows based on exam type and status.
-- Cast to text because new enum values cannot be referenced in the same transaction they are added.
update public.exams
set
  requires_approval = exam_type::text in ('monthly', 'mid_term', 'final_term', 'pre_board', 'annual_exam'),
  assessment_category = case
    when exam_type::text in ('monthly', 'mid_term', 'final_term', 'pre_board', 'annual_exam') then 'major'::public.assessment_category
    else 'regular'::public.assessment_category
  end,
  approval_status = case
    when status = 'approved' then 'approved'::public.result_workflow_status
    when status = 'rejected' then 'rejected'::public.result_workflow_status
    when status = 'submitted' then 'pending_approval'::public.result_workflow_status
    else 'draft'::public.result_workflow_status
  end;

create index if not exists exams_approval_status_idx on public.exams (school_id, requires_approval, approval_status, created_at desc);
create index if not exists exams_uploaded_by_idx on public.exams (school_id, uploaded_by_teacher_id, uploaded_at desc);

-- Teachers may edit approved regular assessments; major exams stay locked after submission.
create or replace function app.can_teacher_edit_exam(target_school_id uuid, target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.school_id = target_school_id
      and e.id = target_exam_id
      and e.created_by = auth.uid()
      and (
        e.status in ('draft', 'rejected')
        or (e.status = 'approved' and e.requires_approval = false)
      )
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  );
$$;

-- Allow teachers to reset rejected major exams back to draft when saving marks.
drop policy if exists exams_update_teacher on public.exams;
create policy exams_update_teacher on public.exams for update using (
  app.can_teacher_edit_exam(school_id, id)
) with check (
  created_by = auth.uid()
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and status in ('draft', 'rejected', 'submitted', 'approved')
);
