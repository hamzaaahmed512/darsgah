import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, LogOut } from "lucide-react";
import { parentSignOutAction } from "@/app/(auth)/parent-portal/actions";
import { getParentChildren, getParentPortalSession } from "@/lib/parent-portal";
import { formatDisplayName } from "@/lib/student-name";
import { formatGradeSection } from "@/lib/utils";

export default async function ParentPortalPage() {
  const session = await getParentPortalSession();
  if (!session) redirect("/parent-portal/sign-in");
  const children = await getParentChildren(session);
  return <main className="min-h-screen bg-[#f5f8fc] px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Parent Portal</p><h1 className="mt-1 font-display text-3xl font-bold text-ink">Your children</h1><p className="mt-1 text-sm text-muted">Select a student to view their read-only profile.</p></div><form action={parentSignOutAction}><button className="inline-flex items-center gap-2 rounded-xl border border-outline bg-white px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink"><LogOut className="h-4 w-4" />Sign out</button></form></header>
    {!children.length ? <div className="mt-8 rounded-2xl border border-outline bg-white p-8 text-center"><GraduationCap className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-4 text-lg font-bold text-ink">No linked students</h2><p className="mt-1 text-sm text-muted">Contact your school administrator if this does not look right.</p></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children.map((child: any) => { const name = formatDisplayName(child.name_en) || formatDisplayName(`${child.first_name} ${child.last_name}`); const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); const className = formatGradeSection(child.grade_name, child.section_name) || child.class_name || "Unassigned"; return <Link key={child.id} href={`/parent-portal/students/${child.id}`} className="group rounded-2xl border border-outline bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><div className="flex items-center gap-4">{child.photo_url ? <img src={child.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">{initials || "ST"}</div>}<div className="min-w-0"><h2 className="truncate text-lg font-bold text-ink">{name}</h2><p className="mt-1 text-sm text-muted">{className}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{child.admission_number}</p></div></div><div className="mt-5 flex items-center justify-between border-t border-outline pt-4 text-sm font-semibold text-primary">View profile<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>; })}</div>}
  </div></main>;
}