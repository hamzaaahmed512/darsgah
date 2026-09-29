import Link from "next/link";
import { ArrowLeft, Printer, UsersRound } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
import { ReturnApprovedResult } from "@/app/(app)/results/_components/return-approved-result";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getExamResultDetail } from "@/lib/services/marks";
import { formatDisplayName } from "@/lib/student-name";
import { formatClassDisplayName } from "@/lib/utils";

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
            <p className="font-semibold text-ink">{formatDisplayName(exam.uploaded_by_teacher_name) || formatDisplayName(exam.creator?.full_name) || "Teacher"}</p>
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
              {formatClassDisplayName(exam.classes?.grades?.name, exam.classes?.name, exam.classes?.sections?.name) || "Class"}
            </p>
            {exam.classes?.room ? <p className="text-sm text-muted">Room: {exam.classes.room}</p> : null}
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
          <CardTitle>Return instructions</CardTitle>
            <Badge tone="yellow">Returned</Badge>
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

      {detail.canReturn ? (
        <Card className="mb-6 border-warning/30">
          <CardHeader>
            <CardTitle>Approved Result Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-sm text-muted">Return this result if the teacher needs to correct marks or other details. You may include a reason.</p>
            <ReturnApprovedResult examId={exam.id} />
          </CardContent>
        </Card>
      ) : null}

      {detail.canPrint ? (
        <div className="mb-6 flex justify-end">
          <ButtonLink href={`/results/print?classId=${exam.class_id}&examType=${exam.exam_type}${exam.month ? `&month=${exam.month}` : ""}`} target="_blank" className="h-10 w-10 rounded-xl px-0" aria-label="Print result cards">
            <Printer className="h-4 w-4" />
          </ButtonLink>
        </div>
      ) : null}

      <Card className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-xl"><UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />Student Marks</CardTitle>
          <Badge tone={exam.requires_approval ? "yellow" : "blue"}>
            {exam.requires_approval ? "Major assessment" : "Regular assessment"}
          </Badge>
        </div>
        {detail.marks.length ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Admission No.</th>
                    <th className="px-6 py-4">Marks</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.marks.map((row, index) => (
                    <tr key={`${row.admission_number}-${index}`} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(row.student_name)}`}>{getInitials(row.student_name)}</span>
                          <span className="font-semibold text-slate-900">{row.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-slate-700">{row.admission_number}</td>
                      <td className="px-6 py-5 text-slate-700">{row.marks_obtained} / {Number(exam.max_marks)}</td>
                      <td className="px-6 py-5"><span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{row.grade}</span></td>
                      <td className="max-w-sm px-6 py-5 text-slate-600">{row.teacher_comment || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">
              {detail.marks.map((row, index) => (
                <article key={`${row.admission_number}-${index}`} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getStudentAvatarTone(row.student_name)}`}>{getInitials(row.student_name)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{row.student_name}</p>
                        <p className="text-xs text-slate-500">{row.admission_number}</p>
                      </div>
                    </div>
                    <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{row.grade}</span>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Marks</p><p className="mt-1 font-semibold text-slate-700">{row.marks_obtained} / {Number(exam.max_marks)}</p></div>
                    <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Comment</p><p className="mt-1 text-sm text-slate-600">{row.teacher_comment || "—"}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-muted">No marks recorded yet.</p>
        )}
      </Card>

      {user.role === "teacher" && exam.workflowStatus === "rejected" ? (
        <p className="mt-4 text-sm text-muted">
          This result was returned by the Principal. You can correct the marks from the{" "}
          <Link href={`/marks?classId=${exam.class_id}&subjectId=${exam.subject_id}&examId=${exam.id}`} className="font-semibold text-primary">
            Marks Entry
          </Link>{" "}
          page and resubmit it for approval.
        </p>
      ) : null}
    </>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStudentAvatarTone(name: string) {
  const tones = [
    "border-blue-100 bg-blue-50 text-blue-600",
    "border-emerald-100 bg-emerald-50 text-emerald-600",
    "border-violet-100 bg-violet-50 text-violet-600",
    "border-amber-100 bg-amber-50 text-amber-600",
    "border-cyan-100 bg-cyan-50 text-cyan-600"
  ];
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
