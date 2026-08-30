import { BookOpenCheck, CalendarDays, GraduationCap, Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getAcademicOptions, getTeacherSubjectAssignments } from "@/lib/services/academics";
import { formatClassDisplayName, formatGradeSection } from "@/lib/utils";

export default async function AcademicsPage() {
  const user = await requireUser("academics:view");
  if (hasPermission(user.role, "classes:manage", user.permissions)) {
    redirect("/classes");
  }

  if (user.role === "teacher") {
    const assignments = await getTeacherSubjectAssignments(user);

    return (
      <>
        <PageHeader
          eyebrow={user.schoolName}
          title="Teaching Assignments"
          description="Review the classes and subjects currently assigned to you."
        />
        {!assignments.length ? (
          <Card className="p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-ink">No assignments yet</h2>
            <p className="mt-2 text-sm text-muted">A principal or administrator can assign subject responsibilities from Class Management.</p>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((item: any) => (
              <Card key={`${item.id}-${item.subject_name ?? "class"}`} className="overflow-hidden">
                <div className="h-1.5 bg-primary" />
                <div className="p-5">
                  <Badge tone="blue">{item.subject_name ?? "General"}</Badge>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                    {formatGradeSection(item.grade_name, item.section_name)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.room ? `Room ${item.room}` : "No room assigned"}
                  </p>
                  <p className="mt-4 rounded-lg bg-surface-low p-3 text-xs font-bold uppercase tracking-wide text-muted">
                    {item.academic_year_name ?? "Current academic year"}
                  </p>
                </div>
              </Card>
            ))}
          </section>
        )}
      </>
    );
  }

  const academics = await getAcademicOptions(user);

  return (
    <>
      <PageHeader
        eyebrow="Structure"
        title="Academic Management"
        description="Academic years, grades, sections, subjects, classes, teacher assignments, and enrollments are normalized in Supabase."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary title="Academic years" value={academics.years.length} icon={<CalendarDays />} />
        <Summary title="Grades" value={academics.grades.length} icon={<GraduationCap />} />
        <Summary title="Sections" value={academics.sections.length} icon={<Layers3 />} />
        <Summary title="Subjects" value={academics.subjects.length} icon={<BookOpenCheck />} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-3 pr-4">Class</th>
                    <th className="py-3 pr-4">Grade</th>
                    <th className="py-3 pr-4">Section</th>
                    <th className="py-3 pr-4">Room</th>
                    <th className="py-3 pr-4">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {academics.classes.map((item) => (
                    <tr key={item.id} className="border-t border-outline/60">
                      <td className="py-3 pr-4 font-semibold">{formatClassDisplayName(item.grade_name, item.name, item.section_name)}</td>
                      <td className="py-3 pr-4">{item.grade_name}</td>
                      <td className="py-3 pr-4">{formatGradeSection(null, item.section_name) || "—"}</td>
                      <td className="py-3 pr-4">{item.room ?? "—"}</td>
                      <td className="py-3 pr-4">{item.academic_year_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Year</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {academics.years.map((year: any) => (
              <div key={year.id} className="rounded-lg bg-surface-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">{year.name}</p>
                  {year.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted">{year.starts_on} to {year.ends_on}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Summary({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
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
