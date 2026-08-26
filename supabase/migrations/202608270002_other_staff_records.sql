create table if not exists public.other_staff_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  category text not null default 'other',
  department text,
  job_title text,
  phone text,
  monthly_salary numeric check (monthly_salary is null or monthly_salary >= 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists other_staff_records_school_status_idx
  on public.other_staff_records (school_id, status, full_name);

drop trigger if exists other_staff_records_updated_at on public.other_staff_records;
create trigger other_staff_records_updated_at
  before update on public.other_staff_records
  for each row execute function public.set_updated_at();

alter table public.other_staff_records enable row level security;

drop policy if exists other_staff_records_select on public.other_staff_records;
create policy other_staff_records_select on public.other_staff_records
for select using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

drop policy if exists other_staff_records_manage on public.other_staff_records;
create policy other_staff_records_manage on public.other_staff_records
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

grant all on public.other_staff_records to authenticated, service_role;
