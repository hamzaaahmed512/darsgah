import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { parentSignOutAction } from "@/app/(auth)/parent-portal/actions";
import { getParentPortalSession, getParentStudent } from "@/lib/parent-portal";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { formatDisplayName } from "@/lib/student-name";
import { formatGradeSection } from "@/lib/utils";

export default async function ParentStudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getParentPortalSession();
  if (!session) redirect("/parent-portal/sign-in");
  const { id } = await params;
  const record = await getParentStudent(session, id);
  if (!record?.student) notFound();
  const name = formatDisplayName(record.student.name_en) || formatDisplayName(`${record.student.first_name} ${record.student.last_name}`);
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <main className="min-h-screen bg-white px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/parent-portal" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" />Back to children</Link><div className="mt-6 flex items-center gap-4">{record.student.photo_url ? <img src={record.student.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">{initials || "ST"}</div>}<div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{record.student.admission_number}</p><h1 className="mt-1 font-display text-3xl font-bold text-ink">{name}</h1><p className="mt-1 text-sm text-muted">{formatGradeSection(record.student.grade_name, record.student.section_name) || record.student.class_name || "Unassigned"}</p></div></div></div><form action={parentSignOutAction}><button className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink"><LogOut className="h-4 w-4" />Sign out</button></form></header><StudentProfileTabs student={record.student} guardians={record.guardians} attendance={record.attendance} marks={record.marks} challans={[]} limitedView={false} canViewFinance={false} /></div></main>;
}