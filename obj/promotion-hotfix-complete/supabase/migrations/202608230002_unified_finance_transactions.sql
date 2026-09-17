-- Unified ledger for manual income, expenses, student fees, and paid payroll.
create sequence if not exists public.finance_transaction_no_seq start 1000;

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  direction text not null check (direction in ('income','expense')),
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  receipt_number text not null unique,
  party_name text,
  student_id uuid references public.students(id) on delete set null,
  fee_payment_id uuid unique references public.fee_payments(id) on delete set null,
  payroll_id uuid unique references public.payroll(id) on delete set null,
  payment_method text check (payment_method in ('cash','bank_transfer','cheque','online_payment','other') or payment_method is null),
  reference_number text,
  description text,
  source text not null default 'manual' check (source in ('manual','fee_payment','payroll')),
  recorded_by uuid references public.profiles(id) on delete set null,
  is_voided boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transactions_school_date_idx on public.finance_transactions (school_id, transaction_date desc);
create index if not exists finance_transactions_school_direction_date_idx on public.finance_transactions (school_id, direction, transaction_date desc);

create or replace function public.assign_finance_transaction_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.receipt_number is null or btrim(new.receipt_number) = '' then
    new.receipt_number := 'TXN-' || to_char(coalesce(new.transaction_date, current_date), 'YYYYMMDD') || '-' || nextval('public.finance_transaction_no_seq');
  end if;
  return new;
end $$;

drop trigger if exists finance_transactions_before_insert on public.finance_transactions;
create trigger finance_transactions_before_insert before insert on public.finance_transactions
for each row execute function public.assign_finance_transaction_number();

drop trigger if exists finance_transactions_updated_at on public.finance_transactions;
create trigger finance_transactions_updated_at before update on public.finance_transactions
for each row execute function public.set_updated_at();

create or replace function public.sync_fee_payment_to_finance_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_student_id uuid; v_student_name text;
begin
  select sfa.student_id, concat_ws(' ', s.first_name, s.last_name)
    into v_student_id, v_student_name
  from public.student_fee_accounts sfa join public.students s on s.id = sfa.student_id
  where sfa.id = new.student_fee_account_id;

  insert into public.finance_transactions (
    school_id, direction, category, amount, transaction_date, receipt_number,
    party_name, student_id, fee_payment_id, payment_method, reference_number,
    description, source, recorded_by, is_voided
  ) values (
    new.school_id, 'income', 'student_fee', new.amount, new.payment_date, new.receipt_number,
    v_student_name, v_student_id, new.id, new.payment_method, coalesce(new.reference_number, new.transaction_number),
    new.remarks, 'fee_payment', new.received_by, new.is_voided
  ) on conflict (fee_payment_id) do update set
    amount = excluded.amount, transaction_date = excluded.transaction_date,
    receipt_number = excluded.receipt_number, party_name = excluded.party_name,
    student_id = excluded.student_id, payment_method = excluded.payment_method,
    reference_number = excluded.reference_number, description = excluded.description,
    recorded_by = excluded.recorded_by, is_voided = excluded.is_voided;
  return new;
end $$;

drop trigger if exists fee_payments_sync_finance_ledger on public.fee_payments;
create trigger fee_payments_sync_finance_ledger after insert or update on public.fee_payments
for each row execute function public.sync_fee_payment_to_finance_ledger();

insert into public.finance_transactions (
  school_id, direction, category, amount, transaction_date, receipt_number,
  party_name, student_id, fee_payment_id, payment_method, reference_number,
  description, source, recorded_by, is_voided
)
select fp.school_id, 'income', 'student_fee', fp.amount, fp.payment_date, fp.receipt_number,
  concat_ws(' ', s.first_name, s.last_name), s.id, fp.id, fp.payment_method,
  coalesce(fp.reference_number, fp.transaction_number), fp.remarks, 'fee_payment', fp.received_by, fp.is_voided
from public.fee_payments fp
join public.student_fee_accounts sfa on sfa.id = fp.student_fee_account_id
join public.students s on s.id = sfa.student_id
on conflict (fee_payment_id) do nothing;

create or replace function public.sync_paid_payroll_to_finance_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_staff_name text;
begin
  select full_name into v_staff_name from public.profiles where id = new.teacher_id;
  if new.status = 'paid' then
    insert into public.finance_transactions (
      school_id, direction, category, amount, transaction_date, receipt_number,
      party_name, payroll_id, description, source, recorded_by, is_voided
    ) values (
      new.school_id, 'expense', 'staff_pay', new.net_salary, coalesce(new.payment_date, current_date), null,
      v_staff_name, new.id, 'Payroll for ' || new.month::text, 'payroll', null, false
    ) on conflict (payroll_id) do update set
      amount = excluded.amount, transaction_date = excluded.transaction_date,
      party_name = excluded.party_name, description = excluded.description, is_voided = false;
  else
    update public.finance_transactions set is_voided = true where payroll_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists payroll_sync_finance_ledger on public.payroll;
create trigger payroll_sync_finance_ledger after insert or update of status, net_salary, payment_date on public.payroll
for each row execute function public.sync_paid_payroll_to_finance_ledger();

insert into public.finance_transactions (
  school_id, direction, category, amount, transaction_date, receipt_number,
  party_name, payroll_id, description, source, is_voided
)
select p.school_id, 'expense', 'staff_pay', p.net_salary, coalesce(p.payment_date, current_date), null,
  pr.full_name, p.id, 'Payroll for ' || p.month::text, 'payroll', false
from public.payroll p left join public.profiles pr on pr.id = p.teacher_id
where p.status = 'paid'
on conflict (payroll_id) do nothing;

alter table public.finance_transactions enable row level security;
drop policy if exists finance_transactions_select on public.finance_transactions;
create policy finance_transactions_select on public.finance_transactions for select using (app.can_access_school(school_id));
drop policy if exists finance_transactions_insert on public.finance_transactions;
create policy finance_transactions_insert on public.finance_transactions for insert with check (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
);
drop policy if exists finance_transactions_update on public.finance_transactions;
create policy finance_transactions_update on public.finance_transactions for update using (
  app.has_school_role(school_id, array['administrator','principal']::public.app_role[])
) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

grant select, insert, update on public.finance_transactions to authenticated;
grant usage, select on sequence public.finance_transaction_no_seq to authenticated;
