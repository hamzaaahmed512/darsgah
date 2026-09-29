-- SECURITY INVOKER keeps finance_transactions RLS in force. The school predicate
-- also prevents a caller with broad visibility from mixing tenants.
create or replace function public.finance_ledger_totals(
  p_school_id uuid, p_from date default null, p_to date default null,
  p_direction text default null, p_query text default null
)
returns table(direction text, amount numeric)
language sql stable security invoker set search_path = public
as $$
  select t.direction::text, coalesce(sum(t.amount), 0)::numeric
  from public.finance_transactions t
  where t.school_id = p_school_id and not t.is_voided
    and (p_from is null or t.transaction_date >= p_from)
    and (p_to is null or t.transaction_date <= p_to)
    and (p_direction is null or t.direction::text = p_direction)
    and (p_query is null or t.receipt_number ilike '%' || p_query || '%'
      or t.party_name ilike '%' || p_query || '%'
      or t.reference_number ilike '%' || p_query || '%'
      or t.description ilike '%' || p_query || '%')
  group by t.direction;
$$;

create or replace function public.finance_dashboard_buckets(p_school_id uuid)
returns table(direction text, amount numeric, transaction_date date,
  category text, payment_method text, source text)
language sql stable security invoker set search_path = public
as $$
  select t.direction::text, sum(t.amount)::numeric, t.transaction_date,
    t.category::text, t.payment_method::text, t.source::text
  from public.finance_transactions t
  where t.school_id = p_school_id and not t.is_voided
    and t.transaction_date is not null
  group by t.direction, t.transaction_date, t.category, t.payment_method, t.source;
$$;

revoke all on function public.finance_ledger_totals(uuid,date,date,text,text) from public, anon;
revoke all on function public.finance_dashboard_buckets(uuid) from public, anon;
grant execute on function public.finance_ledger_totals(uuid,date,date,text,text) to authenticated;
grant execute on function public.finance_dashboard_buckets(uuid) to authenticated;
