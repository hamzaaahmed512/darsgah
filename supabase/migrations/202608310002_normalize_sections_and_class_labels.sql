with normalized_sections as (
  select
    id,
    school_id,
    upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i')) as normalized_name,
    row_number() over (
      partition by school_id, upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i'))
      order by created_at, id
    ) as rank_in_group,
    first_value(id) over (
      partition by school_id, upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i'))
      order by created_at, id
    ) as keeper_id
  from public.sections
),
duplicate_sections as (
  select id, keeper_id
  from normalized_sections
  where rank_in_group > 1
)
update public.classes c
set section_id = d.keeper_id
from duplicate_sections d
where c.section_id = d.id;

delete from public.sections s
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by school_id, upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i'))
        order by created_at, id
      ) as rank_in_group
    from public.sections
  ) ranked
  where rank_in_group > 1
) duplicates
where s.id = duplicates.id;

update public.sections
set name = upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i'))
where name is distinct from upper(regexp_replace(btrim(name), '^(section|sec)\s+', '', 'i'));

alter table public.sections
  drop constraint if exists sections_school_id_name_key;

create unique index if not exists sections_school_id_name_upper_idx
  on public.sections (school_id, upper(btrim(name)));

update public.classes c
set name = case
  when sec.name is null or btrim(sec.name) = '' then upper(btrim(g.name))
  else upper(btrim(g.name) || ' - ' || btrim(sec.name))
end
from public.grades g
left join public.sections sec on sec.id = c.section_id
where c.grade_id = g.id;
