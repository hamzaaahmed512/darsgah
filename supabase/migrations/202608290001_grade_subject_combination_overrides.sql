alter table public.student_subject_combinations
  add column if not exists grade_id uuid references public.grades(id) on delete cascade,
  add column if not exists combination_key text;

alter table public.student_subject_combinations
  drop constraint if exists student_subject_combinations_school_id_name_key;

create unique index if not exists student_subject_combinations_default_override_key
  on public.student_subject_combinations (school_id, grade_id, combination_key)
  where combination_key is not null;
