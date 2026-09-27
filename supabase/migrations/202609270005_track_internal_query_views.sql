alter table public.internal_support_queries
  add column if not exists submitter_viewed_at timestamptz;

create or replace function public.set_internal_support_query_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.submitter_viewed_at is distinct from old.submitter_viewed_at
    and new.assigned_role is not distinct from old.assigned_role
    and new.subject is not distinct from old.subject
    and new.message is not distinct from old.message
    and new.status is not distinct from old.status
    and new.solved_by is not distinct from old.solved_by
    and new.solved_at is not distinct from old.solved_at then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists internal_support_queries_updated_at on public.internal_support_queries;
create trigger internal_support_queries_updated_at
  before update on public.internal_support_queries
  for each row execute function public.set_internal_support_query_updated_at();
