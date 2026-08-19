import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getExamResultDetail } from "@/lib/services/marks";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function ResultDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireUser("results:view");
  const detail = await getExamResultDetail(user, examId);
  const exam: any = detail.exam;

  return (
    <>
      <PageHeader
        eyebrow="Result detail"
        title={exam.title}
        description={`${formatExamType(exam.exam_type)} / ${exam.term} / ${exam.subjects?.name ?? "Subject"}`}
        actions={
          <ButtonLink href="/results" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to Results
          </ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <WorkflowStatusBadge status={exam.workflowStatus} />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uploaded By</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-ink">{exam.uploaded_by_teacher_name ?? exam.creator?.full_name ?? "Teacher"}</p>
            <p className="text-xs text-muted">{exam.uploaded_by_teacher_id ?? exam.creator?.id ?? "—"}</p>
            <p className="mt-2 text-sm text-muted">{formatDateTime(exam.uploaded_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Class / Section</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-ink">
              {exam.classes?.grades?.name ? `${exam.classes.grades.name} / ` : ""}
              {exam.classes?.name}
            </p>
            <p className="text-sm text-muted">{exam.classes?.sections?.name ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved By</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-ink">{exam.approved_by_principal_name ?? "—"}</p>
            <p className="text-xs text-muted">{exam.approved_by_principal_id ?? "—"}</p>
            <p className="mt-2 text-sm text-muted">{formatDateTime(exam.approved_at)}</p>
          </CardContent>
        </Card>
      </div>

      {exam.rejection_reason ? (
        <Card className="mb-6 border-danger/30">
          <CardHeader>
            <CardTitle>Rejection Reason</CardTitle>
            <Badge tone="red">Rejected</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink">{exam.rejection_reason}</p>
          </CardContent>
        </Card>
      ) : null}

      {detail.canApprove && detail.approval?.id ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Principal Review</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalActions approvalId={detail.approval.id} />
          </CardContent>
        </Card>
      ) : null}

      {detail.canPrint ? (
        <div className="mb-6 flex justify-end">
          <ButtonLink href={`/results/print?classId=${exam.class_id}&examType=${exam.exam_type}${exam.month ? `&month=${exam.month}` : ""}`} target="_blank">
            <Printer className="h-4 w-4" /> Print Result Cards
          </ButtonLink>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Student Marks</CardTitle>
          <Badge tone={exam.requires_approval ? "yellow" : "blue"}>
            {exam.requires_approval ? "Major assessment" : "Regular assessment"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline/40 text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-3">Student</th>
                  <th className="py-3 pr-3">Admission #</th>
                  <th className="py-3 pr-3">Marks</th>
                  <th className="py-3 pr-3">Grade</th>
                  <th className="py-3 pr-3">Comment</th>
                </tr>
              </thead>
              <tbody>
                {detail.marks.map((row, index) => (
                  <tr key={`${row.admission_number}-${index}`} className="border-b border-outline/25">
                    <td className="py-3 pr-3 font-semibold">{row.student_name}</td>
                    <td className="py-3 pr-3 text-muted">{row.admission_number}</td>
                    <td className="py-3 pr-3">
                      {row.marks_obtained} / {Number(exam.max_marks)}
                    </td>
                    <td className="py-3 pr-3 font-bold">{row.grade}</td>
                    <td className="py-3 pr-3 text-muted">{row.teacher_comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!detail.marks.length ? <p className="text-sm text-muted">No marks recorded yet.</p> : null}
        </CardContent>
      </Card>

      {user.role === "teacher" && exam.workflowStatus === "rejected" ? (
        <p className="mt-4 text-sm text-muted">
          This result was rejected. You can edit marks from the{" "}
          <Link href={`/marks?classId=${exam.class_id}&subjectId=${exam.subject_id}&examId=${exam.id}`} className="font-semibold text-primary">
            Marks Entry
          </Link>{" "}
          page and resubmit for approval.
        </p>
      ) : null}
    </>
  );
}
