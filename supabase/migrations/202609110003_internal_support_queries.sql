create table if not exists public.internal_support_queries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  assigned_role public.app_role not null check (assigned_role in ('principal', 'administrator')),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 3000),
  status text not null default 'open' check (status in ('open', 'solved')),
  solved_by uuid references public.profiles(id) on delete set null,
  solved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists internal_support_queries_school_status_idx on public.internal_support_queries (school_id, status, created_at desc);
create index if not exists internal_support_queries_submitter_created_idx on public.internal_support_queries (submitted_by, created_at desc);
alter table public.internal_support_queries enable row level security;

create policy internal_support_queries_staff_select on public.internal_support_queries for select using (
  submitted_by = auth.uid() or app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
);
create policy internal_support_queries_staff_insert on public.internal_support_queries for insert with check (
  submitted_by = auth.uid() and app.can_access_school(school_id)
);
create policy internal_support_queries_leadership_update on public.internal_support_queries for update using (
  app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
) with check (app.has_school_role(school_id, array['principal','administrator']::public.app_role[]));

drop trigger if exists internal_support_queries_updated_at on public.internal_support_queries;
create trigger internal_support_queries_updated_at before update on public.internal_support_queries for each row execute function public.set_updated_at();
