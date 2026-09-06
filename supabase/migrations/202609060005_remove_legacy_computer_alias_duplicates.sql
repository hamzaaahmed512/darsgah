-- Grade 9-12 default combinations use Computer Science. Earlier backfills could
-- add the legacy "Computer" alias as well, leaving the same subject twice.
delete from public.student_subject_combination_subjects duplicate
using public.student_subject_combinations sc, public.grades g, public.subjects legacy_subject
where duplicate.combination_id = sc.id
  and duplicate.school_id = sc.school_id
  and g.id = sc.grade_id
  and legacy_subject.id = duplicate.subject_id
  and sc.combination_key is not null
  and g.name in ('Grade 9', 'Grade 10', 'Grade 11', 'Grade 12')
  and lower(btrim(legacy_subject.name)) = 'computer'
  and exists (
    select 1
    from public.student_subject_combination_subjects preferred
    join public.subjects preferred_subject on preferred_subject.id = preferred.subject_id
    where preferred.combination_id = sc.id
      and preferred.school_id = sc.school_id
      and lower(btrim(preferred_subject.name)) in ('computer science', 'computer studies')
  );
