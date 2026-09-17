import { requireUser } from "@/lib/auth/session";
import { getDailyOperationsCenter, getDashboardData } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyOperationsCenter } from "@/components/dashboard/daily-operations-center";
import { formatDistanceToNow } from "date-fns";
import { formatDisplayName } from "@/lib/student-name";
import { Activity, ArrowRight, CalendarDays, Layers3, Settings, UserCog, Users, GraduationCap, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator") {
    throw new Error("Unauthorized access to Admin Dashboard");
  }

  const [dashboard, operations] = await Promise.all([
    getDashboardData(user),
    getDailyOperationsCenter(user)
  ]);

  return (
    <>
      <DashboardHeader
        userName={user.fullName}
        role={user.role}
        roleLabel="System Administrator"
        avatarUrl={user.avatarUrl}
        statusText="ACCOUNT ACTIVE"
        stats={[]}
      />
      <PageHeader
        eyebrow="System Control"
        title="Admin Console"
        description="Manage system configurations, user profiles, role permissions, academic sessions, and check audit logs."
      />

      <DailyOperationsCenter items={operations} compact />

      {/* Quick Actions */}
      <section className="mb-6" aria-labelledby="quick-actions-heading">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-primary">Admin workspace</p>
            <h2 id="quick-actions-heading" className="mt-1 font-display text-xl font-bold text-ink">Quick actions</h2>
          </div>
          <p className="hidden text-sm text-muted sm:block">Common administration tasks</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard
            href="/students?action=new"
            icon={UserPlus}
            title="Enroll student"
            description="Start a new admission record"
            action="Add student"
            tone="blue"
          />
          <QuickActionCard
            href="/admin"
            icon={UserCog}
            title="Manage accounts"
            description="Users, roles, and access controls"
            action="Open console"
            tone="violet"
          />
          <QuickActionCard
            href="/settings?tab=academics"
            icon={CalendarDays}
            title="Academic sessions"
            description="Terms and active academic years"
            action="Edit sessions"
            tone="green"
          />
          <QuickActionCard
            href="/settings"
            icon={Settings}
            title="System settings"
            description="School profile and configuration"
            action="Open settings"
            tone="amber"
          />
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} hint="Active enrollment" icon={GraduationCap} tone="blue" />
        <StatCard label="Teachers" value={dashboard.totalTeachers.toLocaleString()} hint="Active teacher accounts" icon={UserCog} tone="purple" />
        <StatCard label="Staff members" value={dashboard.totalStaff.toLocaleString()} hint="Total active user profiles" icon={Users} tone="green" />
        <StatCard label="Active classes" value={dashboard.totalActiveClasses.toLocaleString()} hint="Classes in the active academic year" icon={Layers3} tone="amber" />
      </section>

      {/* Audit Log Activities */}
      <AdminAuditTrail items={dashboard.activity} />
    </>
  );
}

const quickActionTones = {
  blue: "bg-primary-soft text-primary ring-primary/10",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  green: "bg-success-soft text-success ring-success/10",
  amber: "bg-warning-soft text-warning ring-warning/10"
} as const;

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  action,
  tone
}: {
  href: string;
  icon: typeof UserPlus;
  title: string;
  description: string;
  action: string;
  tone: keyof typeof quickActionTones;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[94px] items-center gap-4 rounded-2xl border border-outline/70 bg-surface p-4 shadow-soft transition duration-200 hover:border-primary/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${quickActionTones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-low text-muted transition-colors group-hover:bg-primary group-hover:text-white" aria-label={action}>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function AdminAuditTrail({ items }: { items: any[] }) {
  return (
    <section className="mt-6" aria-labelledby="audit-trail-heading">
      <Card className="overflow-hidden border border-outline/70 shadow-soft">
        <CardHeader className="border-b border-outline/70 bg-surface-low p-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-button">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-primary">System activity</p>
              <CardTitle id="audit-trail-heading" className="mt-0.5 text-lg">Recent audit trails</CardTitle>
            </div>
          </div>
          <Link href="/activity" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-ink">
            View all activity
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {items.length ? (
            <ol className="divide-y divide-outline/70">
              {items.map((item) => (
                <li key={item.id} className="group flex gap-4 px-5 py-4 transition-colors hover:bg-surface-low sm:px-6">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/10">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{humanizeAuditAction(item.action)}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{formatDisplayName(item.profiles?.full_name) || "System"}</p>
                  </div>
                  <time className="shrink-0 pt-0.5 text-right text-xs font-medium text-muted" dateTime={item.created_at}>
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No activity yet</p>
              <p className="mt-1 text-sm text-muted">Important system events will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function humanizeAuditAction(action: string) {
  return action.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
