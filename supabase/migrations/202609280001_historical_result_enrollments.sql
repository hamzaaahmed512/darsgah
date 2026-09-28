-- Preserve the class and session in which a marked exam was taken. Existing
-- enrollments, including completed and withdrawn rows, remain untouched.
alter table public.enrollments add column if not exists roll_no text;

insert into public.enrollments (school_id, student_id, class_id, academic_year_id, status, starts_on)
select distinct m.school_id, m.student_id, x.class_id, c.academic_year_id,
       'completed'::public.enrollment_status, coalesce(ay.starts_on, x.exam_date)
from public.marks m
join public.exams x on x.id = m.exam_id and x.school_id = m.school_id
join public.classes c on c.id = x.class_id and c.school_id = m.school_id
left join public.academic_years ay on ay.id = c.academic_year_id and ay.school_id = m.school_id
join public.students s on s.id = m.student_id and s.school_id = m.school_id
where c.academic_year_id is not null
  and not exists (
    select 1 from public.enrollments e
    where e.school_id = m.school_id and e.student_id = m.student_id
      and e.class_id = x.class_id and e.academic_year_id = c.academic_year_id
  )
on conflict (school_id, student_id, class_id, academic_year_id) do nothing;

create index if not exists enrollments_result_history_idx
  on public.enrollments (school_id, academic_year_id, class_id, student_id);
create index if not exists exams_result_session_idx
  on public.exams (school_id, class_id, exam_type, month);

-- The existing enrollments_select policy permits school principals and
-- registrars to read historical rows. Teachers retain their head-class scope.
