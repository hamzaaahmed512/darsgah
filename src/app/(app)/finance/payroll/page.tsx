import { requireUser } from "@/lib/auth/session";
import { 
  getApprovedUnpaidLeaveFlags, 
  getPayrollDashboardStats, 
  getPayrollList, 
  getSalaryAdjustments,
  getSalaryHistory,
  getPayrollEligibleStaff,
  currentMonthKey, 
  formatMonth 
} from "@/lib/services/payroll";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPKR, formatDatePK } from "@/lib/utils";
import { Banknote, TrendingUp, TrendingDown, Users, CheckCircle, Clock } from "lucide-react";
import { GeneratePayrollButton } from "@/components/payroll/generate-payroll-button";
import { AddAdjustmentDialog } from "@/components/payroll/add-adjustment-dialog";
import { MarkPaidButton } from "@/components/payroll/mark-paid-button";

export default async function PayrollDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser("payroll:view");
  const sp = await searchParams;
  const month = sp.month ?? currentMonthKey();
  const canManage = hasPermission(user.role, "payroll:manage", user.permissions);

  const [stats, payrollList, unpaidLeaves, adjustments, history, eligibleStaff] = await Promise.all([
    getPayrollDashboardStats(user, month),
    getPayrollList(user, month),
    getApprovedUnpaidLeaveFlags(user, month),
    getSalaryAdjustments(user, undefined, month),
    getSalaryHistory(user), getPayrollEligibleStaff(user)
  ]);

  const statCards = [
    {
      label: "Total Payroll",
      value: formatPKR(stats.totalPayroll),
      hint: "Net salaries for the month",
      icon: Banknote,
      color: "text-primary bg-primary-soft"
    },
    {
      label: "Base Salaries",
      value: formatPKR(stats.totalBaseSalary),
      hint: "Before adjustments",
      icon: Users,
      color: "text-ink bg-surface-low"
    },
    {
      label: "Total Bonuses",
      value: formatPKR(stats.totalBonuses),
      hint: "Bonus adjustments this month",
      icon: TrendingUp,
      color: "text-success bg-success-soft"
    },
    {
      label: "Total Deductions",
      value: formatPKR(stats.totalDeductions),
      hint: "Deduction adjustments this month",
      icon: TrendingDown,
      color: "text-danger bg-danger-soft"
    },
    {
      label: "Paid",
      value: stats.paidCount.toString(),
      hint: "Salary slips marked as paid",
      icon: CheckCircle,
      color: "text-success bg-success-soft"
    },
    {
      label: "Pending",
      value: stats.generatedCount.toString(),
      hint: "Generated but not yet paid",
      icon: Clock,
      color: "text-warning bg-warning-soft"
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title={`Payroll Dashboard — ${formatMonth(month)}`}
        description="Comprehensive view of staff salaries, monthly draft generation, adjustments, and processed history."
        actions={
          canManage ? (
            <div className="flex items-center gap-3">
              <AddAdjustmentDialog month={month} />
              <GeneratePayrollButton month={month} staff={eligibleStaff} />
            </div>
          ) : null
        }
      />

      {/* Month selector */}
      <form method="get" className="mb-8 flex items-center gap-2">
        <label className="text-sm font-semibold text-muted" htmlFor="month-select">Month</label>
        <input
          id="month-select"
          name="month"
          type="month"
          defaultValue={month}
          className="rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105">
          Apply
        </button>
      </form>

      {/* Stats Grid */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{s.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="font-display text-xl font-bold text-ink">{s.value}</div>
                <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-10 grid gap-8 xl:grid-cols-2">
        {/* Adjustments Table */}
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Salary Adjustments</h3>
            <p className="text-sm text-muted">Bonuses and deductions applied before payroll generation.</p>
          </div>
          {!adjustments.length ? (
            <EmptyState
              title="No adjustments found"
              description={canManage ? "Add bonuses or deductions before generating payroll." : "No salary adjustments for this month."}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">Teacher</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((adj: any) => (
                        <tr key={adj.id} className="border-t border-outline/60 hover:bg-surface-low/50">
                          <td className="px-4 py-4 font-semibold text-ink">{adj.teacher_name ?? "—"}</td>
                          <td className="px-4 py-4">
                            <Badge tone={adj.type === "bonus" ? "green" : "red"}>
                              {adj.type === "bonus" ? "Bonus" : "Deduction"}
                            </Badge>
                          </td>
                          <td className={`px-4 py-4 font-semibold ${adj.type === "bonus" ? "text-success" : "text-danger"}`}>
                            {adj.type === "deduction" ? "-" : "+"}{formatPKR(adj.amount)}
                          </td>
                          <td className="px-4 py-4 text-muted truncate max-w-[150px]">{adj.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Unpaid Leaves */}
        {canManage && unpaidLeaves.length ? (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Approved Unpaid Leave Flags</h3>
              <p className="text-sm text-muted">Leaves that may impact payroll for the current month.</p>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Dates</th>
                        <th className="px-4 py-3">Days</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidLeaves.map((leave: any) => (
                        <tr key={`${leave.user_id}-${leave.start_date}`} className="border-t border-outline/60">
                          <td className="px-4 py-4 font-semibold">{leave.full_name}</td>
                          <td className="px-4 py-4 text-muted">{leave.start_date} to {leave.end_date}</td>
                          <td className="px-4 py-4">{leave.leave_days}</td>
                          <td className="px-4 py-4 text-muted truncate max-w-[150px]">{leave.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Approved Unpaid Leave Flags</h3>
              <p className="text-sm text-muted">Leaves that may impact payroll for the current month.</p>
            </div>
            <EmptyState
              title="No unpaid leave flags"
              description="There are no approved unpaid leaves affecting this month."
            />
          </div>
        )}
      </div>

      {/* Payroll Table (Salary Slips) */}
      <div className="mb-10 flex flex-col gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-ink">Salary Slips</h3>
          <p className="text-sm text-muted">Monthly draft generation and tracking of individual salary slips.</p>
        </div>
        <Card>
          <CardContent className="p-0">
            {!payrollList.length ? (
              <EmptyState
                title="No payroll generated yet"
                description={canManage ? `Click "Generate Payroll" to create salary slips for ${formatMonth(month)}.` : "No payroll generated for this month."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Teacher</th>
                      <th className="px-4 py-3">Base Salary</th>
                      <th className="px-4 py-3">Bonus</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Net Salary</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payment Date</th>
                      {canManage && <th className="px-4 py-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payrollList.map((row: any) => (
                      <tr key={row.id} className="border-t border-outline/60 hover:bg-surface-low/70">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-ink">{row.teacher_name ?? "—"}</p>
                          <p className="text-xs text-muted">{row.teacher_email}</p>
                        </td>
                        <td className="px-4 py-4 font-mono">{formatPKR(row.base_salary)}</td>
                        <td className="px-4 py-4 text-success">{formatPKR(row.total_bonus)}</td>
                        <td className="px-4 py-4 text-danger">{formatPKR(row.total_deductions)}</td>
                        <td className="px-4 py-4 font-bold text-ink">{formatPKR(row.net_salary)}</td>
                        <td className="px-4 py-4">
                          <Badge tone={row.status === "paid" ? "green" : "blue"}>
                            {row.status === "paid" ? "Paid" : "Generated"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-muted">
                          {row.payment_date ? formatDatePK(row.payment_date) : "—"}
                        </td>
                        {canManage && (
                          <td className="px-4 py-4">
                            {row.status === "generated" && (
                              <MarkPaidButton payrollId={row.id} />
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processed History */}
      <div className="mb-10 flex flex-col gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-ink">Processed History (Salary Revisions)</h3>
          <p className="text-sm text-muted">Historical records of base salary changes and revisions.</p>
        </div>
        {!history.length ? (
          <EmptyState title="No salary history" description="Salary change records will appear here once a teacher is set up with employment details." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Teacher ID</th>
                      <th className="px-4 py-3">Previous Salary</th>
                      <th className="px-4 py-3">New Salary</th>
                      <th className="px-4 py-3">Change</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Effective Date</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row: any) => {
                      const delta = row.new_salary - row.previous_salary;
                      return (
                        <tr key={row.id} className="border-t border-outline/60 hover:bg-surface-low/50">
                          <td className="px-4 py-4 font-semibold text-ink">{row.teacher_id}</td>
                          <td className="px-4 py-4 font-mono text-muted">{formatPKR(row.previous_salary)}</td>
                          <td className="px-4 py-4 font-mono font-semibold text-ink">{formatPKR(row.new_salary)}</td>
                          <td className={`px-4 py-4 font-semibold ${delta >= 0 ? "text-success" : "text-danger"}`}>
                            {delta >= 0 ? "+" : ""}{formatPKR(delta)}
                          </td>
                          <td className="px-4 py-4">
                            <Badge tone={row.action_type === "increase" ? "green" : row.action_type === "decrease" ? "red" : "blue"}>
                              {row.action_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-muted">{formatDatePK(row.effective_date)}</td>
                          <td className="px-4 py-4 text-muted truncate max-w-[150px]">{row.remarks ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
