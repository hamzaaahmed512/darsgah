import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentTable } from "@/components/students/student-table";
import { StudentFilterForm } from "@/components/students/student-filter-form";
import { StudentFormModal } from "@/components/students/student-form-modal";
import { StudentActions } from "@/components/students/student-actions";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getStudentGenderCounts, getStudents } from "@/lib/services/students";
import { getApprovalRequests } from "@/lib/services/approvals";
import { getAcademicOptions, getTeacherHeadClasses } from "@/lib/services/academics";
import { getSubjectCombinationCatalog } from "@/lib/services/student-combinations";
import { hasPermission } from "@/lib/permissions";
import { createStudentAction } from "@/app/(app)/students/actions";
import { GenderCounts } from "@/components/students/gender-counts";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("students:view");
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  const canReviewStudentRequests = hasPermission(user.role, "approvals:review", user.permissions);
  const [students, academics, pendingRequests, combinations, genderCounts] = await Promise.all([
    getStudents(user, { q: params.q, status: params.status ?? "active", classId: params.classId, page: Number(params.page ?? 1), pageSize: Number(params.pageSize ?? 10) }),
    isTeacher ? getTeacherHeadClasses(user).then((classes) => ({ classes })) : getAcademicOptions(user),
    canReviewStudentRequests ? getApprovalRequests(user, { status: "pending" }) : Promise.resolve([]),
    getSubjectCombinationCatalog(user).catch(() => ({ customCombinations: [] })),
    getStudentGenderCounts(user)
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

      <Card className="mb-5 overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70 shadow-[0_16px_45px_rgba(37,99,235,0.08)]">
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.24)] sm:h-16 sm:w-16">
              <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Student enrollment</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{students.count.toLocaleString()}</span>
                <span className="text-sm font-semibold text-slate-600">{students.count === 1 ? "student enrolled" : "students enrolled"}</span>
              </div>
              <p className="mt-1 text-sm text-muted">Active student records in the current view</p>
            </div>
          </div>
          <GenderCounts male={genderCounts.male} female={genderCounts.female} />
        </CardContent>
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

      <Card className="mb-5 min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <Suspense>
          <StudentFilterForm classes={academics.classes} limitedView={isTeacher} />
        </Suspense>
      </Card>

      <StudentTable
        rows={students.rows}
        limitedView={isTeacher}
        pagination={{ count: students.count, page: students.page, pageSize: students.pageSize }}
      />
    </div>
  );
}
