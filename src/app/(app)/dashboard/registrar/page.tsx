import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";
import { getFinanceDashboard } from "@/lib/services/finance";
import { getApprovalRequests } from "@/lib/services/approvals";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { formatPKR, formatDatePK } from "@/lib/utils";
import { GraduationCap, Wallet, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function RegistrarDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "student_staff") {
    throw new Error("Unauthorized access to Registrar Dashboard");
  }

  const [dashboard, finance, approvals] = await Promise.all([
    getDashboardData(user),
    getFinanceDashboard(user),
    getApprovalRequests(user, { status: "pending" })
  ]);
  const pendingAdmissions = approvals.filter((request) => request.request_type === "admission").length;

  return (
    <>
      <DashboardHeader
        userName={user.fullName}
        role={user.role}
        roleLabel="Registrar"
        avatarUrl={user.avatarUrl}
        statusText="ACCOUNT ACTIVE"
        stats={[
          { label: "Pending Admissions", value: pendingAdmissions },
          { label: "Total Enrolled", value: dashboard.totalStudents }
        ]}
      />
      <PageHeader
        eyebrow={user.schoolName}
        title="Registrar Dashboard"
        description="Search students, verify class enrollments, track unpaid dues, and print final approved result cards."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-primary-soft p-5 text-primary flex justify-between items-center gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Print Result Cards</h3>
            <p className="mt-1 text-sm text-muted">Generate and print official approved exam result cards for class registers.</p>
          </div>
          <ButtonLink href="/results?view=cards">
            Open Results <ArrowRight className="ml-1 h-4 w-4" />
          </ButtonLink>
        </div>

        <div className="rounded-lg bg-warning-soft p-5 text-warning flex justify-between items-center gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Collect Fees</h3>
            <p className="mt-1 text-sm text-muted">Record student tuition payments and print localized receipts.</p>
          </div>
          <ButtonLink href="/finance/fees" variant="secondary">
            Payments &rarr;
          </ButtonLink>
        </div>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} hint="Active enrollment" icon={GraduationCap} />
        <StatCard label="Collected Fees" value={formatPKR(finance.totalCollected)} hint="Total recorded payments" icon={Wallet} />
        <StatCard label="Outstanding Fees" value={formatPKR(finance.totalOutstanding)} hint="Unpaid dues" icon={AlertCircle} />
        <StatCard label="Overdue Accounts" value={finance.overduePayments.toString()} hint="Past due date" icon={AlertCircle} />
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Outstanding classes table */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {!finance.outstandingByClass.length ? (
              <EmptyState title="No outstanding fees" description="Outstanding balances will list here by class." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-low font-label text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2">Class</th>
                      <th className="px-4 py-2">Unpaid Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance.outstandingByClass.map((c: any) => (
                      <tr key={c.class_name} className="border-t border-outline/60">
                        <td className="px-4 py-3 font-semibold text-ink">{c.class_name}</td>
                        <td className="px-4 py-3 font-semibold text-danger">{formatPKR(c.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Link href="/finance/payments" className="text-xs font-bold text-primary hover:underline">
              All History
            </Link>
          </CardHeader>
          <CardContent>
            {!finance.recentPayments.length ? (
              <EmptyState title="No payments recorded" description="Payments collected will be listed here." />
            ) : (
              <div className="space-y-3">
                {finance.recentPayments.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center rounded-lg bg-surface-low p-3">
                    <div>
                      <p className="font-semibold text-ink">{p.student_name}</p>
                      <p className="text-xs text-muted">Receipt: {p.receipt_number} • {formatDatePK(p.payment_date)}</p>
                    </div>
                    <span className="font-semibold text-success">{formatPKR(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
