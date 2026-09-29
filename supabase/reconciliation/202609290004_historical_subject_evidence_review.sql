-- Read-only ATT-02 / RES-03 review. Set :school_id in psql before running.
-- No historic custom mapping can be reconstructed reliably when both the
-- subject row and exam evidence are absent. Check the original subject register.

-- Dry-run count of current subject rows the migration will seed as history.
select school_id,count(*) as subject_rows_to_seed
from public.student_subject_enrollments
where school_id=:'school_id'::uuid
group by school_id;

-- Attendance records without an enrollment effective on that date.
select ar.school_id,ar.student_id,ar.class_id,ar.attendance_date,ar.status
from public.attendance_records ar
where ar.school_id=:'school_id'::uuid
  and not exists (
    select 1 from public.enrollments e
    where e.school_id=ar.school_id and e.student_id=ar.student_id
      and e.class_id=ar.class_id and e.starts_on<=ar.attendance_date
      and (e.ends_on is null or e.ends_on>=ar.attendance_date)
  )
order by ar.attendance_date,ar.class_id,ar.student_id;

-- Marked subjects with no recorded student-subject row in that class.
select m.school_id,m.student_id,x.class_id,c.academic_year_id as exam_session_id,
  x.subject_id,min(x.exam_date) as first_marked_exam_date,count(*) as marks_count
from public.marks m
join public.exams x on x.school_id=m.school_id and x.id=m.exam_id
join public.classes c on c.school_id=x.school_id and c.id=x.class_id
where m.school_id=:'school_id'::uuid
  and not exists (select 1 from public.student_subject_enrollments sse
    where sse.school_id=m.school_id and sse.student_id=m.student_id
      and sse.class_id=x.class_id and sse.subject_id=x.subject_id)
group by m.school_id,m.student_id,x.class_id,c.academic_year_id,x.subject_id
order by first_marked_exam_date;

-- Historical class enrollments with no subject rows and no marked exam
-- evidence. These need the original subject register before correction.
select e.school_id,e.student_id,e.class_id,e.academic_year_id,e.status,e.starts_on,e.ends_on,e.major
from public.enrollments e
join public.classes c on c.school_id=e.school_id and c.id=e.class_id
join public.grades g on g.school_id=c.school_id and g.id=c.grade_id
where e.school_id=:'school_id'::uuid and g.name ~* '(9|10|11|12)'
  and not exists (select 1 from public.student_subject_enrollments sse
    where sse.school_id=e.school_id and sse.student_id=e.student_id and sse.class_id=e.class_id)
  and not exists (select 1 from public.marks m join public.exams x
    on x.school_id=m.school_id and x.id=m.exam_id
    where m.school_id=e.school_id and m.student_id=e.student_id and x.class_id=e.class_id)
order by e.academic_year_id,e.class_id,e.student_id;

-- Rows created after an approved exam are not proof the student studied that
-- subject on exam day. Mark evidence may still establish the subject.
select sse.school_id,sse.student_id,sse.class_id,sse.subject_id,sse.enrolled_at,
  min(x.exam_date) as first_approved_exam_date
from public.student_subject_enrollments sse
join public.exams x on x.school_id=sse.school_id and x.class_id=sse.class_id
  and x.subject_id=sse.subject_id and x.status='approved'
where sse.school_id=:'school_id'::uuid and sse.enrolled_at::date>x.exam_date
group by sse.school_id,sse.student_id,sse.class_id,sse.subject_id,sse.enrolled_at
order by first_approved_exam_date;

-- Current custom-combination rows that do not match the current mapping.
-- These rows may be past evidence or stale auto-enrollments. Review marks
-- and original class registers before removing any row.
select sse.school_id,sse.student_id,sse.class_id,sse.subject_id,
  sse.enrolled_at,s.major as current_combination,
  count(m.id) as recorded_marks
from public.student_subject_enrollments sse
join public.students s on s.school_id=sse.school_id and s.id=sse.student_id
join public.enrollments e on e.school_id=sse.school_id
  and e.student_id=sse.student_id and e.class_id=sse.class_id and e.status='active'
left join public.marks m on m.school_id=sse.school_id and m.student_id=sse.student_id
  and m.class_id=sse.class_id and m.subject_id=sse.subject_id
where sse.school_id=:'school_id'::uuid and s.major like 'custom:%'
  and not exists (
    select 1 from public.student_subject_combinations sc
    join public.student_subject_combination_subjects scs
      on scs.school_id=sc.school_id and scs.combination_id=sc.id
    where sc.school_id=sse.school_id and s.major='custom:'||sc.id::text
      and scs.subject_id=sse.subject_id
  )
group by sse.school_id,sse.student_id,sse.class_id,sse.subject_id,sse.enrolled_at,s.major
order by sse.class_id,sse.student_id,sse.subject_id;
