alter table public.other_staff_records
  add column if not exists cnic text,
  add column if not exists gender text check (gender in ('male', 'female') or gender is null);
