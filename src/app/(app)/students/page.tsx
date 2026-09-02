import { Suspense } from "react";
import { Users } from "lucide-react";
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
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";
import { hasPermission } from "@/lib/permissions";
import { createStudentAction } from "@/app/(app)/students/actions";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("students:view");
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  const canReviewStudentRequests = hasPermission(user.role, "approvals:review", user.permissions);
  const [students, academics, pendingRequests, combinations] = await Promise.all([
    getStudents(user, { q: params.q, status: params.status ?? "active", classId: params.classId, page: Number(params.page ?? 1), pageSize: Number(params.pageSize ?? 10) }),
    isTeacher ? getTeacherHeadClasses(user).then((classes) => ({ classes })) : getAcademicOptions(user),
    canReviewStudentRequests ? getApprovalRequests(user, { status: "pending" }) : Promise.resolve([]),
    getSubjectCombinationCatalog(user).catch(() => ({ customCombinations: [] }))
  ]);
  const pendingStudentRequests = pendingRequests.filter((request) => request.request_type === "admission" || request.request_type === "cancellation");

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <PageHeader
        eyebrow="People"
        title={
          isTeacher ? "My Students" : "Student Management"
        }
        description={isTeacher ? "View the students enrolled in your assigned head class." : "Search, filter, profile, archive, and manage students within the current school tenant."}
        actions={
          <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {hasPermission(user.role, "students:create", user.permissions) ? (
              <StudentActions filters={{ q: params.q, status: params.status ?? "active", classId: params.classId }} />
            ) : null}
            {hasPermission(user.role, "students:create", user.permissions) ? (
              <StudentFormModal
              classes={academics.classes}
              combinations={combinations.customCombinations.map((combination) => ({ value: combination.value, label: combination.name, kind: "custom", classIds: combination.classIds, subjectIds: combination.subjectIds }))}
              onSubmit={createStudentAction}
              submitLabel={user.role === "student_staff" ? "Submit request" : "Add student"}
              initialOpen={params.action === "new"}
            />
          ) : null}
        </div>
        }
      />

      <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-slate-600">
        <Users className="h-4 w-4 text-slate-500" />
        <span>{students.count} students enrolled</span>
      </div>

      <Card className="mb-5 min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
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

      <StudentTable
        rows={students.rows}
        limitedView={isTeacher}
        pagination={{ count: students.count, page: students.page, pageSize: students.pageSize }}
      />
    </div>
  );
}
