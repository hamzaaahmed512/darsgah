-- Monthly challans represent each month's fee charge. They must not become
-- zero merely because an earlier month's account balance was paid.

update public.fee_challans fc
set amount = sfa.total_payable,
    updated_at = now()
from public.student_fee_accounts sfa
where sfa.id = fc.student_fee_account_id
  and fc.amount = 0
  and sfa.total_payable > 0;

create or replace function public.generate_fee_challans(
  p_school_id uuid, p_month text, p_actor_id uuid,
  p_student_id uuid default null, p_class_id uuid default null
) returns table(created_count integer, skipped_count integer)
language plpgsql security definer set search_path = public as $$
declare v_month date := to_date(p_month || '-01', 'YYYY-MM-DD');
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must use YYYY-MM'; end if;
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then
    raise exception 'Unauthorized to generate fee challans';
  end if;
  if p_student_id is not null and p_class_id is not null then raise exception 'Choose a student or a class, not both'; end if;

  return query
  with candidates as (
    select distinct e.student_id, e.class_id, sfa.id as account_id,
      coalesce(sfa.total_payable, 0) as amount,
      coalesce(sfa.due_date, (v_month + interval '30 days')::date) as due_date
    from public.enrollments e
    join public.academic_years ay on ay.id = e.academic_year_id and ay.is_active
    left join public.student_fee_accounts sfa on sfa.school_id = e.school_id
      and sfa.student_id = e.student_id and sfa.academic_year_id = e.academic_year_id
    where e.school_id = p_school_id and e.status = 'active'
      and (p_student_id is null or e.student_id = p_student_id)
      and (p_class_id is null or e.class_id = p_class_id)
  ), inserted as (
    insert into public.fee_challans (school_id, student_id, student_fee_account_id, class_id, fee_month, amount, due_date, created_by)
    select p_school_id, student_id, account_id, class_id, v_month, amount, due_date, p_actor_id
    from candidates
    on conflict (student_id, fee_month) do nothing
    returning id
  )
  select (select count(*)::integer from inserted),
         ((select count(*) from candidates) - (select count(*) from inserted))::integer;
end; $$;

create or replace view public.student_fee_directory
with (security_invoker = true)
as
select
  sfa.id,
  sfa.school_id,
  sfa.student_id,
  trim(
    s.first_name
    || case
         when nullif(trim(coalesce(s.last_name, '')), '') is null
           or lower(trim(s.first_name)) = lower(trim(coalesce(s.last_name, '')))
         then ''
         else ' ' || trim(s.last_name)
       end
  ) as student_name,
  s.admission_number,
  sfa.class_id,
  c.name as class_name,
  g.name as grade_name,
  sec.name as section_name,
  sfa.academic_year_id,
  ay.name as academic_year_name,
  sfa.fee_structure_id,
  sfa.discount_type,
  sfa.discount_value,
  sfa.discount_reason,
  sfa.discount_remarks,
  sfa.discount_approved_by,
  sfa.discount_applied_date,
  sfa.total_payable,
  sfa.amount_paid,
  greatest(
    coalesce((select sum(fc.amount)
      from public.fee_challans fc
      where fc.school_id = sfa.school_id
        and fc.student_id = sfa.student_id), 0) - sfa.amount_paid,
    sfa.total_payable - sfa.amount_paid,
    0
  ) as remaining_balance,
  sfa.due_date,
  case
    when coalesce((select sum(fc.amount)
      from public.fee_challans fc
      where fc.school_id = sfa.school_id
        and fc.student_id = sfa.student_id), 0) > sfa.amount_paid then 'pending'
    when sfa.total_payable <= 0 then 'paid'
    when sfa.amount_paid >= sfa.total_payable then 'paid'
    when sfa.amount_paid > 0 then 'partially_paid'
    when current_date > sfa.due_date then 'overdue'
    else 'pending'
  end as payment_status,
  sfa.created_at,
  sfa.updated_at
from public.student_fee_accounts sfa
join public.students s on s.id = sfa.student_id
join public.academic_years ay on ay.id = sfa.academic_year_id
join public.classes c on c.id = sfa.class_id
join public.grades g on g.id = c.grade_id
left join public.sections sec on sec.id = c.section_id;
