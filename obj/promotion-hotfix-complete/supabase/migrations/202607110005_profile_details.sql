alter table public.profiles
  add column if not exists phone text,
  add column if not exists bio text;

drop view if exists public.staff_directory;

create or replace view public.staff_directory
with (security_invoker = true)
as
select
  sm.id as member_id,
  sm.school_id,
  p.id as user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.phone,
  p.bio,
  sm.role,
  sm.status,
  sm.department,
  sm.job_title,
  count(ta.id)::int as assigned_classes
from public.school_members sm
join public.profiles p on p.id = sm.user_id
left join public.teacher_assignments ta on ta.teacher_id = p.id and ta.school_id = sm.school_id
group by sm.id, sm.school_id, p.id, p.full_name, p.email, p.avatar_url, p.phone, p.bio, sm.role, sm.status, sm.department, sm.job_title;
