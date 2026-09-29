"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitParentComplaintAction } from "@/app/parent-portal/complaint-actions";

type TeacherOption = { id: string; name: string };
type Complaint = { id: string; category: string; subject: string; details: string; status: string; admin_response: string | null; created_at: string; complained_teacher: { full_name: string } | null; reviewer: { full_name: string } | null };

const categoryLabels: Record<string, string> = { teacher: "Teacher", academic: "Academic matter", fees: "Fees", transport: "Transport", facilities: "School facilities", safety: "Safety", administration: "Administration", other: "Other" };

export function ComplaintPanel({ teachers, complaints }: { teachers: TeacherOption[]; complaints: Complaint[] }) {
  const [state, action, pending] = useActionState(submitParentComplaintAction, { status: "idle" as const, message: "" });
  const [category, setCategory] = useState("teacher");
  const router = useRouter();
  useEffect(() => { if (state.status === "success") router.refresh(); }, [router, state.status]);

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
    <section className="rounded-[22px] border border-blue-100 bg-white p-5 shadow-[0_10px_28px_rgba(37,99,235,0.04)] sm:p-6">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><AlertTriangle className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-bold text-ink">Submit a complaint</h2><p className="mt-1 text-sm leading-6 text-muted">This will be shared with the Principal and Administrator, together with the student’s school details.</p></div></div>
      {state.status === "success" ? <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-2 font-bold text-ink">Complaint submitted</p><p className="mt-1 text-sm text-muted">{state.message}</p></div> : <form action={action} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-ink">Issue category<select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-xl border border-outline bg-white px-4 text-sm font-normal">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {category === "teacher" ? <label className="grid gap-2 text-sm font-bold text-ink">Teacher<select name="teacher_id" required defaultValue="" className="h-12 rounded-xl border border-outline bg-white px-4 text-sm font-normal"><option value="" disabled>Select a teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select>{!teachers.length ? <span className="text-xs font-medium text-amber-700">No teachers are currently assigned to this class.</span> : null}</label> : <input type="hidden" name="teacher_id" value="" />}
        <label className="grid gap-2 text-sm font-bold text-ink">Subject<input name="subject" required maxLength={160} placeholder="Brief summary of the issue" className="h-12 rounded-xl border border-outline bg-white px-4 text-sm font-normal" /></label>
        <label className="grid gap-2 text-sm font-bold text-ink">Complaint details<textarea name="details" required maxLength={3000} rows={7} placeholder="Explain what happened, including relevant dates or details…" className="resize-y rounded-xl border border-outline bg-white px-4 py-3 text-sm font-normal" /></label>
        {state.status === "error" ? <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{state.message}</p> : null}
        <button disabled={pending || (category === "teacher" && !teachers.length)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-button disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? "Submitting…" : "Submit complaint"}</button>
        <p className="text-center text-xs text-muted">Please use factual and respectful language. Up to three complaints may be submitted each day.</p>
      </form>}
    </section>

    <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-[0_10px_28px_rgba(37,99,235,0.04)]">
      <div className="border-b border-blue-100 px-5 py-4 sm:px-6"><h2 className="font-display text-xl font-bold text-ink">Complaint history</h2><p className="mt-1 text-sm text-muted">Track review status and official responses.</p></div>
      {complaints.length ? <div>{complaints.map((complaint) => <article key={complaint.id} className="border-b border-slate-100 p-5 last:border-b-0 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{categoryLabels[complaint.category] ?? complaint.category}{complaint.complained_teacher ? ` · ${complaint.complained_teacher.full_name}` : ""}</p><h3 className="mt-1 font-bold text-ink">{complaint.subject}</h3></div><Status status={complaint.status} /></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{complaint.details}</p><p className="mt-3 text-xs font-semibold text-slate-400">Submitted {new Date(complaint.created_at).toLocaleString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>{complaint.admin_response ? <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-primary">Official response{complaint.reviewer ? ` · ${complaint.reviewer.full_name}` : ""}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{complaint.admin_response}</p></div> : null}</article>)}</div> : <div className="px-6 py-14 text-center"><AlertTriangle className="mx-auto h-9 w-9 text-blue-200" /><h3 className="mt-3 font-bold text-ink">No complaints submitted</h3><p className="mt-1 text-sm text-muted">Submitted complaints and school responses will appear here.</p></div>}
    </section>
  </div>;
}

function Status({ status }: { status: string }) { const style = status === "resolved" ? "bg-emerald-50 text-emerald-700" : status === "dismissed" ? "bg-slate-100 text-slate-600" : status === "reviewing" ? "bg-blue-50 text-primary" : "bg-amber-50 text-amber-700"; return <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${style}`}>{status}</span>; }
