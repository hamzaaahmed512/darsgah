import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Shield, Settings, Users, UserCog, GraduationCap, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "administrator") {
    throw new Error("Unauthorized access to Admin Dashboard");
  }

  const dashboard = await getDashboardData(user);

  return (
    <>
      <PageHeader
        eyebrow="System Control"
        title="Admin Console"
        description="Manage system configurations, user profiles, role permissions, academic sessions, and check audit logs."
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

      {/* Admin Quick Links */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-surface-low border border-outline/40 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary mb-3">
              <UserCog className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">Role Management</h3>
            <p className="mt-1 text-sm text-muted">Manage accounts, change user roles, and edit profiles.</p>
          </div>
          <ButtonLink href="/settings?tab=roles" variant="secondary" className="w-full">
            Manage Roles
          </ButtonLink>
        </div>

        <div className="rounded-lg bg-surface-low border border-outline/40 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success mb-3">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">Academic Sessions</h3>
            <p className="mt-1 text-sm text-muted">Create and manage terms and active academic years.</p>
          </div>
          <ButtonLink href="/settings?tab=academics" variant="secondary" className="w-full">
            Edit Sessions
          </ButtonLink>
        </div>

        <div className="rounded-lg bg-surface-low border border-outline/40 p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-soft text-warning mb-3">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">System Settings</h3>
            <p className="mt-1 text-sm text-muted">Modify school settings and display names.</p>
          </div>
          <ButtonLink href="/settings" variant="secondary" className="w-full">
            System Config
          </ButtonLink>
        </div>
      </div>

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
