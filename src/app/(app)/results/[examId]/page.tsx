import Link from "next/link";
import { ArrowLeft, Printer, Activity, School, Target } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
import { ReturnApprovedResult } from "@/app/(app)/results/_components/return-approved-result";
import { ResultDetailTable } from "@/app/(app)/results/[examId]/_components/result-detail-table";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getExamResultDetail } from "@/lib/services/marks";
import { formatClassDisplayName } from "@/lib/utils";


export default async function ResultDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const user = await requireUser("results:view");
  const detail = await getExamResultDetail(user, examId);
  const exam: any = detail.exam;

  const marksList = detail.marks.filter((m: any) => !m.is_absent && m.marks_obtained != null).map((m: any) => Number(m.marks_obtained));
  const highestMarks = marksList.length > 0 ? Math.max(...marksList) : 0;
  const lowestMarks = marksList.length > 0 ? Math.min(...marksList) : 0;
  const totalStudents = detail.marks.length;
  const failedStudentsCount = detail.marks.filter((m: any) => m.grade === "F").length;
  const passedStudentsCount = detail.marks.filter((m: any) => !m.is_absent && m.marks_obtained != null && m.grade !== "F").length;
  const passedPercentage = totalStudents > 0 ? Math.round((passedStudentsCount / totalStudents) * 100) : 0;
  const maxMarks = Number(exam.max_marks);
  const above90Count = maxMarks > 0 ? detail.marks.filter((m: any) => !m.is_absent && m.marks_obtained != null && (Number(m.marks_obtained) / maxMarks) >= 0.9).length : 0;

  return (
    <>
      <PageHeader
        title={exam.title}
        eyebrow="Result detail"
        description={`${formatExamType(exam.exam_type)} / ${exam.term} / ${exam.subjects?.name ?? "Subject"}`}
        actions={
          <ButtonLink href="/results" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to Results
          </ButtonLink>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Class / Section"
          value={
            <span className="text-xl">
              {formatClassDisplayName(exam.classes?.grades?.name, exam.classes?.name, exam.classes?.sections?.name) || "Class"}
            </span>
          }
          hint={exam.classes?.room ? `Room: ${exam.classes.room}` : "No room assigned"}
          icon={School}
          tone="amber"
        />
        <StatCard
          label="Total Marks"
          value={<span className="text-xl">{exam.max_marks}</span>}
          hint={
            <span className="flex flex-col gap-1 mt-1 text-xs">
              <span className="font-semibold text-emerald-600">Highest {highestMarks}</span>
              <span className="font-semibold text-red-500">Lowest {lowestMarks}</span>
            </span>
          }
          icon={Activity}
          tone="purple"
        />
        <StatCard
          label="Student Performance"
          value={<span className="text-xl">{passedPercentage}% Students Passed</span>}
          hint={
            <span className="flex flex-col gap-1 mt-1 text-xs">
              <span className="font-semibold text-emerald-600">{above90Count} student{above90Count === 1 ? "" : "s"} scored above 90%</span>
              <span className="font-semibold text-red-500">{failedStudentsCount} student{failedStudentsCount === 1 ? "" : "s"} failed</span>
            </span>
          }
          icon={Target}
          tone="green"
        />
      </section>

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

      <ResultDetailTable marks={detail.marks as any} maxMarks={Number(exam.max_marks)} requiresApproval={exam.requires_approval} />

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
