import { requireUser } from "@/lib/auth/session";
import { getDashboardData, getPendingAttendanceClasses } from "@/lib/services/dashboard";
import { getFinanceDashboard } from "@/lib/services/finance";
import { getResultsManagementWorkspace } from "@/lib/services/marks";
import { getAnnouncements } from "@/lib/services/announcements";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LazyClassDistributionChart } from "@/components/dashboard/lazy-responsive-charts";
import { PendingAttendanceCard } from "@/components/dashboard/pending-attendance-card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { formatPKR, formatDatePK } from "@/lib/utils";
import { GraduationCap, Users, CalendarX2, AlertTriangle, FileText, Bell, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function PrincipalDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal") {
    throw new Error("Unauthorized access to Principal Dashboard");
  }

  const today = new Date().toISOString().slice(0, 10);
  const [dashboard, finance, results, announcements, pendingAttendanceClasses] = await Promise.all([
    getDashboardData(user),
    getFinanceDashboard(user),
    getResultsManagementWorkspace(user, { status: "pending_approval" }),
    getAnnouncements(user),
    getPendingAttendanceClasses(user)
  ]);

  const pendingApprovalsCount = results.filter(r => r.workflowStatus === "pending_approval").length;

  return (
    <>
      <DashboardHeader
        userName={user.fullName}
        role={user.role}
        roleLabel="Principal"
        avatarUrl={user.avatarUrl}
        statusText="ACCOUNT ACTIVE"
        stats={[
          { label: "Students", value: dashboard.totalStudents },
          { label: "Faculty", value: dashboard.totalTeachers },
          { label: "Pending Approvals", value: pendingApprovalsCount }
        ]}
      />
      <PageHeader
        eyebrow={user.schoolName}
        title="Principal Dashboard"
        description="Oversee academic progress, fee collections, active announcements, and approve student results."
      />

      {/* Quick Actions */}
      <section className="mb-6">
        <h3 className="mb-3 font-display text-base font-bold text-muted uppercase tracking-wide">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/students?action=new"
            className="group flex items-center gap-3 rounded-xl border border-outline/40 bg-surface-low p-4 transition hover:border-primary hover:bg-primary-soft/10"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white transition">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-ink text-sm">New Student</p>
              <p className="text-xs text-muted">Enroll a new admission</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Alert and Actions summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {pendingApprovalsCount > 0 ? (
          <div className="rounded-lg bg-warning-soft p-4 text-warning flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{pendingApprovalsCount} exam result sets are pending approval.</p>
              <Link href="/results?status=pending_approval" className="text-xs font-bold underline hover:brightness-110">
                Go to Result Approvals &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-success-soft p-4 text-success flex items-center gap-3">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-semibold">All major exam uploads have been reviewed and approved.</p>
          </div>
        )}

        <div className="rounded-lg bg-primary-soft p-4 text-primary flex items-center gap-3">
          <Bell className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">{announcements.length} active public announcements.</p>
            <p className="text-xs font-bold">Use the bell menu for history and updates.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} hint="Active enrollment" icon={GraduationCap} />
        <StatCard label="Teachers" value={dashboard.totalTeachers.toLocaleString()} hint="Active instructors" icon={Users} />
        <StatCard label="Outstanding Fees" value={formatPKR(finance.totalOutstanding)} hint="Pending collection" icon={AlertTriangle} />
        <StatCard label="Absent today" value={dashboard.absentToday.toLocaleString()} hint="Attendance exceptions" icon={CalendarX2} />
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

      {/* Attendance follow-up */}
      <section className="mt-6">
        <PendingAttendanceCard classes={pendingAttendanceClasses} today={today} />
      </section>

      {/* Announcements */}
      <section className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Announcements</CardTitle>
            <span className="text-xs font-bold text-muted">Bell menu</span>
          </CardHeader>
          <CardContent>
            {!announcements.length ? (
              <EmptyState title="No active announcements" description="Create an announcement to broadcast school updates." />
            ) : (
              <div className="space-y-4">
                {announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="border-b border-outline/25 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-ink">{a.title}</h4>
                      <Badge tone={a.priority === "critical" ? "red" : a.priority === "high" ? "yellow" : "blue"}>
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted line-clamp-2">{a.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      Published: {formatDatePK(a.publish_date)} by {a.created_by_name ?? "Principal"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
