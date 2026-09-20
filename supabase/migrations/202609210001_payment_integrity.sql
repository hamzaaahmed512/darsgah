-- Enforce the outstanding balance under a row lock for app and direct API writes.
create or replace function public.guard_fee_payment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_student_id uuid;
  v_total numeric;
  v_generated numeric;
  v_paid numeric;
begin
  select school_id, student_id, total_payable into v_school_id, v_student_id, v_total
  from public.student_fee_accounts where id = new.student_fee_account_id for update;
  if v_school_id is null or v_school_id <> new.school_id then
    raise exception 'Invalid fee account';
  end if;
  if new.payment_method = 'online_payment' and not new.is_voided then
    raise exception 'Online payments require provider verification';
  end if;
  if not new.is_voided then
    select coalesce(sum(case when amount > 0 then amount else v_total end), 0)
      into v_generated from public.fee_challans
      where school_id = v_school_id and student_id = v_student_id;
    select coalesce(sum(amount), 0) into v_paid from public.fee_payments
      where student_fee_account_id = new.student_fee_account_id and not is_voided
        and (tg_op = 'INSERT' or id <> new.id);
    if new.amount <= 0 or new.amount > greatest(v_total, v_generated) - v_paid then
      raise exception 'Payment exceeds outstanding balance';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists fee_payment_integrity on public.fee_payments;
create trigger fee_payment_integrity before insert or update of amount, student_fee_account_id, school_id, is_voided, payment_method
on public.fee_payments for each row execute function public.guard_fee_payment();

alter table public.student_fee_accounts drop constraint if exists fee_discount_percentage_range;
alter table public.student_fee_accounts add constraint fee_discount_percentage_range
  check (discount_type <> 'percentage' or discount_value <= 100);
