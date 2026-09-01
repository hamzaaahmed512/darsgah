import { ArrowLeft, CheckCircle2, Lock, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { calculateGrade } from "@/lib/grades";
import { formatExamType, getTeacherMarksWorkspace } from "@/lib/services/marks";
import { saveMarksAction, submitExamForApprovalAction } from "@/app/(app)/marks/actions";

function assessmentsHref(basePath: string, classId?: string, subjectId?: string) {
  const query = new URLSearchParams();
  if (classId) query.set("classId", classId);
  if (subjectId) query.set("subjectId", subjectId);
  const qs = query.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export async function MarkAssessmentView({
  params,
  searchParams,
  basePath = "/academics/exams-setup"
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
  basePath?: string;
}) {
  const [{ examId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser("academics:view");
  const workspace = await getTeacherMarksWorkspace(user, {
    classId: query.classId,
    subjectId: query.subjectId,
    examId
  });
  const selectedExam = workspace.selectedExam;
  const locked = selectedExam
    ? selectedExam.requires_approval
      ? selectedExam.status === "approved"
      : false
    : true;
  const inputDisabled = locked && selectedExam?.status !== "rejected";

  return (
    <>
      <PageHeader
        eyebrow="Assessment marking"
        title={selectedExam ? selectedExam.title : "Mark Assessment"}
        description={
          selectedExam
            ? `${workspace.selected?.class_name ?? "Class"} / ${workspace.selected?.subject_name ?? "Subject"} / ${formatExamType(selectedExam.exam_type)}`
            : "Open an assessment from the assessment list."
        }
        actions={
          <ButtonLink href={assessmentsHref(basePath, workspace.selected?.class_id, workspace.selected?.subject_id)} variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Assessments
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{selectedExam ? "Student Marks" : "Assessment Not Found"}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              {selectedExam
                ? `${selectedExam.term} / ${selectedExam.exam_date} / ${Number(selectedExam.max_marks)} marks`
                : "The assessment may not belong to your assigned class and subject."}
            </p>
          </div>
          {selectedExam ? <WorkflowStatusBadge status={selectedExam.workflow_status} /> : null}
        </CardHeader>
        <CardContent>
          {!selectedExam ? (
            <EmptyState title="Assessment unavailable" description="Go back to the assessment list and choose an assessment assigned to you." />
          ) : !workspace.roster.length ? (
            <EmptyState title="No eligible students" description="Assign active students to this class and subject combination before entering marks." />
          ) : (
            <form action={saveMarksAction} className="grid gap-4">
              <input type="hidden" name="exam_id" value={selectedExam.id} />
              {locked ? (
                <div className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
                  <Lock className="h-4 w-4" />
                  This result set is final and locked after Principal approval.
                </div>
              ) : null}
              {selectedExam.status === "rejected" && selectedExam.rejection_reason ? (
                <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  <p className="font-semibold">Principal feedback</p>
                  <p className="mt-1">{selectedExam.rejection_reason}</p>
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
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
                    {workspace.roster.map((student) => {
                      const value = student.mark?.marks_obtained ?? "";
                      const grade = student.mark?.grade ?? (value === "" ? "-" : calculateGrade(Number(value), Number(selectedExam.max_marks)));
                      return (
                        <tr key={student.student_id} className="border-b border-outline/25">
                          <td className="py-3 pr-3 font-semibold">{student.student_name}</td>
                          <td className="py-3 pr-3 text-muted">{student.admission_number}</td>
                          <td className="py-3 pr-3">
                            <Input
                              name={`mark_${student.student_id}`}
                              type="number"
                              min="0"
                              max={Number(selectedExam.max_marks)}
                              step="0.01"
                              defaultValue={value}
                              disabled={inputDisabled}
                              required
                            />
                          </td>
                          <td className="py-3 pr-3">
                            <Badge tone={grade === "F" ? "red" : grade === "-" ? "gray" : "green"}>{grade}</Badge>
                          </td>
                          <td className="py-3 pr-3">
                            <Input
                              name={`comment_${student.student_id}`}
                              defaultValue={student.mark?.teacher_comment ?? ""}
                              disabled={inputDisabled}
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="submit" variant="secondary" disabled={inputDisabled}>
                  <CheckCircle2 className="h-4 w-4" /> {selectedExam.is_marked ? "Update Marks" : "Save Marks"}
                </Button>
              </div>
            </form>
          )}

          {selectedExam && selectedExam.requires_approval && selectedExam.status === "rejected" ? (
            <form action={submitExamForApprovalAction} className="mt-3 flex justify-end">
              <input type="hidden" name="exam_id" value={selectedExam.id} />
              <Button type="submit">
                <Send className="h-4 w-4" /> Resubmit for Approval
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
