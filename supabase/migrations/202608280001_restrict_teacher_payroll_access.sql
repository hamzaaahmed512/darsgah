-- Teachers and head teachers should not see payroll in navigation or access
-- payroll-backed views/endpoints from the app.

delete from public.role_permissions
where role_key in ('teacher', 'head_teacher')
  and permission in ('payroll:view', 'payroll:manage');

delete from public.user_permission_overrides
where permission in ('payroll:view', 'payroll:manage')
  and exists (
    select 1
    from public.school_members sm
    where sm.school_id = user_permission_overrides.school_id
      and sm.user_id = user_permission_overrides.user_id
      and sm.role in ('teacher', 'head_teacher')
  );

drop policy if exists payroll_select_self on public.payroll;
drop policy if exists salary_adjustments_select_self on public.salary_adjustments;
drop policy if exists teacher_employment_select_self on public.teacher_employment_details;
