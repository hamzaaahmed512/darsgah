import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  XCircle
} from "lucide-react";
import { StaffProfileEditModal } from "@/components/staff/staff-profile-edit-modal";
import { DownloadReportButton } from "@/components/reports/DownloadReportButton";
import type { StaffReportData } from "@/components/reports/profile-report-types";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { canReceiveClassAssignments } from "@/lib/constants/staff";
import { getLeavePolicy, type LeavePolicy } from "@/lib/services/leaves";
import { getStaffProfile } from "@/lib/services/staff";
import { formatDatePK, formatGradeSection, formatPKR } from "@/lib/utils";
import { formatCnic, formatPakistaniPhone } from "@/lib/pakistan-format";

const roleLabel = (role: string, custom?: string | null) =>
  custom ||
  ({
    administrator: "Administrator",
    principal: "Principal",
    teacher: "Teacher",
    head_teacher: "Head Teacher",
    student_staff: "Registrar / Student Staff",
    cashier: "Cashier",
    librarian: "Librarian",
    staff: "General Staff"
  } as Record<string, string>)[role] ||
  role.replace(/_/g, " ");

const attendanceTone: Record<string, string> = {
  present: "border-emerald-100 bg-emerald-50 text-emerald-700",
  absent: "border-red-100 bg-red-50 text-red-700",
  late: "border-amber-100 bg-amber-50 text-amber-700"
};

const leaveTone: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  rejected: "bg-red-50 text-red-700 border-red-100"
};

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("staff:view");
  const data = await getStaffProfile(user, id);
  if (!data.member) notFound();
  const member: any = data.member;
  const isTeacher = canReceiveClassAssignments(member.role);
  const displayRole = roleLabel(member.role, member.custom_role_name);
  const initials =
    member.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "ST";

  const canEdit =
    hasPermission(user.role, "staff:manage", user.permissions) &&
    !(user.role === "principal" && member.role === "administrator");
  const canViewSalary = user.role === "administrator" || user.role === "principal";
  const canViewStaffInsights = user.role === "administrator" || user.role === "principal";

  // Leave policy
  let leavePolicy: LeavePolicy = { annualLimit: 36, monthlyLimit: 3, weeklyLimit: null };
  if (canViewStaffInsights && isTeacher) {
    try {
      leavePolicy = await getLeavePolicy(user);
    } catch {}
  }

  // Extract distinct subjects taught
  const distinctSubjects = Array.from(
    new Set(
      data.assignments
        .map((a: any) => a.subjects?.name)
        .filter((name: any): name is string => Boolean(name && name.trim()))
    )
  );

  const totalClassesCount = data.headClasses.length + data.assignments.length;
  const reportData: StaffReportData = {
    fullName: member.full_name,
    status: member.status,
    staffId: member.user_id ?? id,
    role: displayRole,
    email: member.personal_email || member.email,
    phone: member.phone,
    department: member.department,
    joiningDate: data.employment?.joining_date,
    monthlyPay: canViewSalary && data.employment?.monthly_salary != null ? Number(data.employment.monthly_salary) : null,
    payRestricted: !canViewSalary,
    attendanceRate: data.attendanceStats?.total
      ? ((data.attendanceStats.present + data.attendanceStats.late) / data.attendanceStats.total) * 100 : null,
    attendanceNote: "Current year • Present + late / recorded days",
    daysPresent: data.attendanceStats?.total ? data.attendanceStats.present : null,
    school: { name: user.schoolFullName || user.schoolName, logoUrl: user.schoolLogoUrl }
  };

  return (
    <>
      <div className="min-w-0">
        {/* Printable Official Header (visible only on PDF / print) */}
        <div className="hidden mb-6 border-b border-slate-300 pb-4 print:block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Darsgah School Management</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{member.full_name}</h1>
              <p className="text-sm text-slate-600">
                Official Staff Record · {displayRole} · {member.department || "General Department"}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Generated: {formatDatePK(new Date().toISOString().slice(0, 10))}</p>
              <p className="mt-0.5 font-semibold text-slate-700">Status: {member.status.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Navigation & Header Actions */}
        <div className="print:hidden">
          <Link
            href="/staff"
            prefetch={false}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            Back to staff
          </Link>

          <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-blue-50"
                />
              ) : (
                <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-blue-50 text-2xl font-bold text-primary ring-1 ring-blue-100">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {isTeacher ? "Teacher Profile" : "Staff Profile"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="break-words font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
                    {member.full_name}
                  </h1>
                  <Badge tone={member.status === "active" ? "green" : "gray"}>{member.status}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-muted">
                  {displayRole} · {member.department || "Department not set"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <DownloadReportButton type="staff" data={reportData} />
              {canEdit ? (
                <StaffProfileEditModal
                  staffId={id}
                  initial={{
                    fullName: member.full_name,
                    phone: member.phone,
                    cnic: member.cnic,
                    gender: member.gender,
                    personalEmail: member.personal_email,
                    department: member.department,
                    jobTitle: member.job_title
                  }}
                />
              ) : null}
              <ButtonLink href="/staff" className="min-w-20 print:hidden">
                Back
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* ─── KPI Cards matching website theme ─────────────────────────── */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Staff KPI overview">
          <StatCard
            icon={Banknote}
            label="Monthly Pay"
            value={
              canViewSalary
                ? data.employment?.monthly_salary
                  ? formatPKR(Number(data.employment.monthly_salary))
                  : "Not set"
                : "Confidential"
            }
            tone="green"
            trend={
              data.employment?.employment_status
                ? `Status: ${data.employment.employment_status}`
                : "Base monthly compensation"
            }
            trendTone="positive"
          />

          <StatCard
            icon={CalendarCheck2}
            label="Attendance"
            value={
              data.attendanceStats && data.attendanceStats.total > 0
                ? `${Math.round(((data.attendanceStats.present + data.attendanceStats.late) / data.attendanceStats.total) * 100)}%`
                : data.attendanceStats?.total === 0
                  ? "No records"
                  : "N/A"
            }
            tone="blue"
            trend={
              data.attendanceStats && data.attendanceStats.total > 0
                ? `${data.attendanceStats.present} present · ${data.attendanceStats.absent} absent · ${data.attendanceStats.late} late`
                : "Recorded attendance records"
            }
            trendTone={data.attendanceStats && data.attendanceStats.absent > 3 ? "negative" : "neutral"}
          />

          <StatCard
            icon={CalendarX2}
            label="Leaves"
            value={data.leaveStats ? `${data.leaveStats.annualUsed} day${data.leaveStats.annualUsed === 1 ? "" : "s"}` : "0 days"}
            tone="amber"
            trend={
              data.leaveStats
                ? `${data.leaveStats.monthlyUsed} day${data.leaveStats.monthlyUsed === 1 ? "" : "s"} taken this month`
                : "0 days taken this month"
            }
            trendTone={
              data.leaveStats && leavePolicy.monthlyLimit !== null && data.leaveStats.monthlyUsed > leavePolicy.monthlyLimit
                ? "negative"
                : "neutral"
            }
          />
        </section>

        {/* ─── Profile Details & Teaching Load Below KPI Cards ───────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card 1: Personal & Contact Information */}
          <Card className="overflow-hidden rounded-[24px] border border-outline/70 bg-white shadow-soft">
            <CardHeader className="border-b border-outline/40 pb-4">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-primary-soft p-2.5 text-primary">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Personal &amp; Contact Details</CardTitle>
                  <p className="text-xs text-muted">Core profile, roles, and employment identity.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailItem label="Full name" value={member.full_name} />
                <DetailItem label="System role" value={displayRole} icon={<ShieldCheck className="h-4 w-4" />} />
                <DetailItem label="Department" value={member.department || "Not assigned"} icon={<Building2 className="h-4 w-4" />} />
                <DetailItem
                  label="Designation / Title"
                  value={member.job_title || data.employment?.designation || "Not recorded"}
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                />
                <DetailItem label="Account email" value={member.email || "Not recorded"} icon={<Mail className="h-4 w-4" />} />
                <DetailItem
                  label="Personal email"
                  value={member.personal_email || "Not recorded"}
                  icon={<Mail className="h-4 w-4" />}
                />
                <DetailItem
                  label="Phone number"
                  value={formatPakistaniPhone(member.phone) || member.phone || "Not recorded"}
                  icon={<Phone className="h-4 w-4" />}
                />
                <DetailItem
                  label="CNIC / ID"
                  value={formatCnic(member.cnic) || member.cnic || "Not recorded"}
                />
                <DetailItem
                  label="Gender"
                  value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : "Not recorded"}
                />
                <DetailItem
                  label="Employment status"
                  value={data.employment?.employment_status || member.status}
                />
                <DetailItem
                  label="Joining date"
                  value={data.employment?.joining_date ? formatDatePK(data.employment.joining_date) : "Not recorded"}
                />
                <DetailItem
                  label="Contract type"
                  value={data.employment?.contract_type || "Permanent / Regular"}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Card 2: Classes & Subjects Teaching */}
          <Card className="overflow-hidden rounded-[24px] border border-outline/70 bg-white shadow-soft">
            <CardHeader className="border-b border-outline/40 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-primary-soft p-2.5 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-lg">Assigned Classes &amp; Subjects</CardTitle>
                    <p className="text-xs text-muted">
                      {isTeacher
                        ? `Teaching load: ${totalClassesCount} class assignment${totalClassesCount === 1 ? "" : "s"}`
                        : "Non-teaching administrative staff"}
                    </p>
                  </div>
                </div>
                {isTeacher && distinctSubjects.length > 0 ? (
                  <Badge tone="blue">{distinctSubjects.length} Subject{distinctSubjects.length === 1 ? "" : "s"}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {isTeacher ? (
                <div className="space-y-4">
                  {/* Distinct Subjects Taught */}
                  {distinctSubjects.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Subjects Taught</p>
                      <div className="flex flex-wrap gap-2">
                        {distinctSubjects.map((subj) => (
                          <span
                            key={subj}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-blue-100"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            {subj}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Class Assignments */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Assigned Classes</p>
                    <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
                      {data.headClasses.map((row: any) => (
                        <Link
                          key={`head-${row.id}`}
                          href={`/classes/${row.id}`}
                          className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 transition hover:bg-primary-soft"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-bold text-primary shadow-xs">
                              HT
                            </span>
                            <div>
                              <p className="font-semibold text-ink">
                                {formatGradeSection(row.grades?.name, row.sections?.name)}
                              </p>
                              <p className="text-xs text-muted">Room: {row.room || "Main classroom"}</p>
                            </div>
                          </div>
                          <Badge tone="blue">Head Teacher</Badge>
                        </Link>
                      ))}

                      {data.assignments.map((row: any) => (
                        <Link
                          key={row.id}
                          href={`/classes/${row.classes?.id}`}
                          className="flex items-center justify-between rounded-2xl border border-outline/60 bg-surface-low px-4 py-3 transition hover:bg-surface-high/50"
                        >
                          <div>
                            <p className="font-semibold text-ink">
                              {formatGradeSection(row.classes?.grades?.name, row.classes?.sections?.name)}
                            </p>
                            <p className="text-xs text-muted">Room: {row.classes?.room || "Main classroom"}</p>
                          </div>
                          <Badge tone="blue">{row.subjects?.name || "Subject Teacher"}</Badge>
                        </Link>
                      ))}

                      {!data.headClasses.length && !data.assignments.length ? (
                        <EmptyState
                          title="No classes assigned"
                          description="This teacher currently has no class or subject assignments configured."
                          className="min-h-36"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Administrative Staff"
                  description="Class and subject assignments apply to teaching roles."
                  className="min-h-36"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Attendance & Leave Detailed Breakdown ─────────────────────── */}
        {canViewStaffInsights && isTeacher ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Attendance Details Card */}
            <Card className="overflow-hidden rounded-[24px] border border-outline/70 bg-white shadow-soft">
              <CardHeader className="border-b border-outline/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <CalendarCheck2 className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">Attendance Breakdown</CardTitle>
                      <p className="text-xs text-muted">Teacher presence logs for current academic year.</p>
                    </div>
                  </div>
                  {data.attendanceStats && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {data.attendanceStats.total} total days
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {data.attendanceStats === null ? (
                  <p className="py-6 text-center text-sm text-muted">
                    Apply the teacher attendance migration to view records.
                  </p>
                ) : data.attendanceStats.total === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No attendance records recorded this year.</p>
                ) : (
                  <>
                    <div className="mb-5 grid grid-cols-3 gap-3">
                      <StatPill label="Present" value={data.attendanceStats.present} colorClass="bg-emerald-50 text-emerald-700" />
                      <StatPill label="Absent" value={data.attendanceStats.absent} colorClass="bg-red-50 text-red-700" />
                      <StatPill label="Late" value={data.attendanceStats.late} colorClass="bg-amber-50 text-amber-700" />
                    </div>
                    {data.attendanceStats.recentRecords.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Recent Attendance Entries</p>
                        <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {data.attendanceStats.recentRecords.map((rec) => (
                            <div
                              key={rec.date}
                              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${
                                attendanceTone[rec.status] ?? "border-outline/50 bg-surface-low text-muted"
                              }`}
                            >
                              <span className="font-semibold">{formatDatePK(rec.date)}</span>
                              <span className="inline-flex items-center gap-1.5 font-bold capitalize">
                                {rec.status === "present" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : rec.status === "absent" ? (
                                  <XCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5" />
                                )}
                                {rec.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Leave Usage Card */}
            <Card className="overflow-hidden rounded-[24px] border border-outline/70 bg-white shadow-soft">
              <CardHeader className="border-b border-outline/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                      <CalendarX2 className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg">Leave Usage &amp; Quotas</CardTitle>
                      <p className="text-xs text-muted">Approved and pending staff leave requests.</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {data.leaveStats === null ? (
                  <p className="py-6 text-center text-sm text-muted">
                    Apply the staff leaves migration to view leave usage.
                  </p>
                ) : (
                  <>
                    <div className="mb-5 grid sm:grid-cols-3 gap-3">
                      <LeaveQuota label="Annual" used={data.leaveStats.annualUsed} limit={leavePolicy.annualLimit} />
                      <LeaveQuota label="This month" used={data.leaveStats.monthlyUsed} limit={leavePolicy.monthlyLimit} />
                      <LeaveQuota label="This week" used={data.leaveStats.weeklyUsed} limit={leavePolicy.weeklyLimit} />
                    </div>
                    {data.leaveStats.recentLeaves.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Recent Leave Requests</p>
                        <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {data.leaveStats.recentLeaves.map((lv, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${
                                leaveTone[lv.status] ?? "border-outline/50 bg-surface-low text-muted"
                              }`}
                            >
                              <span className="font-medium capitalize text-ink">
                                {lv.type.replace("_", " ")} &middot; {formatDatePK(lv.start)} – {formatDatePK(lv.end)}
                              </span>
                              <Badge tone={lv.status === "approved" ? "green" : lv.status === "rejected" ? "red" : "yellow"}>
                                {lv.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted">No leave records registered for this year.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

function StatPill({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${colorClass}`}>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs font-semibold">{label}</p>
    </div>
  );
}

function LeaveQuota({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const isUnlimited = limit === null;
  const remaining = isUnlimited ? "N/A" : Math.max(0, limit - used);
  const over = !isUnlimited && used > limit;
  const pct = isUnlimited ? 0 : Math.min(100, limit > 0 ? (used / limit) * 100 : 0);

  return (
    <div className="rounded-2xl border border-outline/50 bg-white p-3.5 shadow-xs">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1.5 flex items-end gap-1">
        <span className={`font-display text-2xl font-bold leading-none ${over ? "text-red-600" : "text-ink"}`}>
          {remaining}
        </span>
        <span className="mb-0.5 text-xs text-muted">/ {isUnlimited ? "N/A" : `${limit}d`}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            isUnlimited ? "bg-slate-200" : over ? "bg-red-500" : remaining === 0 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
