import { requireUser } from "@/lib/auth/session";
import { getDailyOperationsCenter, getDashboardData } from "@/lib/services/dashboard";
import { getFinanceDashboard } from "@/lib/services/finance";
import { getApprovalRequests } from "@/lib/services/approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LazyClassDistributionChart } from "@/components/dashboard/lazy-responsive-charts";
import { LazyExpenseDistributionChart, LazyIncomeTrendChart } from "@/components/finance/lazy-finance-dashboard-charts";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyOperationsCenter } from "@/components/dashboard/daily-operations-center";
import { formatPKR } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, GraduationCap, Users, Wallet, UserPlus } from "lucide-react";
import Link from "next/link";

function percentDelta(current: number, previous: number, lowerIsBetter = false): { text: string; tone: "positive" | "negative" | "neutral" } {
  if (previous === 0 && current === 0) return { text: "No change vs last month", tone: "neutral" as const };
  if (previous === 0) return { text: "New activity this month", tone: lowerIsBetter ? "negative" as const : "positive" as const };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const tone: "positive" | "negative" | "neutral" = change === 0 ? "neutral" : lowerIsBetter ? (change < 0 ? "positive" : "negative") : (change > 0 ? "positive" : "negative");
  const arrow = change >= 0 ? "Up" : "Down";
  return { text: `${arrow} ${Math.abs(change).toFixed(1)}% vs last month`, tone };
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
  const incomeDelta = percentDelta(finance.monthlyIncome, finance.previousMonthlyIncome);
  const expensesDelta = percentDelta(finance.monthlyExpenses, finance.previousMonthlyExpenses, true);
  const netDelta = percentDelta(finance.netCashFlow, finance.previousNetCashFlow);

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
        <StatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} icon={GraduationCap} tone="blue" trend={`${dashboard.recentAdmissions.length} recent admission${dashboard.recentAdmissions.length === 1 ? "" : "s"}`} trendTone={dashboard.recentAdmissions.length > 0 ? "positive" : "neutral"} />
        <StatCard label="Teachers" value={dashboard.totalTeachers.toLocaleString()} icon={Users} tone="purple" trend="Current faculty count" />
        <StatCard label="Monthly income" value={formatPKR(finance.monthlyIncome)} icon={ArrowDownCircle} tone="green" trend={incomeDelta.text} trendTone={incomeDelta.tone} />
        <StatCard label="Monthly expenses" value={formatPKR(finance.monthlyExpenses)} icon={ArrowUpCircle} tone="red" trend={expensesDelta.text} trendTone={expensesDelta.tone} />
        <StatCard label="Profits" value={formatPKR(finance.netCashFlow)} icon={Wallet} tone={finance.netCashFlow >= 0 ? "green" : "red"} trend={netDelta.text} trendTone={netDelta.tone} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyIncomeTrendChart datasets={finance.incomeTrends} />
          </CardContent>
        </Card>
        <Card>
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
