alter table public.students
  add column if not exists student_cnic text;

alter table public.guardians
  add column if not exists cnic text;

update public.guardians g
set cnic = s.father_cnic
from public.student_guardians sg
join public.students s
  on s.id = sg.student_id
 and s.school_id = sg.school_id
where sg.guardian_id = g.id
  and g.school_id = sg.school_id
  and g.cnic is null
  and s.father_cnic is not null;

create unique index if not exists students_school_student_cnic_unique_idx
  on public.students (school_id, student_cnic)
  where student_cnic is not null;

create index if not exists guardians_school_cnic_idx
  on public.guardians (school_id, cnic)
  where cnic is not null;

create index if not exists guardians_school_phone_idx
  on public.guardians (school_id, phone);

drop view if exists public.student_directory;

create view public.student_directory as
select
  s.id,
  s.school_id,
  s.admission_number,
  s.first_name,
  s.last_name,
  s.preferred_name,
  s.name_en,
  s.name_ur,
  s.student_cnic,
  s.father_name_en,
  s.father_name_ur,
  s.father_phone,
  s.father_cnic,
  s.father_alive,
  s.religion,
  s.date_of_birth,
  s.gender,
  s.email,
  s.phone,
  s.address,
  s.admission_date,
  s.status,
  s.archived_at,
  s.photo_url,
  coalesce(s.class_id, e.class_id) as class_id,
  c.name as class_name,
  gr.name as grade_name,
  sec.name as section_name,
  coalesce(s.father_name_en, gu.full_name) as guardian_name,
  coalesce((
    select (count(case when ar.status in ('present', 'late') then 1 end)::numeric / nullif(count(ar.id), 0)) * 100
    from public.attendance_records ar
    where ar.student_id = s.id
  ), 0) as attendance_rate,
  s.major
from public.students s
left join (
  select student_id, class_id
  from public.enrollments
  where status = 'active'
) e on e.student_id = s.id
left join public.classes c on c.id = coalesce(s.class_id, e.class_id)
left join public.grades gr on gr.id = c.grade_id
left join public.sections sec on sec.id = c.section_id
left join (
  select
    sg.student_id,
    g.full_name,
    row_number() over (partition by sg.student_id order by sg.is_primary desc) as rn
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
) gu on gu.student_id = s.id and gu.rn = 1;

grant select on public.student_directory to authenticated;

create or replace view public.student_guardian_details
with (security_invoker = true)
as
select
  sg.school_id,
  sg.student_id,
  sg.guardian_id,
  sg.is_primary,
  g.full_name,
  g.relationship,
  g.email,
  g.phone,
  g.cnic,
  g.emergency_contact_name,
  g.emergency_contact_phone
from public.student_guardians sg
join public.guardians g on g.id = sg.guardian_id;
