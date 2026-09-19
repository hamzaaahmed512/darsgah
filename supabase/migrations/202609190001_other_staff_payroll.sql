-- Keep account payroll identifiers intact while allowing record-only staff.
alter table public.payroll add column other_staff_id uuid references public.other_staff_records(id) on delete cascade;
alter table public.payroll alter column teacher_id drop not null;
alter table public.payroll add constraint payroll_staff_identity_check check ((teacher_id is not null) <> (other_staff_id is not null));
create unique index payroll_other_staff_month_key on public.payroll (school_id, other_staff_id, month) where other_staff_id is not null;

alter table public.salary_adjustments add column other_staff_id uuid references public.other_staff_records(id) on delete cascade;
alter table public.salary_adjustments alter column teacher_id drop not null;
alter table public.salary_adjustments add constraint salary_adjustments_staff_identity_check check ((teacher_id is not null) <> (other_staff_id is not null));

alter table public.salary_history add column other_staff_id uuid references public.other_staff_records(id) on delete cascade;
alter table public.salary_history alter column teacher_id drop not null;
alter table public.salary_history add constraint salary_history_staff_identity_check check ((teacher_id is not null) <> (other_staff_id is not null));

-- Cashiers already manage payroll; let them read record-only staff and update
-- their salaries through the existing payroll actions.
create policy other_staff_payroll_select on public.other_staff_records for select
using (app.has_school_role_key(school_id, array['cashier']));
create policy other_staff_payroll_update on public.other_staff_records for update
using (app.has_school_role_key(school_id, array['cashier']))
with check (app.has_school_role_key(school_id, array['cashier']));

-- Existing rows retain their teacher_id. Existing nullable salaries remain valid;
-- new record-only staff must have a positive amount.
create or replace function public.require_new_other_staff_salary() returns trigger
language plpgsql as $$
begin
  if new.monthly_salary is null or new.monthly_salary <= 0 then
    raise exception 'Monthly salary must be greater than zero';
  end if;
  return new;
end; $$;
create trigger other_staff_salary_on_create before insert on public.other_staff_records
for each row execute function public.require_new_other_staff_salary();

-- Include both account staff and record-only staff in bulk payroll generation.
create or replace function public.generate_monthly_payroll(
  p_school_id uuid, p_month text, p_actor_id uuid, p_teacher_id uuid default null
) returns table(created_count integer, skipped_count integer, skipped_no_salary_count integer)
language plpgsql security definer set search_path = public as $$
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then raise exception 'Unauthorized to generate payroll'; end if;
  return query with all_staff as (
    select sm.user_id as staff_id, null::uuid as record_id, ted.monthly_salary
    from public.school_members sm left join public.teacher_employment_details ted
      on ted.teacher_id=sm.user_id and ted.school_id=sm.school_id and ted.employment_status='active'
    where sm.school_id=p_school_id and sm.status='active' and (p_teacher_id is null or sm.user_id=p_teacher_id)
    union all
    select null::uuid, os.id, os.monthly_salary
    from public.other_staff_records os
    where os.school_id=p_school_id and os.status='active' and (p_teacher_id is null or os.id=p_teacher_id)
  ), candidates as (
    select staff_id, record_id, monthly_salary,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id
        and ((staff_id is not null and sa.teacher_id=staff_id) or (record_id is not null and sa.other_staff_id=record_id))
        and sa.type='bonus' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as bonus,
      coalesce((select sum(sa.amount) from public.salary_adjustments sa where sa.school_id=p_school_id
        and ((staff_id is not null and sa.teacher_id=staff_id) or (record_id is not null and sa.other_staff_id=record_id))
        and sa.type='deduction' and to_char(sa.effective_date,'YYYY-MM')=p_month),0) as deduction
    from all_staff where monthly_salary > 0
  ), inserted as (
    insert into public.payroll (school_id,teacher_id,other_staff_id,month,base_salary,total_bonus,total_deductions,net_salary,status,approved_by)
    select p_school_id,staff_id,record_id,p_month,monthly_salary,bonus,deduction,
      greatest(0,monthly_salary+bonus-deduction),'generated',p_actor_id
    from candidates c where not exists (
      select 1 from public.payroll p where p.school_id=p_school_id and p.month=p_month
        and ((c.staff_id is not null and p.teacher_id=c.staff_id) or (c.record_id is not null and p.other_staff_id=c.record_id))
    ) returning id
  ) select (select count(*)::integer from inserted),
    ((select count(*) from candidates)-(select count(*) from inserted))::integer,
    (select count(*)::integer from all_staff where monthly_salary is null or monthly_salary <= 0);
end; $$;
