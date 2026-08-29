import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { currentMonthKey, formatMonth, getPayrollEligibleStaff, getStaffPayRows } from "@/lib/services/payroll";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StaffPayTable } from "@/components/payroll/staff-pay-table";
import { AddAdjustmentDialog } from "@/components/payroll/add-adjustment-dialog";
import { formatPKR } from "@/lib/utils";
import { Banknote, CheckCircle, Clock, Users } from "lucide-react";

export default async function PayrollDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser("payroll:view");
  if (user.role === "teacher" || user.role === "head_teacher") redirect("/unauthorized");

  const sp = await searchParams;
  const month = sp.month ?? currentMonthKey();
  const canManage = hasPermission(user.role, "payroll:manage", user.permissions);
  const [rows, eligibleStaff] = await Promise.all([
    getStaffPayRows(user, month),
    getPayrollEligibleStaff(user)
  ]);

  const stats = {
    employees: rows.length,
    totalPayable: rows.reduce((sum, row) => sum + (row.baseSalary > 0 ? row.netSalary : 0), 0),
    paid: rows.filter((row) => row.status === "paid").length,
    unpaid: rows.filter((row) => row.status !== "paid").length
  };

  const statCards = [
    { label: "Employees", value: stats.employees.toString(), hint: "Active staff in payroll", icon: Users, color: "text-ink bg-surface-low" },
    { label: "Total Staff Pay", value: formatPKR(stats.totalPayable), hint: `For ${formatMonth(month)}`, icon: Banknote, color: "text-primary bg-primary-soft" },
    { label: "Paid", value: stats.paid.toString(), hint: "Marked paid this month", icon: CheckCircle, color: "text-success bg-success-soft" },
    { label: "Unpaid", value: stats.unpaid.toString(), hint: "Pending payment", icon: Clock, color: "text-warning bg-warning-soft" }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title={`Staff Pay - ${formatMonth(month)}`}
        description="Manage monthly staff salaries, bonuses, deductions, and payment status."
        actions={canManage ? <AddAdjustmentDialog month={month} teachers={eligibleStaff} /> : null}
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{stat.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="font-display text-xl font-bold text-ink">{stat.value}</div>
                <p className="mt-0.5 text-xs text-muted">{stat.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <StaffPayTable rows={rows} month={month} canManage={canManage} />
    </>
  );
}
