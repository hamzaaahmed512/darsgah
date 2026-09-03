alter table public.attendance_sessions
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references public.profiles(id) on delete set null,
  add column if not exists teacher_reopen_used_at timestamptz;

create or replace function public.reopen_attendance_session(
  p_school_id uuid,
  p_class_id uuid,
  p_attendance_date date
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_session public.attendance_sessions;
  v_is_principal boolean;
  v_is_head_teacher boolean;
  v_counts_as_teacher_reopen boolean := false;
begin
  select * into v_session
  from public.attendance_sessions
  where school_id = p_school_id
    and class_id = p_class_id
    and attendance_date = p_attendance_date
  for update;

  if not found then
    raise exception 'Attendance submission not found.';
  end if;

  select app.has_school_role(p_school_id, array['principal']::public.app_role[])
    into v_is_principal;
  select app.is_head_teacher_for_class(p_school_id, p_class_id)
    into v_is_head_teacher;

  if v_is_principal then
    if v_session.reopened_at > now() - interval '24 hours' then
      raise exception 'Attendance is already open for editing.';
    end if;
    if v_session.status = 'submitted'
      and v_session.submitted_by = auth.uid()
      and v_is_head_teacher
      and v_session.teacher_reopen_used_at is null
      and v_session.submitted_at >= now() - interval '24 hours' then
      v_counts_as_teacher_reopen := true;
    elsif v_session.teacher_reopen_used_at is null
      and v_session.submitted_at >= now() - interval '24 hours' then
      raise exception 'The teacher still has an active undo window.';
    end if;
  elsif v_is_head_teacher and v_session.submitted_by = auth.uid() then
    if v_session.teacher_reopen_used_at is not null then
      raise exception 'The teacher undo option has already been used. Ask the principal to reopen attendance.';
    end if;
    if v_session.submitted_at is null or v_session.submitted_at < now() - interval '24 hours' then
      raise exception 'The teacher undo window has expired. Ask the principal to reopen attendance.';
    end if;
    if v_session.reopened_at > now() - interval '24 hours' then
      raise exception 'Attendance is already open for editing.';
    end if;
  else
    raise exception 'You are not allowed to reopen this attendance.';
  end if;

  update public.attendance_sessions
  set reopened_at = now(),
      reopened_by = auth.uid(),
      teacher_reopen_used_at = case when not v_is_principal or v_counts_as_teacher_reopen then now() else teacher_reopen_used_at end
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.reopen_attendance_session(uuid, uuid, date) from public;
grant execute on function public.reopen_attendance_session(uuid, uuid, date) to authenticated, service_role;

drop policy if exists attendance_sessions_resubmit on public.attendance_sessions;
create policy attendance_sessions_resubmit on public.attendance_sessions
for update using (
  reopened_by = auth.uid()
  and reopened_at >= now() - interval '24 hours'
  and (
    app.has_school_role(school_id, array['principal']::public.app_role[])
    or app.is_head_teacher_for_class(school_id, class_id)
  )
) with check (
  status = 'submitted'
  and reopened_at is null
  and reopened_by is null
  and (
    app.has_school_role(school_id, array['principal']::public.app_role[])
    or app.is_head_teacher_for_class(school_id, class_id)
  )
);

drop policy if exists attendance_records_resubmit on public.attendance_records;
create policy attendance_records_resubmit on public.attendance_records
for update using (
  exists (
    select 1 from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.reopened_by = auth.uid()
      and s.reopened_at >= now() - interval '24 hours'
  )
) with check (
  exists (
    select 1 from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.reopened_by = auth.uid()
      and s.reopened_at >= now() - interval '24 hours'
  )
);

drop policy if exists attendance_records_reopen_insert on public.attendance_records;
create policy attendance_records_reopen_insert on public.attendance_records
for insert with check (
  exists (
    select 1 from public.attendance_sessions s
    where s.id = attendance_records.session_id
      and s.reopened_by = auth.uid()
      and s.reopened_at >= now() - interval '24 hours'
  )
);
