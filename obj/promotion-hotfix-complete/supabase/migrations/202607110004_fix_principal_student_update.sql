-- Allow Principals to update students so they can change statuses during the approval workflow
drop policy if exists students_update_staff on public.students;

create policy students_update_staff on public.students 
  for update using (
    app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  ) with check (
    app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[])
  );
