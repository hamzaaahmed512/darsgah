import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-field";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { requireUser } from "@/lib/auth/session";
import { getApprovalRequests } from "@/lib/services/approvals";
import { getLeaveRequestsForReview } from "@/lib/services/leaves";
import { hasPermission } from "@/lib/permissions";
import { reviewLeaveAction } from "@/app/(app)/leave/actions";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("approvals:view");
  const activeTab = params.tab === "leaves" ? "leaves" : "admissions";
  const [requests, leaves] = await Promise.all([
    getApprovalRequests(user, { status: (params.status as any) || "pending" }),
    hasPermission(user.role, "leave:manage", user.permissions) ? getLeaveRequestsForReview(user, "pending") : Promise.resolve([])
  ]);
  const canReviewApprovals = hasPermission(user.role, "approvals:review", user.permissions);
  const canReviewLeaves = hasPermission(user.role, "leave:manage", user.permissions);

  return (
    <>
      <PageHeader 
        eyebrow="Action Center" 
        title="Approval Workflows" 
        description="Review and manage pending admissions, cancellations, and other gated requests." 
      />

      <Card>
        <CardHeader>
          <CardTitle>{activeTab === "leaves" ? "Staff Leaves" : "Admissions Workflow"}</CardTitle>
          <div className="flex gap-2">
            <a className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === "admissions" ? "bg-primary text-white" : "bg-surface-low text-primary"}`} href="/approvals?tab=admissions">
              Admissions Workflow
            </a>
            <a className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === "leaves" ? "bg-primary text-white" : "bg-surface-low text-primary"}`} href="/approvals?tab=leaves">
              Staff Leaves
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "leaves" ? (
            <LeaveReviewTable leaves={leaves} canReview={canReviewLeaves} />
          ) : (
            <ApprovalQueue initialRequests={requests} canReview={canReviewApprovals} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function LeaveReviewTable({ leaves, canReview }: { leaves: any[]; canReview: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="font-label text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="py-3 pr-4">Applicant</th>
            <th className="py-3 pr-4">Type</th>
            <th className="py-3 pr-4">Dates</th>
            <th className="py-3 pr-4">Reason</th>
            <th className="py-3 pr-4">Decision</th>
          </tr>
        </thead>
        <tbody>
          {leaves.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted">No pending leave requests.</td>
            </tr>
          ) : (
            leaves.map((leave) => (
              <tr key={leave.id} className="border-t border-outline/60 align-top">
                <td className="py-3 pr-4 font-semibold">{leave.applicant_name}</td>
                <td className="py-3 pr-4">
                  <Badge tone={leave.is_paid_leave ? "blue" : "yellow"}>{leave.leave_type}</Badge>
                </td>
                <td className="py-3 pr-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                <td className="max-w-sm py-3 pr-4 text-muted">{leave.reason}</td>
                <td className="min-w-[260px] py-3 pr-4">
                  {canReview ? (
                    <div className="grid gap-3">
                      <form action={reviewLeaveAction}>
                        <input type="hidden" name="leave_id" value={leave.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <form action={reviewLeaveAction} className="grid gap-2">
                        <input type="hidden" name="leave_id" value={leave.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <Field label="Denial comment">
                          <Textarea name="principal_remarks" required className="min-h-20" />
                        </Field>
                        <Button type="submit" variant="danger" size="sm">Deny</Button>
                      </form>
                    </div>
                  ) : (
                    <Badge tone="yellow">{leave.status}</Badge>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
