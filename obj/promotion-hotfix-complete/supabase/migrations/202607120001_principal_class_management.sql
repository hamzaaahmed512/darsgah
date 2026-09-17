-- Allow principals to manage (insert/update/delete) classes, same as administrators
drop policy if exists classes_manage on public.classes;
create policy classes_manage on public.classes for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);

-- Allow principals to manage teacher assignments too
drop policy if exists teacher_assignments_manage on public.teacher_assignments;
create policy teacher_assignments_manage on public.teacher_assignments for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);
