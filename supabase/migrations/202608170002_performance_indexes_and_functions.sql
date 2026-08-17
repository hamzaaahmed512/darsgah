-- -----------------------------------------------------------------------------
-- Performance pass: indexes, RLS helper tuning, and one SQL RPC for heavy reads
-- -----------------------------------------------------------------------------
-- This migration is intentionally scoped to the hottest query bottlenecks in the
-- current app: tenant membership checks, teacher/class joins, attendance windows,
-- finance lookups, and school-scoped lists. It should run after the earlier
-- schema migrations and before production traffic spikes on a live system.
--
-- Why this matters:
-- 1) Most tenant-owned tables are filtered by school_id and then one or two more
--    fields (class_id, student_id, teacher_id, status, date range).
-- 2) RLS functions are executed per row during policy checks; they must be
--    cheap and backed by indexed membership tables.
-- 3) A few large list queries currently fetch too much data or do repeated work
--    that should be handled in SQL instead of JS.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1) Critical composite indexes for common access paths
-- -----------------------------------------------------------------------------

-- school_members is used for every school membership check and for RLS.
-- The heavy path is school_id + user_id + status; role is also used to filter.
create index if not exists school_members_school_user_status_idx
  on public.school_members (school_id, user_id, status);

create index if not exists school_members_school_role_status_user_idx
  on public.school_members (school_id, role, status, user_id);

-- Teacher/class access is the hottest join in attendance, enrollment, and class-scoped reads.
create index if not exists teacher_assignments_school_class_teacher_idx
  on public.teacher_assignments (school_id, class_id, teacher_id);

create index if not exists teacher_assignments_school_teacher_class_subject_idx
  on public.teacher_assignments (school_id, teacher_id, class_id, subject_id);

-- Enrollment reads are often school + class + status, and student-level lookups are very common.
create index if not exists enrollments_school_class_status_student_idx
  on public.enrollments (school_id, class_id, status, student_id);

create index if not exists enrollments_school_student_status_class_idx
  on public.enrollments (school_id, student_id, status, class_id);

-- Attendance reads are date-bounded and class/student scoped.
create index if not exists attendance_records_school_class_date_student_idx
  on public.attendance_records (school_id, class_id, attendance_date, student_id);

create index if not exists attendance_records_school_student_date_idx
  on public.attendance_records (school_id, student_id, attendance_date);

-- Activity log list pages are ordered by recency within school.
create index if not exists activity_logs_school_entity_created_idx
  on public.activity_logs (school_id, entity_type, created_at desc);

-- Student listing and recent admissions are filtered by school + status/date.
create index if not exists students_school_status_admission_date_idx
  on public.students (school_id, status, admission_date desc);

-- Finance reads are dominated by fee account and payment history lookups.
create index if not exists fee_payments_school_account_date_idx
  on public.fee_payments (school_id, student_fee_account_id, payment_date desc);

create index if not exists fee_payments_school_voided_created_idx
  on public.fee_payments (school_id, is_voided, created_at desc);

create index if not exists finance_audit_logs_school_student_created_idx
  on public.finance_audit_logs (school_id, student_id, created_at desc);

-- Exam and marks access often filters by school + teacher/class/subject/date.
create index if not exists exams_school_class_subject_date_idx
  on public.exams (school_id, class_id, subject_id, exam_date desc);

create index if not exists exams_school_created_status_date_idx
  on public.exams (school_id, created_by, status, exam_date desc);

create index if not exists marks_school_class_student_status_idx
  on public.marks (school_id, class_id, student_id, status);

-- Staff leave reads are tenant-scoped and date-range heavy.
create index if not exists staff_leaves_school_user_date_idx
  on public.staff_leaves (school_id, user_id, start_date, end_date);

-- Student transport assignment checks are school + student lookups.
create index if not exists student_transport_assignments_school_student_idx
  on public.student_transport_assignments (school_id, student_id);

-- -----------------------------------------------------------------------------
-- 2) RLS helper functions: keep them cheap and cacheable
-- -----------------------------------------------------------------------------
-- Note: These functions sit in the app schema and are used from RLS policies.
-- They must be STABLE so Postgres can avoid repeated evaluation within a query,
-- and they should use an indexed lookup against school_members.

create or replace function app.has_school_role(target_school_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members sm
    where sm.school_id = target_school_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
      and sm.role = any(allowed_roles)
  );
$$;

create or replace function app.can_access_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members sm
    where sm.school_id = target_school_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

create or replace function app.is_teacher_for_class(target_school_id uuid, target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_assignments ta
    where ta.school_id = target_school_id
      and ta.class_id = target_class_id
      and ta.teacher_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.classes c
    where c.school_id = target_school_id
      and c.id = target_class_id
      and c.head_teacher_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- 3) Query helper RPC: attendance summary in SQL instead of multiple round trips
-- -----------------------------------------------------------------------------
-- This is a good example of a repeated multi-step read that should live in the DB:
-- a class attendance summary for a date range, aggregated once in Postgres instead
-- of pulling all rows into JS and re-aggregating in the app.
create or replace function app.get_class_attendance_summary(
  p_school_id uuid,
  p_class_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  attendance_date date,
  total_students bigint,
  present_count bigint,
  late_count bigint,
  absent_count bigint,
  excused_count bigint
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not app.can_access_school(p_school_id) then
    raise exception 'Not authorized to access this school.';
  end if;

  return query
  with roster as (
    select e.student_id,
           e.school_id,
           e.class_id
    from public.enrollments e
    where e.school_id = p_school_id
      and e.class_id = p_class_id
      and e.status = 'active'
  ),
  daily as (
    select ar.attendance_date,
           ar.student_id,
           ar.status
    from public.attendance_records ar
    where ar.school_id = p_school_id
      and ar.class_id = p_class_id
      and ar.attendance_date >= p_start_date
      and ar.attendance_date <= p_end_date
  )
  select d.attendance_date,
         count(distinct r.student_id) as total_students,
         count(*) filter (where d.status in ('present', 'late')) as present_count,
         count(*) filter (where d.status = 'late') as late_count,
         count(*) filter (where d.status = 'absent') as absent_count,
         count(*) filter (where d.status = 'excused') as excused_count
  from (
    select distinct ro.attendance_date, ro.student_id
    from (
      select generate_series(p_start_date, p_end_date, interval '1 day')::date as attendance_date,
             r.student_id
      from roster r
    ) ro
  ) s
  left join daily d
    on d.attendance_date = s.attendance_date
   and d.student_id = s.student_id
  group by d.attendance_date
  order by d.attendance_date;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) Recommended policy rewrite where per-row RLS subqueries were expensive
-- -----------------------------------------------------------------------------
-- The original patterns often did repeated membership + class lookup checks inside
-- each policy. The following is the practice to prefer in future policy work:
--
--   - Use EXISTS against an indexed membership table.
--   - Use (select auth.uid()) once per row instead of calling auth.uid() multiple
--     times repeatedly inside a predicate.
--   - Ensure the membership table has (school_id, user_id, status) and relevant
--     class/teacher indexes before relying on these patterns.
--
-- Leave the current policies in place and avoid mass rewrites in a live system
-- unless the specific policy is known to be a bottleneck. The helper functions
-- above are the safe, cheap direction to keep policy evaluation fast.

-- -----------------------------------------------------------------------------
-- 5) Explicit notes on what we could not verify without EXPLAIN ANALYZE
-- -----------------------------------------------------------------------------
-- These are the only things that truly require live inspection against the target
-- database and actual row counts:
--
--   - whether the planner prefers the new composite indexes over the older single-column ones
--   - whether some historical index is redundant in production workloads
--   - whether a particular query is still limited by seq scans on a very large table
--
-- Run the following EXPLAIN ANALYZE examples against the real Supabase database
-- once the migration is applied, then share the output for final tuning:

-- Example 1: membership policy lookup
-- explain analyze
-- select *
-- from public.school_members sm
-- where sm.school_id = '00000000-0000-0000-0000-000000000000'
--   and sm.user_id = auth.uid()
--   and sm.status = 'active';

-- Example 2: teacher/class access path
-- explain analyze
-- select *
-- from public.teacher_assignments ta
-- where ta.school_id = '00000000-0000-0000-0000-000000000000'
--   and ta.class_id = '00000000-0000-0000-0000-000000000000';

-- Example 3: attendance register query
-- explain analyze
-- select *
-- from public.attendance_records ar
-- where ar.school_id = '00000000-0000-0000-0000-000000000000'
--   and ar.class_id = '00000000-0000-0000-0000-000000000000'
--   and ar.attendance_date >= current_date - interval '30 days';

-- Example 4: finance payment history query
-- explain analyze
-- select *
-- from public.fee_payments fp
-- where fp.school_id = '00000000-0000-0000-0000-000000000000'
--   and fp.student_fee_account_id = '00000000-0000-0000-0000-000000000000'
-- order by fp.payment_date desc;

-- Example 5: student directory list / tenant filter
-- explain analyze
-- select *
-- from public.student_directory sd
-- where sd.school_id = '00000000-0000-0000-0000-000000000000'
--   and sd.status = 'active'
-- order by sd.last_name
-- limit 50;

-- Example 6: attendance-summary RPC
-- explain analyze
-- select *
-- from app.get_class_attendance_summary(
--   '00000000-0000-0000-0000-000000000000',
--   '00000000-0000-0000-0000-000000000000',
--   current_date - interval '30 days',
--   current_date
-- );

-- If the planner still prefers sequential scans for the larger tables, the next
-- tuning step is to verify row counts and adjust the index ordering to match the
-- actual dominant filter cardinality, not just the theoretical query shape.
