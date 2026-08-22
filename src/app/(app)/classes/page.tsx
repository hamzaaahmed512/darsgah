import { Suspense } from "react";
import type { ReactNode } from "react";
import { BookOpenCheck, CalendarDays, GraduationCap, Layers3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getAcademicOptions, getClassTeachersAndAttendance } from "@/lib/services/academics";
import { ClassFilterForm } from "@/components/classes/class-filter-form";
import { EmptyState } from "@/components/ui/empty-state";
import { sortGrades } from "@/lib/utils";
import { ClassGradeGroup } from "@/components/classes/class-grade-group";
import { AddGradeModal } from "@/components/classes/add-grade-modal";
import { ButtonLink } from "@/components/ui/button";

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

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Class Management"
        description="Organize the academic structure, assign teachers, and manage each class from one place."
        actions={
          <>
            <ButtonLink href="/subjects" variant="secondary">View subjects</ButtonLink>
            <AddGradeModal existingGradeNames={academicData.grades.map((grade: any) => grade.name)} />
          </>
        }
      />

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Academic years" value={academicData.years.length} icon={<CalendarDays className="h-5 w-5" />} />
        <SummaryCard title="Grades" value={academicData.grades.length} icon={<GraduationCap className="h-5 w-5" />} />
        <SummaryCard title="Sections" value={academicData.sections.length} icon={<Layers3 className="h-5 w-5" />} />
        <SummaryCard title="Subjects" value={academicData.subjects.length} icon={<BookOpenCheck className="h-5 w-5" />} />
      </section>

      <Card className="mb-5 p-4">
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
        <div className="grid gap-3">
          {sortedGradeNames.map((gradeName) => {
            const gradeClasses = classesByGrade[gradeName];
            return (
              <ClassGradeGroup
                key={gradeName}
                gradeName={gradeName}
                classes={gradeClasses}
                classDetails={classDetails}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
        </div>
        <div className="rounded-lg bg-primary-soft p-3 text-primary">{icon}</div>
      </div>
    </Card>
  );
}
