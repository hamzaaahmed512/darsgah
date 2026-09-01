import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck2, GraduationCap, Pencil, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return <>
    <div className="relative z-10 bg-white pb-1">
      <PageHeader eyebrow={`Student ID · ${student.admission_number}`} title={<span className="flex flex-wrap items-center gap-3">{formatFullName(student.first_name, student.last_name)} <Badge tone={statusTone}>{student.status.replaceAll("_", " ")}</Badge></span>} description={`Class · ${className}`} actions={<>
        <Link href="/students" prefetch={false} className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-outline hover:bg-surface-low hover:text-primary"><ArrowLeft className="h-4 w-4" />Back</Link>
        {hasPermission(user.role, "students:update", user.permissions) ? <ButtonLink href={`/students/${id}/edit`} variant="secondary"><Pencil className="h-4 w-4" />Edit</ButtonLink> : null}
        {hasPermission(user.role, "students:archive", user.permissions) && student.status !== "archived" && !student.status.startsWith("pending") ? <ConfirmButton label={user.role === "student_staff" ? "Request Cancellation" : "Archive"} confirmText={user.role === "student_staff" ? "Submit a cancellation request for this student to the Principal?" : "Archive this student? This keeps the record but removes it from active lists."} action={archive} /> : null}
      </>} />

      <section className={`grid gap-4 ${canViewFinance ? "md:grid-cols-3" : "md:grid-cols-2"}`} aria-label="Student summary">
        <SummaryCard icon={<CalendarCheck2 className="h-5 w-5" />} title="Attendance rate" value={summaries.attendance.rate === null ? "No data" : `${Math.round(summaries.attendance.rate)}%`} detail={`${summaries.attendance.present} present or late of ${summaries.attendance.total} recorded days`} tone="blue" />
        <SummaryCard icon={<GraduationCap className="h-5 w-5" />} title="Exam performance" value={summaries.exams.average === null ? "No data" : `${Math.round(summaries.exams.average)}%`} detail={`${summaries.exams.total} subject result${summaries.exams.total === 1 ? "" : "s"} recorded`} tone="green" />
        {canViewFinance ? <SummaryCard icon={<WalletCards className="h-5 w-5" />} title="Fee status" value={money.format(summaries.fees.outstanding)} detail={`${unpaidCount} unpaid challan${unpaidCount === 1 ? "" : "s"}`} tone="red" /> : null}
      </section>
    </div>
    <StudentProfileTabs student={student} guardians={guardians} attendance={attendance} marks={marks} challans={challans} limitedView={limitedView} canViewFinance={canViewFinance} />
  </>;
}

function SummaryCard({ icon, title, value, detail, tone }: { icon: React.ReactNode; title: string; value: string; detail: string; tone: "blue" | "green" | "red" }) {
  const styles = { blue: "bg-primary-soft text-primary", green: "bg-success-soft text-success", red: "bg-danger-soft text-danger" };
  return <Card><CardContent className="flex items-start gap-4 p-5"><span className={`rounded-xl p-2.5 ${styles[tone]}`}>{icon}</span><div className="min-w-0"><p className="font-label text-xs font-bold uppercase tracking-wide text-muted">{title}</p><p className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">{value}</p><p className="mt-1 text-sm leading-5 text-muted">{detail}</p></div></CardContent></Card>;
}
