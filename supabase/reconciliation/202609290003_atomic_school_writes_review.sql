-- Read-only integrity report. In psql set the tenant first:
-- \set school_id 'YOUR-SCHOOL-UUID'
-- Review each row against admission registers, attendance sheets, and payroll
-- approvals. This file never changes stored records.

-- Students with no enrollment record, active students with no active
-- enrollment, and students without a primary guardian. Pending admissions
-- without an enrollment may be expected until approval; retain their status
-- in the report so staff can distinguish them from active students.
select s.school_id, s.id as student_id, s.admission_number, s.status,
  case when not exists (
    select 1 from public.enrollments e where e.school_id=s.school_id
      and e.student_id=s.id
  ) then 'NO_ENROLLMENT_RECORD'
  when s.status='active' and not exists (
    select 1 from public.enrollments e where e.school_id=s.school_id
      and e.student_id=s.id and e.status='active'
  ) then 'NO_ACTIVE_ENROLLMENT' end as enrollment_issue,
  case when not exists (
    select 1 from public.student_guardians sg
    join public.guardians g on g.school_id=sg.school_id and g.id=sg.guardian_id
    where sg.school_id=s.school_id and sg.student_id=s.id and sg.is_primary
  ) then 'NO_PRIMARY_GUARDIAN' end as guardian_issue
from public.students s
where s.school_id=:'school_id'::uuid
  and (
    not exists (select 1 from public.enrollments e where e.school_id=s.school_id
      and e.student_id=s.id)
    or (s.status='active' and not exists (select 1 from public.enrollments e
      where e.school_id=s.school_id and e.student_id=s.id and e.status='active'))
    or not exists (select 1 from public.student_guardians sg
      where sg.school_id=s.school_id and sg.student_id=s.id and sg.is_primary)
  )
order by s.status,s.admission_number;

-- Submitted sessions that contain no student attendance records.
select a.school_id,a.id as attendance_session_id,a.class_id,a.attendance_date,
  a.submitted_by,a.submitted_at
from public.attendance_sessions a
where a.school_id=:'school_id'::uuid
  and not exists (select 1 from public.attendance_records r
    where r.school_id=a.school_id and r.session_id=a.id)
order by a.attendance_date desc,a.class_id;

-- Payroll salary snapshots that differ from the salary-history value
-- effective in that month. A missing salary-history row is reported as
-- UNKNOWN_HISTORY; it is not evidence that the payroll amount is wrong.
with staff_payroll as (
  select p.school_id,p.id as payroll_id,p.month,p.base_salary,
    p.teacher_id,p.other_staff_id,
    case when p.teacher_id is not null then ted.monthly_salary
      else os.monthly_salary end as current_master_salary
  from public.payroll p
  left join public.teacher_employment_details ted
    on ted.school_id=p.school_id and ted.teacher_id=p.teacher_id
  left join public.other_staff_records os
    on os.school_id=p.school_id and os.id=p.other_staff_id
  where p.school_id=:'school_id'::uuid
), expected as (
  select p.*,
    (select h.new_salary from public.salary_history h
      where h.school_id=p.school_id
        and ((p.teacher_id is not null and h.teacher_id=p.teacher_id)
          or (p.other_staff_id is not null and h.other_staff_id=p.other_staff_id))
        and h.effective_date<=((p.month||'-01')::date)
      order by h.effective_date desc,h.created_at desc limit 1) as effective_salary
  from staff_payroll p
)
select school_id,payroll_id,month,teacher_id,other_staff_id,base_salary,
  effective_salary,current_master_salary,
  case when effective_salary is null then 'UNKNOWN_HISTORY'
    when base_salary<>effective_salary then 'PAYROLL_HISTORY_MISMATCH'
    when (month||'-01')::date>=date_trunc('month',current_date)::date
      and current_master_salary is distinct from effective_salary then 'CURRENT_MASTER_MISMATCH'
  end as review_reason
from expected
where effective_salary is null or base_salary<>effective_salary
  or ((month||'-01')::date>=date_trunc('month',current_date)::date
    and current_master_salary is distinct from effective_salary)
order by month desc,teacher_id,other_staff_id;
