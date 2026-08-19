-- Add new columns to support enhanced student directory features
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS name_ur text,
ADD COLUMN IF NOT EXISTS father_name_en text,
ADD COLUMN IF NOT EXISTS father_name_ur text,
ADD COLUMN IF NOT EXISTS father_phone text,
ADD COLUMN IF NOT EXISTS father_cnic text,
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id);

-- Create compound index for sibling lookups by CNIC
CREATE INDEX IF NOT EXISTS idx_students_school_father_cnic ON public.students(school_id, father_cnic);

-- Update the student_directory view to include new fields
DROP VIEW IF EXISTS public.student_directory;

CREATE OR REPLACE VIEW public.student_directory AS
SELECT 
    s.id,
    s.school_id,
    s.admission_number,
    s.first_name,
    s.last_name,
    s.preferred_name,
    s.name_en,
    s.name_ur,
    s.father_name_en,
    s.father_name_ur,
    s.father_phone,
    s.father_cnic,
    s.date_of_birth,
    s.gender,
    s.email,
    s.phone,
    s.address,
    s.admission_date,
    s.status,
    s.archived_at,
    s.photo_url,
    -- Using the explicit class_id if provided, otherwise fallback to active enrollment
    COALESCE(s.class_id, e.class_id) AS class_id,
    c.name AS class_name,
    gr.name AS grade_name,
    sec.name AS section_name,
    -- Fallback guardian name
    COALESCE(s.father_name_en, gu.full_name) AS guardian_name,
    -- Attendance calculation
    COALESCE(
        (
            SELECT (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END)::numeric / NULLIF(COUNT(ar.id), 0)) * 100
            FROM public.attendance_records ar
            WHERE ar.student_id = s.id
        ),
        0
    ) AS attendance_rate
FROM public.students s
LEFT JOIN (
    SELECT student_id, class_id
    FROM public.enrollments
    WHERE status = 'active'
) e ON e.student_id = s.id
LEFT JOIN public.classes c ON c.id = COALESCE(s.class_id, e.class_id)
LEFT JOIN public.grades gr ON gr.id = c.grade_id
LEFT JOIN public.sections sec ON sec.id = c.section_id
LEFT JOIN (
    SELECT sg.student_id, g.full_name,
           ROW_NUMBER() OVER (PARTITION BY sg.student_id ORDER BY sg.is_primary DESC) as rn
    FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
) gu ON gu.student_id = s.id AND gu.rn = 1;

-- Grant permissions on the view
GRANT SELECT ON public.student_directory TO authenticated;
