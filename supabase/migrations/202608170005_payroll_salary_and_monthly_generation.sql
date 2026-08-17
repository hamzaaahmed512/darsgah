-- Salary activation and payroll generator correction.
-- monthly_salary already exists on teacher_employment_details; zero was its
-- historical default, which made "salary not set" indistinguishable from zero.

alter table public.teacher_employment_details alter column monthly_salary drop default;
alter table public.teacher_employment_details alter column monthly_salary drop not null;
update public.teacher_employment_details set monthly_salary = null where monthly_salary = 0;
alter table public.teacher_employment_details drop constraint if exists teacher_employment_details_monthly_salary_check;
alter table public.teacher_employment_details add constraint teacher_employment_details_monthly_salary_check check (monthly_salary is null or monthly_salary > 0);

-- The original policies already restrict this table to its owner or school
-- administrators/principals. Payroll generation may therefore only snapshot a
-- positive salary; missing values are deliberately reported to the caller.
drop function if exists public.generate_monthly_payroll(uuid, text, uuid, uuid);
create function public.generate_monthly_payroll(
  p_school_id uuid, p_month text, p_actor_id uuid, p_teacher_id uuid default null
) returns table(created_count integer, skipped_count integer, skipped_no_salary_count integer)
language plpgsql security definer set search_path = public as $$
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then raise exception 'Unauthorized to generate payroll'; end if;
  return query with all_staff as (
    select sm.user_id, ted.monthly_salary
    from public.school_members sm left join public.teacher_employment_details ted on ted.teacher_id=sm.user_id and ted.school_id=sm.school_id and ted.employment_status='active'
    where sm.school_id=p_school_id and sm.status='active' and (p_teacher_id is null or sm.user_id=p_teacher_id)
  ), candidates as (
    select user_id as teacher_id, monthly_salary,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id and sa.teacher_id=all_staff.user_id and sa.type='bonus' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as bonus,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id and sa.teacher_id=all_staff.user_id and sa.type='deduction' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as deduction
    from all_staff where monthly_salary > 0
  ), inserted as (
    insert into public.payroll (school_id,teacher_id,month,base_salary,total_bonus,total_deductions,net_salary,status,approved_by)
    select p_school_id,teacher_id,p_month,monthly_salary,bonus,deduction,greatest(0,monthly_salary+bonus-deduction),'generated',p_actor_id from candidates
    on conflict (school_id,teacher_id,month) do nothing returning id
  ) select (select count(*)::integer from inserted), ((select count(*) from candidates)-(select count(*) from inserted))::integer,
    (select count(*)::integer from all_staff where monthly_salary is null or monthly_salary <= 0);
end; $$;

grant execute on function public.generate_monthly_payroll(uuid, text, uuid, uuid) to authenticated;
