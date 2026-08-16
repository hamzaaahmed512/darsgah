-- Supports the class attendance register and bounded class-management summaries.
create index if not exists attendance_records_school_class_date_idx
  on public.attendance_records (school_id, class_id, attendance_date);

-- Supports finance-directory filters pushed through the security-invoker view.
create index if not exists student_fee_accounts_school_class_year_idx
  on public.student_fee_accounts (school_id, class_id, academic_year_id);

-- Supports the financial dashboard's current-day/current-month collection queries
-- and the payment-history view's reverse-chronological reads.
create index if not exists fee_payments_school_active_date_idx
  on public.fee_payments (school_id, payment_date, created_at desc)
  where is_voided = false;

create index if not exists fee_payments_school_created_idx
  on public.fee_payments (school_id, created_at desc);

create index if not exists finance_audit_logs_school_created_idx
  on public.finance_audit_logs (school_id, created_at desc);
