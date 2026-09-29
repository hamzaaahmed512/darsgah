import Link from "next/link";
import { BookOpen, CheckCircle2, ClipboardList, Clock3, FileText, Undo2 } from "lucide-react";
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
import { ReportGenerator } from "@/components/reports/report-generator";
import { StatCard } from "@/components/dashboard/stat-card";
import { paginateRows } from "@/lib/pagination";

const statusFilters: Array<{ value: ResultWorkflowStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Returned" }
];

function roleDescription(role: UserRole) {
  if (role === "teacher") return "Review every result you have uploaded, including approval status for major examinations.";
  if (role === "principal") return "Review and approve uploaded results, then generate and print official result cards for the school.";
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
          sessionId: params.sessionId,
          classId: params.classId,
          examType: params.examType as any,
          month: params.month ? Number(params.month) : undefined
        })
      : Promise.resolve(null)
  ]);

  const pendingCount = results.filter((row) => row.workflowStatus === "pending_approval").length;
  const approvedCount = results.filter((row) => row.workflowStatus === "approved").length;
  const returnedCount = results.filter((row) => row.workflowStatus === "rejected").length;
  const showCards = canGenerateCards && (user.role === "student_staff" || view === "cards");
  const paginatedResults = paginateRows(results, params.page, params.pageSize);

  return (
    <>
      {params.print === "1" ? <ReportGenerator title="Results Register" autoOpen headers={["Result", "Status"]} data={results.map((row) => [row.title, row.workflowStatus])} /> : null}
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
            <CheckCircle2 className="h-4 w-4" />
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
        <>
          <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="kpi-card h-full rounded-[24px] !border-t-4 !border-t-blue-500 p-5 shadow-sm sm:p-6">
              <div className="flex h-full items-start gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 sm:h-16 sm:w-16"><ClipboardList className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Total Results</p>
                  <p className="mt-2 whitespace-nowrap font-display text-[clamp(1.55rem,2vw,1.875rem)] font-bold leading-none tracking-tight text-ink">{results.length}</p>
                  <div className="mt-3 text-sm font-medium text-muted">In this view</div>
                </div>
              </div>
            </Card>
            <StatCard label="Approved" value={approvedCount} hint="Ready for use" icon={CheckCircle2} tone="green" trend={approvedCount ? "Approved results" : "None approved yet"} trendTone="positive" />
            <StatCard label="Pending" value={pendingCount} hint="Awaiting review" icon={Clock3} tone="amber" trend={pendingCount ? "Action needed" : "Nothing waiting"} trendTone={pendingCount ? "negative" : "positive"} />
            <StatCard label="Returned" value={returnedCount} hint="Needs revision" icon={Undo2} tone="red" trend={returnedCount ? "Teacher follow-up" : "No revisions"} trendTone={returnedCount ? "negative" : "positive"} />
          </section>

          <Card className="mb-5 min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:p-5">
            <form className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_260px_200px]" action="/results">
              {user.role === "student_staff" ? <input type="hidden" name="view" value="management" /> : null}
              <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-600">
                <span>Term</span>
                <Input name="term" defaultValue={params.term ?? ""} placeholder="Filter by term..." className="min-h-12 min-w-0 rounded-xl border-blue-100 bg-blue-50/70 text-sm shadow-none placeholder:text-slate-400 focus:border-primary/30 focus:bg-white sm:min-h-14 sm:rounded-2xl sm:text-base" />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-600">
                <span>Status</span>
                <Select name="status" defaultValue={status} className="min-h-12 min-w-0 rounded-xl border-slate-200 text-sm shadow-none sm:min-h-14 sm:text-base">
                  {statusFilters.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-end self-end w-full">
                <button className="min-h-12 min-w-0 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-none sm:min-h-14 sm:rounded-2xl w-full" type="submit">
                  Filter
                </button>
              </div>
            </form>
          </Card>
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
                rows={paginatedResults.rows}
                showApprovalColumns
                showPrint={canGenerateCards}
                inlineApproval={user.role === "principal"}
                pagination={{ count: paginatedResults.count, page: paginatedResults.page, pageSize: paginatedResults.pageSize }}
              />
          )}
        </>
      ) : null}

      {showCards && cardsWorkspace ? <ResultCardsPanel workspace={cardsWorkspace} /> : null}
    </>
  );
}
