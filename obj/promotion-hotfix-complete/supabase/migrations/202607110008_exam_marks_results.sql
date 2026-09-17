do $$
begin
  create type public.exam_type as enum ('quiz', 'monthly', 'mid_term', 'final_term');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.exam_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.mark_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.result_approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.grading_scales (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  grade text not null,
  min_percentage numeric(5,2) not null,
  max_percentage numeric(5,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, grade),
  check (min_percentage >= 0 and max_percentage <= 100 and min_percentage <= max_percentage)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  exam_type public.exam_type not null,
  title text not null,
  term text not null,
  exam_date date not null,
  max_marks numeric(7,2) not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status public.exam_status not null default 'draft',
  submitted_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_marks > 0)
);

create unique index if not exists exams_school_natural_key_idx
  on public.exams (school_id, class_id, subject_id, exam_type, term, exam_date, title);

create table if not exists public.marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  marks_obtained numeric(7,2) not null,
  grade text not null,
  status public.mark_status not null default 'draft',
  teacher_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, exam_id, student_id),
  check (marks_obtained >= 0)
);

create table if not exists public.result_approvals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status public.result_approval_status not null default 'pending',
  principal_comment text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, exam_id)
);

create index if not exists exams_teacher_status_idx on public.exams (school_id, created_by, status);
create index if not exists exams_class_term_idx on public.exams (school_id, class_id, term, exam_type, status);
create index if not exists marks_exam_student_idx on public.marks (school_id, exam_id, student_id);
create index if not exists marks_student_idx on public.marks (school_id, student_id, class_id);
create index if not exists result_approvals_status_idx on public.result_approvals (school_id, status, submitted_at desc);

drop trigger if exists grading_scales_updated_at on public.grading_scales;
create trigger grading_scales_updated_at before update on public.grading_scales for each row execute function public.set_updated_at();

drop trigger if exists exams_updated_at on public.exams;
create trigger exams_updated_at before update on public.exams for each row execute function public.set_updated_at();

drop trigger if exists marks_updated_at on public.marks;
create trigger marks_updated_at before update on public.marks for each row execute function public.set_updated_at();

drop trigger if exists result_approvals_updated_at on public.result_approvals;
create trigger result_approvals_updated_at before update on public.result_approvals for each row execute function public.set_updated_at();

create or replace function app.is_teacher_assigned_to_subject(target_school_id uuid, target_class_id uuid, target_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_assignments
    where school_id = target_school_id
      and class_id = target_class_id
      and subject_id = target_subject_id
      and teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.classes
    where school_id = target_school_id
      and id = target_class_id
      and head_teacher_id = auth.uid()
  );
$$;

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
      and e.status in ('draft', 'rejected')
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  );
$$;

alter table public.grading_scales enable row level security;
alter table public.exams enable row level security;
alter table public.marks enable row level security;
alter table public.result_approvals enable row level security;

drop policy if exists grading_scales_read on public.grading_scales;
create policy grading_scales_read on public.grading_scales for select using (app.can_access_school(school_id));

drop policy if exists grading_scales_manage_admin on public.grading_scales;
create policy grading_scales_manage_admin on public.grading_scales for all using (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator']::public.app_role[])
);

drop policy if exists exams_read on public.exams;
create policy exams_read on public.exams for select using (app.can_access_school(school_id));

drop policy if exists exams_insert_teacher on public.exams;
create policy exams_insert_teacher on public.exams for insert with check (
  created_by = auth.uid()
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
);

drop policy if exists exams_update_teacher on public.exams;
create policy exams_update_teacher on public.exams for update using (
  app.can_teacher_edit_exam(school_id, id)
) with check (
  created_by = auth.uid()
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and status in ('draft', 'rejected', 'submitted')
);

drop policy if exists exams_update_principal on public.exams;
create policy exams_update_principal on public.exams for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop policy if exists marks_read on public.marks;
create policy marks_read on public.marks for select using (app.can_access_school(school_id));

drop policy if exists marks_insert_teacher on public.marks;
create policy marks_insert_teacher on public.marks for insert with check (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
);

drop policy if exists marks_update_teacher on public.marks;
create policy marks_update_teacher on public.marks for update using (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
) with check (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
  and status in ('draft', 'rejected')
);

drop policy if exists marks_update_principal on public.marks;
create policy marks_update_principal on public.marks for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop policy if exists result_approvals_read on public.result_approvals;
create policy result_approvals_read on public.result_approvals for select using (app.can_access_school(school_id));

drop policy if exists result_approvals_insert_teacher on public.result_approvals;
create policy result_approvals_insert_teacher on public.result_approvals for insert with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and e.school_id = result_approvals.school_id
      and e.created_by = auth.uid()
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  )
);

drop policy if exists result_approvals_update_principal on public.result_approvals;
create policy result_approvals_update_principal on public.result_approvals for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop policy if exists result_approvals_resubmit_teacher on public.result_approvals;
create policy result_approvals_resubmit_teacher on public.result_approvals for update using (
  submitted_by = auth.uid()
  and status = 'rejected'
  and exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and e.school_id = result_approvals.school_id
      and e.created_by = auth.uid()
      and e.status = 'rejected'
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  )
) with check (
  submitted_by = auth.uid()
  and status = 'pending'
);
