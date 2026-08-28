alter table public.students drop constraint if exists students_major_check;
alter table public.students add constraint students_major_check check (
  major is null or length(btrim(major)) between 1 and 120
);

create table if not exists public.student_subject_combinations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.student_subject_combination_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  combination_id uuid not null references public.student_subject_combinations(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (combination_id, class_id)
);

create table if not exists public.student_subject_combination_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  combination_id uuid not null references public.student_subject_combinations(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (combination_id, subject_id)
);

create trigger student_subject_combinations_updated_at
before update on public.student_subject_combinations
for each row execute function public.set_updated_at();

alter table public.student_subject_combinations enable row level security;
alter table public.student_subject_combination_classes enable row level security;
alter table public.student_subject_combination_subjects enable row level security;

create policy student_subject_combinations_select on public.student_subject_combinations
for select using (app.has_school_role(school_id, array['administrator','principal','teacher','head_teacher','student_staff']::public.app_role[]));
create policy student_subject_combinations_manage on public.student_subject_combinations
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create policy student_subject_combination_classes_select on public.student_subject_combination_classes
for select using (app.has_school_role(school_id, array['administrator','principal','teacher','head_teacher','student_staff']::public.app_role[]));
create policy student_subject_combination_classes_manage on public.student_subject_combination_classes
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create policy student_subject_combination_subjects_select on public.student_subject_combination_subjects
for select using (app.has_school_role(school_id, array['administrator','principal','teacher','head_teacher','student_staff']::public.app_role[]));
create policy student_subject_combination_subjects_manage on public.student_subject_combination_subjects
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));
