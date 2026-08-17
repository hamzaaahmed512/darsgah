import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import { getStudentRecord } from "@/lib/services/students";
import { hasPermission } from "@/lib/permissions";
import { archiveStudentAction } from "@/app/(app)/students/actions";

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

export default async function StudentProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const user = await requireUser("students:view");
  const canViewFinance = hasPermission(user.role, "finance:view", user.permissions);
  const { student, guardians, attendance, marks, challans, summaries } = await getStudentRecord(user, id, { attendanceFrom: filters.from, attendanceTo: filters.to, includeFinance: canViewFinance });
  if (!student) notFound();

  async function archive() { "use server"; await archiveStudentAction(id); }

  return <>
    <PageHeader eyebrow={student.admission_number} title={`${student.first_name} ${student.last_name}`} description={`${student.grade_name ?? "Unassigned"}${student.section_name ? ` • ${student.section_name}` : ""}`} actions={<>
      {hasPermission(user.role, "students:update", user.permissions) ? <ButtonLink href={`/students/${id}/edit`} variant="secondary">Edit</ButtonLink> : null}
      {hasPermission(user.role, "students:archive", user.permissions) && student.status !== "archived" && !student.status.startsWith("pending") ? <ConfirmButton label={user.role === "student_staff" ? "Request Cancellation" : "Archive"} confirmText={user.role === "student_staff" ? "Submit a cancellation request for this student to the Principal?" : "Archive this student? This keeps the record but removes it from active lists."} action={archive} /> : null}
    </>} />

    <section className={`grid gap-4 ${canViewFinance ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      <SummaryCard title="Attendance" value={summaries.attendance.rate === null ? "No data" : `${Math.round(summaries.attendance.rate)}%`} detail={`${summaries.attendance.present} present or late of ${summaries.attendance.total} recorded days`} />
      <SummaryCard title="Exam performance" value={summaries.exams.average === null ? "No data" : `${Math.round(summaries.exams.average)}%`} detail={`${summaries.exams.total} subject result${summaries.exams.total === 1 ? "" : "s"} recorded`} />
      {canViewFinance ? <SummaryCard title="Fee status" value={money.format(summaries.fees.outstanding)} detail={`${summaries.fees.total} challan${summaries.fees.total === 1 ? "" : "s"} in history`} /> : null}
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <Card><CardHeader><CardTitle>Biodata</CardTitle><Badge tone={student.status.startsWith("pending") ? "yellow" : student.status === "archived" ? "gray" : "green"}>{student.status.replaceAll("_", " ")}</Badge></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Info label="Preferred name" value={student.preferred_name ?? "Not recorded"} /><Info label="Gender" value={student.gender ?? "Not recorded"} /><Info label="Birth date" value={student.date_of_birth} /><Info label="Admission date" value={student.admission_date} /><Info label="Class assignment" value={student.class_name ?? "Unassigned"} /><Info label="Email" value={student.email ?? "Not recorded"} icon={<Mail className="h-4 w-4" />} /><Info label="Phone" value={student.phone ?? "Not recorded"} icon={<Phone className="h-4 w-4" />} /><div className="sm:col-span-2"><Info label="Address" value={student.address ?? "Not recorded"} /></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Guardians and emergency contact</CardTitle></CardHeader><CardContent className="space-y-3">{guardians.length ? guardians.map((guardian: any) => <div key={guardian.guardian_id} className="rounded-lg bg-surface-low p-4"><p className="font-semibold text-ink">{guardian.full_name}{guardian.is_primary ? " (Primary)" : ""}</p><p className="text-sm text-muted">{guardian.relationship} • {guardian.phone}</p><p className="text-sm text-muted">{guardian.email ?? "No email"}</p><p className="mt-2 text-sm text-muted">Emergency: {guardian.emergency_contact_name ?? "Not recorded"} {guardian.emergency_contact_phone ? `• ${guardian.emergency_contact_phone}` : ""}</p></div>) : <EmptyState title="No guardian recorded" description="Guardian and emergency contact details will appear here." className="min-h-40 p-5" />}</CardContent></Card>
    </section>

    <Card className="mt-6"><CardHeader><CardTitle>Attendance history</CardTitle><form className="flex flex-wrap items-end gap-2 text-sm"><label className="grid gap-1 text-muted">From<input name="from" type="date" defaultValue={filters.from} className="rounded-lg border border-outline bg-surface px-2 py-1 text-ink" /></label><label className="grid gap-1 text-muted">To<input name="to" type="date" defaultValue={filters.to} className="rounded-lg border border-outline bg-surface px-2 py-1 text-ink" /></label><button className="rounded-lg bg-primary px-3 py-1.5 font-semibold text-white">Filter</button></form></CardHeader><CardContent><HistoryTable emptyTitle="No attendance records" emptyDescription="Attendance for this student will appear here after it is submitted." headers={["Date", "Class", "Status", "Note"]} rows={attendance.map((row: any) => [row.attendance_date, row.classes?.name ?? "—", <Badge key="status">{row.status}</Badge>, row.note ?? "—"])} /></CardContent></Card>
    <Card className="mt-6"><CardHeader><CardTitle>Marks and exam history</CardTitle></CardHeader><CardContent><HistoryTable emptyTitle="No exam results" emptyDescription="Subject results will appear here when marks are recorded." headers={["Exam", "Term", "Subject", "Marks", "Grade", "Status", "Comment"]} rows={marks.map((row: any) => [row.exams?.title ?? "—", row.exams?.term ?? "—", row.subjects?.name ?? "—", `${row.marks_obtained}/${row.exams?.max_marks ?? "—"}`, row.grade, <Badge key="status">{row.exams?.approval_status ?? row.status}</Badge>, row.teacher_comment ?? "—"])} /></CardContent></Card>
    {canViewFinance ? <Card className="mt-6"><CardHeader><CardTitle>Fee and challan history</CardTitle></CardHeader><CardContent><HistoryTable emptyTitle="No fee challans" emptyDescription="Generated monthly challans will appear here." headers={["Month", "Amount", "Due date", "Status", "Outstanding", "Generated"]} rows={challans.map((row: any) => [row.fee_month, money.format(Number(row.amount)), row.due_date, <Badge key="status">{row.payment_status}</Badge>, money.format(row.outstanding), new Date(row.created_at).toLocaleDateString("en-PK")])} /></CardContent></Card> : null}
  </>;
}

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) { return <Card><CardContent className="p-5"><p className="font-label text-xs font-bold uppercase tracking-wide text-muted">{title}</p><p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{value}</p><p className="mt-1 text-sm text-muted">{detail}</p></CardContent></Card>; }
function HistoryTable({ headers, rows, emptyTitle, emptyDescription }: { headers: string[]; rows: ReactNode[][]; emptyTitle: string; emptyDescription: string }) { if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} className="min-h-40 p-6" />; return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="font-label text-xs uppercase tracking-wide text-muted"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap py-3 pr-4">{header}</th>)}</tr></thead><tbody>{rows.map((cells, rowIndex) => <tr key={rowIndex} className="border-t border-outline/60">{cells.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap py-3 pr-4 text-ink">{cell}</td>)}</tr>)}</tbody></table></div>; }
function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <div className="rounded-lg bg-surface-low p-4"><p className="mb-2 flex items-center gap-2 font-label text-xs font-bold uppercase tracking-wide text-muted">{icon}{label}</p><p className="font-semibold text-ink">{value}</p></div>; }
