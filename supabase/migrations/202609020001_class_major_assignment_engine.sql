alter table public.classes
  add column if not exists major_count integer not null default 0 check (major_count >= 0),
  add column if not exists default_major text null check (default_major is null or length(btrim(default_major)) between 1 and 120);

create table if not exists public.class_allowed_majors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  major_key text not null check (length(btrim(major_key)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (class_id, major_key)
);

create index if not exists class_allowed_majors_class_idx on public.class_allowed_majors(school_id, class_id);

alter table public.class_allowed_majors enable row level security;
create policy class_allowed_majors_select on public.class_allowed_majors
for select using (app.has_school_role(school_id, array['administrator','principal','teacher','head_teacher','student_staff']::public.app_role[]));
create policy class_allowed_majors_manage on public.class_allowed_majors
for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]))
with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create or replace function public.apply_class_default_major()
returns trigger language plpgsql security definer set search_path = public as $$
declare configured_major text;
begin
  if new.class_id is null then return new; end if;
  select default_major into configured_major
  from public.classes
  where id = new.class_id and school_id = new.school_id and major_count = 1;
  if configured_major is not null then new.major := configured_major; end if;
  return new;
end;
$$;

drop trigger if exists students_apply_class_default_major on public.students;
create trigger students_apply_class_default_major
before insert or update of class_id on public.students
for each row execute function public.apply_class_default_major();
