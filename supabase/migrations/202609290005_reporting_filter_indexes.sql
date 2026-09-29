-- Reporting filters that are not covered by the existing tenant-leading indexes.
create index if not exists staff_leaves_school_status_end_start_idx
  on public.staff_leaves (school_id, status, end_date, start_date);

create index if not exists student_subject_enrollments_school_class_student_idx
  on public.student_subject_enrollments (school_id, class_id, student_id);

create index if not exists library_books_school_title_id_idx
  on public.library_books (school_id, title, id);
create index if not exists library_copies_school_accession_id_idx
  on public.library_copies (school_id, accession, id);
create index if not exists library_loans_school_issued_id_idx
  on public.library_loans (school_id, issued_at, id);
create index if not exists library_reservations_school_created_id_idx
  on public.library_reservations (school_id, created_at, id);
