import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getExamResultsForReviewByApprovalId } from "@/lib/services/marks";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { reviewExamApprovalAction } from "@/app/(app)/exam-approvals/actions";

export default async function ExamApprovalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("marks:approve");
  if (!(await principalCanAccessAcademicControl(user))) redirect("/unauthorized");

  let reviewData;
  try {
    reviewData = await getExamResultsForReviewByApprovalId(user, id);
  } catch {
    notFound();
  }

  const { approval, exam, marks } = reviewData;

  // Calculate statistics
  const totalStudents = marks.length;
  const gradedCount = marks.filter((m: any) => m.marks_obtained !== null).length;
  const validMarks = marks.filter((m: any) => typeof m.marks_obtained === "number").map((m: any) => m.marks_obtained);
  const averageMarks = validMarks.length ? (validMarks.reduce((a: number, b: number) => a + b, 0) / validMarks.length).toFixed(1) : "N/A";
  const highestMarks = validMarks.length ? Math.max(...validMarks) : "N/A";
  const lowestMarks = validMarks.length ? Math.min(...validMarks) : "N/A";

  const isPending = approval.status === "pending";

  return (
    <>
      <div className="mb-4">
        <Link href="/exam-approvals" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink transition">
          <ChevronLeft className="h-4 w-4" /> Back to Approvals
        </Link>
      </div>

      <PageHeader
        eyebrow="Review Results"
        title={exam.title}
        description="Verify marks and grades before approving this result set for publication."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Main Content: Student List */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-outline/40">
              <CardTitle>Student Results ({totalStudents})</CardTitle>
              <Badge tone="gray">Max Marks: {exam.max_marks}</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Admission #</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40">
                  {marks.map((m: any) => (
                    <tr key={m.id} className="hover:bg-surface-low/50">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {m.students?.first_name} {m.students?.last_name}
                      </td>
                      <td className="px-4 py-3 text-muted">{m.students?.admission_number || "—"}</td>
                      <td className="px-4 py-3">
                        {m.marks_obtained !== null ? (
                          <span className="font-semibold text-ink">{m.marks_obtained}</span>
                        ) : (
                          <span className="text-muted italic">N/A</span>
                        )}
                        <span className="text-muted text-xs"> / {exam.max_marks}</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.grade ? <Badge tone="blue">{m.grade}</Badge> : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted max-w-[200px] truncate" title={m.teacher_comment}>
                        {m.teacher_comment || "—"}
                      </td>
                    </tr>
                  ))}
                  {marks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        No students found for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar: Details & Decision */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-outline/40">
              <CardTitle>Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-ink">Class & Subject</p>
                <p className="text-muted mt-1">{exam.classes?.grades?.name} {exam.classes?.name && `/ ${exam.classes.name}`} / {exam.subjects?.name}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Type & Term</p>
                <p className="text-muted mt-1">{formatExamType(exam.exam_type)} / {exam.term}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">Submitted By</p>
                <p className="text-muted mt-1">{approval.submitter?.full_name ?? "Teacher"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-outline/40">
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 text-center text-sm">
              <div className="rounded-lg bg-surface-low p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Graded</p>
                <p className="mt-1 font-display text-xl font-bold text-ink">{gradedCount} <span className="text-sm font-normal text-muted">/ {totalStudents}</span></p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Average</p>
                <p className="mt-1 font-display text-xl font-bold text-ink">{averageMarks}</p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Highest</p>
                <p className="mt-1 font-display text-xl font-bold text-success">{highestMarks}</p>
              </div>
              <div className="rounded-lg bg-surface-low p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">Lowest</p>
                <p className="mt-1 font-display text-xl font-bold text-danger">{lowestMarks}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-outline/40">
              <CardTitle>Principal Decision</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isPending ? (
                <form action={reviewExamApprovalAction.bind(null, approval.id)} className="grid gap-4">
                  <Textarea name="principal_comment" placeholder="Optional Principal comment" className="min-h-[100px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="submit" name="decision" value="rejected" variant="secondary" className="text-danger hover:bg-danger-soft border border-danger/20 w-full">
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button type="submit" name="decision" value="approved" className="bg-success text-white hover:bg-success/90 w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className={`flex items-center gap-2 font-semibold p-3 rounded-lg ${approval.status === "approved" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                    {approval.status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    This result set was {approval.status}.
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Comment provided:</p>
                    <p className="text-muted mt-1 rounded-lg bg-surface-low p-3 italic">
                      {approval.principal_comment || "No comment provided."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
