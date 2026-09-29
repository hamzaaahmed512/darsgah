-- Read-only inventory of approved major exams with missing marks.
-- Set :school_id to the school UUID in psql before running this file.
-- A historical roster is reconstructed from the exam class and enrollment
-- dates; review late admissions and old imports before changing an approval.
with expected as (
  select x.school_id, x.id as exam_id, x.title, x.exam_type, x.exam_date,
         x.class_id, x.subject_id, e.student_id
  from public.exams x
  join public.enrollments e on e.school_id = x.school_id and e.class_id = x.class_id
    and e.starts_on <= x.exam_date and (e.ends_on is null or e.ends_on >= x.exam_date)
  join public.students st on st.school_id = e.school_id and st.id = e.student_id
  join public.classes c on c.school_id = x.school_id and c.id = x.class_id
  join public.grades g on g.school_id = c.school_id and g.id = c.grade_id
  join public.subjects subject on subject.school_id = x.school_id and subject.id = x.subject_id
  join public.student_subject_enrollments sse on sse.school_id = x.school_id
    and sse.class_id = x.class_id and sse.subject_id = x.subject_id
    and sse.student_id = e.student_id
  where x.school_id = :'school_id'::uuid
    and x.status::text = 'approved'
    and x.exam_type::text in ('monthly','first_term','second_term','third_term')
    and not (
      g.name ~* '(9|10|11|12)' and (
        (coalesce(e.major, st.major) = 'biology' and lower(subject.name) in ('computer','computer science','computer studies'))
        or (coalesce(e.major, st.major) = 'biology' and g.name ~* '(11|12)' and lower(subject.name) in ('mathematics','maths'))
        or (coalesce(e.major, st.major) = 'computer' and lower(subject.name) = 'biology')
        or (coalesce(e.major, st.major) = 'computer' and g.name ~* '(11|12)' and lower(subject.name) = 'chemistry')
        or (coalesce(e.major, st.major) = 'pre_engineering' and lower(subject.name) in ('biology','computer','computer science','computer studies'))
        or (g.name ~* '(11|12)' and lower(subject.name) = 'statistics')
      )
    )
), missing as (
  select distinct expected.* from expected
  left join public.marks m on m.school_id = expected.school_id
    and m.exam_id = expected.exam_id and m.student_id = expected.student_id
  where m.id is null
)
select m.exam_id, m.title, m.exam_type, m.exam_date, m.class_id,
       s.name as subject_name, count(*) as missing_marks,
       array_agg(m.student_id order by m.student_id) as student_ids_to_review
from missing m
join public.subjects s on s.school_id = m.school_id and s.id = m.subject_id
group by m.exam_id, m.title, m.exam_type, m.exam_date, m.class_id, s.name
order by m.exam_date desc, m.title;

-- Existing queued exam shells lacking an approval request (possible after an
-- earlier partial create) require review before an explicit backfill.
select x.id as exam_id, x.title, x.class_id, x.subject_id, x.created_by
from public.exams x
left join public.result_approvals a on a.school_id = x.school_id and a.exam_id = x.id
where x.school_id = :'school_id'::uuid and a.id is null
  and x.status::text = 'pending_approval'
  and x.exam_type::text in ('monthly','first_term','second_term','third_term')
order by x.created_at;

-- After checking the rows above, restore only the reviewed queue entries:
-- begin;
-- insert into public.result_approvals(school_id, exam_id, submitted_by, status, submitted_at)
-- select x.school_id, x.id, x.created_by, 'pending', coalesce(x.submitted_at, x.created_at)
-- from public.exams x
-- where x.school_id = :'school_id'::uuid
--   and x.id = any(array['REVIEWED_EXAM_UUID'::uuid])
--   and x.status::text = 'pending_approval'
-- on conflict (school_id, exam_id) do nothing;
-- commit;

-- Existing zero marks cannot safely be inferred as absences. This is a
-- dry-run list for manual review; the new column defaults to false.
select m.id as mark_id, m.exam_id, m.student_id, x.title, x.exam_date
from public.marks m
join public.exams x on x.school_id = m.school_id and x.id = m.exam_id
where m.school_id = :'school_id'::uuid and m.marks_obtained = 0 and not m.is_absent
order by x.exam_date desc, x.title;

-- After staff verify an actual absence, update only the reviewed mark IDs
-- in a transaction. Replace the empty VALUES set with reviewed IDs and
-- inspect the SELECT before executing the UPDATE; do not infer from zero.
-- begin;
-- create temp table reviewed_absence_ids(id uuid primary key) on commit drop;
-- insert into reviewed_absence_ids(id) values ('REVIEWED_MARK_UUID');
-- select m.id, m.exam_id, m.student_id, m.marks_obtained, m.grade
-- from public.marks m join reviewed_absence_ids r on r.id = m.id
-- where m.school_id = :'school_id'::uuid and m.marks_obtained = 0;
-- update public.marks m set is_absent = true, grade = 'Absent'
-- from reviewed_absence_ids r where m.id = r.id
--   and m.school_id = :'school_id'::uuid and m.marks_obtained = 0;
-- commit;

-- Result cards use the roll number stored on that session's enrollment.
-- These rows will display a dash until staff reconcile the original register.
select e.id as enrollment_id, e.academic_year_id, e.class_id, e.student_id
from public.enrollments e
where e.school_id = :'school_id'::uuid and e.roll_no is null
  and exists (
    select 1 from public.exams x where x.school_id = e.school_id
      and x.class_id = e.class_id and x.status::text = 'approved'
      and x.exam_type::text in ('monthly','first_term','second_term','third_term')
  )
order by e.academic_year_id, e.class_id, e.student_id;
