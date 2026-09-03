import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { AlertCircle, Banknote, FileText, Percent, Settings } from "lucide-react";
import { getStudentFees, getPaymentHistory, getFinanceDashboard } from "@/lib/services/finance";
import { getAcademicOptions } from "@/lib/services/academics";
import { PageHeader } from "@/components/layout/page-header";
import { FeeManagementClient } from "@/components/finance/fee-management-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatPKR } from "@/lib/utils";

export default async function FeeManagementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser("finance:view");
  const month = (await searchParams).month ?? new Date().toISOString().slice(0, 7);
  const [accounts, academics, payments, dashboard] = await Promise.all([
    getStudentFees(user, {}),
    getAcademicOptions(user),
    getPaymentHistory(user, {}),
    getFinanceDashboard(user)
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Fee Management"
        description="Review student fee accounts, collect payments, apply discounts, and print receipts from one focused workspace."
        actions={
          <>
            <Link href="/finance/fees/structures" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-button hover:brightness-105">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Fee Structures
            </Link>
            <Link href={`/finance/challans?month=${month}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-primary ring-1 ring-outline hover:bg-primary-soft">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Challans
            </Link>
          </>
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expected Billing"
          value={formatPKR(dashboard.totalExpected)}
          icon={Banknote}
          tone="blue"
          trend="Total payable across fee accounts"
        />
        <StatCard
          label="Collected"
          value={formatPKR(dashboard.totalCollected)}
          icon={Banknote}
          tone="green"
          trend="Payments posted against fee accounts"
        />
        <StatCard
          label="Outstanding"
          value={formatPKR(dashboard.totalOutstanding)}
          icon={AlertCircle}
          tone="red"
          trend={`${dashboard.pendingPayments} pending account${dashboard.pendingPayments === 1 ? "" : "s"}`}
          trendTone={dashboard.pendingPayments > 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Discounts"
          value={formatPKR(dashboard.totalDiscounts)}
          icon={Percent}
          tone="amber"
          trend="Approved fee adjustments"
        />
      </div>
      <FeeManagementClient
        user={user}
        accounts={accounts}
        classes={academics.classes}
        sessions={academics.years}
        payments={payments}
      />
    </>
  );
}
