-- Correct the month validation in the preceding monthly-generation migration.
-- Apply this file when 202608170003 has already been run.

create or replace function public.generate_fee_challans(
  p_school_id uuid, p_month text, p_actor_id uuid, p_student_id uuid default null, p_class_id uuid default null
) returns table(created_count integer, skipped_count integer)
language plpgsql security definer set search_path = public as $$
declare v_month date := to_date(p_month || '-01', 'YYYY-MM-DD');
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then raise exception 'Unauthorized to generate fee challans'; end if;
  if p_student_id is not null and p_class_id is not null then raise exception 'Choose a student or a class, not both'; end if;
  return query with candidates as (
    select distinct e.student_id, e.class_id, sfa.id as account_id, coalesce(sfa.total_payable - sfa.amount_paid, 0) as amount, coalesce(sfa.due_date, (v_month + interval '30 days')::date) as due_date
    from public.enrollments e join public.academic_years ay on ay.id=e.academic_year_id and ay.is_active
    left join public.student_fee_accounts sfa on sfa.school_id=e.school_id and sfa.student_id=e.student_id and sfa.academic_year_id=e.academic_year_id
    where e.school_id=p_school_id and e.status='active' and (p_student_id is null or e.student_id=p_student_id) and (p_class_id is null or e.class_id=p_class_id)
  ), inserted as (
    insert into public.fee_challans (school_id,student_id,student_fee_account_id,class_id,fee_month,amount,due_date,created_by)
    select p_school_id,student_id,account_id,class_id,v_month,amount,due_date,p_actor_id from candidates on conflict (student_id,fee_month) do nothing returning id
  ) select (select count(*)::integer from inserted), ((select count(*) from candidates)-(select count(*) from inserted))::integer;
end; $$;

create or replace function public.generate_monthly_payroll(
  p_school_id uuid, p_month text, p_actor_id uuid, p_teacher_id uuid default null
) returns table(created_count integer, skipped_count integer)
language plpgsql security definer set search_path = public as $$
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then raise exception 'Unauthorized to generate payroll'; end if;
  return query with candidates as (
    select sm.user_id as teacher_id, ted.monthly_salary,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id and sa.teacher_id=sm.user_id and sa.type='bonus' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as bonus,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id and sa.teacher_id=sm.user_id and sa.type='deduction' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as deduction
    from public.school_members sm join public.teacher_employment_details ted on ted.teacher_id=sm.user_id and ted.school_id=sm.school_id
    where sm.school_id=p_school_id and sm.status='active' and ted.employment_status='active' and (p_teacher_id is null or sm.user_id=p_teacher_id)
  ), inserted as (
    insert into public.payroll (school_id,teacher_id,month,base_salary,total_bonus,total_deductions,net_salary,status,approved_by)
    select p_school_id,teacher_id,p_month,monthly_salary,bonus,deduction,greatest(0,monthly_salary+bonus-deduction),'generated',p_actor_id from candidates
    on conflict (school_id,teacher_id,month) do nothing returning id
  ) select (select count(*)::integer from inserted), ((select count(*) from candidates)-(select count(*) from inserted))::integer;
end; $$;
