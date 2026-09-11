import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, ClipboardList, Clock3, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import ResultsPage from "@/app/(app)/results/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { getResultsManagementWorkspace } from "@/lib/services/marks";
import type { ResultWorkflowStatus } from "@/types/database";
import { StatCard } from "@/components/dashboard/stat-card";

const statusFilters: Array<{ value: ResultWorkflowStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending" },
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
  const approvedCount = results.filter((row) => row.workflowStatus === "approved").length;
  const pendingCount = results.filter((row) => row.workflowStatus === "pending_approval").length;
  const returnedCount = results.filter((row) => row.workflowStatus === "rejected").length;

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

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Results" value={results.length} hint="In this view" icon={ClipboardList} tone="blue" trend="My class results" />
        <StatCard label="Approved" value={approvedCount} hint="Ready results" icon={CheckCircle2} tone="green" trend={approvedCount ? "Approved" : "None approved yet"} trendTone="positive" />
        <StatCard label="Pending" value={pendingCount} hint="Awaiting review" icon={Clock3} tone="amber" trend={pendingCount ? "Awaiting approval" : "Nothing waiting"} trendTone={pendingCount ? "negative" : "positive"} />
        <StatCard label="Returned" value={returnedCount} hint="Needs revision" icon={Undo2} tone="red" trend={returnedCount ? "Review feedback" : "No revisions"} trendTone={returnedCount ? "negative" : "positive"} />
      </section>
      <section className="mb-5 rounded-[22px] border border-blue-200 bg-white p-4 shadow-[0_10px_28px_rgba(37,99,235,0.04)] sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-primary ring-1 ring-blue-100"><ClipboardList className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-bold text-ink">Filter results</h2><p className="mt-0.5 text-sm text-muted">Find your results by term and review status.</p></div></div>
          <form className="grid gap-3 rounded-[18px] border border-blue-100 bg-blue-50/45 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]" action="/academics/results">
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

          <div className="mt-4 flex flex-wrap gap-2">
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

      </section>
      {!results.length ? (
            <EmptyState
              title="No uploaded results yet"
              description="Assessments appear here after marks are saved. Major examinations show their approval status."
            />
      ) : (
            <ResultsTable rows={results} showApprovalColumns showPrint={false} inlineApproval={false} />
      )}
    </>
  );
}
