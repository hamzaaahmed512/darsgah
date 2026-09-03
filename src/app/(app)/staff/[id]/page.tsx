import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, BriefcaseBusiness, Building2, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { StaffProfileEditModal } from "@/components/staff/staff-profile-edit-modal";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getStaffProfile } from "@/lib/services/staff";
import { formatDatePK, formatGradeSection, formatPKR } from "@/lib/utils";

const roleLabel = (role: string, custom?: string | null) => custom || ({ administrator: "Administrator", principal: "Principal", teacher: "Teacher", head_teacher: "Head Teacher", student_staff: "Registrar / Student Staff" } as Record<string, string>)[role] || role.replace(/_/g, " ");

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("staff:view");
  const data = await getStaffProfile(user, id);
  if (!data.member) notFound();
  const member: any = data.member;
  const displayRole = roleLabel(member.role, member.custom_role_name);
  const initials = member.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "ST";
  const canEdit = hasPermission(user.role, "staff:manage", user.permissions) && !(user.role === "principal" && member.role === "administrator");
  const canViewSalary = user.role === "administrator" || user.role === "principal";

  return <>
    <div className="relative z-10 bg-white pb-1">
      <Link href="/staff" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"><ArrowLeft className="h-4 w-4 text-primary" />Back to staff</Link>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {member.avatar_url ? <Image src={member.avatar_url} alt="" width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-blue-50" /> : <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-blue-50 text-2xl font-bold text-primary ring-1 ring-blue-100">{initials}</div>}
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.12em] text-primary">Faculty profile</p>
            <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-bold tracking-tight text-ink">{member.full_name}</h1><Badge tone={member.status === "active" ? "green" : "gray"}>{member.status}</Badge></div>
            <p className="mt-1 text-sm font-medium text-muted">{displayRole} · {member.department || "Department not set"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? <StaffProfileEditModal staffId={id} initial={{ fullName: member.full_name, phone: member.phone, personalEmail: member.personal_email, department: member.department, jobTitle: member.job_title }} /> : null}
          <ButtonLink href="/staff"><ArrowLeft className="h-4 w-4" />Back</ButtonLink>
        </div>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Staff summary">
        <Summary icon={<ShieldCheck className="h-5 w-5" />} label="Role" value={displayRole} />
        <Summary icon={<Building2 className="h-5 w-5" />} label="Department" value={member.department || "Not set"} />
        <Summary icon={<BriefcaseBusiness className="h-5 w-5" />} label="Job title" value={member.job_title || data.employment?.designation || "Not set"} />
        <Summary icon={<Users className="h-5 w-5" />} label="Class assignments" value={String(data.assignments.length + data.headClasses.length)} />
      </section>
    </div>

    <section className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card><CardHeader className="border-b-0 pb-2"><CardTitle>Contact & employment</CardTitle></CardHeader><CardContent className="grid gap-5 pt-2">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Detail label="Account email" value={member.email} icon={<Mail className="h-4 w-4" />} />
          <Detail label="Phone" value={member.phone || "Not recorded"} icon={<Phone className="h-4 w-4" />} />
          <Detail label="Personal email" value={member.personal_email || "Not recorded"} icon={<Mail className="h-4 w-4" />} />
          <Detail label="Employment status" value={data.employment?.employment_status || member.status} />
          <Detail label="Joining date" value={data.employment?.joining_date ? formatDatePK(data.employment.joining_date) : "Not set"} />
          {canViewSalary ? <Detail label="Monthly salary" value={data.employment?.monthly_salary ? formatPKR(Number(data.employment.monthly_salary)) : "Not set"} /> : null}
        </dl>
      </CardContent></Card>

      <Card><CardHeader className="border-b-0 pb-2"><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Classes & subjects</CardTitle></CardHeader><CardContent className="grid gap-2 pt-2">
        {data.headClasses.map((row: any) => <Link key={`head-${row.id}`} href={`/classes/${row.id}`} className="flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3"><span className="font-semibold text-ink">{formatGradeSection(row.grades?.name, row.sections?.name)}</span><Badge tone="blue">Head Teacher</Badge></Link>)}
        {data.assignments.map((row: any) => <Link key={row.id} href={`/classes/${row.classes?.id}`} className="flex items-center justify-between rounded-xl bg-surface-low px-4 py-3"><span className="font-semibold text-ink">{formatGradeSection(row.classes?.grades?.name, row.classes?.sections?.name)}</span><Badge tone="gray">{row.subjects?.name || "Class teacher"}</Badge></Link>)}
        {!data.headClasses.length && !data.assignments.length ? <p className="py-8 text-center text-sm text-muted">No classes assigned.</p> : null}
      </CardContent></Card>
    </section>
  </>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <Card className="p-5"><span className="inline-flex rounded-lg bg-primary-soft p-2 text-primary">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 truncate font-display text-xl font-bold text-ink">{value}</p></Card>;
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1.5 flex items-center gap-2 font-medium text-ink">{icon ? <span className="text-primary">{icon}</span> : null}{value}</dd></div>;
}
