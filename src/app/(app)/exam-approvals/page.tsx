
import Link from "next/link";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { requireUser } from "@/lib/auth/session";
import { formatExamType, getPrincipalExamApprovals, getWorkflowStatusFromExam } from "@/lib/services/marks";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { formatDisplayName } from "@/lib/student-name";
import { formatClassDisplayName } from "@/lib/utils";
import type { ResultApprovalStatus } from "@/types/database";
import { redirect } from "next/navigation";

const statusTone = {
  pending: "yellow",
  approved: "green",
  rejected: "red"
} as const;

export default async function ExamApprovalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("marks:approve");
  if (!(await principalCanAccessAcademicControl(user))) redirect("/unauthorized");

  const status = (params.status as ResultApprovalStatus | "all" | undefined) ?? "pending";
  const approvals = await getPrincipalExamApprovals(user, status);

  return (
    <>
      <PageHeader
        eyebrow="Principal review"
        title="Exam Result Approvals"
        description="Approve finalized special exam results or return them with correction instructions for the teacher."
        actions={
          <Link href="/results" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            Open Results Dashboard
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((item) => (
          <a
            key={item}
            href={`/exam-approvals?status=${item}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${status === item ? "bg-primary text-white" : "bg-white text-muted hover:bg-surface-low"}`}
          >
            {item === "rejected" ? "returned" : item}
          </a>
        ))}
      </div>

      {!approvals.length ? (
        <EmptyState title="No exam approvals" description="Monthly, 1st Term, 2nd Term, and 3rd Term exams will appear here." />
      ) : (
        <div className="grid gap-4">
          {approvals.map((approval: any) => {
            const exam = approval.exams;
            return (
              <Card key={approval.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{exam?.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted">
                      {formatClassDisplayName(exam?.classes?.grades?.name, exam?.classes?.name, exam?.classes?.sections?.name)} / {exam?.subjects?.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatExamType(exam?.exam_type)} / {exam?.term} / {exam?.exam_date}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Uploaded by {formatDisplayName(exam?.uploaded_by_teacher_name) || formatDisplayName(approval.submitter?.full_name) || formatDisplayName(exam?.creator?.full_name) || "Teacher"}
                      {exam?.uploaded_by_teacher_id ? ` (${exam.uploaded_by_teacher_id.slice(0, 8)}…)` : ""}
                      {exam?.uploaded_at ? ` on ${new Date(exam.uploaded_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={statusTone[approval.status as keyof typeof statusTone]}>{approval.status}</Badge>
                    {exam ? <WorkflowStatusBadge status={getWorkflowStatusFromExam(exam)} /> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {approval.status === "pending" ? (
                    <div className="flex justify-end pt-2">
                      <Link
                        href={`/exam-approvals/review/${approval.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                      >
                        Review and Decide
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-surface-low p-3 text-sm">
                      <p className="font-semibold text-ink">Principal comment</p>
                      <p className="mt-1 text-muted">{approval.principal_comment || "No comment provided."}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
