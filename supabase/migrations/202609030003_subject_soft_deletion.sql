-- Archive subjects without breaking exams, marks, or historical result cards.
alter table public.subjects
  add column if not exists archived_at timestamptz;

-- Archived rows may retain their original identity while a replacement subject
-- with the same name or code is created for current academic work.
alter table public.subjects drop constraint if exists subjects_school_id_name_key;
alter table public.subjects drop constraint if exists subjects_school_id_code_key;

create unique index if not exists subjects_active_school_name_key
  on public.subjects (school_id, name)
  where archived_at is null;

create unique index if not exists subjects_active_school_code_key
  on public.subjects (school_id, code)
  where archived_at is null and code is not null;

create index if not exists subjects_school_archived_idx
  on public.subjects (school_id, archived_at);
