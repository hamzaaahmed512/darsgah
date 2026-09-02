-- Remove ICS with Economics and ICS with Statistics combinations from student_subject_combinations
delete from public.student_subject_combinations
where combination_key in ('computer_economics', 'computer_economics_stats')
   or lower(btrim(name)) in ('ics with economics', 'ics with statistics', 'ics with economics and stats', 'computer with economics', 'computer with economics and stats');

-- Update any students currently mapped to removed combinations to default ICS with Physics ('computer')
update public.students
set major = 'computer'
where major in ('computer_economics', 'computer_economics_stats', 'ICS with Economics', 'ICS with Statistics', 'ICS with Economics and Stats', 'Computer with Economics', 'Computer with Economics and Stats');

-- Update student major check constraint
alter table public.students drop constraint if exists students_major_check;
alter table public.students add constraint students_major_check check (
  major is null or major in ('computer', 'biology', 'pre_engineering') or major like 'custom:%'
);

-- Update trigger function for removing major excluded subjects
create or replace function public.remove_major_excluded_subjects()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  grade_no integer;
begin
  if new.class_id is null or new.major is null then return new; end if;
  select nullif(substring(g.name from '(9|10|11|12)'), '')::integer into grade_no
  from public.classes c join public.grades g on g.id = c.grade_id
  where c.id = new.class_id and c.school_id = new.school_id;

  delete from public.student_subject_enrollments sse
  using public.subjects sub
  where sse.school_id = new.school_id and sse.student_id = new.id and sse.class_id = new.class_id
    and sub.id = sse.subject_id
    and (
      (grade_no in (9,10) and new.major = 'computer' and lower(sub.name) = 'biology') or
      (grade_no in (9,10) and new.major = 'biology' and lower(sub.name) in ('computer','computer science','computer studies')) or
      (grade_no in (11,12) and new.major = 'computer' and lower(sub.name) in ('biology','chemistry','statistics')) or
      (grade_no in (11,12) and new.major = 'pre_engineering' and lower(sub.name) in ('biology','computer','computer science','computer studies','statistics')) or
      (grade_no in (11,12) and new.major = 'biology' and lower(sub.name) in ('computer','computer science','computer studies','mathematics','maths','statistics'))
    );
  return new;
end $$;
