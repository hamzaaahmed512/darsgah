import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { PageHero } from "@/components/marketing/shared";

export const metadata: Metadata = { title: "FAQs | GetDarsgah", description: "Answers to common questions about Darsgah, implementation, access, data, and pricing." };

const faqs = [
  ["What is Darsgah?", "Darsgah is a school management system that connects student records, attendance, academics, staff, finance, approvals, reporting, transport, and announcements in one workspace."],
  ["Who is Darsgah designed for?", "Darsgah is designed for school leadership and operational teams, including principals, administrators, teachers, student-management staff, finance teams, and other school employees."],
  ["Can different staff members have different access?", "Yes. Darsgah is role-aware, so each user can be given access aligned with their responsibilities. This keeps work focused and helps protect sensitive school information."],
  ["Does Darsgah support attendance and exam results?", "Yes. Teachers can record attendance for assigned classes, while academic workflows support exam setup, marks, result generation, review, and approval."],
  ["Can Darsgah manage school fees and payroll?", "Yes. The finance workspace includes fee management, payments, challans, financial visibility, payroll, and salary adjustments."],
  ["How does onboarding work?", "We begin with a discovery conversation, understand your current processes, confirm the right setup, and plan onboarding around your team and data needs."],
  ["Can we move existing school data into Darsgah?", "Data migration needs vary by school. We assess the structure and quality of your existing records during discovery and include an appropriate migration approach in the proposal."],
  ["How much does Darsgah cost?", "Pricing is tailored to school size, selected scope, and implementation needs. This keeps the proposal relevant and avoids charging schools for capacity they do not need."],
  ["Is Darsgah suitable for more than one campus?", "Yes. We can plan a coordinated setup for school groups and multi-campus organizations, including standardized workflows and onboarding."],
  ["How can I see the product?", "Book a demo through our contact page. We will arrange a focused walkthrough based on your school and the areas you want to improve."],
];

export default function FAQsPage() {
  return <>
    <PageHero eyebrow="Frequently asked questions" title={<>Questions, answered<br /><span className="text-primary">clearly.</span></>} description="The essentials about Darsgah, how it works, and what to expect when bringing it into your school." />
    <section className="marketing-container py-20"><div className="mx-auto max-w-3xl divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([question, answer], index) => <details key={question} className="group py-1" open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left font-bold text-ink"><span>{question}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted transition-transform group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span></summary><p className="max-w-2xl pb-7 pr-12 text-sm leading-7 text-muted">{answer}</p></details>)}</div></section>
    <section className="border-t border-slate-200 bg-slate-50"><div className="marketing-container py-16 text-center"><h2 className="text-2xl font-bold text-ink">Still have a question?</h2><p className="mt-3 text-sm text-muted">Tell us what you would like to know and we will get back to you.</p><Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-ink">Contact our team <ArrowRight className="h-4 w-4" /></Link></div></section>
  </>;
}
