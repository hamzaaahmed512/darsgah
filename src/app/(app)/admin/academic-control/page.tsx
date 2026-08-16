import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
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
        description="Review examination configurations, assignments, and student-result approvals."
      />
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Special exam configuration</CardTitle></CardHeader>
          <CardContent>
            {setup.migrationRequired ? (
              <EmptyState title="Database migration required" description="Apply the latest School OS migration to enable special exams." />
            ) : !setup.exams.length ? (
              <EmptyState title="No special exams yet" description="Create special-exam assignments from the academic workflow." />
            ) : (
              <ul className="space-y-3">
                {setup.exams.map((exam: any) => (
                  <li key={exam.id} className="rounded-lg bg-surface-low p-3">
                    <p className="font-semibold">{exam.title}</p>
                    <p className="text-sm text-muted">{exam.classes?.grades?.name} {exam.classes?.name} / {exam.subjects?.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Student Results</CardTitle></CardHeader>
          <CardContent>
            {!results.length ? (
              <EmptyState title="No results found" description="Uploaded major-examination results appear here for approval." />
            ) : <ResultsTable rows={results} showApprovalColumns inlineApproval />}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
