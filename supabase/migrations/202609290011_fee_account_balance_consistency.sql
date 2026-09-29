-- Keep every fee calculation on one account-scoped, cumulative basis.
-- A student's historical academic-year accounts must never share challans.

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
  greatest(greatest(sfa.total_payable, charges.generated_amount) - sfa.amount_paid, 0) as remaining_balance,
  sfa.due_date,
  case
    when greatest(sfa.total_payable, charges.generated_amount) <= sfa.amount_paid then 'paid'
    when current_date > sfa.due_date then 'overdue'
    when sfa.amount_paid > 0 then 'partially_paid'
    else 'pending'
  end as payment_status,
  sfa.created_at,
  sfa.updated_at,
  -- New columns are appended so CREATE OR REPLACE remains compatible with
  -- the existing view's column order.
  greatest(sfa.total_payable, charges.generated_amount) as billed_amount,
  greatest(sfa.amount_paid - greatest(sfa.total_payable, charges.generated_amount), 0) as credit_balance
from public.student_fee_accounts sfa
join public.students s on s.id = sfa.student_id
join public.academic_years ay on ay.id = sfa.academic_year_id
join public.classes c on c.id = sfa.class_id
join public.grades g on g.id = c.grade_id
left join public.sections sec on sec.id = c.section_id
left join lateral (
  select coalesce(sum(fc.amount), 0) as generated_amount
  from public.fee_challans fc
  where fc.school_id = sfa.school_id
    and fc.student_fee_account_id = sfa.id
) charges on true;

create or replace function public.guard_fee_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_total numeric;
  v_generated numeric;
  v_paid numeric;
begin
  select school_id, total_payable into v_school_id, v_total
  from public.student_fee_accounts where id = new.student_fee_account_id for update;
  if v_school_id is null or v_school_id <> new.school_id then
    raise exception 'Invalid fee account';
  end if;
  if new.payment_method = 'online_payment' and not new.is_voided then
    raise exception 'Online payments require provider verification';
  end if;
  if not new.is_voided then
    select coalesce(sum(amount), 0) into v_generated
    from public.fee_challans
    where school_id = v_school_id
      and student_fee_account_id = new.student_fee_account_id;
    select coalesce(sum(amount), 0) into v_paid
    from public.fee_payments
    where student_fee_account_id = new.student_fee_account_id
      and not is_voided
      and (tg_op = 'INSERT' or id <> new.id);
    if new.amount <= 0 or new.amount > greatest(v_total, v_generated) - v_paid then
      raise exception 'Payment exceeds outstanding balance';
    end if;
  end if;
  return new;
end; $$;

create or replace function public.get_finance_dashboard(p_school_id uuid, p_month_start date, p_today date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app
as $$
declare
  result jsonb;
begin
  if not app.can_access_school(p_school_id) then
    raise exception 'Not authorized to access this school.';
  end if;

  with account_balances as (
    select
      sfa.*,
      c.name as class_name,
      g.name as grade_name,
      sec.name as section_name,
      greatest(sfa.total_payable, coalesce(charges.generated_amount, 0)) as billed_amount,
      greatest(greatest(sfa.total_payable, coalesce(charges.generated_amount, 0)) - sfa.amount_paid, 0) as outstanding,
      greatest(coalesce(charges.challan_count, 0), 1) as billing_periods,
      case when fs.id is null then null else
        fs.tuition_fee + fs.admission_fee + fs.examination_fee + fs.library_fee
        + fs.laboratory_fee + fs.transport_fee + fs.miscellaneous_charges
      end as base_period_fee
    from public.student_fee_accounts sfa
    join public.classes c on c.id = sfa.class_id
    join public.grades g on g.id = c.grade_id
    left join public.sections sec on sec.id = c.section_id
    left join public.fee_structures fs on fs.id = sfa.fee_structure_id
    left join lateral (
      select coalesce(sum(fc.amount), 0) as generated_amount, count(*) as challan_count
      from public.fee_challans fc
      where fc.school_id = sfa.school_id
        and fc.student_fee_account_id = sfa.id
    ) charges on true
    where sfa.school_id = p_school_id
  ), account_totals as (
    select
      coalesce(sum(billed_amount), 0) as expected,
      coalesce(sum(amount_paid), 0) as collected,
      coalesce(sum(outstanding), 0) as outstanding,
      count(*) filter (where outstanding > 0 and p_today <= due_date) as pending_count,
      count(*) filter (where outstanding > 0 and p_today > due_date) as overdue_count,
      coalesce(sum(
        case
          when base_period_fee is not null then greatest(base_period_fee - total_payable, 0) * billing_periods
          when discount_type = 'fixed' then discount_value * billing_periods
          when discount_type = 'percentage' and discount_value > 0 and discount_value < 100
            then ((total_payable / (1 - discount_value / 100)) - total_payable) * billing_periods
          else 0
        end
      ), 0) as discounts
    from account_balances
  ), payment_totals as (
    select
      coalesce(sum(amount) filter (where payment_date = p_today), 0) as today_collection,
      coalesce(sum(amount), 0) as monthly_collection
    from public.fee_payments
    where school_id = p_school_id and not is_voided and payment_date >= p_month_start
  )
  select jsonb_build_object(
    'totalExpected', a.expected,
    'totalCollected', a.collected,
    'totalOutstanding', a.outstanding,
    'todayCollection', p.today_collection,
    'monthlyCollection', p.monthly_collection,
    'totalDiscounts', a.discounts,
    'pendingPayments', a.pending_count,
    'overduePayments', a.overdue_count,
    'collectionMethodData', coalesce((
      select jsonb_agg(jsonb_build_object('name', replace(payment_method, '_', ' '), 'value', amount) order by amount desc)
      from (
        select payment_method, sum(amount) as amount
        from public.fee_payments
        where school_id = p_school_id and not is_voided and payment_date >= p_month_start
        group by payment_method
      ) methods
    ), '[]'::jsonb),
    'outstandingByClass', coalesce((
      select jsonb_agg(jsonb_build_object(
        'class_name', class_name, 'grade_name', grade_name,
        'section_name', section_name, 'amount', amount
      ) order by amount desc)
      from (
        select class_name, grade_name, section_name, sum(outstanding) as amount
        from account_balances
        group by class_id, class_name, grade_name, section_name
        having sum(outstanding) > 0
        order by amount desc
        limit 5
      ) classes
    ), '[]'::jsonb),
    'recentPayments', coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.created_at desc)
      from (
        select * from public.payment_history_view
        where school_id = p_school_id
        order by created_at desc
        limit 5
      ) recent
    ), '[]'::jsonb)
  ) into result
  from account_totals a cross join payment_totals p;

  return result;
end;
$$;
