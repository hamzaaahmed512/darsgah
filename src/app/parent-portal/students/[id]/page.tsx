import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, Building2, CalendarDays, GraduationCap, LogOut, Mail, Phone, UserRound, WalletCards } from "lucide-react";
import { parentSignOutAction } from "@/app/(auth)/parent-portal/actions";
import { getParentPortalSession, getParentStudent } from "@/lib/parent-portal";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { formatDisplayName } from "@/lib/student-name";
import { formatGradeSection } from "@/lib/utils";

type PortalTab = "bio" | "attendance" | "marks" | "fees" | "school";

const portalNav: Array<{ id: PortalTab; label: string; icon: typeof UserRound }> = [
  { id: "bio", label: "Bio Data", icon: UserRound },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "marks", label: "Marks & Results", icon: GraduationCap },
  { id: "fees", label: "Fees & Dues", icon: WalletCards },
  { id: "school", label: "School Information", icon: Building2 }
];

export default async function ParentStudentProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const session = await getParentPortalSession();
  if (!session) redirect("/parent-portal/sign-in");
  const { id } = await params;
  const record = await getParentStudent(session, id);
  if (!record?.student) notFound();
  const requestedTab = (await searchParams).tab;
  const activeTab: PortalTab = requestedTab === "attendance" || requestedTab === "marks" || requestedTab === "fees" || requestedTab === "school" ? requestedTab : "bio";
  const name = formatDisplayName(record.student.name_en) || formatDisplayName(`${record.student.first_name} ${record.student.last_name}`);
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const className = formatGradeSection(record.student.grade_name, record.student.section_name) || record.student.class_name || "Unassigned";
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const baseHref = `/parent-portal/students/${id}`;

  return <div className="min-h-screen bg-[#f7faff] text-ink lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
    <aside className="flex flex-col border-b border-blue-100 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-blue-100 px-5 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-button"><BookOpen className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{record.school?.name ?? "School Portal"}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">Student Portal</p></div>
      </div>
      <div className="border-b border-blue-100 px-5 py-5 lg:border-0">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-blue-50 font-bold text-primary">{record.student.photo_url ? <img src={record.student.photo_url} alt="" className="h-full w-full object-cover" /> : initials || "ST"}</span><div className="min-w-0"><p className="truncate font-bold text-ink">{name}</p><p className="mt-0.5 truncate text-sm text-muted">{className}</p></div></div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:px-4 lg:py-4" aria-label="Student portal navigation">
        {portalNav.map((item) => { const Icon = item.icon; const isActive = activeTab === item.id; return <Link key={item.id} href={`${baseHref}?tab=${item.id}`} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${isActive ? "bg-primary text-white shadow-button" : "text-muted hover:bg-blue-50 hover:text-primary"}`}><Icon className="h-[18px] w-[18px]" />{item.label}</Link>; })}
      </nav>
      <form action={parentSignOutAction} className="mt-auto border-t border-blue-100 p-4"><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-muted transition hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-[18px] w-[18px]" />Sign out</button></form>
    </aside>
    <div className="min-w-0">
      <header className="flex min-h-[76px] items-center border-b border-blue-100 bg-white px-5 sm:px-8"><p className="flex items-center gap-2 text-sm font-semibold text-slate-600"><CalendarDays className="h-4 w-4 text-primary" />{today}</p></header>
      <main className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8">
        <div className="rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-white p-5 shadow-[0_12px_32px_rgba(37,99,235,0.05)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{activeTab === "school" ? "School directory" : record.student.admission_number}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{activeTab === "bio" ? "Student Profile" : activeTab === "attendance" ? "Attendance" : activeTab === "marks" ? "Marks & Results" : activeTab === "fees" ? "Fees & Dues" : "School Information"}</h1><p className="mt-2 text-sm text-muted">{activeTab === "school" ? "School contact and directory details" : activeTab === "fees" ? "Review challans, outstanding balance, and due dates" : `${name} · ${className}`}</p></div>
        <div className="mt-6">{activeTab === "school" ? <SchoolInformation school={record.school} /> : <StudentProfileTabs student={record.student} guardians={record.guardians} attendance={record.attendance} marks={record.marks} challans={record.challans} limitedView={false} canViewFinance portalMode hideTabs />}</div>
      </main>
    </div>
  </div>;
}

function SchoolInformation({ school }: { school: { name: string; contactEmail: string | null; phone: string | null } | null }) {
  return <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-[22px] border border-blue-100 bg-white p-6 shadow-[0_10px_28px_rgba(37,99,235,0.04)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary"><Building2 className="h-6 w-6" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-primary">School</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">{school?.name ?? "School information"}</h2><p className="mt-2 text-sm leading-6 text-muted">Contact the school directly for admissions, attendance, results, or other record-related questions.</p></div><div className="rounded-[22px] border border-blue-100 bg-white p-6 shadow-[0_10px_28px_rgba(37,99,235,0.04)]"><h2 className="font-display text-lg font-bold text-ink">Contact details</h2><div className="mt-5 grid gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-primary"><Mail className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Email</p><p className="mt-1 font-semibold text-ink">{school?.contactEmail || "Not provided"}</p></div></div><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Phone className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Phone</p><p className="mt-1 font-semibold text-ink">{school?.phone || "Not provided"}</p></div></div></div></div></section>;
}
