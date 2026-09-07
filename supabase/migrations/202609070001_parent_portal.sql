alter table public.students
  add column if not exists guardian_cnic text,
  add column if not exists guardian_phone text;

create index if not exists students_school_guardian_cnic_idx
  on public.students (school_id, guardian_cnic)
  where guardian_cnic is not null;

create index if not exists students_school_guardian_phone_idx
  on public.students (school_id, guardian_phone)
  where guardian_phone is not null;

update public.students s
set guardian_cnic = g.cnic,
    guardian_phone = g.phone
from public.student_guardians sg
join public.guardians g
  on g.id = sg.guardian_id
 and g.school_id = sg.school_id
where sg.student_id = s.id
  and sg.school_id = s.school_id
  and sg.is_primary = true;