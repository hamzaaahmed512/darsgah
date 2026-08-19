-- Allow principals to manage academic years, grades, and sections
drop policy if exists academic_manage on public.academic_years;
create policy academic_manage on public.academic_years for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);

drop policy if exists grades_manage on public.grades;
create policy grades_manage on public.grades for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);

drop policy if exists sections_manage on public.sections;
create policy sections_manage on public.sections for all using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);
