-- Add a parent-facing announcement channel alongside authenticated staff audiences.
alter table public.announcements
  drop constraint if exists announcements_audience_type_check;

alter table public.announcements
  add constraint announcements_audience_type_check
  check (audience_type in ('all', 'parents', 'teachers', 'registrar', 'admin', 'class', 'department', 'roles'));

create index if not exists announcements_parent_portal_idx
  on public.announcements (school_id, audience_type, is_archived, publish_date, created_at desc)
  where audience_type = 'parents';
