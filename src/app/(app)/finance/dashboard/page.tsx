import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getFinanceDashboard, getFinanceTransactions } from "@/lib/services/finance";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form-field";
import { LazyExpenseDistributionChart, LazyIncomeTrendChart, LazyOutstandingByClassChart } from "@/components/finance/lazy-finance-dashboard-charts";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Banknote, LucideIcon, Search } from "lucide-react";
import { TRANSACTION_CATEGORY_LABELS, type TransactionCategory, type TransactionDirection } from "@/lib/finance-transactions";
import { formatCompactPKR, formatDatePK, formatPKR } from "@/lib/utils";
import { TransactionFormModal } from "@/components/finance/transaction-form-modal";
import { hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/student-name";

function canViewFinancialReports(role: string) {
  return role !== "administrator";
}

const statTones = {
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  purple: "bg-purple-50 text-purple-600 ring-purple-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-50 text-slate-600 ring-slate-100"
} as const;

function FinanceStatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
  trendTone = "neutral"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof statTones;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
}) {
  const trendClass = trendTone === "positive" ? "text-emerald-600" : trendTone === "negative" ? "text-red-600" : "text-slate-500";

  return (
    <Card className="h-full p-5 shadow-sm sm:p-6">
      <div className="flex h-full items-start gap-5">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 sm:h-16 sm:w-16 ${statTones[tone]}`}>
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 whitespace-nowrap font-display text-[clamp(1.55rem,2vw,1.875rem)] font-bold leading-none tracking-tight text-ink">{value}</p>
          {trend ? <p className={`mt-3 text-sm font-bold ${trendClass}`}>{trend}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function percentDelta(
  current: number,
  previous: number,
  lowerIsBetter = false,
  comparisonLabel = "last month",
  newActivityLabel = "this month"
): { text: string; tone: "positive" | "negative" | "neutral" } {
  if (previous === 0 && current === 0) return { text: `No change vs ${comparisonLabel}`, tone: "neutral" as const };
  if (previous === 0) return { text: `New activity ${newActivityLabel}`, tone: lowerIsBetter ? "negative" as const : "positive" as const };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const tone: "positive" | "negative" | "neutral" = change === 0 ? "neutral" : lowerIsBetter ? (change < 0 ? "positive" : "negative") : (change > 0 ? "positive" : "negative");
  const arrow = change >= 0 ? "Up" : "Down";
  return { text: `${arrow} ${Math.abs(change).toFixed(1)}% vs ${comparisonLabel}`, tone };
}

function formatFinanceAmount(amount: number) {
  return Math.abs(amount) >= 1_000_000 ? formatCompactPKR(amount) : formatPKR(amount);
}

function formatMargin(value: number) {
  return `${value.toFixed(1)}%`;
}

function contributionText(current: number, lifetime: number, label: string) {
  if (lifetime <= 0 || current <= 0) return `Yearly share: 0%`;
  return `Yearly share: ${((current / lifetime) * 100).toFixed(1)}%`;
}

function buildDashboardHref(params: Record<string, string | undefined>, view: "month" | "year" | "lifetime") {
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "view") continue;
    nextParams.set(key, value);
  }
  nextParams.set("view", view);
  const query = nextParams.toString();
  return query ? `/finance/dashboard?${query}` : "/finance/dashboard";
}

function chartPeriodForView(view: "month" | "year" | "lifetime"): "monthly" | "yearly" | "lifetime" {
  if (view === "month") return "monthly";
  if (view === "year") return "yearly";
  return "lifetime";
}

export default async function FinanceDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("finance:view");
  const canManage = hasPermission(user.role, "finance:manage", user.permissions);
  const canViewReports = canViewFinancialReports(user.role);
  const summaryView = (["month", "year", "lifetime"].includes(params.view ?? "") ? params.view : "month") as "month" | "year" | "lifetime";
  let students: Array<{ id: string; name: string; admissionNumber: string }> = [];
  if (canManage) {
    const supabase = await createClient();
    const { data: studentRows } = await supabase.from("students").select("id,first_name,last_name,admission_number").eq("school_id", user.schoolId).eq("status", "active").order("first_name");
    students = (studentRows ?? []).map((student) => ({ id: student.id, name: formatFullName(student.first_name, student.last_name), admissionNumber: student.admission_number }));
  }

  if (!canViewReports) {
    const period = (["month", "year", "lifetime", "custom"].includes(params.period ?? "") ? params.period : "month") as "month" | "year" | "lifetime" | "custom";
    const direction = (["income", "expense"].includes(params.direction ?? "") ? params.direction : "all") as TransactionDirection | "all";
    const transactions = await getFinanceTransactions(user, {
      period,
      direction,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      q: params.q,
      page: Number(params.page ?? 1),
      includeTotals: false
    });
    const pageCount = Math.max(1, Math.ceil(transactions.count / transactions.pageSize));

    return (
      <>
        <PageHeader
          eyebrow="Finance"
          title="Finance"
          description="Record income and expenses, then review posted transaction entries."
          actions={canManage ? <><TransactionFormModal direction="income" students={students} /><TransactionFormModal direction="expense" students={students} /></> : null}
        />

        <Card className="mb-5 p-4">
          <form method="get" className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_160px_160px_150px_150px_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input name="q" defaultValue={params.q ?? ""} placeholder="Receipt, person, reference..." className="pl-9" /></div>
            <Select name="period" defaultValue={period}><option value="month">This month</option><option value="year">This year</option><option value="lifetime">Lifetime</option><option value="custom">Custom dates</option></Select>
            <Select name="direction" defaultValue={direction}><option value="all">All transactions</option><option value="income">Income only</option><option value="expense">Expenses only</option></Select>
            <Input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ""} aria-label="Date from" />
            <Input name="dateTo" type="date" defaultValue={params.dateTo ?? ""} aria-label="Date to" />
            <Button type="submit">Apply</Button>
          </form>
          <p className="mt-2 text-xs text-muted">Choose Custom dates to use the From and To fields.</p>
        </Card>

        <Card>
          <CardContent className="p-0">
            {!transactions.rows.length ? <EmptyState title="No transactions found" description="Try another period or record a new income or expense." className="m-5" /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
              <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Student / party</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Recorded by</th><th className="px-4 py-3">Reference</th></tr></thead>
              <tbody>{transactions.rows.map((row: any) => <tr key={row.id} className="border-t border-outline/60"><td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{row.receipt_number}</td><td className="px-4 py-3"><Badge tone={row.direction === "income" ? "green" : "red"}>{TRANSACTION_CATEGORY_LABELS[row.category as TransactionCategory] ?? row.category.replace(/_/g, " ")}</Badge><p className="mt-1 text-xs capitalize text-muted">{row.source.replace(/_/g, " ")}</p></td><td className="px-4 py-3"><p className="font-semibold text-ink">{row.student_name || row.party_name || "—"}</p>{row.admission_number ? <p className="text-xs text-muted">{row.admission_number}</p> : null}<p className="max-w-xs truncate text-xs text-muted">{row.description}</p></td><td className={`px-4 py-3 font-bold ${row.direction === "income" ? "text-success" : "text-danger"}`}>{row.direction === "income" ? "+" : "−"}{formatPKR(Number(row.amount))}</td><td className="px-4 py-3 text-muted">{formatDatePK(row.transaction_date)}</td><td className="px-4 py-3 text-muted">{row.recorded_by_name || "System"}</td><td className="px-4 py-3 text-muted">{row.reference_number || "—"}</td></tr>)}</tbody>
            </table></div>}
          </CardContent>
        </Card>

        {pageCount > 1 ? <nav className="mt-4 flex items-center gap-3 text-sm"><span className="text-muted">Page {transactions.page} of {pageCount}</span>{transactions.page > 1 ? <Link className="font-semibold text-primary" href={`/finance/dashboard?${new URLSearchParams({ ...params, page: String(transactions.page - 1) })}`}>Previous</Link> : null}{transactions.page < pageCount ? <Link className="font-semibold text-primary" href={`/finance/dashboard?${new URLSearchParams({ ...params, page: String(transactions.page + 1) })}`}>Next</Link> : null}</nav> : null}
      </>
    );
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

  const incomeDelta = percentDelta(data.monthlyIncome, data.previousMonthlyIncome);
  const expensesDelta = percentDelta(data.monthlyExpenses, data.previousMonthlyExpenses, true);
  const netDelta = percentDelta(data.netCashFlow, data.previousNetCashFlow);
  const yearlyIncomeDelta = percentDelta(data.yearlyIncome, data.previousYearlyIncome, false, "previous year", "this year");
  const yearlyExpensesDelta = percentDelta(data.yearlyExpenses, data.previousYearlyExpenses, true, "previous year", "this year");
  const yearlyProfitDelta = percentDelta(data.yearlyProfit, data.previousYearlyProfit, false, "previous year", "this year");
  const selectedTotals = data.periodTotals?.[summaryView] ?? data.periodTotals.month;
  const initialChartPeriod = chartPeriodForView(summaryView);
  const currentMargin = selectedTotals.income > 0 ? (selectedTotals.profit / selectedTotals.income) * 100 : 0;
  const previousMarginBase = summaryView === "month"
    ? data.previousMonthlyIncome
    : summaryView === "year"
      ? data.previousYearlyIncome
      : 0;
  const previousMarginProfit = summaryView === "month"
    ? data.previousNetCashFlow
    : summaryView === "year"
      ? data.previousYearlyProfit
      : 0;
  const previousMargin = previousMarginBase > 0 ? (previousMarginProfit / previousMarginBase) * 100 : 0;
  const marginDelta = percentDelta(currentMargin, previousMargin);
  const lifetimeIncomeContribution = contributionText(data.yearlyIncome, data.lifetimeIncome, "income");
  const lifetimeExpenseContribution = contributionText(data.yearlyExpenses, data.lifetimeExpenses, "expenses");
  const lifetimeProfitContribution = contributionText(data.yearlyProfit, data.lifetimeProfit, "profit");

  const mainStats = [
    {
      label: summaryView === "month" ? "Monthly Income" : summaryView === "year" ? "Yearly Income" : "Total Income",
      value: formatFinanceAmount(selectedTotals.income),
      icon: ArrowDownCircle,
      tone: "green",
      trend: summaryView === "month" ? incomeDelta.text : summaryView === "year" ? yearlyIncomeDelta.text : lifetimeIncomeContribution,
      trendTone: summaryView === "month" ? incomeDelta.tone : summaryView === "year" ? yearlyIncomeDelta.tone : "positive"
    },
    {
      label: summaryView === "month" ? "Monthly Expenses" : summaryView === "year" ? "Yearly Expenses" : "Total Expenses",
      value: formatFinanceAmount(selectedTotals.expenses),
      icon: ArrowUpCircle,
      tone: "red",
      trend: summaryView === "month" ? expensesDelta.text : summaryView === "year" ? yearlyExpensesDelta.text : lifetimeExpenseContribution,
      trendTone: summaryView === "month" ? expensesDelta.tone : summaryView === "year" ? yearlyExpensesDelta.tone : "positive"
    },
    {
      label: summaryView === "month" ? "Monthly Profit" : summaryView === "year" ? "Yearly Profit" : "Total Profit",
      value: formatFinanceAmount(selectedTotals.profit),
      icon: Wallet,
      tone: selectedTotals.profit >= 0 ? "blue" : "red",
      trend: summaryView === "month" ? netDelta.text : summaryView === "year" ? yearlyProfitDelta.text : lifetimeProfitContribution,
      trendTone: summaryView === "month" ? netDelta.tone : summaryView === "year" ? yearlyProfitDelta.tone : "positive"
    },
    {
      label: summaryView === "month" ? "Net Margin" : summaryView === "year" ? "Net Margin" : "Net Margin",
      value: formatMargin(currentMargin),
      icon: Banknote,
      tone: currentMargin >= 0 ? "purple" : "red",
      trend: summaryView === "lifetime" ? "Profit as a share of income" : marginDelta.text,
      trendTone: summaryView === "lifetime" ? "neutral" : marginDelta.tone
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Financial Dashboard"
        description="Track school finances by month, year, and lifetime from one ledger."
        actions={canManage ? <><TransactionFormModal direction="income" students={students} /><TransactionFormModal direction="expense" students={students} /></> : null}
      />

      <div className="mb-5 flex justify-start">
        <div className="inline-flex max-w-full rounded-xl border border-outline/60 bg-white p-1">
          {([
            { value: "month", label: "Monthly" },
            { value: "year", label: "Yearly" },
            { value: "lifetime", label: "Lifetime" }
          ] as const).map((option) => (
            <Link
              key={option.value}
              href={buildDashboardHref(params, option.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                summaryView === option.value ? "bg-primary text-white" : "text-muted hover:bg-surface-low hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {mainStats.map((stat) => (
          <FinanceStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone as keyof typeof statTones}
            trend={stat.trend}
            trendTone={stat.trendTone as "positive" | "negative" | "neutral"}
          />
        ))}
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyIncomeTrendChart datasets={data.incomeTrends} initialPeriod={initialChartPeriod} />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyExpenseDistributionChart datasets={data.expenseDistributions} initialPeriod={initialChartPeriod} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Outstanding Fees by Class</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyOutstandingByClassChart data={data.outstandingByClass} />
        </CardContent>
      </Card>

    </>
  );
}
