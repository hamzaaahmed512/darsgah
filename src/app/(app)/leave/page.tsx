import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { LeaveApplicationDialog } from "@/components/leave/leave-application-dialog";
import { LeavePeriodFilters } from "@/components/leave/leave-period-filters";
import { LeaveReviewActions } from "@/components/leave/leave-review-actions";
import { CsvExport } from "@/components/reports/csv-export";
import { requireUser } from "@/lib/auth/session";
import { getLeaveRequestsForReview, getMyLeaveCenter } from "@/lib/services/leaves";
import { hasPermission } from "@/lib/permissions";
import { submitLeaveAction } from "@/app/(app)/leave/actions";

const statusTone = {
  pending: "yellow",
  approved: "green",
  rejected: "red"
} as const;

type LeaveRangeMode = "month" | "year" | "lifetime" | "custom";

function getLeaveRange(params: Record<string, string | undefined>) {
  const dateParts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);
  const mode: LeaveRangeMode = params.range === "year" || params.range === "custom" || params.range === "lifetime" ? params.range : "month";
  const month = currentMonth;
  const year = currentYear;

  if (mode === "year") return { mode, month, year, from: `${year}-01-01`, to: `${year}-12-31` };
  if (mode === "lifetime") return { mode, month, year, from: "", to: "" };
  if (mode === "custom") {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : `${currentMonth}-01`;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : today;
    return { mode, month, year, from: from <= to ? from : to, to: from <= to ? to : from };
  }
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
  return { mode, month, year, from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export default async function LeavePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const range = getLeaveRange(params);
  const user = await requireUser("leave:view");
  const canReviewLeaves = hasPermission(user.role, "leave:manage", user.permissions);
  const reviewLeaves = canReviewLeaves ? await getLeaveRequestsForReview(user, "all", range) : [];
  const leaveCenter = canReviewLeaves ? { leaves: [], migrationRequired: false } : await getMyLeaveCenter(user, range);
  const { leaves, migrationRequired } = leaveCenter;
  const exportDate = new Date().toISOString().slice(0, 10);
  const reviewExportRows = reviewLeaves.map((leave) => ({
    Staff: (leave as any).applicant_name ?? "Employee",
    Type: leave.leave_type.replace(/_/g, " "),
    "Start date": leave.start_date,
    "End date": leave.end_date,
    Reason: leave.reason,
    Status: leave.status,
    Remarks: leave.principal_remarks ?? "",
    "Reviewed by": (leave as any).reviewed_by_name ?? ""
  }));
  const personalExportRows = leaves.map((leave) => ({
    Type: leave.leave_type.replace(/_/g, " "),
    "Start date": leave.start_date,
    "End date": leave.end_date,
    Reason: leave.reason,
    Status: leave.status,
    Remarks: leave.principal_remarks ?? ""
  }));

  return (
    <>
      <PageHeader
        eyebrow="Employee portal"
        title="Leave Center"
        description={canReviewLeaves ? "Review staff leave requests and make approval decisions." : "Submit leave requests and track Principal review status."}
        actions={
          !canReviewLeaves ? (
            <LeaveApplicationDialog>
              <LeaveRequestForm migrationRequired={migrationRequired} />
            </LeaveApplicationDialog>
          ) : null
        }
      />

      {canReviewLeaves ? (
        <Card>
          <CardHeader>
            <CardTitle>Staff Leave Requests</CardTitle>
            <CsvExport rows={reviewExportRows} filename={`staff-leave-requests-${exportDate}.csv`} />
          </CardHeader>
          <CardContent>
            <LeavePeriodFilters mode={range.mode} from={params.from ?? range.from} to={params.to ?? range.to} />
            {!reviewLeaves.length ? (
              <EmptyState title="No leave requests" description="Staff leave requests will appear here for approval." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-3 pr-4">Staff</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Dates</th>
                      <th className="py-3 pr-4">Reason</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewLeaves.map((leave) => (
                      <tr key={leave.id} className="border-t border-outline/60 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-ink">{(leave as any).applicant_name ?? "Employee"}</p>
                        </td>
                        <td className="py-3 pr-4 font-semibold capitalize">{leave.leave_type.replace("_", " ")}</td>
                        <td className="py-3 pr-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                        <td className="max-w-sm py-3 pr-4 text-muted">{leave.reason}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={statusTone[leave.status]}>{leave.status}</Badge>
                          {leave.principal_remarks ? <p className="mt-1 text-xs text-muted">{leave.principal_remarks}</p> : null}
                        </td>
                        <td className="py-3 pr-4">
                          {leave.status === "pending" ? (
                            <LeaveReviewActions leaveId={leave.id} />
                          ) : (
                            <p className="text-right text-xs font-semibold text-muted">Reviewed by {(leave as any).reviewed_by_name ?? "reviewer"}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Leave History</CardTitle>
            <CsvExport rows={personalExportRows} filename={`my-leave-history-${exportDate}.csv`} />
          </CardHeader>
          <CardContent>
            <LeavePeriodFilters mode={range.mode} from={params.from ?? range.from} to={params.to ?? range.to} />
            {migrationRequired ? (
              <EmptyState title="Leave history unavailable" description="The hosted database does not have the staff leave table yet." />
            ) : !leaves.length ? (
              <EmptyState title="No leave requests yet" description="Submitted leave requests will appear here with their latest status." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Dates</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="border-t border-outline/60">
                        <td className="py-3 pr-4 font-semibold capitalize">{leave.leave_type.replace("_", " ")}</td>
                        <td className="py-3 pr-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={statusTone[leave.status]}>{leave.status}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted">{leave.principal_remarks || "No remarks"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function LeaveRequestForm({ migrationRequired }: { migrationRequired: boolean }) {
  if (migrationRequired) {
    return (
      <EmptyState
        title="Database migration required"
        description="Apply the latest School OS migration to enable staff leave requests."
      />
    );
  }

  return (
    <form action={submitLeaveAction} className="grid gap-4">
      <Field label="Leave type">
        <Select name="leave_type" required defaultValue="casual">
          <option value="casual">Casual</option>
          <option value="medical">Medical</option>
          <option value="annual">Annual</option>
          <option value="unpaid">Unpaid</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date">
          <Input name="start_date" type="date" required />
        </Field>
        <Field label="End date">
          <Input name="end_date" type="date" required />
        </Field>
      </div>
      <Field label="Reason">
        <Textarea name="reason" required placeholder="Briefly explain the leave request" />
      </Field>
      <Button type="submit">Submit Request</Button>
    </form>
  );
}
