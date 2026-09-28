import { redirect } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, FileText, Search } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { StudentPagination } from "@/components/students/student-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { TRANSACTION_CATEGORY_LABELS, type TransactionCategory, type TransactionDirection } from "@/lib/finance-transactions";
import { getFinanceTransactions } from "@/lib/services/finance";
import { formatCompactPKR, formatDatePK, formatPKR } from "@/lib/utils";

function canViewFinancialReports(role: string) {
  return role !== "administrator";
}

function financeDashboardHref(params: Record<string, string | undefined>) {
  const nextParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) nextParams.set(key, value);
  });
  const query = nextParams.toString();
  return query ? `/finance/dashboard?${query}` : "/finance/dashboard";
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser("finance:view");
  const showTotals = canViewFinancialReports(user.role);
  if (!showTotals) {
    redirect(financeDashboardHref(params));
  }
  const period = (["month", "year", "lifetime", "custom"].includes(params.period ?? "") ? params.period : "month") as "month" | "year" | "lifetime" | "custom";
  const direction = (["income", "expense"].includes(params.direction ?? "") ? params.direction : "all") as TransactionDirection | "all";
  const data = await getFinanceTransactions(user, {
    period,
    direction,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    q: params.q,
    page: Number(params.page ?? 1),
    pageSize: Number(params.pageSize ?? 10),
    includeTotals: showTotals
  });

  return <>
    <PageHeader eyebrow="Operations" title="Transactions" description="A read-only ledger of income, student-fee payments, payroll, and expenses. Record new entries from the Finance dashboard." />

    {showTotals ? (
      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={formatCompactPKR(data.totals.income)} hint="Transactions in selected range" icon={ArrowDownCircle} tone="green" />
        <StatCard label="Expenses" value={formatCompactPKR(data.totals.expenses)} hint="Transactions in selected range" icon={ArrowUpCircle} tone="red" />
        <StatCard label="Net" value={formatCompactPKR(data.totals.income - data.totals.expenses)} hint="Income minus expenses" icon={ArrowDownCircle} tone="blue" />
      </section>
    ) : null}

    <Card className="mb-5 rounded-[28px] border border-outline/70 bg-white p-4 shadow-card">
      <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input name="q" defaultValue={params.q ?? ""} placeholder="Receipt, person, reference..." className="h-12 rounded-2xl border-outline/70 pl-11 shadow-none" /></div>
        <Select name="period" defaultValue={period} className="h-12 rounded-2xl border-outline/70 shadow-none"><option value="month">This month</option><option value="year">This year</option><option value="lifetime">Lifetime</option><option value="custom">Custom dates</option></Select>
        <Select name="direction" defaultValue={direction} className="h-12 rounded-2xl border-outline/70 shadow-none"><option value="all">All transactions</option><option value="income">Income only</option><option value="expense">Expenses only</option></Select>
        <Input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ""} aria-label="Date from" className="h-12 rounded-2xl border-outline/70 shadow-none" />
        <Input name="dateTo" type="date" defaultValue={params.dateTo ?? ""} aria-label="Date to" className="h-12 rounded-2xl border-outline/70 shadow-none" />
        <Button type="submit" className="min-h-12 rounded-2xl">Apply</Button>
      </form>
      <p className="mt-2 text-xs text-muted">Choose Custom dates to use the From and To fields.</p>
    </Card>

    <Card className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          Transaction Ledger
        </h2>
        <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{data.count} transactions</span>
      </div>
      <CardContent className="p-0">
        {!data.rows.length ? <EmptyState title="No transactions found" description="Try changing the search, period, transaction type, or dates." className="m-5" /> : <>
          <div className="transaction-table-scroll hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-6 py-4">Receipt</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Student / party</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Recorded by</th></tr></thead>
              <tbody>{data.rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100 transition hover:bg-blue-50/30"><td className="whitespace-nowrap px-6 py-5 font-mono text-xs font-semibold text-primary">{row.receipt_number}</td><td className="px-6 py-5"><Badge tone={row.direction === "income" ? "green" : "red"}>{TRANSACTION_CATEGORY_LABELS[row.category as TransactionCategory] ?? row.category.replace(/_/g, " ")}</Badge><p className="mt-1 whitespace-nowrap text-xs capitalize text-muted">{row.source.replace(/_/g, " ")}</p></td><td className="px-6 py-5"><p className="whitespace-nowrap font-semibold text-ink">{row.student_name || row.party_name || "—"}</p>{row.admission_number ? <p className="whitespace-nowrap text-xs text-muted">{row.admission_number}</p> : null}<p className="max-w-xs truncate text-xs text-muted">{row.description}</p></td><td className={`whitespace-nowrap px-6 py-5 font-bold ${row.direction === "income" ? "text-success" : "text-danger"}`}>{row.direction === "income" ? "+" : "−"}{formatPKR(Number(row.amount))}</td><td className="whitespace-nowrap px-6 py-5 text-muted">{formatDatePK(row.transaction_date)}</td><td className="whitespace-nowrap px-6 py-5 text-muted">{row.recorded_by_name || "System"}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 lg:hidden">
            {data.rows.map((row: any) => (
              <article key={row.id} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{row.student_name || row.party_name || "—"}</p>
                    <p className="mt-0.5 truncate font-mono text-xs font-semibold text-primary">{row.receipt_number}</p>
                  </div>
                  <Badge tone={row.direction === "income" ? "green" : "red"}>{TRANSACTION_CATEGORY_LABELS[row.category as TransactionCategory] ?? row.category.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="text-xs text-slate-500"><p>{formatDatePK(row.transaction_date)}</p><p className="mt-1">{row.recorded_by_name || "System"}</p></div>
                  <p className={`whitespace-nowrap font-bold ${row.direction === "income" ? "text-success" : "text-danger"}`}>{row.direction === "income" ? "+" : "−"}{formatPKR(Number(row.amount))}</p>
                </div>
              </article>
            ))}
          </div>
        </>}
      </CardContent>
      <StudentPagination count={data.count} page={data.page} pageSize={data.pageSize} itemLabel="transactions" />
    </Card>
  </>;
}
