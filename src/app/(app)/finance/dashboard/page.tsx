import { requireUser } from "@/lib/auth/session";
import { getFinanceDashboard } from "@/lib/services/finance";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyCollectionMethodChart, LazyOutstandingByClassChart } from "@/components/finance/lazy-finance-dashboard-charts";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Percent, ClipboardList, AlertCircle, Banknote } from "lucide-react";
import { formatPKR } from "@/lib/utils";
import { TransactionFormModal } from "@/components/finance/transaction-form-modal";
import { hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceDashboardPage() {
  const user = await requireUser("finance:view");
  const canManage = hasPermission(user.role, "finance:manage", user.permissions);
  let students: Array<{ id: string; name: string; admissionNumber: string }> = [];
  if (canManage) {
    const supabase = await createClient();
    const { data: studentRows } = await supabase.from("students").select("id,first_name,last_name,admission_number").eq("school_id", user.schoolId).eq("status", "active").order("first_name");
    students = (studentRows ?? []).map((student) => ({ id: student.id, name: `${student.first_name} ${student.last_name}`.trim(), admissionNumber: student.admission_number }));
  }
  let data;
  try {
    data = await getFinanceDashboard(user);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Financial Dashboard" />
        <Card className="mt-8 border-warning/50 bg-warning-soft">
          <CardHeader>
            <CardTitle className="text-warning">Finance Module Not Initialized</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-warning-strong">
            The finance module database tables are missing or inaccessible. Please ensure the finance migration has been applied to your database.
          </CardContent>
        </Card>
      </>
    );
  }

  const stats = [
    {
      label: "Monthly Income",
      value: formatPKR(data.monthlyIncome),
      description: "Fees and all other income this month",
      icon: ArrowDownCircle,
      color: "text-success bg-success-soft"
    },
    {
      label: "Monthly Expenses",
      value: formatPKR(data.monthlyExpenses),
      description: "Payroll and all expenses this month",
      icon: ArrowUpCircle,
      color: "text-danger bg-danger-soft"
    },
    {
      label: "Net Cash Flow",
      value: formatPKR(data.netCashFlow),
      description: "Monthly income minus expenses",
      icon: Wallet,
      color: data.netCashFlow >= 0 ? "text-success bg-success-soft" : "text-danger bg-danger-soft"
    },
    {
      label: "Total Expected Fees",
      value: formatPKR(data.totalExpected),
      description: "Aggregated academic fee structures",
      icon: Banknote,
      color: "text-primary bg-primary-soft"
    },
    {
      label: "Collected Fees",
      value: formatPKR(data.totalCollected),
      description: "Total payments recorded to date",
      icon: Wallet,
      color: "text-success bg-success-soft"
    },
    {
      label: "Outstanding Fees",
      value: formatPKR(data.totalOutstanding),
      description: "Remaining unpaid invoices",
      icon: AlertCircle,
      color: "text-danger bg-danger-soft"
    },
    {
      label: "Today's Collection",
      value: formatPKR(data.todayCollection),
      description: "Captured during current calendar day",
      icon: ArrowDownCircle,
      color: "text-primary bg-primary-soft"
    },
    {
      label: "Monthly Collection",
      value: formatPKR(data.monthlyCollection),
      description: "Cumulative for this calendar month",
      icon: ArrowDownCircle,
      color: "text-success bg-success-soft"
    },
    {
      label: "Total Discounts",
      value: formatPKR(data.totalDiscounts),
      description: "Scholarships & special adjustments",
      icon: Percent,
      color: "text-warning bg-warning-soft"
    },
    {
      label: "Pending Accounts",
      value: data.pendingPayments.toString(),
      description: "Students with unpaid installments",
      icon: ClipboardList,
      color: "text-muted bg-surface-low"
    },
    {
      label: "Overdue Accounts",
      value: data.overduePayments.toString(),
      description: "Students past their due date",
      icon: AlertCircle,
      color: "text-danger bg-danger-soft"
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Financial Dashboard"
        description="Monitor expected tuition, collected amounts, outstanding balances, daily activity, and discounts."
        actions={canManage ? <><TransactionFormModal direction="income" students={students} /><TransactionFormModal direction="expense" students={students} /></> : null}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                <div className="font-display text-2xl font-bold text-ink">{stat.value}</div>
                <p className="mt-1 text-xs text-muted">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyOutstandingByClassChart data={data.outstandingByClass} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Collections by Method</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyCollectionMethodChart data={data.collectionMethodData} />
          </CardContent>
        </Card>
      </div>

    </>
  );
}
