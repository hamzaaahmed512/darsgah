-- Enforce the configured borrower-specific loan period at the database boundary.
-- The UI may offer a shorter date, but no client can issue beyond this policy.
create or replace function public.library_enforce_issue_due_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_loan_days integer;
begin
  if new.borrower_kind = 'student' then
    select student_loan_days into v_loan_days
    from public.library_settings where school_id = new.school_id;
  elsif new.borrower_kind = 'staff' then
    select staff_loan_days into v_loan_days
    from public.library_settings where school_id = new.school_id;
  else
    raise exception 'Invalid borrower type';
  end if;

  if v_loan_days is null then
    raise exception 'Library borrowing rules are not configured for this school';
  end if;
  if new.due_date <= v_today or new.due_date > v_today + v_loan_days then
    raise exception 'Due date must be within the configured % day loan period', v_loan_days;
  end if;
  return new;
end;
$$;

drop trigger if exists library_enforce_issue_due_date on public.library_loans;
create trigger library_enforce_issue_due_date
before insert on public.library_loans
for each row execute function public.library_enforce_issue_due_date();
