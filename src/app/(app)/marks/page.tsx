import Link from "next/link";
import { CheckCircle2, Lock, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { formatExamType, getTeacherMarksWorkspace, majorAssessmentTypes, regularAssessmentTypes } from "@/lib/services/marks";
import { calculateGrade } from "@/lib/grades";
import { createExamAction, saveMarksAction, submitExamForApprovalAction } from "@/app/(app)/marks/actions";
import type { ExamType } from "@/types/database";

const examTypes: Array<{ value: ExamType; label: string; group: "regular" | "major" }> = [
  ...regularAssessmentTypes.map((value) => ({
    value,
    label: formatExamType(value),
    group: "regular" as const
  })),
  ...majorAssessmentTypes.map((value) => ({
    value,
    label: formatExamType(value),
    group: "major" as const
  }))
];

export default async function MarksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("marks:manage");
  const workspace = await getTeacherMarksWorkspace(user, {
    classId: params.classId,
    subjectId: params.subjectId,
    examId: params.examId
  });

  const selectedExam = workspace.selectedExam;
  const locked = selectedExam
    ? selectedExam.requires_approval
      ? selectedExam.status === "approved"
      : false
    : true;
  const requiresApproval = selectedExam?.requires_approval ?? false;

  return (
    <>
      <PageHeader
        eyebrow="Assessment workflow"
        title="Marks Entry"
        description="Create exams only for your assigned classes and subjects. The four official exam types are queued for Principal approval."
        actions={
          <ButtonLink href="/results" variant="secondary">
            Exams & Results
          </ButtonLink>
        }
      />

      {!workspace.options.length ? (
        <EmptyState title="No mark-entry assignments" description="Teachers can enter marks only for classes/subjects assigned to them, or for classes where they are the head teacher." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="grid gap-6 content-start">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Class / Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {workspace.options.map((option) => (
                    <Link
                      key={`${option.class_id}:${option.subject_id}`}
                      href={`/marks?classId=${option.class_id}&subjectId=${option.subject_id}`}
                      className={`rounded-lg border px-3 py-3 text-sm transition ${
                        workspace.selected?.class_id === option.class_id && workspace.selected?.subject_id === option.subject_id
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-outline/50 bg-white hover:bg-surface-low"
                      }`}
                    >
                      <span className="block font-bold">{option.class_name}</span>
                      <span className="text-muted">{option.subject_name}</span>
                      {option.is_head_teacher ? <Badge tone="blue" className="mt-2">Head teacher</Badge> : null}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createExamAction} className="grid gap-3">
                  <input type="hidden" name="class_id" value={workspace.selected?.class_id ?? ""} />
                  <input type="hidden" name="subject_id" value={workspace.selected?.subject_id ?? ""} />
                  <Field label="Assessment type">
                    <Select name="exam_type" defaultValue="quiz">
                      <optgroup label="Regular assessments (auto-approved)">
                        {examTypes
                          .filter((type) => type.group === "regular")
                          .map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Major examinations (requires approval)">
                        {examTypes
                          .filter((type) => type.group === "major")
                          .map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                      </optgroup>
                    </Select>
                  </Field>
                  <Field label="Month (required for Monthly only)">
                    <Select name="month" defaultValue="">
                      <option value="">Not applicable</option>
                      {Array.from({ length: 12 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>
                          {new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Title">
                    <Input name="title" placeholder="Quiz 1, August Monthly, 1st Term..." required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Term">
                      <Input name="term" defaultValue="Term 1" required />
                    </Field>
                    <Field label="Date">
                      <Input name="exam_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                    </Field>
                  </div>
                  <Field label="Max marks">
                    <Input name="max_marks" type="number" min="1" step="0.01" defaultValue="100" required />
                  </Field>
                  <Button type="submit">Create Assessment</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 content-start">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Assessment Register</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    {workspace.selected?.class_name} / {workspace.selected?.subject_name}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {!workspace.exams.length ? (
                  <EmptyState title="No assessments yet" description="Create a regular or major assessment to begin entering marks." />
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {workspace.exams.map((exam: any) => (
                      <Link
                        key={exam.id}
                        href={`/marks?classId=${exam.class_id}&subjectId=${exam.subject_id}&examId=${exam.id}`}
                        className={`rounded-lg border p-3 text-sm transition ${
                          selectedExam?.id === exam.id ? "border-primary bg-primary-soft" : "border-outline/50 bg-white hover:bg-surface-low"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-ink">{exam.title}</p>
                            <p className="text-muted">
                              {formatExamType(exam.exam_type)}{exam.month ? ` / ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, exam.month - 1, 1))}` : ""} / {exam.term}
                            </p>
                          </div>
                          <WorkflowStatusBadge status={exam.workflow_status} />
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {exam.exam_date} / {Number(exam.max_marks)} marks
                          {exam.requires_approval ? " / Requires approval" : " / Auto-approved"}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{selectedExam ? selectedExam.title : "Marks Table"}</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    {selectedExam
                      ? `${formatExamType(selectedExam.exam_type)} / ${selectedExam.term} / ${Number(selectedExam.max_marks)} marks`
                      : "Select an assessment to enter marks."}
                  </p>
                </div>
                {selectedExam ? <WorkflowStatusBadge status={selectedExam.workflow_status} /> : null}
              </CardHeader>
              <CardContent>
                {!selectedExam ? (
                  <EmptyState title="No assessment selected" description="Choose or create an assessment before entering marks." />
                ) : !workspace.roster.length ? (
                  <EmptyState title="No students enrolled in this subject yet" description="Enroll students from the Subjects page before entering marks." />
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
                            const inputDisabled = locked && selectedExam.status !== "rejected";
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
                                  <Badge tone={grade === "F" ? "red" : "green"}>{grade}</Badge>
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
                      <Button type="submit" variant="secondary" disabled={locked && selectedExam.status !== "rejected"}>
                        <CheckCircle2 className="h-4 w-4" /> Save Marks
                      </Button>
                    </div>
                  </form>
                )}

                {selectedExam && requiresApproval && selectedExam.status === "rejected" ? (
                  <form action={submitExamForApprovalAction} className="mt-3 flex justify-end">
                    <input type="hidden" name="exam_id" value={selectedExam.id} />
                    <Button type="submit">
                      <Send className="h-4 w-4" /> Resubmit for Approval
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
