create unique index if not exists students_student_cnic_global_unique_idx
  on public.students ((regexp_replace(student_cnic, '\\D', '', 'g')))
  where student_cnic is not null and length(regexp_replace(student_cnic, '\\D', '', 'g')) = 13;
