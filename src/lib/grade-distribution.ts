import { sortClassesNaturally } from "@/lib/class-sort";

type SectionCount = { class_name: string; grade_name: string | null; student_count: number };

export function aggregateClassDistributionByGrade(sections: SectionCount[]) {
  const grades = new Map<string, { class_name: string; student_count: number }>();

  for (const section of sections) {
    const gradeName = section.grade_name?.trim() || section.class_name.trim();
    const key = gradeName.toLocaleLowerCase();
    const grade = grades.get(key);

    if (grade) {
      grade.student_count += section.student_count;
    } else {
      grades.set(key, { class_name: gradeName, student_count: section.student_count });
    }
  }

  return sortClassesNaturally([...grades.values()]);
}
