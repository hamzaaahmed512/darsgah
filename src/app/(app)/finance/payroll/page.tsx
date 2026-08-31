import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { currentMonthKey, formatMonth, getPayrollEligibleStaff, getStaffPayRows } from "@/lib/services/payroll";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
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
        <StatCard label="Employees" value={stats.employees.toString()} hint="Active staff in payroll" icon={Users} tone="slate" />
        <StatCard label="Total Staff Pay" value={formatPKR(stats.totalPayable)} hint={`For ${formatMonth(month)}`} icon={Banknote} tone="blue" />
        <StatCard label="Paid" value={stats.paid.toString()} hint="Marked paid this month" icon={CheckCircle} tone="green" />
        <StatCard label="Unpaid" value={stats.unpaid.toString()} hint="Pending payment" icon={Clock} tone="amber" />
      </div>

      <StaffPayTable rows={rows} month={month} canManage={canManage} />
    </>
  );
}
