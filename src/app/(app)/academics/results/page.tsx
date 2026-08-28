import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import ResultsPage from "@/app/(app)/results/page";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { getResultsManagementWorkspace } from "@/lib/services/marks";
import type { ResultWorkflowStatus } from "@/types/database";

const statusFilters: Array<{ value: ResultWorkflowStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

export default async function AcademicResultsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await props.searchParams;
  const user = await requireUser("results:view");
  const status = (params.status as ResultWorkflowStatus | "all" | undefined) ?? "all";
  const isPrincipalTeacher = user.role === "principal" && await principalCanAccessAcademicControl(user);

  if (user.role === "principal" && !isPrincipalTeacher) redirect("/results");
  if (!isPrincipalTeacher && !hasPermission(user.role, "marks:manage", user.permissions)) {
    return <ResultsPage searchParams={Promise.resolve(params)} />;
  }

  const results = await getResultsManagementWorkspace(user, {
    classId: params.classId,
    term: params.term,
    status,
    scope: "teacher"
  });

  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Results"
        description="Review your uploaded assessments and approval status for major examinations."
        actions={
          isPrincipalTeacher ? (
            <>
              <ButtonLink href="/results" variant="secondary">
                Whole School Results
              </ButtonLink>
              <ButtonLink href="/academics/results" variant="primary">
                <BookOpen className="h-4 w-4" /> My Class Results
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/academics/exams-setup" variant="secondary">
              Assessments
            </ButtonLink>
          )
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My Exams & Results</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" action="/academics/results">
            <Field label="Term">
              <Input name="term" defaultValue={params.term ?? ""} placeholder="Filter by term" />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={status}>
                {statusFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <button className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">
                Filter
              </button>
            </div>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            {statusFilters.map((item) => (
              <Link
                key={item.value}
                href={`/academics/results?status=${item.value}${params.term ? `&term=${encodeURIComponent(params.term)}` : ""}`}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${status === item.value ? "bg-primary text-white" : "bg-white text-muted hover:bg-surface-low"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {!results.length ? (
            <EmptyState
              title="No uploaded results yet"
              description="Assessments appear here after marks are saved. Major examinations show their approval status."
            />
          ) : (
            <ResultsTable rows={results} showApprovalColumns showPrint={false} inlineApproval={false} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
