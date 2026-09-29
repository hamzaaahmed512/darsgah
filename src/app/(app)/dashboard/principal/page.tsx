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
import { formatCompactPKR } from "@/lib/utils";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, GraduationCap, Users, Wallet, UserPlus } from "lucide-react";
import Link from "next/link";
import { getStudentGenderCounts } from "@/lib/services/students";
import { aggregateClassDistributionByGrade } from "@/lib/grade-distribution";
import { GenderCounts } from "@/components/students/gender-counts";

const statTones = {
  green: { tile: "bg-emerald-50 text-emerald-600 ring-emerald-100", accent: "!border-t-emerald-500" }, red: { tile: "bg-red-50 text-red-600 ring-red-100", accent: "!border-t-rose-500" }, blue: { tile: "bg-blue-50 text-blue-600 ring-blue-100", accent: "!border-t-blue-500" }, purple: { tile: "bg-purple-50 text-purple-600 ring-purple-100", accent: "!border-t-purple-500" }, amber: { tile: "bg-amber-50 text-amber-600 ring-amber-100", accent: "!border-t-amber-500" }, slate: { tile: "bg-slate-50 text-slate-600 ring-slate-100", accent: "!border-t-slate-400" }
} as const;

function OverviewFinanceStatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
  detail,
  trendTone = "neutral"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof statTones;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
  detail?: React.ReactNode;
}) {
  const trendClass = trendTone === "positive" ? "text-emerald-600" : trendTone === "negative" ? "text-red-600" : "text-slate-500";

  return (
    <Card className={`kpi-card h-full !border-t-4 p-5 shadow-sm sm:p-6 ${statTones[tone].accent}`}>
      <div className="flex h-full items-start gap-5">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 sm:h-16 sm:w-16 ${statTones[tone].tile}`}>
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-2 whitespace-nowrap font-display text-[clamp(1.55rem,2vw,1.875rem)] font-bold leading-none tracking-tight text-ink">{value}</p>
          {trend ? <p className={`mt-3 text-sm font-bold ${trendClass}`}>{trend}</p> : null}
          {detail ? <div className="mt-3 flex items-center gap-3">{detail}</div> : null}
        </div>
      </div>
    </Card>
  );
}

function formatFinanceAmount(amount: number) {
  return formatCompactPKR(amount);
}

function contributionText(current: number, lifetime: number) {
  if (lifetime <= 0 || current <= 0) return "Yearly share: 0%";
  return `Yearly share: ${((current / lifetime) * 100).toFixed(1)}%`;
}

async function optionalDashboardData<T>(label: string, request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "unclassified";
    console.error(`Principal dashboard ${label} failed (${code}).`);
    return null;
  }
}

export default async function PrincipalDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal") {
    throw new Error("Unauthorized access to Principal Dashboard");
  }

  const [dashboard, operations, finance, studentRequests, genderCounts] = await Promise.all([
    optionalDashboardData("school summary", getDashboardData(user)),
    optionalDashboardData("daily operations", getDailyOperationsCenter(user)),
    optionalDashboardData("finance summary", getFinanceDashboard(user)),
    optionalDashboardData("student approvals", getApprovalRequests(user, { status: "pending" })),
    optionalDashboardData("gender summary", getStudentGenderCounts(user))
  ]);

  const unavailableSections = [!dashboard && "school summary", !operations && "daily operations", !finance && "finance summary", !studentRequests && "student approvals", !genderCounts && "gender summary"].filter(Boolean) as string[];
  const pendingAdmissionsCount = (studentRequests ?? []).filter((request) => request.request_type === "admission").length;
  const incomeContribution = finance ? contributionText(finance.yearlyIncome, finance.lifetimeIncome) : null;
  const expenseContribution = finance ? contributionText(finance.yearlyExpenses, finance.lifetimeExpenses) : null;
  const profitContribution = finance ? contributionText(finance.yearlyProfit, finance.lifetimeProfit) : null;
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

      {unavailableSections.length ? <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">Some dashboard information is temporarily unavailable.</p><p className="mt-1 text-sm">The page is still usable. Refresh to retry: {unavailableSections.join(", ")}.</p></div></div> : null}

      {operations ? <DailyOperationsCenter items={operations} compact /> : null}

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
        {dashboard ? <OverviewFinanceStatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} icon={GraduationCap} tone="blue" detail={genderCounts ? <GenderCounts male={genderCounts.male} female={genderCounts.female} compact /> : undefined} /> : null}
        {dashboard ? <OverviewFinanceStatCard label="Staff" value={dashboard.totalStaff.toLocaleString()} icon={Users} tone="purple" trend={`${dashboard.totalTeachers.toLocaleString()} teacher${dashboard.totalTeachers === 1 ? "" : "s"}`} /> : null}
        {finance ? <OverviewFinanceStatCard label="Total income" value={formatFinanceAmount(finance.lifetimeIncome)} icon={ArrowDownCircle} tone="green" trend={incomeContribution ?? undefined} trendTone="positive" /> : null}
        {finance ? <OverviewFinanceStatCard label="Total expenses" value={formatFinanceAmount(finance.lifetimeExpenses)} icon={ArrowUpCircle} tone="red" trend={expenseContribution ?? undefined} trendTone="positive" /> : null}
        {finance ? <OverviewFinanceStatCard label="Total profit" value={formatFinanceAmount(finance.lifetimeProfit)} icon={Wallet} tone={finance.lifetimeProfit >= 0 ? "green" : "red"} trend={profitContribution ?? undefined} trendTone="positive" /> : null}
      </section>

      {finance ? <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
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
      </section> : null}

      {/* Charts and Feeds */}
      {dashboard ? <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyClassDistributionChart data={aggregateClassDistributionByGrade(dashboard.classDistribution)} />
          </CardContent>
        </Card>
        <ActivityFeed items={dashboard.activity} />
      </section> : null}

    </>
  );
}
