import { Suspense } from "react";
import { ChevronDown, Clock3, Mail, MessageSquareText } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

const faqs = [
  ["How do I add a student?", "Open Students, choose Add Student, then select the class and complete the required details."],
  ["How do subject combinations work?", "Create and manage combinations from Classes. Each section can then offer the combinations relevant to its students."],
  ["How do I manage books and loans?", "Open Library to add titles, register copies, issue books, manage returns, and review overdue loans."],
  ["Can different staff members have different access?", "Yes. Darsgah uses role-based access so each staff member only sees the workspaces they need."],
  ["What should I include in a support request?", "Tell us what you were trying to do, what happened instead, and include useful details such as the student, class, or page involved."],
];

export default async function HelpPage() {
  await requireUser("dashboard:view");
  return <>
    <PageHeader eyebrow="Support" title="Help & Support" description="Get help from the Darsgah team without leaving your school workspace." />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <Card className="overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card"><div className="border-b border-outline/50 bg-slate-50/70 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Contact us</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">Send the Darsgah team a message</h2><p className="mt-2 text-sm leading-6 text-muted">Use this form for product questions, support, or help with your school setup.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><ContactLine icon={Mail} title="Email" text="darsgah.help@gmail.com" /><ContactLine icon={MessageSquareText} title="Support" text="Product and setup help" /><ContactLine icon={Clock3} title="Response" text="Within two business days" /></div></div><CardContent className="p-5 sm:p-6"><Suspense fallback={<div className="min-h-[420px]" />}><ContactForm /></Suspense></CardContent></Card>
      <Card className="h-fit overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-card"><div className="border-b border-outline/50 bg-slate-50/70 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Frequently asked questions</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">Questions, answered clearly.</h2></div><CardContent className="p-5 sm:p-6"><div className="divide-y divide-outline/60 border-y border-outline/60">{faqs.map(([question, answer], index) => <details key={question} className="group py-1" open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-sm font-bold text-ink"><span>{question}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted transition-transform group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span></summary><p className="pb-5 pr-10 text-sm leading-6 text-muted">{answer}</p></details>)}</div></CardContent></Card>
    </div>
  </>;
}

function ContactLine({ icon: Icon, title, text }: { icon: typeof Mail; title: string; text: string }) {
  return <div className="flex min-w-0 items-start gap-2 rounded-xl border border-outline/55 bg-white p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-xs font-bold text-ink">{title}</p><p className="mt-0.5 break-words text-[11px] leading-4 text-muted">{text}</p></div></div>;
}
