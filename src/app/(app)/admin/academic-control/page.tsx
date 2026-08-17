import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import { createSpecialExamAction } from "@/app/(app)/special-exams/actions";
import { requireUser } from "@/lib/auth/session";
import { getResultsManagementWorkspace } from "@/lib/services/marks";
import { getSpecialExamSetup } from "@/lib/services/special-exams";

export default async function AcademicControlPage() {
  const user = await requireUser("academics:view");

  if (user.role !== "principal") redirect("/academics");

  const [setup, results] = await Promise.all([
    getSpecialExamSetup(user),
    getResultsManagementWorkspace(user, { status: "all" })
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Principal portal"
        title="Academic Control"
        description="Review special exams, teacher assignments, and student-result approvals from one workspace."
      />

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="items-center">
            <div>
              <CardTitle>Create Special Exam</CardTitle>
              <p className="mt-1 text-sm text-muted">Add a special exam for a teacher, class, and subject assignment.</p>
            </div>
            {!setup.migrationRequired ? (
              <Button type="submit" form="special-exam-form">
                Create Special Exam
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {setup.migrationRequired ? (
              <EmptyState title="Database migration required" description="Apply the latest School OS migration to enable special exams." />
            ) : (
              <form id="special-exam-form" action={createSpecialExamAction} className="grid gap-4">
                <Field label="Teacher assignment">
                  <Select name="assignment_key" required>
                    <option value="">Choose teacher / class / subject</option>
                    {setup.assignments.map((assignment) => (
                      <option
                        key={`${assignment.teacher_id}:${assignment.class_id}:${assignment.subject_id}`}
                        value={`${assignment.teacher_id}:${assignment.class_id}:${assignment.subject_id}`}
                      >
                        {assignment.teacher_name} / {assignment.grade_name} {assignment.class_name} / {assignment.subject_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Exam name">
                  <Input name="title" placeholder="Special Exam - Algebra Retake" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Date">
                    <Input name="exam_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  </Field>
                  <Field label="Max marks">
                    <Input name="max_marks" type="number" min="1" step="0.01" defaultValue="100" required />
                  </Field>
                </div>
                <Field label="Term">
                  <Input name="term" defaultValue="Special Exams" required />
                </Field>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Exam Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            {setup.migrationRequired ? (
              <EmptyState title="Special exams unavailable" description="The hosted database does not have the special-exam columns yet." />
            ) : !setup.exams.length ? (
              <EmptyState title="No special exams yet" description="Created exams will appear here for their assigned teacher." />
            ) : (
              <div className="grid gap-3">
                {setup.exams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-outline/60 bg-surface-low p-4 transition hover:border-outline hover:bg-white md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-ink">{exam.title}</p>
                        <Badge tone={exam.approval_status === "approved" ? "green" : exam.approval_status === "pending_approval" ? "yellow" : "gray"}>
                          {exam.approval_status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {exam.classes?.grades?.name} {exam.classes?.name} / {exam.subjects?.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {exam.exam_date} • Max marks {exam.max_marks}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-muted">
                      {exam.teacher?.full_name ?? "Assigned teacher unavailable"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!results.length ? (
            <EmptyState title="No results found" description="Uploaded major-examination results appear here for approval." />
          ) : (
            <ResultsTable rows={results} showApprovalColumns inlineApproval />
          )}
        </CardContent>
      </Card>
    </>
  );
}
