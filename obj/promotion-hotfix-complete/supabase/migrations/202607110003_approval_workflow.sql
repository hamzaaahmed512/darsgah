-- Extend student_status enum with pending states
alter type public.student_status add value if not exists 'pending_approval';
alter type public.student_status add value if not exists 'pending_cancellation';

-- New enums for approval workflow
create type public.approval_request_type as enum ('admission', 'cancellation');
create type public.approval_request_status as enum ('pending', 'approved', 'denied');

-- Approval requests table (the core state machine)
create table public.approval_requests (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools(id) on delete cascade,
  request_type    public.approval_request_type not null,
  student_id      uuid not null references public.students(id) on delete cascade,
  submitted_by    uuid not null references public.profiles(id) on delete restrict,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  status          public.approval_request_status not null default 'pending',
  denial_reason   text,
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Only one pending request per student at a time
create unique index approval_requests_pending_unique
  on public.approval_requests (school_id, student_id)
  where status = 'pending';

create index approval_requests_school_status_idx
  on public.approval_requests (school_id, status, submitted_at desc);

create trigger approval_requests_updated_at
  before update on public.approval_requests
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for approval_requests
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.approval_requests enable row level security;

-- student_staff: can insert requests and see their own school's requests
create policy approval_requests_insert_staff on public.approval_requests
  for insert with check (
    app.has_school_role(school_id, array['student_staff']::public.app_role[])
  );

-- Everyone who can access the school can read requests
create policy approval_requests_select on public.approval_requests
  for select using (
    app.has_school_role(school_id, array['principal','administrator','student_staff']::public.app_role[])
  );

-- Only principal or administrator can review (update) requests
create policy approval_requests_review on public.approval_requests
  for update using (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  ) with check (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Update student RLS: teachers must NOT see pending_* students
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists students_select_by_role on public.students;

create policy students_select_by_role on public.students for select using (
  -- staff/admin/principal see all statuses
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or (
    -- teachers only see active students in their assigned classes
    status = 'active'
    and exists (
      select 1 from public.enrollments e
      where e.student_id = students.id
        and e.school_id = students.school_id
        and e.status = 'active'
        and app.is_teacher_for_class(students.school_id, e.class_id)
    )
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Principal can manage school_members (teachers + student_staff)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists members_admin_insert on public.school_members;
drop policy if exists members_admin_update on public.school_members;

create policy members_manage_principal_or_admin on public.school_members
  for insert with check (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  );

create policy members_update_principal_or_admin on public.school_members
  for update using (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Principal can manage classes and teacher_assignments
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists classes_manage on public.classes;
create policy classes_manage on public.classes
  for all using (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  ) with check (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  );

drop policy if exists teacher_assignments_manage on public.teacher_assignments;
create policy teacher_assignments_manage on public.teacher_assignments
  for all using (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  ) with check (
    app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants for the new table
-- ─────────────────────────────────────────────────────────────────────────────
grant all on public.approval_requests to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime on approval_requests
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.approval_requests;
