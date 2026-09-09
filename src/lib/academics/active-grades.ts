export function getActiveGradeNames(
  classes: Array<{ grade_name: string; academic_year_id: string }>,
  activeAcademicYearId?: string
) {
  if (!activeAcademicYearId) return [];

  return [...new Set(
    classes
      .filter((cls) => cls.academic_year_id === activeAcademicYearId)
      .map((cls) => cls.grade_name)
      .filter(Boolean)
  )];
}
