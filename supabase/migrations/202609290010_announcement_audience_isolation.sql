-- Enforce announcement audience boundaries in Postgres as well as the app.
-- Leadership can review both channels; ordinary authenticated members can
-- select only announcements addressed to their role or user ID. Parent portal
-- reads continue through its validated service-side student session.
drop policy if exists announcements_select on public.announcements;

create policy announcements_select on public.announcements
for select using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
  or exists (
    select 1
    from public.school_members sm
    where sm.school_id = announcements.school_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
      and (
        announcements.audience_type = 'all'
        or (announcements.audience_type = 'teachers' and sm.role::text in ('teacher', 'head_teacher'))
        or (announcements.audience_type = 'registrar' and sm.role::text = 'student_staff')
        or (announcements.audience_type = 'admin' and sm.role::text = 'administrator')
        or (
          announcements.audience_type = 'roles'
          and announcements.audience_value = 'user:' || auth.uid()::text
        )
        or (
          announcements.audience_type = 'roles'
          and announcements.audience_value <> 'parents'
          and sm.role::text = any(string_to_array(replace(coalesce(announcements.audience_value, ''), ' ', ''), ','))
        )
      )
  )
);
