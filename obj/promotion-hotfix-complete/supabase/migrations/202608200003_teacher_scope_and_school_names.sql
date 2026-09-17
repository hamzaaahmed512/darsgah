-- Limit teacher access to their head class and expose compact school branding
-- through the existing one-request session bootstrap.

drop policy if exists students_select_by_role on public.students;
create policy students_select_by_role on public.students for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or (
    status = 'active'
    and exists (
      select 1
      from public.enrollments e
      where e.student_id = students.id
        and e.school_id = students.school_id
        and e.status = 'active'
        and app.is_head_teacher_for_class(students.school_id, e.class_id)
    )
  )
);

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_head_teacher_for_class(school_id, class_id)
);

drop policy if exists attendance_sessions_select on public.attendance_sessions;
create policy attendance_sessions_select on public.attendance_sessions for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_head_teacher_for_class(school_id, class_id)
);

drop policy if exists attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  or app.is_head_teacher_for_class(school_id, class_id)
);

drop policy if exists guardians_select on public.guardians;
create policy guardians_select on public.guardians for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop policy if exists student_guardians_select on public.student_guardians;
create policy student_guardians_select on public.student_guardians for select using (
  app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
);

drop function if exists public.get_current_app_user();
create function public.get_current_app_user()
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  must_change_password boolean,
  school_id uuid,
  school_name text,
  role public.app_role,
  department text,
  job_title text,
  custom_role_id uuid,
  permissions text[],
  school_logo_url text,
  school_favicon_url text,
  school_short_name text,
  school_full_name text
)
language sql
stable
security definer
set search_path = public, app
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.must_change_password,
    sm.school_id,
    s.name,
    sm.role,
    sm.department,
    sm.job_title,
    sm.custom_role_id,
    app.get_resolved_permissions(p.id, sm.school_id),
    case when jsonb_typeof(ss.settings -> 'schoolLogoUrl') = 'string'
      then ss.settings ->> 'schoolLogoUrl' end,
    case when jsonb_typeof(ss.settings -> 'schoolFaviconUrl') = 'string'
      then ss.settings ->> 'schoolFaviconUrl' end,
    case when jsonb_typeof(ss.settings -> 'schoolShortName') = 'string'
      then nullif(ss.settings ->> 'schoolShortName', '') end,
    s.name
  from public.profiles p
  join public.school_members sm
    on sm.user_id = p.id and sm.status = 'active'
  join public.schools s on s.id = sm.school_id
  left join public.school_settings ss on ss.school_id = sm.school_id
  where p.id = (select auth.uid())
  order by sm.created_at
  limit 1;
$$;

revoke all on function public.get_current_app_user() from public, anon;
grant execute on function public.get_current_app_user() to authenticated;
