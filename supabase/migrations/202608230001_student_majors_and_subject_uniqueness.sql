-- Student study groups and case-insensitive subject uniqueness.
alter table public.students
  add column if not exists major text;

alter table public.students drop constraint if exists students_major_check;
alter table public.students add constraint students_major_check check (
  major is null or major in ('computer','biology','pre_engineering','computer_economics','computer_economics_stats')
);

create or replace function public.enforce_normalized_subject_name_unique()
returns trigger language plpgsql security definer set search_path = public as $$
declare normalized_name text;
begin
  normalized_name := lower(regexp_replace(btrim(new.name), '\s+', ' ', 'g'));
  if normalized_name = 'computer science' then normalized_name := 'computer'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.school_id::text || ':' || normalized_name, 0));
  if exists (
    select 1 from public.subjects s
    where s.school_id = new.school_id
      and s.id is distinct from new.id
      and case
        when lower(regexp_replace(btrim(s.name), '\s+', ' ', 'g')) = 'computer science' then 'computer'
        else lower(regexp_replace(btrim(s.name), '\s+', ' ', 'g'))
      end = normalized_name
  ) then
    raise exception 'A subject named "%" already exists', new.name;
  end if;
  new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  return new;
end $$;

drop trigger if exists subjects_normalized_name_unique on public.subjects;
create trigger subjects_normalized_name_unique
before insert or update of name, school_id on public.subjects
for each row execute function public.enforce_normalized_subject_name_unique();

-- Existing Grade 11/12 classes also need Statistics for the Computer with Economics track.
insert into public.subjects (school_id, name, is_elective)
select distinct g.school_id, 'Statistics', true
from public.grades g
where lower(g.name) in ('grade 11', 'grade 12')
  and not exists (
    select 1 from public.subjects s where s.school_id = g.school_id and lower(btrim(s.name)) = 'statistics'
  );

insert into public.class_subjects (school_id, class_id, subject_id, is_class_specific)
select c.school_id, c.id, s.id, false
from public.classes c
join public.grades g on g.id = c.grade_id
join public.subjects s on s.school_id = c.school_id and lower(btrim(s.name)) = 'statistics'
where lower(g.name) in ('grade 11', 'grade 12')
on conflict (school_id, class_id, subject_id) do nothing;

drop view if exists public.student_directory;
create view public.student_directory as
select
  s.id, s.school_id, s.admission_number, s.first_name, s.last_name, s.preferred_name,
  s.name_en, s.name_ur, s.father_name_en, s.father_name_ur, s.father_phone, s.father_cnic,
  s.date_of_birth, s.gender, s.email, s.phone, s.address, s.admission_date, s.status,
  s.archived_at, s.photo_url, coalesce(s.class_id, e.class_id) as class_id,
  c.name as class_name, gr.name as grade_name, sec.name as section_name,
  coalesce(s.father_name_en, gu.full_name) as guardian_name,
  coalesce((
    select (count(case when ar.status in ('present', 'late') then 1 end)::numeric / nullif(count(ar.id), 0)) * 100
    from public.attendance_records ar where ar.student_id = s.id
  ), 0) as attendance_rate,
  s.major
from public.students s
left join (select student_id, class_id from public.enrollments where status = 'active') e on e.student_id = s.id
left join public.classes c on c.id = coalesce(s.class_id, e.class_id)
left join public.grades gr on gr.id = c.grade_id
left join public.sections sec on sec.id = c.section_id
left join (
  select sg.student_id, g.full_name, row_number() over (partition by sg.student_id order by sg.is_primary desc) as rn
  from public.student_guardians sg join public.guardians g on g.id = sg.guardian_id
) gu on gu.student_id = s.id and gu.rn = 1;

grant select on public.student_directory to authenticated;

create or replace function public.remove_major_excluded_subjects()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  grade_no integer;
begin
  if new.class_id is null or new.major is null then return new; end if;
  select nullif(substring(g.name from '(9|10|11|12)'), '')::integer into grade_no
  from public.classes c join public.grades g on g.id = c.grade_id
  where c.id = new.class_id and c.school_id = new.school_id;

  delete from public.student_subject_enrollments sse
  using public.subjects sub
  where sse.school_id = new.school_id and sse.student_id = new.id and sse.class_id = new.class_id
    and sub.id = sse.subject_id
    and (
      (grade_no in (9,10) and new.major = 'computer' and lower(sub.name) = 'biology') or
      (grade_no in (9,10) and new.major = 'biology' and lower(sub.name) in ('computer','computer science','computer studies')) or
      (grade_no in (11,12) and new.major = 'computer' and lower(sub.name) in ('biology','chemistry')) or
      (grade_no in (11,12) and new.major = 'pre_engineering' and lower(sub.name) in ('biology','computer','computer science','computer studies')) or
      (grade_no in (11,12) and new.major = 'biology' and lower(sub.name) in ('computer','computer science','computer studies','mathematics','maths')) or
      (grade_no in (11,12) and new.major in ('computer_economics','computer_economics_stats') and lower(sub.name) in ('biology','chemistry')) or
      (grade_no in (11,12) and new.major = 'computer_economics_stats' and lower(sub.name) = 'physics')
    );
  return new;
end $$;

drop trigger if exists students_remove_major_excluded_subjects on public.students;
create trigger students_remove_major_excluded_subjects
after insert or update of major, class_id on public.students
for each row execute function public.remove_major_excluded_subjects();
