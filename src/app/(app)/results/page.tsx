import Link from "next/link";
import { BookOpen, ClipboardList, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ResultCardsFilters, ResultCardsPanel } from "@/app/(app)/results/_components/result-cards-panel";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { principalCanAccessAcademicControl } from "@/lib/services/academics";
import { getResultCardsWorkspace, getResultsManagementWorkspace } from "@/lib/services/marks";
import type { ResultWorkflowStatus, UserRole } from "@/types/database";

const statusFilters: Array<{ value: ResultWorkflowStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Returned" }
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
  const canViewOwnClassResults = user.role === "principal" && await principalCanAccessAcademicControl(user);
  const canGenerateCards = hasPermission(user.role, "results:generate", user.permissions);

  const [results, cardsWorkspace] = await Promise.all([
    getResultsManagementWorkspace(user, { classId: params.classId, term: params.term, status }),
    canGenerateCards
      ? getResultCardsWorkspace(user, {
          classId: params.classId,
          examType: params.examType as any,
          month: params.month ? Number(params.month) : undefined
        })
      : Promise.resolve(null)
  ]);

  const pendingCount = results.filter((row) => row.workflowStatus === "pending_approval").length;
  const showCards = canGenerateCards && (user.role === "student_staff" || view === "cards");

  return (
    <>
      <PageHeader
        eyebrow="Results management"
        title={user.role === "teacher" ? "My Exams & Results" : user.role === "principal" ? "Exam & Result Approvals" : "Exams & Results"}
        description={roleDescription(user.role)}
        actions={
          canViewOwnClassResults ? (
            <>
              <ButtonLink href="/results" variant="primary">
                Whole School Results
              </ButtonLink>
              <ButtonLink href="/academics/results" variant="secondary">
                <BookOpen className="h-4 w-4" /> My Class Results
              </ButtonLink>
            </>
          ) : null
        }
      />

      {user.role === "principal" ? (
        <div className="mb-5 rounded-[22px] bg-warning-soft px-5 py-4 text-sm font-semibold text-warning">
          {pendingCount
            ? `${pendingCount} major examination result${pendingCount === 1 ? "" : "s"} awaiting your approval.`
            : "No major examination results are currently pending approval."}
        </div>
      ) : null}

      {canGenerateCards ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/results?view=management"
            className={`inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-semibold transition ${view !== "cards" ? "bg-primary text-white shadow-button" : "bg-white text-muted ring-1 ring-outline hover:bg-surface-low"}`}
          >
            Approved Results
          </Link>
          <Link
            href="/results?view=cards"
            className={`inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-semibold transition ${view === "cards" ? "bg-primary text-white shadow-button" : "bg-white text-muted ring-1 ring-outline hover:bg-surface-low"}`}
          >
            Result Cards
          </Link>
        </div>
      ) : null}

      {showCards && cardsWorkspace ? (
        <Card className="mb-6 rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="gap-4 border-b border-outline/50 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.5rem]">Result Card Filters</CardTitle>
                <p className="mt-1 text-sm text-muted">Select the class and examination set for result card printing.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResultCardsFilters workspace={cardsWorkspace} />
          </CardContent>
        </Card>
      ) : null}

      {!showCards ? (
        <Card className="mb-6 rounded-[30px] border border-outline/70 bg-white shadow-card">
          <CardHeader className="gap-4 border-b border-outline/50 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-blue-50 text-primary">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-[1.5rem]">{user.role === "teacher" ? "Uploaded Results" : user.role === "principal" ? "Major Examination Review" : "Result Register"}</CardTitle>
                <p className="mt-1 text-sm text-muted">Filter results by term and workflow status.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="mb-5 grid gap-3 rounded-[24px] border border-outline/60 bg-slate-50/60 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" action="/results">
              {user.role === "student_staff" ? <input type="hidden" name="view" value="management" /> : null}
              <Field label="Term">
                <Input name="term" defaultValue={params.term ?? ""} placeholder="Filter by term" className="h-12 rounded-2xl border-outline/70 shadow-none" />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-outline/70 shadow-none">
                  {statusFilters.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <button className="min-h-12 rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button" type="submit">
                  Filter
                </button>
              </div>
            </form>

            <div className="mb-4 flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <Link
                  key={item.value}
                  href={`/results?status=${item.value}${params.term ? `&term=${encodeURIComponent(params.term)}` : ""}${user.role === "student_staff" ? "&view=management" : ""}`}
                  className={`inline-flex min-h-10 items-center rounded-2xl px-4 text-sm font-semibold transition ${status === item.value ? "bg-primary text-white shadow-button" : "bg-white text-muted ring-1 ring-outline hover:bg-surface-low"}`}
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
