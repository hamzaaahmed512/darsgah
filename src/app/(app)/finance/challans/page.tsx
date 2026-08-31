import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getStudentFees, getFeeChallans } from "@/lib/services/finance";
import { getAcademicOptions } from "@/lib/services/academics";
import { PageHeader } from "@/components/layout/page-header";
import { ChallanGeneration } from "@/components/finance/challan-generation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDatePK, formatPKR } from "@/lib/utils";

export default async function FinanceChallansPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser("finance:view");
  const month = (await searchParams).month ?? new Date().toISOString().slice(0, 7);
  const [accounts, academics, challans] = await Promise.all([
    getStudentFees(user, {}),
    getAcademicOptions(user),
    getFeeChallans(user, month)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Fee Challans"
        description="Generate monthly challans and review issued billing records for the selected month."
        actions={
          <>
            <Link href="/finance/fees" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-primary ring-1 ring-outline hover:bg-primary-soft">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Fee Management
            </Link>
            <Link href="/finance/fees/structures" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:brightness-105">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Fee Structures
            </Link>
          </>
        }
      />

      <ChallanGeneration user={user} month={month} accounts={accounts} classes={academics.classes} />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-muted" htmlFor="challan-month">Challan month</label>
        <input id="challan-month" name="month" type="month" defaultValue={month} className="rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-sm text-ink" />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Fee Collection Challans — {month}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((row: any) => (
                  <tr key={row.id} className="border-t border-outline/60">
                    <td className="px-4 py-3 font-semibold">{row.student_name}<span className="ml-2 text-xs text-muted">{row.admission_number}</span></td>
                    <td className="px-4 py-3">{row.class_name}</td>
                    <td className="px-4 py-3">{formatPKR(row.amount)}</td>
                    <td className="px-4 py-3"><Badge tone={row.payment_status === "paid" ? "green" : "yellow"}>{row.payment_status}</Badge></td>
                    <td className="px-4 py-3 text-muted">{formatDatePK(row.created_at)}</td>
                  </tr>
                ))}
                {!challans.length && (
                  <tr>
                    <td className="px-4 py-4 text-muted" colSpan={5}>No challans generated for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
