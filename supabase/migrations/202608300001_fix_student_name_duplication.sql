-- Fix: Student name duplication in finance views
-- The original views used (first_name || ' ' || last_name) which produces "ALI ALI"
-- when last_name is NULL or identical to first_name (e.g. for single-name students).
--
-- The corrected expression mirrors the TypeScript formatFullName() utility in
-- src/lib/student-name.ts:
--   • If last_name is NULL, empty, or case-insensitively equal to first_name → return first_name only
--   • Otherwise → return "first_name last_name"

-- Helper SQL expression (inlined in both views):
--   trim(
--     s.first_name
--     || case
--          when nullif(trim(coalesce(s.last_name, '')), '') is null
--            or lower(trim(s.first_name)) = lower(trim(coalesce(s.last_name, '')))
--          then ''
--          else ' ' || trim(s.last_name)
--        end
--   )

-- ─── 1. student_fee_directory ────────────────────────────────────────────────

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
    when sfa.amount_paid >= sfa.total_payable then 'paid'
    when sfa.amount_paid > 0 and sfa.amount_paid < sfa.total_payable then 'partially_paid'
    when sfa.total_payable > 0 and current_date > sfa.due_date then 'overdue'
    else 'unpaid'
  end as payment_status,
  sfa.created_at,
  sfa.updated_at
from public.student_fee_accounts sfa
join public.students s on s.id = sfa.student_id
join public.academic_years ay on ay.id = sfa.academic_year_id
join public.classes c on c.id = sfa.class_id
join public.grades g on g.id = c.grade_id
left join public.sections sec on sec.id = c.section_id;

-- ─── 2. payment_history_view ─────────────────────────────────────────────────

create or replace view public.payment_history_view
with (security_invoker = true)
as
select
  fp.id,
  fp.school_id,
  fp.student_fee_account_id,
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
  c.name as class_name,
  g.name as grade_name,
  sec.name as section_name,
  ay.name as academic_year_name,
  fp.receipt_number,
  fp.amount,
  fp.payment_method,
  fp.transaction_number,
  fp.reference_number,
  fp.remarks,
  fp.received_by as received_by_id,
  p_rec.full_name as received_by_name,
  fp.payment_date,
  fp.is_voided,
  fp.voided_by as voided_by_id,
  p_void.full_name as voided_by_name,
  fp.voided_at,
  fp.void_reason,
  fp.created_at
from public.fee_payments fp
join public.student_fee_accounts sfa on sfa.id = fp.student_fee_account_id
join public.students s on s.id = sfa.student_id
join public.classes c on c.id = sfa.class_id
join public.grades g on g.id = c.grade_id
left join public.sections sec on sec.id = c.section_id
join public.academic_years ay on ay.id = sfa.academic_year_id
left join public.profiles p_rec on p_rec.id = fp.received_by
left join public.profiles p_void on p_void.id = fp.voided_by;
