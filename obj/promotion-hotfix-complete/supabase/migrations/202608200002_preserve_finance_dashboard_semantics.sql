-- Preserve the existing dashboard's payment-status semantics in the aggregate RPC.
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

  with account_totals as (
    select
      coalesce(sum(total_payable), 0) as expected,
      coalesce(sum(amount_paid), 0) as collected,
      coalesce(sum(total_payable - amount_paid), 0) as outstanding,
      count(*) filter (
        where amount_paid < total_payable
          and (amount_paid > 0 or not (total_payable > 0 and current_date > due_date))
      ) as pending_count,
      count(*) filter (
        where amount_paid <= 0 and total_payable > 0 and current_date > due_date
      ) as overdue_count,
      coalesce(sum(case
        when discount_type = 'fixed' then discount_value
        when discount_type = 'percentage' and discount_value > 0 and discount_value < 100
          then (total_payable / (1 - discount_value / 100)) * (discount_value / 100)
        else 0 end), 0) as discounts
    from public.student_fee_accounts
    where school_id = p_school_id
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
      select jsonb_agg(jsonb_build_object('className', class_name, 'amount', amount) order by amount desc)
      from (
        select c.name as class_name, sum(sfa.total_payable - sfa.amount_paid) as amount
        from public.student_fee_accounts sfa
        join public.classes c on c.id = sfa.class_id
        where sfa.school_id = p_school_id
        group by c.id, c.name
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
