import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ResultCardsFilters, ResultCardsPanel } from "@/app/(app)/results/_components/result-cards-panel";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getResultCardsWorkspace, getResultsManagementWorkspace } from "@/lib/services/marks";
import type { ResultWorkflowStatus, UserRole } from "@/types/database";

const statusFilters: Array<{ value: ResultWorkflowStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

function roleDescription(role: UserRole) {
  if (role === "teacher") return "Review every result you have uploaded, including approval status for major examinations.";
  if (role === "principal") return "Review uploaded major examination results, approve or reject them, and track ownership.";
  if (role === "student_staff") return "View approved major examinations and print official result cards when ready.";
  return "Monitor result uploads, approval status, and registrar printing readiness.";
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("results:view");
  const status = (params.status as ResultWorkflowStatus | "all" | undefined) ?? "all";
  const view = params.view ?? (user.role === "student_staff" ? "cards" : "management");

  const [results, cardsWorkspace] = await Promise.all([
    getResultsManagementWorkspace(user, { classId: params.classId, term: params.term, status }),
    user.role === "student_staff" && hasPermission(user.role, "results:generate", user.permissions)
      ? getResultCardsWorkspace(user, {
          classId: params.classId,
          examType: params.examType as any,
          month: params.month ? Number(params.month) : undefined
        })
      : Promise.resolve(null)
  ]);

  const pendingCount = results.filter((row) => row.workflowStatus === "pending_approval").length;
  const showCards = user.role === "student_staff" || view === "cards";

  return (
    <>
      <PageHeader
        eyebrow="Results management"
        title={user.role === "teacher" ? "My Exams & Results" : user.role === "principal" ? "Exam & Result Approvals" : "Exams & Results"}
        description={roleDescription(user.role)}
      />

      {user.role === "principal" ? (
        <div className="mb-5 rounded-lg bg-warning-soft p-4 text-sm font-semibold text-warning">
          {pendingCount
            ? `${pendingCount} major examination result${pendingCount === 1 ? "" : "s"} awaiting your approval.`
            : "No major examination results are currently pending approval."}
        </div>
      ) : null}

      {user.role === "student_staff" ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/results?view=management"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${view !== "cards" ? "bg-primary text-white" : "bg-white text-muted hover:bg-surface-low"}`}
          >
            Approved Results
          </Link>
          <Link
            href="/results?view=cards"
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${view === "cards" ? "bg-primary text-white" : "bg-white text-muted hover:bg-surface-low"}`}
          >
            Result Cards
          </Link>
        </div>
      ) : null}

      {showCards && cardsWorkspace ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Result Card Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultCardsFilters workspace={cardsWorkspace} />
          </CardContent>
        </Card>
      ) : null}

      {!showCards || user.role !== "student_staff" ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{user.role === "teacher" ? "Uploaded Results" : user.role === "principal" ? "Major Examination Review" : "Result Register"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" action="/results">
              {user.role === "student_staff" ? <input type="hidden" name="view" value="management" /> : null}
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
                  href={`/results?status=${item.value}${params.term ? `&term=${encodeURIComponent(params.term)}` : ""}${user.role === "student_staff" ? "&view=management" : ""}`}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${status === item.value ? "bg-primary text-white" : "bg-white text-muted hover:bg-surface-low"}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {!results.length ? (
              <EmptyState
                title={user.role === "teacher" ? "No uploaded results yet" : "No results found"}
                description={
                  user.role === "teacher"
                    ? "Quiz and class test marks are approved immediately. Major examinations appear here after you submit them for approval."
                    : "Uploaded major examination results will appear here."
                }
              />
            ) : (
              <ResultsTable
                rows={results}
                showApprovalColumns
                showPrint={user.role === "student_staff"}
                inlineApproval={user.role === "principal"}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {showCards && cardsWorkspace ? <ResultCardsPanel workspace={cardsWorkspace} /> : null}
    </>
  );
}
