import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StudentTable } from "@/components/students/student-table";
import { StudentFilterForm } from "@/components/students/student-filter-form";
import { StudentFormModal } from "@/components/students/student-form-modal";
import { StudentActions } from "@/components/students/student-actions";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStudents } from "@/lib/services/students";
import { getAcademicOptions } from "@/lib/services/academics";
import { hasPermission } from "@/lib/permissions";
import { createStudentAction } from "@/app/(app)/students/actions";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("students:view");
  const [students, academics] = await Promise.all([
    getStudents(user, { q: params.q, status: params.status ?? "active", classId: params.classId, page: Number(params.page ?? 1) }),
    getAcademicOptions(user)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title={
          <div className="flex items-center gap-3">
            Student Management
            <Badge tone="blue">{students.count} students enrolled</Badge>
          </div>
        }
        description="Search, filter, profile, archive, and manage students within the current school tenant."
        actions={
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            {hasPermission(user.role, "students:create") ? (
              <StudentActions filters={{ q: params.q, status: params.status ?? "active", classId: params.classId }} />
            ) : null}
            {hasPermission(user.role, "students:create") ? (
            <StudentFormModal
              classes={academics.classes}
              onSubmit={createStudentAction}
              submitLabel={user.role === "student_staff" ? "Submit request" : "Create student"}
              initialOpen={params.action === "new"}
            />
          ) : null}
        </div>
        }
      />

      <Card className="mb-5 p-4">
        <Suspense>
          <StudentFilterForm classes={academics.classes} />
        </Suspense>
      </Card>

      <StudentTable rows={students.rows} />
      <p className="mt-4 text-sm text-muted">
        Showing {students.rows.length} of {students.count} students.
      </p>
      {students.count > students.pageSize ? (
        <nav className="mt-3 flex items-center gap-3 text-sm" aria-label="Student pages">
          {students.page > 1 ? <Link href={`/students?${new URLSearchParams({ ...params, page: String(students.page - 1) })}`} className="font-semibold text-primary hover:underline">Previous</Link> : <span className="text-muted">Previous</span>}
          <span className="text-muted">Page {students.page} of {Math.ceil(students.count / students.pageSize)}</span>
          {students.page * students.pageSize < students.count ? <Link href={`/students?${new URLSearchParams({ ...params, page: String(students.page + 1) })}`} className="font-semibold text-primary hover:underline">Next</Link> : <span className="text-muted">Next</span>}
        </nav>
      ) : null}
    </>
  );
}
