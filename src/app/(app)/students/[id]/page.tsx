import { notFound } from "next/navigation";
import Link from "next/link";
import { Archive, ArrowLeft, CalendarCheck2, GraduationCap, Pencil, WalletCards } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { formatGradeSection } from "@/lib/utils";
import { requireUser } from "@/lib/auth/session";
import { getStudentRecord } from "@/lib/services/students";
import { hasPermission } from "@/lib/permissions";
import { archiveStudentAction } from "@/app/(app)/students/actions";
import { formatFullName } from "@/lib/student-name";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("students:view");
  const limitedView = user.role === "teacher" || user.role === "head_teacher";
  const canViewFinance = !limitedView && hasPermission(user.role, "finance:view", user.permissions);
  const { student, guardians, attendance, marks, challans, summaries } = await getStudentRecord(user, id, { includeFinance: canViewFinance });
  if (!student) notFound();

  async function archive() { "use server"; await archiveStudentAction(id); }
  const className = formatGradeSection(student.grade_name, student.section_name) || student.class_name || "Unassigned";
  const statusTone = student.status.startsWith("pending") ? "yellow" : student.status === "archived" ? "gray" : "green";
  const unpaidCount = challans.filter((row: any) => row.outstanding > 0).length;
  const displayName = formatFullName(student.first_name, student.last_name);
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";

  return <>
    <div className="relative z-10 bg-white pb-1">
      <Link href="/students" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"><ArrowLeft className="h-4 w-4 text-primary" />Back to students</Link>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {student.photo_url ? <img src={student.photo_url} alt="" className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-blue-50" /> : <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-blue-50 text-2xl font-bold text-primary ring-1 ring-blue-100">{initials}</div>}
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-primary">Student ID&nbsp; · &nbsp;{student.admission_number}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-bold tracking-tight text-ink">{displayName}</h1><Badge tone={statusTone}>{student.status.replaceAll("_", " ")}</Badge></div>
            <p className="mt-1 text-sm font-medium text-muted">Class&nbsp; · &nbsp;{className}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasPermission(user.role, "students:update", user.permissions) ? <ButtonLink href={`/students/${id}/edit`} variant="secondary"><Pencil className="h-4 w-4" />Edit</ButtonLink> : null}
          {hasPermission(user.role, "students:archive", user.permissions) && student.status !== "archived" && !student.status.startsWith("pending") ? <ConfirmButton label={user.role === "student_staff" ? "Request Cancellation" : "Archive"} confirmText={user.role === "student_staff" ? "Submit a cancellation request for this student to the Principal?" : "Archive this student? This keeps the record but removes it from active lists."} action={archive} variant="secondary" icon={<Archive className="h-4 w-4" />} /> : null}
          <ButtonLink href="/students" className="min-w-24"><ArrowLeft className="h-4 w-4" />Back</ButtonLink>
        </div>
      </div>

      <section className={`grid gap-5 ${canViewFinance ? "md:grid-cols-3" : "md:grid-cols-2"}`} aria-label="Student summary">
        <StatCard icon={CalendarCheck2} label="Attendance rate" value={summaries.attendance.rate === null ? "No data" : `${Math.round(summaries.attendance.rate)}%`} tone="blue" trend={`${summaries.attendance.present} present or late of ${summaries.attendance.total} recorded days`} />
        <StatCard icon={GraduationCap} label="Exam performance" value={summaries.exams.average === null ? "No data" : `${Math.round(summaries.exams.average)}%`} tone="green" trend={`${summaries.exams.total} subject result${summaries.exams.total === 1 ? "" : "s"} recorded`} />
        {canViewFinance ? <StatCard icon={WalletCards} label="Fee status" value={money.format(summaries.fees.outstanding)} tone="red" trend={`${unpaidCount} unpaid challan${unpaidCount === 1 ? "" : "s"}`} /> : null}
      </section>
    </div>
    <StudentProfileTabs student={student} guardians={guardians} attendance={attendance} marks={marks} challans={challans} limitedView={limitedView} canViewFinance={canViewFinance} />
  </>;
}
