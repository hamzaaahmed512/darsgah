drop index if exists public.students_student_cnic_global_unique_idx;

create unique index if not exists students_active_student_cnic_global_unique_idx
  on public.students ((regexp_replace(student_cnic, '\\D', '', 'g')))
  where status = 'active'
    and student_cnic is not null
    and length(regexp_replace(student_cnic, '\\D', '', 'g')) = 13;
