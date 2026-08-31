import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { TRANSACTION_CATEGORY_LABELS, type TransactionCategory, type TransactionDirection } from "@/lib/finance-transactions";
import { getFinanceTransactions } from "@/lib/services/finance";
import { formatDatePK, formatPKR } from "@/lib/utils";

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
  const data = await getFinanceTransactions(user, { period, direction, dateFrom: params.dateFrom, dateTo: params.dateTo, q: params.q, page: Number(params.page ?? 1), includeTotals: showTotals });
  const pageCount = Math.max(1, Math.ceil(data.count / data.pageSize));

  return <>
    <PageHeader eyebrow="Operations" title="Transactions" description="A read-only ledger of income, student-fee payments, payroll, and expenses. Record new entries from the Finance dashboard." />

    {showTotals ? (
      <section className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={formatPKR(data.totals.income)} hint="Transactions in selected range" icon={ArrowDownCircle} tone="green" />
        <StatCard label="Expenses" value={formatPKR(data.totals.expenses)} hint="Transactions in selected range" icon={ArrowUpCircle} tone="red" />
        <StatCard label="Net" value={formatPKR(data.totals.income - data.totals.expenses)} hint="Income minus expenses" icon={ArrowDownCircle} tone="blue" />
      </section>
    ) : null}

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
        {!data.rows.length ? <EmptyState title="No transactions found" description="Try another period or record a new income or expense." className="m-5" /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
          <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Student / party</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Recorded by</th><th className="px-4 py-3">Reference</th></tr></thead>
          <tbody>{data.rows.map((row: any) => <tr key={row.id} className="border-t border-outline/60"><td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{row.receipt_number}</td><td className="px-4 py-3"><Badge tone={row.direction === "income" ? "green" : "red"}>{TRANSACTION_CATEGORY_LABELS[row.category as TransactionCategory] ?? row.category.replace(/_/g, " ")}</Badge><p className="mt-1 text-xs capitalize text-muted">{row.source.replace(/_/g, " ")}</p></td><td className="px-4 py-3"><p className="font-semibold text-ink">{row.student_name || row.party_name || "—"}</p>{row.admission_number ? <p className="text-xs text-muted">{row.admission_number}</p> : null}<p className="max-w-xs truncate text-xs text-muted">{row.description}</p></td><td className={`px-4 py-3 font-bold ${row.direction === "income" ? "text-success" : "text-danger"}`}>{row.direction === "income" ? "+" : "−"}{formatPKR(Number(row.amount))}</td><td className="px-4 py-3 text-muted">{formatDatePK(row.transaction_date)}</td><td className="px-4 py-3 text-muted">{row.recorded_by_name || "System"}</td><td className="px-4 py-3 text-muted">{row.reference_number || "—"}</td></tr>)}</tbody>
        </table></div>}
      </CardContent>
    </Card>
    {pageCount > 1 ? <nav className="mt-4 flex items-center gap-3 text-sm"><span className="text-muted">Page {data.page} of {pageCount}</span>{data.page > 1 ? <Link className="font-semibold text-primary" href={`/finance/transactions?${new URLSearchParams({ ...params, page: String(data.page - 1) })}`}>Previous</Link> : null}{data.page < pageCount ? <Link className="font-semibold text-primary" href={`/finance/transactions?${new URLSearchParams({ ...params, page: String(data.page + 1) })}`}>Next</Link> : null}</nav> : null}
  </>;
}
