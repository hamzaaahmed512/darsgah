import { requireUser } from "@/lib/auth/session";
import { getDailyOperationsCenter, getDashboardData } from "@/lib/services/dashboard";
import { getFinanceDashboard } from "@/lib/services/finance";
import { getApprovalRequests } from "@/lib/services/approvals";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LazyClassDistributionChart } from "@/components/dashboard/lazy-responsive-charts";
import { LazyExpenseDistributionChart, LazyIncomeTrendChart } from "@/components/finance/lazy-finance-dashboard-charts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyOperationsCenter } from "@/components/dashboard/daily-operations-center";
import { formatCompactPKR, formatPKR } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, GraduationCap, Users, Wallet, UserPlus } from "lucide-react";
import Link from "next/link";

const statTones = {
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  purple: "bg-purple-50 text-purple-600 ring-purple-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-50 text-slate-600 ring-slate-100"
} as const;

function OverviewFinanceStatCard({
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

function formatFinanceAmount(amount: number) {
  return Math.abs(amount) >= 1_000_000 ? formatCompactPKR(amount) : formatPKR(amount);
}

function contributionText(current: number, lifetime: number) {
  if (lifetime <= 0 || current <= 0) return "Yearly share: 0%";
  return `Yearly share: ${((current / lifetime) * 100).toFixed(1)}%`;
}

export default async function PrincipalDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal") {
    throw new Error("Unauthorized access to Principal Dashboard");
  }

  const [dashboard, operations, finance, studentRequests] = await Promise.all([
    getDashboardData(user),
    getDailyOperationsCenter(user),
    getFinanceDashboard(user),
    getApprovalRequests(user, { status: "pending" })
  ]);

  const pendingAdmissionsCount = studentRequests.filter((request) => request.request_type === "admission").length;
  const incomeContribution = contributionText(finance.yearlyIncome, finance.lifetimeIncome);
  const expenseContribution = contributionText(finance.yearlyExpenses, finance.lifetimeExpenses);
  const profitContribution = contributionText(finance.yearlyProfit, finance.lifetimeProfit);
  return (
    <>
      <DashboardHeader
        userName={user.fullName}
        role={user.role}
        eyebrow={user.schoolName}
        avatarUrl={user.avatarUrl}
        statusText="ACCOUNT ACTIVE"
        decorative
        stats={[
          { label: "Pending Admissions", value: pendingAdmissionsCount }
        ]}
      />

      <DailyOperationsCenter items={operations} compact />

      {pendingAdmissionsCount > 0 ? (
        <div className="mb-6 grid gap-4">
          {pendingAdmissionsCount > 0 ? (
            <div className="rounded-lg bg-primary-soft p-4 text-primary flex items-center gap-3">
              <UserPlus className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {pendingAdmissionsCount} new admission request{pendingAdmissionsCount === 1 ? " needs" : "s need"} review.
                </p>
                <Link href="/students?status=pending_approval" className="text-xs font-bold underline hover:brightness-110">
                  Review in Students &rarr;
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <OverviewFinanceStatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} icon={GraduationCap} tone="blue" trend={`${dashboard.recentAdmissions.length} new admission${dashboard.recentAdmissions.length === 1 ? "" : "s"}`} trendTone={dashboard.recentAdmissions.length > 0 ? "positive" : "neutral"} />
        <OverviewFinanceStatCard label="Staff" value={dashboard.totalStaff.toLocaleString()} icon={Users} tone="purple" trend={`${dashboard.totalTeachers.toLocaleString()} teacher${dashboard.totalTeachers === 1 ? "" : "s"}`} />
        <OverviewFinanceStatCard label="Total income" value={formatFinanceAmount(finance.lifetimeIncome)} icon={ArrowDownCircle} tone="green" trend={incomeContribution} trendTone="positive" />
        <OverviewFinanceStatCard label="Total expenses" value={formatFinanceAmount(finance.lifetimeExpenses)} icon={ArrowUpCircle} tone="red" trend={expenseContribution} trendTone="positive" />
        <OverviewFinanceStatCard label="Total profit" value={formatFinanceAmount(finance.lifetimeProfit)} icon={Wallet} tone={finance.lifetimeProfit >= 0 ? "green" : "red"} trend={profitContribution} trendTone="positive" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyIncomeTrendChart datasets={finance.incomeTrends} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyExpenseDistributionChart datasets={finance.expenseDistributions} />
          </CardContent>
        </Card>
      </section>

      {/* Charts and Feeds */}
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyClassDistributionChart data={dashboard.classDistribution} />
          </CardContent>
        </Card>
        <ActivityFeed items={dashboard.activity} />
      </section>

    </>
  );
}
