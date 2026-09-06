create table if not exists public.student_subject_combination_section_subject_overrides (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  combination_id uuid not null references public.student_subject_combinations(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, combination_id, subject_id)
);

create index if not exists student_combination_section_override_class_idx
  on public.student_subject_combination_section_subject_overrides (school_id, class_id);

alter table public.student_subject_combination_section_subject_overrides enable row level security;

create policy student_combination_section_override_select on public.student_subject_combination_section_subject_overrides
for select using (app.has_school_role(school_id, array['administrator','principal','teacher','head_teacher','student_staff']::public.app_role[]));

create policy student_combination_section_override_manage on public.student_subject_combination_section_subject_overrides
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));
