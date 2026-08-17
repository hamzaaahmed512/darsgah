import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SpecialExamCreateModal } from "@/components/special-exams/special-exam-create-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
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
        description="Review student results first, then inspect special-exam configurations below."
        actions={<SpecialExamCreateModal assignments={setup.assignments} migrationRequired={setup.migrationRequired} />}
      />

      <Card>
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

      <Card className="mt-6">
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
                  <p className="text-sm font-semibold text-muted">{exam.teacher?.full_name ?? "Assigned teacher unavailable"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
