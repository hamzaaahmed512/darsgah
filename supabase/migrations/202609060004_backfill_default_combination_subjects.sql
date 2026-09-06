-- Older schools received default combination rows before their class and subject
-- mappings were backfilled. Link each default combination to every section in
-- its grade, then populate only combinations that currently have no subjects.

insert into public.student_subject_combination_classes (school_id, combination_id, class_id)
select sc.school_id, sc.id, c.id
from public.student_subject_combinations sc
join public.classes c on c.school_id = sc.school_id and c.grade_id = sc.grade_id
where sc.combination_key is not null
  and sc.is_active = true
on conflict (combination_id, class_id) do nothing;

insert into public.student_subject_combination_subjects (school_id, combination_id, subject_id)
select sc.school_id, sc.id, s.id
from public.student_subject_combinations sc
join public.grades g on g.id = sc.grade_id and g.school_id = sc.school_id
join public.subjects s on s.school_id = sc.school_id and s.archived_at is null
where sc.combination_key is not null
  and sc.is_active = true
  and not exists (
    select 1 from public.student_subject_combination_subjects existing
    where existing.school_id = sc.school_id and existing.combination_id = sc.id
  )
  and (
    (g.name in ('Grade 9', 'Grade 10') and lower(btrim(s.name)) in (
      'english', 'urdu', 'islamiat', 'translation of the holy quran', 'pak studies',
      'mathematics', 'physics', 'chemistry', 'biology', 'computer', 'computer science', 'computer studies'
    ))
    or (g.name in ('Grade 11', 'Grade 12') and lower(btrim(replace(s.name, ' Compulsory', ''))) in (
      'english', 'urdu', 'islamiat', 'pakistan studies', 'pak studies', 'translation of the holy quran',
      'mathematics', 'physics', 'chemistry', 'biology', 'computer science', 'computer', 'computer studies',
      'principles of accounting', 'principles of economics', 'advanced accounting', 'commercial geography'
    ))
  )
  and not (sc.combination_key = 'computer' and lower(btrim(s.name)) = 'biology')
  and not (
    g.name in ('Grade 11', 'Grade 12')
    and sc.combination_key = 'computer' and lower(btrim(s.name)) = 'chemistry'
  )
  and not (sc.combination_key = 'biology' and lower(btrim(s.name)) in ('computer', 'computer science', 'computer studies'))
  and not (
    g.name in ('Grade 11', 'Grade 12')
    and sc.combination_key = 'biology' and lower(btrim(s.name)) = 'mathematics'
  )
  and not (
    sc.combination_key = 'pre_engineering' and lower(btrim(s.name)) in ('biology', 'computer', 'computer science', 'computer studies')
  );
