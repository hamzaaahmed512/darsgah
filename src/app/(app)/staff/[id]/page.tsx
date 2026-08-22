import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, BriefcaseBusiness, Building2, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getStaffProfile } from "@/lib/services/staff";
import { formatDatePK, formatPKR } from "@/lib/utils";

const roleLabel = (role: string, custom?: string | null) => custom || ({ administrator: "Administrator", principal: "Principal", teacher: "Teacher", head_teacher: "Head Teacher", student_staff: "Registrar / Student Staff" } as Record<string, string>)[role] || role.replace(/_/g, " ");

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("staff:view");
  const data = await getStaffProfile(user, id);
  if (!data.member) notFound();
  const member: any = data.member;

  return <>
    <div className="mb-4"><Link href="/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to staff</Link></div>
    <PageHeader eyebrow="Faculty profile" title={member.full_name} description={`${roleLabel(member.role, member.custom_role_name)} · ${member.status}`} />
    <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Info icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={roleLabel(member.role, member.custom_role_name)} />
      <Info icon={<Building2 className="h-4 w-4" />} label="Department" value={member.department || "Not set"} />
      <Info icon={<BriefcaseBusiness className="h-4 w-4" />} label="Job title" value={member.job_title || data.employment?.designation || "Not set"} />
      <Info icon={<Users className="h-4 w-4" />} label="Class assignments" value={String(data.assignments.length + data.headClasses.length)} />
    </section>
    <section className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Contact and employment</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm">
        <p className="flex items-center gap-2 rounded-xl bg-surface-low p-3"><Mail className="h-4 w-4 text-primary" /> {member.email}</p>
        <p className="flex items-center gap-2 rounded-xl bg-surface-low p-3"><Phone className="h-4 w-4 text-primary" /> {member.phone || "Not provided"}</p>
        {member.personal_email ? <p className="flex items-center gap-2 rounded-xl bg-surface-low p-3"><Mail className="h-4 w-4 text-primary" /> {member.personal_email}</p> : null}
        {data.employment ? <div className="grid gap-2 rounded-xl border border-outline/50 p-3"><p><span className="font-semibold">Employment:</span> {data.employment.employment_status}</p><p><span className="font-semibold">Joined:</span> {data.employment.joining_date ? formatDatePK(data.employment.joining_date) : "Not set"}</p>{(user.role === "administrator" || user.role === "principal") ? <p><span className="font-semibold">Monthly salary:</span> {data.employment.monthly_salary ? formatPKR(Number(data.employment.monthly_salary)) : "Not set"}</p> : null}</div> : null}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Classes and subjects</CardTitle></CardHeader><CardContent className="grid gap-2">
        {data.headClasses.map((row: any) => <Link key={`head-${row.id}`} href={`/classes/${row.id}`} className="flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3"><span className="font-semibold text-ink">{row.grades?.name} · Section {row.sections?.name}</span><Badge tone="blue">Head Teacher</Badge></Link>)}
        {data.assignments.map((row: any) => <Link key={row.id} href={`/classes/${row.classes?.id}`} className="flex items-center justify-between rounded-xl bg-surface-low px-4 py-3"><span className="font-semibold text-ink">{row.classes?.grades?.name} · Section {row.classes?.sections?.name}</span><Badge tone="gray">{row.subjects?.name || "Class teacher"}</Badge></Link>)}
        {!data.headClasses.length && !data.assignments.length ? <p className="py-6 text-center text-sm text-muted">No classes assigned.</p> : null}
      </CardContent></Card>
    </section>
  </>;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <Card className="p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">{icon}{label}</p><p className="mt-2 truncate font-semibold text-ink">{value}</p></Card>;
}
