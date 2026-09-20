create table if not exists public.parent_portal_sessions (
  id uuid primary key,
  student_id uuid not null,
  school_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists parent_portal_sessions_expires_at_idx on public.parent_portal_sessions (expires_at);
alter table public.parent_portal_sessions enable row level security;
revoke all on public.parent_portal_sessions from anon, authenticated;
grant select, insert, delete on public.parent_portal_sessions to service_role;
