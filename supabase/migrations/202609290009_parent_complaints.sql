-- Complaints created through the parent portal and reviewed by school leadership.
-- Parent portal operations use the service client only after validating its
-- signed, revocable student session. Authenticated access is restricted by RLS.
create table if not exists public.parent_complaints (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  category text not null check (category in ('teacher', 'academic', 'fees', 'transport', 'facilities', 'safety', 'administration', 'other')),
  complained_teacher_id uuid references public.profiles(id) on delete set null,
  subject text not null check (char_length(btrim(subject)) between 1 and 160),
  details text not null check (char_length(btrim(details)) between 1 and 3000),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'resolved', 'dismissed')),
  admin_response text check (admin_response is null or char_length(btrim(admin_response)) between 1 and 3000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category = 'teacher' or complained_teacher_id is null)
);

create index if not exists parent_complaints_school_status_created_idx
  on public.parent_complaints (school_id, status, created_at desc);
create index if not exists parent_complaints_student_created_idx
  on public.parent_complaints (student_id, created_at desc);

alter table public.parent_complaints enable row level security;

create policy parent_complaints_leadership_select on public.parent_complaints for select using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);
create policy parent_complaints_leadership_update on public.parent_complaints for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop trigger if exists parent_complaints_updated_at on public.parent_complaints;
create trigger parent_complaints_updated_at before update on public.parent_complaints
for each row execute function public.set_updated_at();

grant select, update on public.parent_complaints to authenticated;
