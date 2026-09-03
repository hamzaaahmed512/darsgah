-- 1. Ensure default combinations exist for all high school grades in all schools.
INSERT INTO public.student_subject_combinations (school_id, grade_id, name, combination_key, is_active)
SELECT DISTINCT
  g.school_id,
  g.id,
  CASE 
    WHEN m.key = 'computer' AND (g.name ILIKE '%11%' OR g.name ILIKE '%12%') THEN 'ICS with Physics'
    WHEN m.key = 'computer' THEN 'Computer'
    WHEN m.key = 'biology' AND (g.name ILIKE '%11%' OR g.name ILIKE '%12%') THEN 'Pre-Medical'
    WHEN m.key = 'biology' THEN 'Biology'
    WHEN m.key = 'pre_engineering' THEN 'Pre-Engineering'
  END,
  m.key,
  true
FROM public.grades g
CROSS JOIN (VALUES ('computer'), ('biology'), ('pre_engineering')) AS m(key)
WHERE (g.name ILIKE '%grade 9%' OR g.name ILIKE '%grade 10%' OR g.name ILIKE '%grade 11%' OR g.name ILIKE '%grade 12%')
  AND NOT (m.key = 'pre_engineering' AND (g.name ILIKE '%grade 9%' OR g.name ILIKE '%grade 10%'))
ON CONFLICT (school_id, grade_id, combination_key) WHERE combination_key IS NOT NULL DO NOTHING;

-- 2. Backfill null-major students in grades 9-12 based on their current subject enrollments.
DO $$
DECLARE
  std record;
  inferred_major text;
  grade_no int;
BEGIN
  FOR std IN 
    SELECT s.id, s.school_id, s.class_id, e.class_id as enrolled_class_id, g.name as grade_name
    FROM public.students s
    LEFT JOIN (SELECT student_id, class_id FROM public.enrollments WHERE status = 'active') e ON e.student_id = s.id
    JOIN public.classes c ON c.id = COALESCE(s.class_id, e.class_id)
    JOIN public.grades g ON g.id = c.grade_id
    WHERE s.major IS NULL 
      AND (g.name ILIKE '%grade 9%' OR g.name ILIKE '%grade 10%' OR g.name ILIKE '%grade 11%' OR g.name ILIKE '%grade 12%')
  LOOP
    inferred_major := NULL;
    grade_no := NULL;
    IF std.grade_name ILIKE '%grade 9%' THEN grade_no := 9; END IF;
    IF std.grade_name ILIKE '%grade 10%' THEN grade_no := 10; END IF;
    IF std.grade_name ILIKE '%grade 11%' THEN grade_no := 11; END IF;
    IF std.grade_name ILIKE '%grade 12%' THEN grade_no := 12; END IF;
    
    -- Check for Biology
    IF EXISTS (
      SELECT 1 FROM public.student_subject_enrollments sse
      JOIN public.subjects sub ON sub.id = sse.subject_id
      WHERE sse.student_id = std.id AND sse.class_id = COALESCE(std.class_id, std.enrolled_class_id)
        AND lower(btrim(sub.name)) = 'biology'
    ) THEN
      inferred_major := 'biology';
    -- Check for Computer
    ELSIF EXISTS (
      SELECT 1 FROM public.student_subject_enrollments sse
      JOIN public.subjects sub ON sub.id = sse.subject_id
      WHERE sse.student_id = std.id AND sse.class_id = COALESCE(std.class_id, std.enrolled_class_id)
        AND lower(btrim(sub.name)) IN ('computer', 'computer science', 'computer studies')
    ) THEN
      inferred_major := 'computer';
    -- Check for Pre-Engineering (grade 11/12 with physics + chemistry, no bio/comp)
    ELSIF grade_no IN (11, 12) AND EXISTS (
      SELECT 1 FROM public.student_subject_enrollments sse
      JOIN public.subjects sub ON sub.id = sse.subject_id
      WHERE sse.student_id = std.id AND sse.class_id = COALESCE(std.class_id, std.enrolled_class_id)
        AND lower(btrim(sub.name)) = 'physics'
    ) AND EXISTS (
      SELECT 1 FROM public.student_subject_enrollments sse
      JOIN public.subjects sub ON sub.id = sse.subject_id
      WHERE sse.student_id = std.id AND sse.class_id = COALESCE(std.class_id, std.enrolled_class_id)
        AND lower(btrim(sub.name)) = 'chemistry'
    ) THEN
      inferred_major := 'pre_engineering';
    END IF;

    -- Fallback to class default major
    IF inferred_major IS NULL THEN
      SELECT default_major INTO inferred_major
      FROM public.classes
      WHERE id = COALESCE(std.class_id, std.enrolled_class_id);
    END IF;

    -- Last resort fallback
    IF inferred_major IS NULL THEN
      inferred_major := 'biology';
    END IF;

    UPDATE public.students
    SET major = inferred_major
    WHERE id = std.id;
  END LOOP;
END $$;
