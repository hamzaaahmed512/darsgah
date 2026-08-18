import type { Metadata } from "next";
import { Activity, BarChart3, BookOpen, Bus, CalendarCheck, ClipboardCheck, Coins, FileSpreadsheet, GraduationCap, Megaphone, ShieldCheck, Users } from "lucide-react";
import { CTA, PageHero } from "@/components/marketing/shared";

export const metadata: Metadata = { title: "Features | GetDarsgah", description: "Explore the student, attendance, academic, finance, staff, reporting, and school operations tools in Darsgah." };

const groups = [
  { icon: GraduationCap, title: "Students", text: "Maintain accurate student and guardian information throughout the full school journey.", points: ["Student profiles and enrollment", "Guardian and contact details", "Class and subject assignment", "Searchable student directory"] },
  { icon: CalendarCheck, title: "Attendance", text: "Make daily attendance simple for teachers and useful for school leadership.", points: ["Class and date registers", "Present, absent, and leave status", "Teacher assignment controls", "Attendance summaries"] },
  { icon: BookOpen, title: "Academics", text: "Keep your academic structure and assessment process aligned from setup to published result.", points: ["Classes, sections, and subjects", "Exam and marks setup", "Results generation", "Review and approval workflow"] },
  { icon: Coins, title: "Finance & payroll", text: "Give finance teams an organized view of fees, payments, staff salary, and monthly work.", points: ["Fee structures and challans", "Payment recording", "Finance dashboard", "Payroll and adjustments"] },
  { icon: Users, title: "People & leave", text: "Keep staff information, responsibilities, and leave workflows accessible and current.", points: ["Staff and teacher directory", "Departments and roles", "Leave applications", "Review and status tracking"] },
  { icon: ClipboardCheck, title: "Approvals", text: "Turn important school decisions into visible, traceable steps instead of informal follow-ups.", points: ["Central action queue", "Review context", "Approve or return", "Status visibility"] },
  { icon: BarChart3, title: "Reports", text: "Move from raw records to useful operational insight without rebuilding spreadsheets.", points: ["Attendance reporting", "Enrollment summaries", "Activity history", "CSV exports"] },
  { icon: Bus, title: "Transport", text: "Organize school transport information in the same workspace as the rest of operations.", points: ["Vehicle records", "Route management", "Driver information", "Operational status"] },
  { icon: Megaphone, title: "Announcements", text: "Keep school teams aware of updates from the workspace they already use every day.", points: ["Targeted announcements", "Read status", "Notification center", "Announcement archive"] }
];

export default function FeaturesPage() {
  return <>
    <PageHero eyebrow="Product features" title={<>Everything your team needs.<br /><span className="text-primary">Nothing they don&apos;t.</span></>} description="Darsgah gives each school role a focused workspace while keeping information connected behind the scenes." />
    <section className="marketing-container py-20">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ icon: Icon, title, text, points }) => <article key={title} className="marketing-card rounded-[22px] border border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
          <h2 className="mt-6 text-xl font-bold tracking-tight text-ink">{title}</h2><p className="mt-3 min-h-[72px] text-sm leading-6 text-muted">{text}</p>
          <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">{points.map(point => <li key={point} className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{point}</li>)}</ul>
        </article>)}
      </div>
    </section>
    <section className="border-y border-slate-200 bg-slate-50"><div className="marketing-container grid gap-10 py-16 md:grid-cols-3">
      <Value icon={ShieldCheck} title="Permission-aware" text="Access follows responsibilities, helping schools protect sensitive records." />
      <Value icon={Activity} title="Traceable activity" text="Important actions stay visible, creating accountability across teams." />
      <Value icon={FileSpreadsheet} title="Export when needed" text="Take useful data with you for reporting and offline workflows." />
    </div></section>
    <CTA title="See Darsgah with your school's workflow" description="A personal walkthrough will show how your team can move from fragmented processes to one shared system." />
  </>;
}
function Value({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) { return <div><Icon className="h-6 w-6 text-primary" /><h3 className="mt-4 font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p></div>; }
