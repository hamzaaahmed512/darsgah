-- Keep the student fee directory aligned with real challan-backed pending balances.
-- The previous view derived status only from total_payable and amount_paid, which
-- ignored the fact that a generated challan is still considered pending until it
-- is actually paid.

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
  (sfa.total_payable - sfa.amount_paid) as remaining_balance,
  sfa.due_date,
  case
    when sfa.total_payable <= 0 then 'paid'
    when sfa.amount_paid >= sfa.total_payable then 'paid'
    when sfa.amount_paid > 0 and sfa.amount_paid < sfa.total_payable then 'partially_paid'
    when sfa.total_payable > 0 and current_date > sfa.due_date then 'overdue'
    when exists (
      select 1
      from public.fee_challans fc
      where fc.school_id = sfa.school_id
        and fc.student_id = sfa.student_id
        and fc.amount > 0
    ) then 'pending'
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
