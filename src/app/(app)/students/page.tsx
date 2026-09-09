import { Suspense } from "react";
import { CircleMinus, GraduationCap, UserCheck, UsersRound } from "lucide-react";
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
import { StatCard } from "@/components/dashboard/stat-card";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("students:view");
  const isTeacher = user.role === "teacher" || user.role === "head_teacher";
  const canReviewStudentRequests = hasPermission(user.role, "approvals:review", user.permissions);
  const supabase = await createClient();
  const [students, academics, pendingRequests, combinations, genderCounts, studentMetricResult] = await Promise.all([
    getStudents(user, { q: params.q, status: params.status ?? "active", classId: params.classId, page: Number(params.page ?? 1), pageSize: Number(params.pageSize ?? 10) }),
    isTeacher ? getTeacherHeadClasses(user).then((classes) => ({ classes })) : getAcademicOptions(user),
    canReviewStudentRequests ? getApprovalRequests(user, { status: "pending" }) : Promise.resolve([]),
    getSubjectCombinationCatalog(user).catch(() => ({ customCombinations: [] })),
    getStudentGenderCounts(user),
    supabase.from("students").select("status,admission_date").eq("school_id", user.schoolId)
  ]);
  const pendingStudentRequests = pendingRequests.filter((request) => request.request_type === "admission" || request.request_type === "cancellation");
  if (studentMetricResult.error) throw new Error(studentMetricResult.error.message);
  const studentMetrics = studentMetricResult.data ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = studentMetrics.filter((student) => student.admission_date && new Date(student.admission_date) >= monthStart).length;
  const withdrawn = studentMetrics.filter((student) => student.status === "withdrawn" || student.status === "cancelled").length;
  const activeStudents = studentMetrics.filter((student) => student.status === "active").length;

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

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="h-full rounded-[24px] !border-t-4 !border-t-blue-500 p-5 shadow-sm sm:p-6">
          <div className="flex h-full items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:h-16 sm:w-16"><GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Total students</p>
              <p className="mt-2 whitespace-nowrap font-display text-[clamp(1.55rem,2vw,1.875rem)] font-bold leading-none tracking-tight text-ink">{studentMetrics.length.toLocaleString()}</p>
              <div className="mt-3"><GenderCounts male={genderCounts.male} female={genderCounts.female} compact /></div>
            </div>
          </div>
        </Card>
        <StatCard label="Active students" value={activeStudents} hint="Currently enrolled and active" icon={UsersRound} tone="purple" trend="Active records" trendTone="positive" />
        <StatCard label="New admissions" value={newThisMonth} hint="Students added this month" icon={UserCheck} tone="green" trend="This month" trendTone="positive" />
        <StatCard label="Withdrawn" value={withdrawn} hint="Cancelled or withdrawn records" icon={CircleMinus} tone="red" trend="School records" trendTone="negative" />
      </section>

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

      <StudentTable rows={students.rows} limitedView={isTeacher} pagination={{ count: students.count, page: students.page, pageSize: students.pageSize }} />
    </div>
  );
}
