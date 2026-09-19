create table if not exists public.internal_support_query_remarks (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.internal_support_queries(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role public.app_role not null check (author_role in ('principal', 'administrator')),
  remark text not null check (char_length(btrim(remark)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists internal_support_query_remarks_query_created_idx
  on public.internal_support_query_remarks (query_id, created_at);

alter table public.internal_support_query_remarks enable row level security;

create policy internal_support_query_remarks_leadership_select
  on public.internal_support_query_remarks for select using (
    app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
    and exists (
      select 1 from public.internal_support_queries q
      where q.id = internal_support_query_remarks.query_id
        and q.school_id = internal_support_query_remarks.school_id
    )
  );

create policy internal_support_query_remarks_leadership_insert
  on public.internal_support_query_remarks for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.school_members m
      where m.school_id = internal_support_query_remarks.school_id
        and m.user_id = auth.uid()
        and m.role = internal_support_query_remarks.author_role
        and m.status = 'active'
    )
    and app.has_school_role(school_id, array['principal','administrator']::public.app_role[])
    and exists (
      select 1 from public.internal_support_queries q
      where q.id = internal_support_query_remarks.query_id
        and q.school_id = internal_support_query_remarks.school_id
    )
  );
