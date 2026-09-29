import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Bell, BookOpen, Building2, CalendarDays, ChevronDown, GraduationCap, LogOut, Mail, Phone, UserRound, WalletCards } from "lucide-react";
import { parentSignOutAction } from "@/app/(auth)/parent-portal/actions";
import { getParentComplaints, getParentPortalSession, getParentStudent } from "@/lib/parent-portal";
import { ComplaintPanel } from "@/components/parent-portal/complaint-panel";
import { StudentProfileTabs } from "@/components/students/student-profile-tabs";
import { formatDisplayName } from "@/lib/student-name";
import { formatDatePK, formatGradeSection } from "@/lib/utils";

type PortalTab = "bio" | "attendance" | "marks" | "fees" | "complaints" | "school";

const portalNav: Array<{ id: PortalTab; label: string; icon: typeof UserRound }> = [
  { id: "bio", label: "Bio Data", icon: UserRound },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "marks", label: "Marks & Results", icon: GraduationCap },
  { id: "fees", label: "Fees & Dues", icon: WalletCards },
  { id: "complaints", label: "Complaints", icon: AlertTriangle },
  { id: "school", label: "School Information", icon: Building2 }
];

export default async function ParentStudentProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const session = await getParentPortalSession();
  if (!session) redirect("/parent-portal/sign-in");
  const { id } = await params;
  const record = await getParentStudent(session, id);
  if (!record?.student) notFound();
  const requestedTab = (await searchParams).tab;
  const activeTab: PortalTab = requestedTab === "attendance" || requestedTab === "marks" || requestedTab === "fees" || requestedTab === "complaints" || requestedTab === "school" ? requestedTab : "bio";
  const complaintData = activeTab === "complaints" ? await getParentComplaints(session) : null;
  const name = formatDisplayName(record.student.name_en) || formatDisplayName(`${record.student.first_name} ${record.student.last_name}`);
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const className = formatGradeSection(record.student.grade_name, record.student.section_name) || record.student.class_name || "Unassigned";
  const today = new Intl.DateTimeFormat("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const baseHref = `/parent-portal/students/${id}`;

  return <div className="min-h-screen bg-[#f7faff] text-ink lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
    <aside className="flex flex-col border-b border-blue-100 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-blue-100 px-5 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white shadow-button">{record.school?.logoUrl ? <img src={record.school.logoUrl} alt="" className="h-full w-full bg-white object-contain" /> : <BookOpen className="h-5 w-5" />}</span>
        <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{record.school?.shortName || "School Portal"}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">Student Portal</p></div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:px-4 lg:py-4" aria-label="Student portal navigation">
        {portalNav.map((item) => { const Icon = item.icon; const isActive = activeTab === item.id; return <Link key={item.id} href={`${baseHref}?tab=${item.id}`} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition ${isActive ? "bg-primary text-white shadow-button" : "text-muted hover:bg-blue-50 hover:text-primary"}`}><Icon className="h-[18px] w-[18px]" />{item.label}</Link>; })}
      </nav>
    </aside>
    <div className="min-w-0">
      <header className="relative z-30 flex min-h-[76px] items-center justify-between gap-4 border-b border-blue-100 bg-white px-5 sm:px-8">
        <p className="hidden items-center gap-2 text-sm font-semibold text-slate-600 sm:flex"><CalendarDays className="h-4 w-4 text-primary" />{today}</p>
        <div className="ml-auto flex items-center gap-2">
          <ParentNotificationBell notifications={record.notifications} />
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition hover:border-blue-100 hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 [&::-webkit-details-marker]:hidden">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50 text-sm font-bold text-primary">{record.student.photo_url ? <img referrerPolicy="no-referrer" src={record.student.photo_url} alt="" className="h-full w-full object-cover" /> : initials || "ST"}</span>
              <span className="hidden min-w-0 text-left sm:block"><span className="block max-w-44 truncate text-sm font-bold text-ink">{name}</span><span className="mt-0.5 block max-w-44 truncate text-xs text-muted">{className}</span></span>
              <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
              <div className="border-b border-blue-50 px-3 py-3"><p className="truncate text-sm font-bold text-ink">{name}</p><p className="mt-1 truncate text-xs text-muted">{className}</p></div>
              <form action={parentSignOutAction} className="pt-2"><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-[18px] w-[18px]" />Sign out</button></form>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8">
        <div className="rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-white p-5 shadow-[0_12px_32px_rgba(37,99,235,0.05)] sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{activeTab === "school" ? "School directory" : activeTab === "complaints" ? "Confidential communication" : record.student.admission_number}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{activeTab === "bio" ? "Student Profile" : activeTab === "attendance" ? "Attendance" : activeTab === "marks" ? "Marks & Results" : activeTab === "fees" ? "Fees & Dues" : activeTab === "complaints" ? "Complaints" : "School Information"}</h1><p className="mt-2 text-sm text-muted">{activeTab === "school" ? "School contact and directory details" : activeTab === "complaints" ? "Raise an issue directly with the Principal and Administrator" : activeTab === "fees" ? "Review challans, outstanding balance, and due dates" : `${name} · ${className}`}</p></div>
        <div className="mt-6">{activeTab === "school" ? <SchoolInformation school={record.school} /> : activeTab === "complaints" && complaintData ? <ComplaintPanel teachers={complaintData.teachers} complaints={complaintData.complaints as any} /> : <StudentProfileTabs student={record.student} guardians={record.guardians} attendance={record.attendance} marks={record.marks} challans={record.challans} limitedView={false} canViewFinance portalMode hideTabs />}</div>
      </main>
    </div>
  </div>;
}

function ParentNotificationBell({ notifications }: { notifications: Array<{ id: string; title: string; description: string; priority: string; type: string; publish_date: string }> }) {
  return <details className="group relative">
    <summary className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-slate-600 transition hover:bg-blue-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 [&::-webkit-details-marker]:hidden" aria-label={`Notifications${notifications.length ? `, ${notifications.length} available` : ""}`}>
      <Bell className="h-5 w-5" aria-hidden="true" />
      {notifications.length ? <span className="absolute right-0.5 top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{notifications.length > 99 ? "99+" : notifications.length}</span> : null}
    </summary>
    <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
      <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3.5"><div><p className="font-display text-base font-bold text-ink">Notifications</p><p className="mt-0.5 text-xs text-muted">Notices sent to parents by the school</p></div>{notifications.length ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-primary">{notifications.length}</span> : null}</div>
      <div className="max-h-[min(32rem,calc(100dvh-8rem))] overflow-y-auto">
        {notifications.length ? notifications.map((notification) => <article key={notification.id} className="border-b border-blue-50 px-4 py-4 last:border-b-0">
          <div className="flex items-start gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.priority === "critical" ? "bg-red-500" : notification.priority === "high" ? "bg-amber-500" : notification.priority === "medium" ? "bg-blue-500" : "bg-slate-400"}`} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="break-words text-sm font-bold text-ink">{notification.title}</h2><span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{notification.type}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-muted">{notification.description}</p><p className="mt-2 text-[11px] font-semibold text-slate-400">Published {formatDatePK(notification.publish_date)}</p></div></div>
        </article>) : <div className="px-6 py-10 text-center"><Bell className="mx-auto h-8 w-8 text-blue-200" /><p className="mt-3 text-sm font-bold text-ink">No notifications</p><p className="mt-1 text-xs text-muted">New notices from the school will appear here.</p></div>}
      </div>
    </div>
  </details>;
}

function SchoolInformation({ school }: { school: { name: string; shortName: string | null; description: string | null; logoUrl: string | null; contactEmail: string | null; phone: string | null } | null }) {
  return <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-[22px] border border-blue-100 bg-white p-6 shadow-[0_10px_28px_rgba(37,99,235,0.04)]"><span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-primary">{school?.logoUrl ? <img src={school.logoUrl} alt={`${school.shortName || school.name} logo`} className="h-full w-full bg-white object-contain" /> : <Building2 className="h-7 w-7" />}</span><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-primary">School</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">{school?.name ?? "School information"}</h2><p className="mt-2 text-sm leading-6 text-muted">{school?.description || "Contact the school directly for admissions, attendance, results, or other record-related questions."}</p></div><div className="rounded-[22px] border border-blue-100 bg-white p-6 shadow-[0_10px_28px_rgba(37,99,235,0.04)]"><h2 className="font-display text-lg font-bold text-ink">Contact details</h2><div className="mt-5 grid gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-primary"><Mail className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Email</p><p className="mt-1 font-semibold text-ink">{school?.contactEmail || "Not provided"}</p></div></div><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Phone className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-muted">Phone</p><p className="mt-1 font-semibold text-ink">{school?.phone || "Not provided"}</p></div></div></div></div></section>;
}

