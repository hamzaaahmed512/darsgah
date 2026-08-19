-- Keep tenant names visually consistent regardless of entry point.
create or replace function public.normalize_school_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name = upper(trim(new.name));
  return new;
end;
$$;

update public.schools set name = upper(trim(name)) where name <> upper(trim(name));

drop trigger if exists schools_normalize_name on public.schools;
create trigger schools_normalize_name
before insert or update of name on public.schools
for each row execute function public.normalize_school_name();
