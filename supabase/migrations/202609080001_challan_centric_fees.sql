-- Preserve issued charges; legacy payments remain unassigned until reconciled.
alter table public.fee_challans
  add column issue_date date,
  add column academic_year_id uuid references public.academic_years(id),
  add column line_items jsonb,
  add column discount_amount numeric not null default 0 check (discount_amount >= 0),
  add column discount_reason text;
update public.fee_challans c set issue_date = c.created_at::date,
  line_items = jsonb_build_array(jsonb_build_object('description', 'Monthly fee', 'amount', c.amount)),
  academic_year_id = a.academic_year_id
from public.student_fee_accounts a where a.id = c.student_fee_account_id;
update public.fee_challans set issue_date = created_at::date,
  line_items = jsonb_build_array(jsonb_build_object('description', 'Issued fee', 'amount', amount))
where issue_date is null;
alter table public.fee_challans alter column issue_date set default current_date,
  alter column issue_date set not null, alter column line_items set not null;
alter table public.fee_payments add column challan_id uuid references public.fee_challans(id) on delete restrict;
create index fee_payments_challan_idx on public.fee_payments(challan_id);

create function public.validate_challan_record() returns trigger
language plpgsql set search_path = public as $$
declare v_total numeric; v_paid numeric; v_items jsonb;
begin
  if TG_OP = 'INSERT' then
    select academic_year_id into new.academic_year_id from student_fee_accounts
      where id = new.student_fee_account_id and school_id = new.school_id;
    if new.line_items is null then
      select jsonb_agg(jsonb_build_object('description', initcap(replace(i.key, '_', ' ')), 'amount', i.value::numeric)),
        sum(i.value::numeric) into v_items, v_total
      from student_fee_accounts a join fee_structures f on f.id = a.fee_structure_id
      cross join lateral jsonb_each_text(to_jsonb(f)) i
      where a.id = new.student_fee_account_id and a.school_id = new.school_id
        and i.key in ('tuition_fee','admission_fee','examination_fee','library_fee','laboratory_fee','transport_fee','miscellaneous_charges');
      if v_total >= new.amount and v_total > 0 then
        new.line_items := v_items;
        new.discount_amount := v_total - new.amount;
        if new.discount_amount > 0 then new.discount_reason := 'Discount at issuance'; end if;
      end if;
    end if;
    new.line_items := coalesce(new.line_items, jsonb_build_array(jsonb_build_object('description', 'Monthly fee', 'amount', new.amount)));
    new.due_date := greatest(new.issue_date, (new.fee_month + interval '1 month - 1 day')::date);
  else
    if (new.school_id, new.student_id, new.student_fee_account_id, new.academic_year_id, new.class_id, new.issue_date, new.fee_month)
      is distinct from (old.school_id, old.student_id, old.student_fee_account_id, old.academic_year_id, old.class_id, old.issue_date, old.fee_month) then
      raise exception 'Issued challan identity cannot be changed';
    end if;
  end if;
  if jsonb_typeof(new.line_items) <> 'array' or jsonb_array_length(new.line_items) = 0 then raise exception 'Line items required'; end if;
  if exists(select 1 from jsonb_array_elements(new.line_items) i where
    nullif(trim(i->>'description'), '') is null or i->>'amount' is null or (i->>'amount')::numeric < 0
    or (i->>'amount')::numeric::text in ('NaN', 'Infinity', '-Infinity')) then raise exception 'Invalid line item'; end if;
  select sum(round((i->>'amount')::numeric, 2)) into v_total from jsonb_array_elements(new.line_items) i;
  if new.discount_amount > v_total or new.discount_amount::text in ('NaN', 'Infinity', '-Infinity') then raise exception 'Discount exceeds charges'; end if;
  new.amount := v_total - new.discount_amount;
  select coalesce(sum(amount),0) into v_paid from fee_payments where challan_id = new.id and not is_voided;
  if new.amount < v_paid then raise exception 'Challan total cannot be less than payments received'; end if;
  if (TG_OP = 'INSERT' or new.due_date is distinct from old.due_date) and new.due_date < new.issue_date then
    raise exception 'Due date precedes issue date';
  end if;
  return new;
end; $$;
create trigger validate_challan_record before insert or update on public.fee_challans
for each row execute function public.validate_challan_record();

create function public.validate_challan_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.fee_challans; v_paid numeric;
begin
  if new.amount::text in ('NaN', 'Infinity', '-Infinity') or new.amount <> round(new.amount, 2) then
    raise exception 'Invalid payment amount';
  end if;
  if TG_OP = 'UPDATE' and ((old.challan_id is not null and new.challan_id is distinct from old.challan_id)
    or (new.student_fee_account_id, new.school_id, new.amount)
    is distinct from (old.student_fee_account_id, old.school_id, old.amount)) then
    raise exception 'Payment identity and amount are immutable';
  end if;
  if new.challan_id is null then
    if TG_OP = 'INSERT' then raise exception 'Select a challan for this payment'; end if;
    return new;
  end if;
  select * into c from fee_challans where id = new.challan_id for update;
  if not found or c.school_id <> new.school_id or c.student_fee_account_id is distinct from new.student_fee_account_id then
    raise exception 'Payment does not belong to this challan';
  end if;
  select coalesce(sum(amount),0) into v_paid from fee_payments where challan_id = c.id and not is_voided and id <> new.id;
  if not new.is_voided and v_paid + new.amount > c.amount then raise exception 'Payment exceeds challan balance'; end if;
  return new;
end; $$;
create trigger validate_challan_payment before insert or update on public.fee_payments
for each row execute function public.validate_challan_payment();

-- Lock before reading payments; serialize adjustments with collections and voids.
create function public.adjust_fee_challan(
  p_challan_id uuid, p_school_id uuid, p_expected_updated_at timestamptz,
  p_discount numeric, p_reason text, p_items jsonb, p_due_date date
) returns void language plpgsql security definer set search_path = public as $$
declare c public.fee_challans; v_after public.fee_challans;
begin
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then
    raise exception 'Unauthorized to adjust challans';
  end if;
  select * into c from fee_challans where id = p_challan_id and school_id = p_school_id for update;
  if not found then raise exception 'Challan not found'; end if;
  if p_expected_updated_at is distinct from c.updated_at then raise exception 'Challan changed. Refresh before editing again.'; end if;
  if p_discount is not null and nullif(trim(p_reason), '') is null then raise exception 'Adjustment reason required'; end if;
  update fee_challans set line_items = coalesce(p_items, c.line_items),
    due_date = coalesce(p_due_date, c.due_date), discount_amount = coalesce(p_discount, c.discount_amount),
    discount_reason = case when p_discount is null then c.discount_reason else p_reason end
  where id = c.id returning * into v_after;
  insert into finance_audit_logs(school_id, action, actor_id, student_id, previous_values, new_values)
  values(p_school_id, 'challan_adjusted', auth.uid(), c.student_id, to_jsonb(c), to_jsonb(v_after));
end; $$;
revoke all on function public.adjust_fee_challan(uuid, uuid, timestamptz, numeric, text, jsonb, date) from public;
grant execute on function public.adjust_fee_challan(uuid, uuid, timestamptz, numeric, text, jsonb, date) to authenticated;

-- A human must choose the destination for historical account payments.
create function public.assign_legacy_challan_payment(p_school_id uuid, p_challan_id uuid, p_payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.fee_challans; p public.fee_payments;
begin
  if not app.has_school_role(p_school_id, array['administrator','principal','cashier']::public.app_role[]) then raise exception 'Unauthorized'; end if;
  select * into c from fee_challans where id = p_challan_id and school_id = p_school_id for update;
  if not found then raise exception 'Challan not found'; end if;
  select * into p from fee_payments where id = p_payment_id and school_id = p_school_id for update;
  if not found or p.challan_id is not null or p.is_voided or p.student_fee_account_id is distinct from c.student_fee_account_id then
    raise exception 'Payment cannot be assigned to this challan';
  end if;
  update fee_payments set challan_id = c.id where id = p.id;
  insert into finance_audit_logs(school_id, action, actor_id, student_id, previous_values, new_values)
  values(p_school_id, 'legacy_payment_assigned', auth.uid(), c.student_id, to_jsonb(p), jsonb_build_object('payment_id', p.id, 'challan_id', c.id));
end; $$;
revoke all on function public.assign_legacy_challan_payment(uuid, uuid, uuid) from public;
grant execute on function public.assign_legacy_challan_payment(uuid, uuid, uuid) to authenticated;
