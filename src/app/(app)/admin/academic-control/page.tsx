import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LeavePeriodFilters } from "@/components/leave/leave-period-filters";
import { ResultsTable } from "@/app/(app)/results/_components/results-table";
import { requireUser } from "@/lib/auth/session";
import { getResultsManagementWorkspace } from "@/lib/services/marks";

type AcademicRangeMode = "month" | "year" | "lifetime" | "custom";

function getAcademicRange(params: Record<string, string | undefined>) {
  const dateParts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);
  const mode: AcademicRangeMode = params.range === "year" || params.range === "custom" || params.range === "lifetime" ? params.range : "month";

  if (mode === "year") return { mode, from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
  if (mode === "lifetime") return { mode, from: "", to: "" };
  if (mode === "custom") {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : `${currentMonth}-01`;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : today;
    return { mode, from: from <= to ? from : to, to: from <= to ? to : from };
  }

  const [year, month] = currentMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { mode, from: `${currentMonth}-01`, to: `${currentMonth}-${String(lastDay).padStart(2, "0")}` };
}

export default async function AcademicControlPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const range = getAcademicRange(params);
  const user = await requireUser("academics:view");

  if (user.role !== "principal") redirect("/academics");

  const results = await getResultsManagementWorkspace(user, { status: "all", from: range.from, to: range.to });

  return (
    <>
      <PageHeader
        eyebrow="Principal portal"
        title="Academic Control"
        description="Review teacher-created Monthly and Term exams. Principals cannot create or edit exams."
      />

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          <LeavePeriodFilters
            action="/admin/academic-control"
            mode={range.mode}
            from={params.from ?? range.from}
            to={params.to ?? range.to}
          />
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
