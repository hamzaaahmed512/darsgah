import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardPenLine, FileText, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { defaultGradeScale } from "@/lib/grades";

export default async function ExamsSetupPage() {
  const user = await requireUser("academics:view");
  if (user.role === "principal") redirect("/admin/academic-control");

  return <>
    <PageHeader eyebrow="Academics" title="Exams & Marks Setup" description="Create assessment tasks and review the grading rubric before marks entry." />
    <section className="grid gap-5 lg:grid-cols-3">
      <Card><CardHeader><CardTitle>Assessment Setup</CardTitle><FileText className="h-5 w-5 text-primary" /></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted">Teachers create quizzes, class tests, assignments, and major exam shells from the Results Portal before entering marks.</p><Link href="/academics/results" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Open Results Portal</Link></CardContent></Card>
      <Card><CardHeader><CardTitle>Official Exams</CardTitle><ClipboardPenLine className="h-5 w-5 text-primary" /></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted">Teachers create Monthly and Term exams for their own assignments. These are queued for Principal review.</p><Badge tone="blue">Teacher created / Principal approved</Badge></CardContent></Card>
      <Card><CardHeader><CardTitle>Grading Rubric</CardTitle><ListChecks className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="grid gap-2">{defaultGradeScale.map((row) => <div key={row.grade} className="flex items-center justify-between rounded-lg bg-surface-low px-3 py-2 text-sm"><span className="font-bold text-ink">{row.grade}</span><span className="font-semibold text-muted">{row.min_percentage}% - {row.max_percentage}%</span></div>)}</div></CardContent></Card>
    </section>
  </>;
}
