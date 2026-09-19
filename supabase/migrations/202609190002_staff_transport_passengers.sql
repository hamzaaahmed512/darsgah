create table public.staff_transport_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  account_staff_id uuid references public.profiles(id) on delete restrict,
  record_staff_id uuid references public.other_staff_records(id) on delete restrict,
  vehicle_id uuid not null references public.transport_vehicles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_transport_one_identity check ((account_staff_id is not null) <> (record_staff_id is not null))
);
create unique index staff_transport_account_unique on public.staff_transport_assignments (school_id, account_staff_id) where account_staff_id is not null;
create unique index staff_transport_record_unique on public.staff_transport_assignments (school_id, record_staff_id) where record_staff_id is not null;
create index staff_transport_vehicle_idx on public.staff_transport_assignments (school_id, vehicle_id);
create trigger staff_transport_updated_at before update on public.staff_transport_assignments
for each row execute function public.set_updated_at();

alter table public.staff_transport_assignments enable row level security;
create policy staff_transport_select on public.staff_transport_assignments for select
using (app.can_access_school(school_id));
-- Inserts and moves use assign_staff_transport so capacity cannot be bypassed.
create policy staff_transport_delete on public.staff_transport_assignments for delete
using (app.has_school_role_key(school_id, array['administrator','principal','student_staff']));
grant all on public.staff_transport_assignments to authenticated, service_role;

-- Keep student writes behind the updated shared-capacity function too. The
-- existing remove action still deletes through its school-scoped policy.
drop policy if exists student_transport_manage on public.student_transport_assignments;
create policy student_transport_delete on public.student_transport_assignments for delete
using (app.has_school_role_key(school_id, array['administrator','principal','student_staff']));

create or replace function public.assign_staff_transport(
  p_school_id uuid, p_account_staff_id uuid, p_record_staff_id uuid,
  p_vehicle_id uuid, p_actor_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_capacity integer;
  v_current_count integer;
  v_assignment_id uuid;
begin
  if not app.has_school_role_key(p_school_id, array['administrator','principal','student_staff']) then
    raise exception 'Not authorized to manage transport assignments.';
  end if;
  if (p_account_staff_id is null) = (p_record_staff_id is null) then
    raise exception 'Select one staff member.';
  end if;
  if p_account_staff_id is not null and not exists (
    select 1 from public.school_members sm where sm.school_id=p_school_id and sm.user_id=p_account_staff_id and sm.status='active'
  ) then raise exception 'Staff member is not active in this school.'; end if;
  if p_record_staff_id is not null and not exists (
    select 1 from public.other_staff_records os where os.school_id=p_school_id and os.id=p_record_staff_id and os.status='active'
  ) then raise exception 'Staff member is not active in this school.'; end if;

  select seat_capacity into v_capacity from public.transport_vehicles
  where school_id=p_school_id and id=p_vehicle_id and status='active' for update;
  if v_capacity is null then raise exception 'Vehicle is not available.'; end if;

  select id into v_assignment_id from public.staff_transport_assignments
  where school_id=p_school_id and
    ((p_account_staff_id is not null and account_staff_id=p_account_staff_id) or
     (p_record_staff_id is not null and record_staff_id=p_record_staff_id));
  if v_assignment_id is not null and exists (
    select 1 from public.staff_transport_assignments where id=v_assignment_id and vehicle_id=p_vehicle_id
  ) then return; end if;

  select (select count(*) from public.student_transport_assignments where school_id=p_school_id and vehicle_id=p_vehicle_id)
       + (select count(*) from public.staff_transport_assignments where school_id=p_school_id and vehicle_id=p_vehicle_id)
  into v_current_count;
  if v_current_count >= v_capacity then raise exception 'Vehicle is at maximum passenger capacity.'; end if;

  if v_assignment_id is not null then
    update public.staff_transport_assignments set vehicle_id=p_vehicle_id, assigned_by=p_actor_id, assigned_at=now()
    where id=v_assignment_id;
  else
    insert into public.staff_transport_assignments (school_id,account_staff_id,record_staff_id,vehicle_id,assigned_by)
    values (p_school_id,p_account_staff_id,p_record_staff_id,p_vehicle_id,p_actor_id);
  end if;
end; $$;
grant execute on function public.assign_staff_transport(uuid,uuid,uuid,uuid,uuid) to authenticated;

-- Preserve student billing while including staff in the shared seat limit.
create or replace function public.assign_student_transport(
  p_school_id uuid, p_student_id uuid, p_vehicle_id uuid, p_actor_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_capacity integer;
  v_current_count integer;
begin
  if not app.has_school_role_key(p_school_id, array['administrator','principal','student_staff']) then
    raise exception 'Not authorized to manage transport assignments.';
  end if;
  select seat_capacity into v_capacity from public.transport_vehicles
  where school_id=p_school_id and id=p_vehicle_id and status='active' for update;
  if v_capacity is null then raise exception 'Vehicle is not available.'; end if;
  if not exists (select 1 from public.students where id=p_student_id and school_id=p_school_id) then
    raise exception 'Student is not in this school.';
  end if;
  if exists (select 1 from public.student_transport_assignments
    where school_id=p_school_id and student_id=p_student_id and vehicle_id=p_vehicle_id) then return; end if;
  select (select count(*) from public.student_transport_assignments where school_id=p_school_id and vehicle_id=p_vehicle_id)
       + (select count(*) from public.staff_transport_assignments where school_id=p_school_id and vehicle_id=p_vehicle_id)
  into v_current_count;
  if v_current_count >= v_capacity then raise exception 'Vehicle is at maximum passenger capacity.'; end if;
  insert into public.student_transport_assignments (school_id,student_id,vehicle_id,assigned_by)
  values (p_school_id,p_student_id,p_vehicle_id,p_actor_id)
  on conflict (school_id,student_id) do update set vehicle_id=excluded.vehicle_id,
    assigned_by=excluded.assigned_by,assigned_at=now();
end; $$;
