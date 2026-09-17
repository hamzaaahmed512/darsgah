alter type public.app_role add value if not exists 'cashier';
alter type public.app_role add value if not exists 'staff';
alter type public.app_role add value if not exists 'head_teacher';
alter type public.student_status add value if not exists 'cancelled';

create or replace function app.has_school_role_key(target_school_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_members
    where school_id = target_school_id
      and user_id = auth.uid()
      and status = 'active'
      and role::text = any(allowed_roles)
  );
$$;

do $$
begin
  create type public.staff_leave_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.staff_leaves (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  leave_type text not null check (leave_type in ('casual', 'medical', 'annual', 'unpaid', 'other')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status public.staff_leave_status not null default 'pending',
  is_paid_leave boolean not null default true,
  principal_remarks text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date),
  check (status <> 'rejected' or principal_remarks is not null)
);

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  start_point text not null,
  end_point text not null,
  monthly_fare numeric not null default 0 check (monthly_fare >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table if not exists public.transport_drivers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  phone text not null,
  license_number text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, license_number)
);

create table if not exists public.transport_vehicles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plate_number text not null,
  seat_capacity integer not null check (seat_capacity > 0),
  driver_id uuid references public.transport_drivers(id) on delete set null,
  route_id uuid references public.transport_routes(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, plate_number)
);

create table if not exists public.student_transport_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  vehicle_id uuid not null references public.transport_vehicles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id)
);

do $$
begin
  if to_regclass('public.student_fee_accounts') is not null then
    alter table public.student_fee_accounts
      add column if not exists transport_recurring_fee numeric not null default 0 check (transport_recurring_fee >= 0);
  end if;
end $$;

alter table public.exams
  add column if not exists is_special boolean not null default false,
  add column if not exists assigned_teacher_id uuid references public.profiles(id) on delete set null;

create index if not exists staff_leaves_school_status_idx on public.staff_leaves (school_id, status, created_at desc);
create index if not exists staff_leaves_user_idx on public.staff_leaves (school_id, user_id, created_at desc);
create index if not exists transport_assignments_vehicle_idx on public.student_transport_assignments (school_id, vehicle_id);
create index if not exists exams_special_assignee_idx on public.exams (school_id, is_special, assigned_teacher_id, status);

drop trigger if exists staff_leaves_updated_at on public.staff_leaves;
create trigger staff_leaves_updated_at before update on public.staff_leaves for each row execute function public.set_updated_at();
drop trigger if exists transport_routes_updated_at on public.transport_routes;
create trigger transport_routes_updated_at before update on public.transport_routes for each row execute function public.set_updated_at();
drop trigger if exists transport_drivers_updated_at on public.transport_drivers;
create trigger transport_drivers_updated_at before update on public.transport_drivers for each row execute function public.set_updated_at();
drop trigger if exists transport_vehicles_updated_at on public.transport_vehicles;
create trigger transport_vehicles_updated_at before update on public.transport_vehicles for each row execute function public.set_updated_at();
drop trigger if exists student_transport_assignments_updated_at on public.student_transport_assignments;
create trigger student_transport_assignments_updated_at before update on public.student_transport_assignments for each row execute function public.set_updated_at();

create or replace function app.is_teacher_assigned_to_subject(target_school_id uuid, target_class_id uuid, target_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_assignments
    where school_id = target_school_id
      and class_id = target_class_id
      and subject_id = target_subject_id
      and teacher_id = auth.uid()
  );
$$;

create or replace function app.can_teacher_edit_exam(target_school_id uuid, target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.school_id = target_school_id
      and e.id = target_exam_id
      and (e.created_by = auth.uid() or e.assigned_teacher_id = auth.uid())
      and (
        e.status in ('draft', 'rejected')
        or (e.status = 'approved' and e.requires_approval = false and e.is_special = false)
      )
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  );
$$;

create or replace function public.sync_transport_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_school_id uuid;
  v_new_fare numeric := 0;
  v_old_fare numeric := 0;
begin
  v_student_id := coalesce(new.student_id, old.student_id);
  v_school_id := coalesce(new.school_id, old.school_id);

  if tg_op in ('INSERT', 'UPDATE') then
    select coalesce(r.monthly_fare, 0)
    into v_new_fare
    from public.transport_vehicles v
    left join public.transport_routes r on r.id = v.route_id
    where v.id = new.vehicle_id;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    select coalesce(r.monthly_fare, 0)
    into v_old_fare
    from public.transport_vehicles v
    left join public.transport_routes r on r.id = v.route_id
    where v.id = old.vehicle_id;
  end if;

  if to_regclass('public.student_fee_accounts') is null then
    return coalesce(new, old);
  end if;

  update public.student_fee_accounts
  set
    total_payable = greatest(0, total_payable - v_old_fare + v_new_fare),
    transport_recurring_fee = v_new_fare,
    updated_at = now()
  where school_id = v_school_id
    and student_id = v_student_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists student_transport_fee_sync on public.student_transport_assignments;
create trigger student_transport_fee_sync
after insert or update or delete on public.student_transport_assignments
for each row execute function public.sync_transport_fee();

create or replace function public.assign_student_transport(
  p_school_id uuid,
  p_student_id uuid,
  p_vehicle_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_current_count integer;
begin
  if not app.has_school_role(p_school_id, array['administrator','principal','student_staff']::public.app_role[]) then
    raise exception 'Not authorized to manage transport assignments.';
  end if;

  select seat_capacity
  into v_capacity
  from public.transport_vehicles
  where id = p_vehicle_id
    and school_id = p_school_id
    and status = 'active';

  if v_capacity is null then
    raise exception 'Vehicle is not available.';
  end if;

  select count(*)
  into v_current_count
  from public.student_transport_assignments
  where school_id = p_school_id
    and vehicle_id = p_vehicle_id
    and student_id <> p_student_id;

  if v_current_count >= v_capacity then
    raise exception 'Vehicle is at maximum passenger capacity.';
  end if;

  insert into public.student_transport_assignments (school_id, student_id, vehicle_id, assigned_by)
  values (p_school_id, p_student_id, p_vehicle_id, p_actor_id)
  on conflict (school_id, student_id) do update set
    vehicle_id = excluded.vehicle_id,
    assigned_by = excluded.assigned_by,
    assigned_at = now();
end;
$$;

create or replace view public.transport_vehicle_dashboard
with (security_invoker = true)
as
select
  v.id,
  v.school_id,
  v.plate_number,
  v.seat_capacity,
  v.status,
  v.driver_id,
  d.full_name as driver_name,
  d.phone as driver_phone,
  v.route_id,
  r.name as route_name,
  r.start_point,
  r.end_point,
  r.monthly_fare,
  count(sta.id)::int as passenger_count
from public.transport_vehicles v
left join public.transport_drivers d on d.id = v.driver_id
left join public.transport_routes r on r.id = v.route_id
left join public.student_transport_assignments sta on sta.vehicle_id = v.id and sta.school_id = v.school_id
group by v.id, v.school_id, v.plate_number, v.seat_capacity, v.status, v.driver_id, d.full_name, d.phone, v.route_id, r.name, r.start_point, r.end_point, r.monthly_fare;

create or replace view public.payroll_unpaid_leave_flags
with (security_invoker = true)
as
select
  sl.school_id,
  sl.user_id,
  p.full_name,
  sl.start_date,
  sl.end_date,
  (sl.end_date - sl.start_date + 1)::int as leave_days,
  sl.reason,
  sl.principal_remarks
from public.staff_leaves sl
join public.profiles p on p.id = sl.user_id
where sl.status = 'approved'
  and sl.is_paid_leave = false;

alter table public.staff_leaves enable row level security;
alter table public.transport_routes enable row level security;
alter table public.transport_drivers enable row level security;
alter table public.transport_vehicles enable row level security;
alter table public.student_transport_assignments enable row level security;

drop policy if exists staff_leaves_select on public.staff_leaves;
create policy staff_leaves_select on public.staff_leaves for select using (
  user_id = auth.uid()
  or app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop policy if exists staff_leaves_insert_self on public.staff_leaves;
create policy staff_leaves_insert_self on public.staff_leaves for insert with check (
  user_id = auth.uid()
  and app.can_access_school(school_id)
);

drop policy if exists staff_leaves_review on public.staff_leaves;
create policy staff_leaves_review on public.staff_leaves for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);

drop policy if exists transport_routes_select on public.transport_routes;
create policy transport_routes_select on public.transport_routes for select using (app.can_access_school(school_id));
drop policy if exists transport_routes_manage on public.transport_routes;
create policy transport_routes_manage on public.transport_routes for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists transport_drivers_select on public.transport_drivers;
create policy transport_drivers_select on public.transport_drivers for select using (app.can_access_school(school_id));
drop policy if exists transport_drivers_manage on public.transport_drivers;
create policy transport_drivers_manage on public.transport_drivers for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists transport_vehicles_select on public.transport_vehicles;
create policy transport_vehicles_select on public.transport_vehicles for select using (app.can_access_school(school_id));
drop policy if exists transport_vehicles_manage on public.transport_vehicles;
create policy transport_vehicles_manage on public.transport_vehicles for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists student_transport_select on public.student_transport_assignments;
create policy student_transport_select on public.student_transport_assignments for select using (app.can_access_school(school_id));
drop policy if exists student_transport_manage on public.student_transport_assignments;
create policy student_transport_manage on public.student_transport_assignments for all using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff on public.students
  for insert with check (app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[]));

drop policy if exists students_update_staff on public.students;
create policy students_update_staff on public.students
  for update using (app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[]))
  with check (app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[]));

drop policy if exists exams_insert_principal_special on public.exams;
create policy exams_insert_principal_special on public.exams for insert with check (
  is_special = true
  and created_by = auth.uid()
  and app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.school_id = exams.school_id
      and ta.class_id = exams.class_id
      and ta.subject_id = exams.subject_id
      and ta.teacher_id = exams.assigned_teacher_id
  )
);

drop policy if exists exams_update_teacher on public.exams;
create policy exams_update_teacher on public.exams for update using (
  app.can_teacher_edit_exam(school_id, id)
) with check (
  (created_by = auth.uid() or assigned_teacher_id = auth.uid())
  and app.is_teacher_assigned_to_subject(school_id, class_id, subject_id)
  and status in ('draft', 'rejected', 'submitted', 'approved')
);

drop policy if exists marks_insert_teacher on public.marks;
create policy marks_insert_teacher on public.marks for insert with check (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
);

drop policy if exists marks_update_teacher on public.marks;
create policy marks_update_teacher on public.marks for update using (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
) with check (
  teacher_id = auth.uid()
  and app.can_teacher_edit_exam(school_id, exam_id)
  and status in ('draft', 'rejected')
);

drop policy if exists result_approvals_insert_teacher on public.result_approvals;
create policy result_approvals_insert_teacher on public.result_approvals for insert with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and e.school_id = result_approvals.school_id
      and (e.created_by = auth.uid() or e.assigned_teacher_id = auth.uid())
      and app.is_teacher_assigned_to_subject(e.school_id, e.class_id, e.subject_id)
  )
);

do $$
begin
  if to_regclass('public.fee_structures') is not null then
    execute 'drop policy if exists fee_structures_all on public.fee_structures';
    execute 'create policy fee_structures_all on public.fee_structures for all using (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    ) with check (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    )';
  end if;

  if to_regclass('public.student_fee_accounts') is not null then
    execute 'drop policy if exists student_fee_accounts_all on public.student_fee_accounts';
    execute 'create policy student_fee_accounts_all on public.student_fee_accounts for all using (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    ) with check (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    )';
  end if;

  if to_regclass('public.fee_payments') is not null then
    execute 'drop policy if exists fee_payments_insert on public.fee_payments';
    execute 'create policy fee_payments_insert on public.fee_payments for insert with check (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    )';

    execute 'drop policy if exists fee_payments_update on public.fee_payments';
    execute 'create policy fee_payments_update on public.fee_payments for update using (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    ) with check (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    )';
  end if;

  if to_regclass('public.finance_audit_logs') is not null then
    execute 'drop policy if exists finance_audit_logs_select on public.finance_audit_logs';
    execute 'create policy finance_audit_logs_select on public.finance_audit_logs for select using (
      app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier''])
    )';
  end if;

  if to_regclass('public.teacher_employment_details') is not null then
    execute 'drop policy if exists teacher_employment_all_admin on public.teacher_employment_details';
    execute 'create policy teacher_employment_all_admin on public.teacher_employment_details
      for all using (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))
      with check (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))';
  end if;

  if to_regclass('public.salary_history') is not null then
    execute 'drop policy if exists salary_history_all_admin on public.salary_history';
    execute 'create policy salary_history_all_admin on public.salary_history
      for all using (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))
      with check (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))';
  end if;

  if to_regclass('public.salary_adjustments') is not null then
    execute 'drop policy if exists salary_adjustments_all_admin on public.salary_adjustments';
    execute 'create policy salary_adjustments_all_admin on public.salary_adjustments
      for all using (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))
      with check (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))';
  end if;

  if to_regclass('public.payroll') is not null then
    execute 'drop policy if exists payroll_all_admin on public.payroll';
    execute 'create policy payroll_all_admin on public.payroll
      for all using (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))
      with check (app.has_school_role_key(school_id, array[''administrator'',''principal'',''cashier'']))';
  end if;
end $$;

grant all on public.staff_leaves to authenticated, service_role;
grant all on public.transport_routes to authenticated, service_role;
grant all on public.transport_drivers to authenticated, service_role;
grant all on public.transport_vehicles to authenticated, service_role;
grant all on public.student_transport_assignments to authenticated, service_role;
grant execute on function public.assign_student_transport(uuid, uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.initialize_school_permissions(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_permission text;
  v_default_permissions jsonb := '{
    "administrator": ["dashboard:view","students:view","students:create","students:update","students:archive","attendance:view","staff:view","staff:manage","academics:view","academics:manage","results:view","results:generate","reports:view","activity:view","settings:manage","users:manage","approvals:view","approvals:review","teachers:manage","classes:manage","finance:view","finance:manage","payroll:view","payroll:manage","leave:view","leave:manage","transport:view","transport:manage","special-exams:manage","announcements:view","announcements:manage"],
    "principal": ["dashboard:view","students:view","students:create","students:update","students:archive","attendance:view","staff:view","academics:view","marks:approve","results:view","results:generate","reports:view","activity:view","approvals:view","approvals:review","teachers:manage","classes:manage","finance:view","finance:manage","payroll:view","payroll:manage","leave:view","leave:manage","transport:view","transport:manage","special-exams:manage","announcements:view","announcements:manage"],
    "teacher": ["dashboard:view","students:view","attendance:view","attendance:submit","academics:view","marks:manage","results:view","leave:view","payroll:view","announcements:view"],
    "student_staff": ["dashboard:view","students:view","students:create","students:update","students:archive","attendance:view","results:view","results:generate","reports:view","approvals:view","transport:view","transport:manage","finance:view","announcements:view"],
    "cashier": ["dashboard:view","students:view","finance:view","finance:manage","payroll:view","payroll:manage","announcements:view"],
    "staff": ["dashboard:view","leave:view","announcements:view"],
    "head_teacher": ["dashboard:view","students:view","attendance:view","attendance:submit","academics:view","marks:manage","results:view","leave:view","payroll:view","announcements:view"]
  }'::jsonb;
begin
  for v_role in select jsonb_object_keys(v_default_permissions)
  loop
    for v_permission in select jsonb_array_elements_text(v_default_permissions -> v_role)
    loop
      insert into public.role_permissions (school_id, role_key, permission, granted)
      values (p_school_id, v_role, v_permission, true)
      on conflict (school_id, role_key, permission) do update set granted = true;
    end loop;
  end loop;
end;
$$;

select public.initialize_school_permissions(id) from public.schools;
