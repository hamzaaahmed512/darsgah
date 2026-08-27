create or replace function public.ensure_class_head_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.head_teacher_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.school_members sm
    where sm.school_id = new.school_id
      and sm.user_id = new.head_teacher_id
      and sm.role in ('teacher', 'head_teacher', 'principal')
      and sm.status = 'active'
  ) then
    raise exception 'Head teacher must be an active teacher or principal in this school.';
  end if;

  return new;
end;
$$;
