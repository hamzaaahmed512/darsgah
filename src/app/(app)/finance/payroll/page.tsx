import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { currentMonthKey, formatMonth, getPayrollEligibleStaff, getStaffPayRows } from "@/lib/services/payroll";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { StaffPayTable } from "@/components/payroll/staff-pay-table";
import { AddAdjustmentDialog } from "@/components/payroll/add-adjustment-dialog";
import { formatCompactPKR } from "@/lib/utils";
import { Banknote, CheckCircle, Clock, Search, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-field";
import { paginateRows } from "@/lib/pagination";

export default async function PayrollDashboardPage({ searchParams }: { searchParams: Promise<{ month?: string; q?: string; status?: string; page?: string; pageSize?: string }> }) {
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
  const query = (sp.q ?? "").trim().toLowerCase();
  const status = sp.status === "paid" || sp.status === "unpaid" ? sp.status : "all";
  const filteredRows = rows.filter((row) => {
    const matchesQuery = !query || `${row.name} ${row.email ?? ""} ${row.jobTitle ?? ""} ${row.role}`.toLowerCase().includes(query);
    const matchesStatus = status === "all" || (status === "paid" ? row.status === "paid" : row.status !== "paid");
    return matchesQuery && matchesStatus;
  });
  const paginatedRows = paginateRows(filteredRows, sp.page, sp.pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title={`Staff Pay - ${formatMonth(month)}`}
        description="Manage monthly staff salaries, bonuses, deductions, and payment status."
        actions={canManage ? <AddAdjustmentDialog month={month} staff={eligibleStaff} /> : null}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value={stats.employees.toString()} hint="Active staff in payroll" icon={Users} tone="slate" />
        <StatCard label="Total Staff Pay" value={formatCompactPKR(stats.totalPayable)} hint={`For ${formatMonth(month)}`} icon={Banknote} tone="blue" />
        <StatCard label="Paid" value={stats.paid.toString()} hint="Marked paid this month" icon={CheckCircle} tone="green" />
        <StatCard label="Unpaid" value={stats.unpaid.toString()} hint="Pending payment" icon={Clock} tone="amber" />
      </div>

      <Card className="mb-5 rounded-[24px] border border-blue-200 bg-white p-4 shadow-[0_12px_34px_rgba(37,99,235,0.05)]">
        <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto] md:items-end">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input name="q" defaultValue={sp.q ?? ""} className="h-12 rounded-2xl border-blue-100 bg-blue-50/70 pl-11 shadow-none placeholder:text-slate-400 focus:bg-white" placeholder="Search staff by name, email, or role..." />
            </div>
          </Field>
          <Field label="Month">
            <Input id="month-select" name="month" type="month" defaultValue={month} className="h-12 rounded-2xl border-outline/70 bg-white shadow-none" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={status} className="h-12 rounded-2xl border-outline/70 bg-white shadow-none">
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </Select>
          </Field>
          <button type="submit" className="min-h-12 rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button hover:brightness-105">
            Filter
          </button>
        </form>
      </Card>

      <StaffPayTable
        rows={paginatedRows.rows}
        month={month}
        canManage={canManage}
        pagination={{ count: paginatedRows.count, page: paginatedRows.page, pageSize: paginatedRows.pageSize }}
      />
    </>
  );
}
