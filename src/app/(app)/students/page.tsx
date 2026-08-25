import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentTable } from "@/components/students/student-table";
import { StudentFilterForm } from "@/components/students/student-filter-form";
import { StudentFormModal } from "@/components/students/student-form-modal";
import { StudentActions } from "@/components/students/student-actions";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStudents } from "@/lib/services/students";
import { getApprovalRequests } from "@/lib/services/approvals";
import { getAcademicOptions, getTeacherHeadClasses } from "@/lib/services/academics";
import { hasPermission } from "@/lib/permissions";
import { createStudentAction } from "@/app/(app)/students/actions";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("students:view");
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  const canReviewStudentRequests = hasPermission(user.role, "approvals:review", user.permissions);
  const [students, academics, pendingRequests] = await Promise.all([
    getStudents(user, { q: params.q, status: params.status ?? "active", classId: params.classId, page: Number(params.page ?? 1) }),
    isTeacher ? getTeacherHeadClasses(user).then((classes) => ({ classes })) : getAcademicOptions(user),
    canReviewStudentRequests ? getApprovalRequests(user, { status: "pending" }) : Promise.resolve([])
  ]);
  const pendingStudentRequests = pendingRequests.filter((request) => request.request_type === "admission" || request.request_type === "cancellation");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title={
          <div className="flex items-center gap-3">
            {isTeacher ? "My Students" : "Student Management"}
            <Badge tone="blue">{students.count} students enrolled</Badge>
          </div>
        }
        description={isTeacher ? "View the students enrolled in your assigned head class." : "Search, filter, profile, archive, and manage students within the current school tenant."}
        actions={
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
            {hasPermission(user.role, "students:create", user.permissions) ? (
              <StudentActions filters={{ q: params.q, status: params.status ?? "active", classId: params.classId }} />
            ) : null}
            {hasPermission(user.role, "students:create", user.permissions) ? (
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
          <StudentFilterForm classes={academics.classes} limitedView={isTeacher} />
        </Suspense>
      </Card>

      {pendingStudentRequests.length ? (
        <Card className="mb-5">
          <CardHeader>
            <div>
              <CardTitle>Pending Student Requests</CardTitle>
              <p className="mt-1 text-sm text-muted">Review new admissions and cancellation requests from the Students section.</p>
            </div>
            <Badge tone="yellow">{pendingStudentRequests.length} pending</Badge>
          </CardHeader>
          <CardContent>
            <ApprovalQueue initialRequests={pendingStudentRequests} canReview={canReviewStudentRequests} />
          </CardContent>
        </Card>
      ) : null}

      <StudentTable rows={students.rows} limitedView={isTeacher} />
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
