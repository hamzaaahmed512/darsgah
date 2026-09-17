-- Create sequences
create sequence if not exists public.receipt_no_seq start 1000;

-- Create tables
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  tuition_fee numeric not null default 0 check (tuition_fee >= 0),
  admission_fee numeric not null default 0 check (admission_fee >= 0),
  examination_fee numeric not null default 0 check (examination_fee >= 0),
  library_fee numeric not null default 0 check (library_fee >= 0),
  laboratory_fee numeric not null default 0 check (laboratory_fee >= 0),
  transport_fee numeric not null default 0 check (transport_fee >= 0),
  miscellaneous_charges numeric not null default 0 check (miscellaneous_charges >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, academic_year_id, class_id)
);

create table if not exists public.student_fee_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  fee_structure_id uuid references public.fee_structures(id) on delete set null,
  discount_type text not null default 'none' check (discount_type in ('percentage', 'fixed', 'none')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  discount_reason text check (discount_reason in ('scholarship', 'sibling_discount', 'merit', 'need_based', 'special_approval') or discount_reason is null),
  discount_remarks text,
  discount_approved_by text,
  discount_applied_date date,
  total_payable numeric not null default 0 check (total_payable >= 0),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  due_date date not null default (current_date + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, academic_year_id)
);

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_fee_account_id uuid not null references public.student_fee_accounts(id) on delete cascade,
  receipt_number text not null unique,
  amount numeric not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'cheque', 'online_payment')),
  transaction_number text,
  reference_number text,
  remarks text,
  received_by uuid references public.profiles(id) on delete set null,
  payment_date date not null default current_date,
  is_voided boolean not null default false,
  voided_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade,
  previous_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.fee_structures enable row level security;
alter table public.student_fee_accounts enable row level security;
alter table public.fee_payments enable row level security;
alter table public.finance_audit_logs enable row level security;

-- Add updated_at triggers
create trigger fee_structures_updated_at before update on public.fee_structures for each row execute function public.set_updated_at();
create trigger student_fee_accounts_updated_at before update on public.student_fee_accounts for each row execute function public.set_updated_at();
create trigger fee_payments_updated_at before update on public.fee_payments for each row execute function public.set_updated_at();

-- Trigger functions
create or replace function public.sync_student_fee_account()
returns trigger
language plpgsql
security definer
as $$
declare
  v_fee_structure_id uuid;
  v_tuition numeric;
  v_admission numeric;
  v_exam numeric;
  v_library numeric;
  v_lab numeric;
  v_transport numeric;
  v_misc numeric;
  v_total_base numeric;
begin
  if new.status = 'active' then
    -- Find if a fee structure exists for this class and academic year
    select id, tuition_fee, admission_fee, examination_fee, library_fee, laboratory_fee, transport_fee, miscellaneous_charges
    into v_fee_structure_id, v_tuition, v_admission, v_exam, v_library, v_lab, v_transport, v_misc
    from public.fee_structures
    where school_id = new.school_id
      and class_id = new.class_id
      and academic_year_id = new.academic_year_id;

    if v_fee_structure_id is not null then
      v_total_base := v_tuition + v_admission + v_exam + v_library + v_lab + v_transport + v_misc;
      
      insert into public.student_fee_accounts (
        school_id,
        student_id,
        academic_year_id,
        class_id,
        fee_structure_id,
        total_payable,
        amount_paid,
        due_date
      ) values (
        new.school_id,
        new.student_id,
        new.academic_year_id,
        new.class_id,
        v_fee_structure_id,
        v_total_base,
        0,
        current_date + interval '30 days'
      )
      on conflict (school_id, student_id, academic_year_id) do update set
        class_id = excluded.class_id,
        fee_structure_id = excluded.fee_structure_id,
        total_payable = case 
          when student_fee_accounts.discount_type = 'percentage' then excluded.total_payable * (1.0 - student_fee_accounts.discount_value / 100.0)
          when student_fee_accounts.discount_type = 'fixed' then greatest(0, excluded.total_payable - student_fee_accounts.discount_value)
          else excluded.total_payable
        end;
    else
      -- Insert a shell record
      insert into public.student_fee_accounts (
        school_id,
        student_id,
        academic_year_id,
        class_id,
        fee_structure_id,
        total_payable,
        amount_paid,
        due_date
      ) values (
        new.school_id,
        new.student_id,
        new.academic_year_id,
        new.class_id,
        null,
        0,
        0,
        current_date + interval '30 days'
      )
      on conflict (school_id, student_id, academic_year_id) do update set
        class_id = excluded.class_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.sync_fee_structure_accounts()
returns trigger
language plpgsql
security definer
as $$
declare
  r record;
  v_total_base numeric;
begin
  v_total_base := new.tuition_fee + new.admission_fee + new.examination_fee + new.library_fee + new.laboratory_fee + new.transport_fee + new.miscellaneous_charges;

  for r in (
    select student_id
    from public.enrollments
    where school_id = new.school_id
      and class_id = new.class_id
      and academic_year_id = new.academic_year_id
      and status = 'active'
  ) loop
    insert into public.student_fee_accounts (
      school_id,
      student_id,
      academic_year_id,
      class_id,
      fee_structure_id,
      total_payable,
      amount_paid,
      due_date
    ) values (
      new.school_id,
      r.student_id,
      new.academic_year_id,
      new.class_id,
      new.id,
      v_total_base,
      0,
      current_date + interval '30 days'
    )
    on conflict (school_id, student_id, academic_year_id) do update set
      fee_structure_id = new.id,
      total_payable = case 
        when student_fee_accounts.discount_type = 'percentage' then v_total_base * (1.0 - student_fee_accounts.discount_value / 100.0)
        when student_fee_accounts.discount_type = 'fixed' then greatest(0, v_total_base - student_fee_accounts.discount_value)
        else v_total_base
      end;
  end loop;
  return new;
end;
$$;

create or replace function public.update_fee_account_paid_amount()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_paid numeric;
  v_account_id uuid;
begin
  v_account_id := coalesce(new.student_fee_account_id, old.student_fee_account_id);

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.fee_payments
  where student_fee_account_id = v_account_id
    and is_voided = false;

  update public.student_fee_accounts
  set amount_paid = v_total_paid,
      updated_at = now()
  where id = v_account_id;

  return new;
end;
$$;

create or replace function public.assign_receipt_number()
returns trigger
language plpgsql
as $$
begin
  if new.receipt_number is null then
    new.receipt_number := 'REC-' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('public.receipt_no_seq');
  end if;
  return new;
end;
$$;

-- Register Triggers
create trigger enrollments_fee_sync
after insert or update of status on public.enrollments
for each row execute function public.sync_student_fee_account();

create trigger fee_structures_sync
after insert or update on public.fee_structures
for each row execute function public.sync_fee_structure_accounts();

create trigger fee_payments_change
after insert or update or delete on public.fee_payments
for each row execute function public.update_fee_account_paid_amount();

create trigger fee_payments_before_insert
before insert on public.fee_payments
for each row execute function public.assign_receipt_number();

-- Views
create or replace view public.student_fee_directory
with (security_invoker = true)
as
select
  sfa.id,
  sfa.school_id,
  sfa.student_id,
  (s.first_name || ' ' || s.last_name) as student_name,
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

create or replace view public.payment_history_view
with (security_invoker = true)
as
select
  fp.id,
  fp.school_id,
  fp.student_fee_account_id,
  sfa.student_id,
  (s.first_name || ' ' || s.last_name) as student_name,
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

-- RLS Policies
create policy fee_structures_select on public.fee_structures for select using (app.can_access_school(school_id));
create policy fee_structures_all on public.fee_structures for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create policy student_fee_accounts_select on public.student_fee_accounts for select using (app.can_access_school(school_id));
create policy student_fee_accounts_all on public.student_fee_accounts for all using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create policy fee_payments_select on public.fee_payments for select using (app.can_access_school(school_id));
create policy fee_payments_insert on public.fee_payments for insert with check (app.has_school_role(school_id, array['administrator','principal','student_staff']::public.app_role[]));
create policy fee_payments_update on public.fee_payments for update using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[])) with check (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));

create policy finance_audit_logs_select on public.finance_audit_logs for select using (app.has_school_role(school_id, array['administrator','principal']::public.app_role[]));
create policy finance_audit_logs_insert on public.finance_audit_logs for insert with check (app.can_access_school(school_id));

-- Backfill
insert into public.student_fee_accounts (
  school_id,
  student_id,
  academic_year_id,
  class_id,
  fee_structure_id,
  total_payable,
  amount_paid,
  due_date
)
select
  e.school_id,
  e.student_id,
  e.academic_year_id,
  e.class_id,
  fs.id,
  coalesce(fs.tuition_fee + fs.admission_fee + fs.examination_fee + fs.library_fee + fs.laboratory_fee + fs.transport_fee + fs.miscellaneous_charges, 0),
  0,
  current_date + interval '30 days'
from public.enrollments e
left join public.fee_structures fs on fs.school_id = e.school_id and fs.class_id = e.class_id and fs.academic_year_id = e.academic_year_id
where e.status = 'active'
on conflict (school_id, student_id, academic_year_id) do nothing;
