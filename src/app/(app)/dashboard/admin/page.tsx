import { requireUser } from "@/lib/auth/session";
import { getDailyOperationsCenter, getDashboardData } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyOperationsCenter } from "@/components/dashboard/daily-operations-center";
import { ArrowUpRight, Shield, Settings, Users, UserCog, GraduationCap, UserPlus, CalendarDays } from "lucide-react";
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
        <StatCard label="Total students" value={dashboard.totalStudents.toLocaleString()} hint="Active enrollment" icon={GraduationCap} />
        <StatCard label="Teachers" value={dashboard.totalTeachers.toLocaleString()} hint="Active teacher accounts" icon={UserCog} />
        <StatCard label="Staff Members" value={dashboard.totalStaff.toLocaleString()} hint="Total user profiles" icon={Users} />
        <StatCard label="System Security" value="OK" hint="All roles verified" icon={Shield} />
      </section>

      {/* Audit Log Activities */}
      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent System Audit Trails</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={dashboard.activity} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

const quickActionTones = {
  blue: "bg-primary-soft text-primary ring-primary/10 group-hover:bg-primary group-hover:text-white",
  violet: "bg-violet-50 text-violet-600 ring-violet-100 group-hover:bg-violet-600 group-hover:text-white",
  green: "bg-success-soft text-success ring-success/10 group-hover:bg-success group-hover:text-white",
  amber: "bg-warning-soft text-warning ring-warning/10 group-hover:bg-warning group-hover:text-white"
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
      className="group relative flex min-h-[174px] flex-col overflow-hidden rounded-2xl border border-outline/70 bg-surface p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-surface-mid/70 transition group-hover:scale-125" />
      <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-colors duration-200 ${quickActionTones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="relative mt-4">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
      </div>
      <span className="relative mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary">
        {action}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
