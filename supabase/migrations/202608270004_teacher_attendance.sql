create table if not exists public.teacher_attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  note text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, teacher_id, attendance_date)
);

create index if not exists teacher_attendance_records_school_date_idx
  on public.teacher_attendance_records (school_id, attendance_date);

create index if not exists teacher_attendance_records_teacher_date_idx
  on public.teacher_attendance_records (school_id, teacher_id, attendance_date desc);

drop trigger if exists teacher_attendance_records_updated_at on public.teacher_attendance_records;
create trigger teacher_attendance_records_updated_at
  before update on public.teacher_attendance_records
  for each row execute function public.set_updated_at();

alter table public.teacher_attendance_records enable row level security;

drop policy if exists teacher_attendance_records_select on public.teacher_attendance_records;
create policy teacher_attendance_records_select on public.teacher_attendance_records
for select using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  or teacher_id = (select auth.uid())
);

drop policy if exists teacher_attendance_records_manage on public.teacher_attendance_records;
create policy teacher_attendance_records_manage on public.teacher_attendance_records
for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
)
with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);

grant all on public.teacher_attendance_records to authenticated, service_role;
