import { requireUser } from "@/lib/auth/session";
import { getTeacherDashboardData } from "@/lib/services/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ArrowRight, GraduationCap, School, CalendarX2, CalendarCheck, BookOpen, ClipboardList, Clock3 } from "lucide-react";
import Link from "next/link";
import { formatGradeSection } from "@/lib/utils";

export default async function TeacherDashboardPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "teacher" && user.role !== "head_teacher") {
    throw new Error("Unauthorized access to Teacher Dashboard");
  }

  const dashboard = await getTeacherDashboardData(user);
  const headClasses = dashboard.headClasses;

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
          { label: "My Classes", value: headClasses.length },
          { label: "My Students", value: dashboard.totalStudents }
        ]}
      />

      <section className="mb-6 overflow-hidden rounded-[22px] border border-primary-ink bg-gradient-to-br from-primary to-[#16478f] text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)]" aria-labelledby="teacher-daily-operations">
        <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-5 sm:px-6">
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-wide text-blue-100">Today</p>
            <h2 id="teacher-daily-operations" className="font-display text-xl font-bold text-white">Daily Operations</h2>
          </div>
          <Link href="/attendance" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25">
            Open Center
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 bg-white/5 px-5 py-4 sm:px-6">
          <Link
            href="/attendance"
            className="group inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Mark Attendance</p>
              <p className="text-[11px] font-medium text-muted">Record today&apos;s class attendance</p>
            </div>
          </Link>
          <Link
            href="/academics"
            className="group inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">My Classes</p>
              <p className="text-[11px] font-medium text-muted">View teaching assignments</p>
            </div>
          </Link>
          <Link
            href="/academics/exams-setup"
            className="group inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Mark Assessment</p>
              <p className="text-[11px] font-medium text-muted">Enter marks for an assessment</p>
            </div>
          </Link>
          <Link
            href="/academics/results?status=pending_approval"
            className="group inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Pending Results</p>
              <p className="text-[11px] font-medium text-muted">Review results awaiting approval</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My students" value={dashboard.totalStudents.toLocaleString()} hint="Students in your head class" icon={GraduationCap} tone="blue" />
        <StatCard label="Head classes" value={headClasses.length.toLocaleString()} hint="Classes assigned to you" icon={School} tone="purple" />
        <StatCard label="Absent today" value={dashboard.absentToday.toLocaleString()} hint="In your head class" icon={CalendarX2} tone="red" />
        <StatCard label="Attendance completed" value={`${dashboard.attendanceCompleted}/${headClasses.length}`} hint="Head classes marked today" icon={CalendarCheck} tone="green" />
      </section>

      {/* Head Teacher Classes */}
      <section className="mt-6">
        <h3 className="mb-4 font-display text-lg font-bold text-ink">My Assigned Head Classes</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {headClasses.length ? (
            headClasses.map((item: any) => (
              <Card key={item.id} className="p-5">
                <div className="flex justify-between items-start">
                  <Badge tone={item.attendance_marked_today ? "green" : "blue"}>
                    {item.attendance_marked_today ? "Marked today" : "Head teacher"}
                  </Badge>
                </div>
                <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                  {formatGradeSection(item.grade_name, item.section_name)}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {item.room ? `Room ${item.room}` : "No room assigned"}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <ButtonLink href={`/students?classId=${item.id}`} variant="secondary" className="w-full">
                    Student list
                  </ButtonLink>
                  <ButtonLink href={`/attendance?classId=${item.id}`} className="w-full">
                    {item.attendance_marked_today ? "View attendance" : "Mark attendance"}
                  </ButtonLink>
                </div>
              </Card>
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="No head-teacher class" description="Only a class head teacher can mark attendance. Subject assignments remain visible in Academics." />
            </div>
          )}
        </div>
      </section>

    </>
  );
}
