import { AlertTriangle, CheckCircle2, Clock3, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ComplaintReviewForm } from "@/components/parent-queries/complaint-review-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDisplayName } from "@/lib/student-name";
import { formatGradeSection } from "@/lib/utils";

const categoryLabels: Record<string, string> = { teacher: "Teacher", academic: "Academic matter", fees: "Fees", transport: "Transport", facilities: "School facilities", safety: "Safety", administration: "Administration", other: "Other" };
function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

export default async function ParentQueriesPage() {
  const user = await requireUser("dashboard:view");
  if (user.role !== "principal" && user.role !== "administrator") redirect("/unauthorized");
  const db = await createClient();
  const { data, error } = await db.from("parent_complaints").select("id,category,subject,details,status,admin_response,created_at,reviewed_at,students(first_name,last_name,name_en,admission_number,father_name_en,father_phone),classes(name,grades(name),sections(name)),complained_teacher:profiles!parent_complaints_complained_teacher_id_fkey(full_name),reviewer:profiles!parent_complaints_reviewed_by_fkey(full_name)").eq("school_id", user.schoolId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const complaints = data ?? [];
  const submitted = complaints.filter((complaint) => complaint.status === "submitted").length;
  const reviewing = complaints.filter((complaint) => complaint.status === "reviewing").length;
  const closed = complaints.filter((complaint) => complaint.status === "resolved" || complaint.status === "dismissed").length;

  return <>
    <PageHeader eyebrow="Parent communication" title="Parent Queries" description="Review confidential parent complaints together with the student and class details needed to investigate them." />
    <section className="mb-5 grid gap-4 sm:grid-cols-3"><Metric label="New complaints" value={submitted} icon={Inbox} tone="amber" /><Metric label="Under review" value={reviewing} icon={Clock3} tone="blue" /><Metric label="Closed" value={closed} icon={CheckCircle2} tone="green" /></section>
    {complaints.length ? <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-card">{complaints.map((complaint) => {
      const student: any = relation(complaint.students as any); const cls: any = relation(complaint.classes as any); const grade: any = relation(cls?.grades); const section: any = relation(cls?.sections); const teacher: any = relation(complaint.complained_teacher as any); const reviewer: any = relation(complaint.reviewer as any);
      const studentName = formatDisplayName(student?.name_en) || formatDisplayName(`${student?.first_name ?? ""} ${student?.last_name ?? ""}`) || "Student";
      const className = formatGradeSection(grade?.name, section?.name) || cls?.name || "Unassigned";
      return <article key={complaint.id} className="border-b border-slate-100 p-5 last:border-b-0 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase text-primary">{categoryLabels[complaint.category] ?? complaint.category}</span><Status status={complaint.status} />{teacher ? <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">Teacher: {teacher.full_name}</span> : null}</div><h2 className="mt-3 font-display text-xl font-bold text-ink">{complaint.subject}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{complaint.details}</p></div><p className="shrink-0 text-xs font-semibold text-muted">{new Date(complaint.created_at).toLocaleString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Student" value={studentName} /><Detail label="Admission number" value={student?.admission_number ?? "Not recorded"} /><Detail label="Class" value={className} /><Detail label="Parent / guardian contact" value={student?.father_phone ? `${student?.father_name_en || "Guardian"} · ${student.father_phone}` : student?.father_name_en || "Not recorded"} /></div>
        {complaint.admin_response ? <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Official response{reviewer ? ` · ${reviewer.full_name}` : ""}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{complaint.admin_response}</p></div> : null}
        <ComplaintReviewForm complaintId={complaint.id} status={complaint.status} response={complaint.admin_response} />
      </article>;
    })}</section> : <EmptyState title="No parent complaints" description="Complaints submitted through the parent portal will appear here with the student’s details." />}
  </>;
}

function Status({ status }: { status: string }) { const style = status === "resolved" ? "bg-emerald-50 text-emerald-700" : status === "dismissed" ? "bg-slate-100 text-slate-600" : status === "reviewing" ? "bg-blue-50 text-primary" : "bg-amber-50 text-amber-700"; return <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${style}`}>{status}</span>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value}</p></div>; }
function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof AlertTriangle; tone: "blue" | "amber" | "green" }) { const styles = { blue: "bg-blue-50 text-primary", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" }; return <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles[tone]}`}><Icon className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p></div></div></div>; }
