import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions, getClassTeachersAndAttendance } from "@/lib/services/academics";
import { ClassFilterForm } from "@/components/classes/class-filter-form";
import { EmptyState } from "@/components/ui/empty-state";
import { sortGrades } from "@/lib/utils";
import { ClassGradeList } from "@/components/classes/class-grade-list";
import { AddGradeModal } from "@/components/classes/add-grade-modal";
import { getActiveGradeNames } from "@/lib/academics/active-grades";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { GraduationCap, Layers3, UserCheck, Users } from "lucide-react";

export default async function ClassesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser("classes:manage");

  const [academicData, classDetails] = await Promise.all([
    getAcademicOptions(user),
    getClassTeachersAndAttendance(user)
  ]);

  const filterGrade = params.grade ?? "all";
  const filterClass = params.classId ?? "all";
  const filterQ = (params.q ?? "").toLowerCase();

  const filteredClasses = academicData.classes.filter((cls) => {
    if (filterGrade !== "all" && cls.grade_id !== filterGrade) return false;
    if (filterClass !== "all" && cls.id !== filterClass) return false;
    if (!filterQ) return true;

    const matchText = `${cls.name} ${cls.grade_name} ${cls.section_name ?? ""} ${cls.room ?? ""} ${cls.head_teacher_name ?? ""}`.toLowerCase();
    return matchText.includes(filterQ);
  });

  const classesByGrade = filteredClasses.reduce((acc, cls) => {
    const grade = cls.grade_name || "Unassigned";
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(cls);
    return acc;
  }, {} as Record<string, typeof filteredClasses>);

  const sortedGradeNames = Object.keys(classesByGrade).sort(sortGrades);
  const totalStudents = Object.values(classDetails.studentsByClass ?? {}).reduce((sum: number, count: any) => sum + Number(count ?? 0), 0);
  const assignedTeachers = new Set(academicData.classes.map((cls: any) => cls.head_teacher_id).filter(Boolean)).size;

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Classes"
        description="Organize the academic structure, assign teachers, and manage each class from one place."
        actions={
          <>
            <ButtonLink href="/subjects" variant="secondary" className="rounded-2xl">Subjects and Combinations</ButtonLink>
            <AddGradeModal existingGradeNames={getActiveGradeNames(
              academicData.classes,
              academicData.years.find((year: any) => year.is_active)?.id
            )} />
          </>
        }
      />

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Grades" value={academicData.grades.length} hint="Academic levels configured" icon={GraduationCap} tone="blue" />
        <StatCard label="Sections" value={academicData.classes.length} hint="Available class sections" icon={Layers3} tone="purple" />
        <StatCard label="Students" value={totalStudents.toLocaleString()} hint="Across all class sections" icon={Users} tone="green" />
        <StatCard label="Head teachers" value={assignedTeachers} hint="Assigned to a class section" icon={UserCheck} tone="amber" />
      </section>

      <Card className="mb-5 rounded-[24px] border border-blue-100 bg-white p-4 shadow-[0_12px_34px_rgba(37,99,235,0.05)]">
        <Suspense>
          <ClassFilterForm grades={academicData.grades} classes={academicData.classes} />
        </Suspense>
      </Card>

      {filteredClasses.length === 0 ? (
        <EmptyState
          title="No classes found"
          description="Add a grade or try clearing your search filters."
        />
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4 px-1">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><Layers3 className="h-5 w-5 text-primary" />Class Structure</h2>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{academicData.classes.length} sections</span>
          </div>
        <ClassGradeList
          classDetails={classDetails}
          groups={sortedGradeNames.map((gradeName) => ({ gradeName, classes: classesByGrade[gradeName] }))}
        />
        </section>
      )}
    </>
  );
}
