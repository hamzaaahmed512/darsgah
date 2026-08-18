import type { Metadata } from "next";
import { Eye, HeartHandshake, Lightbulb, Target } from "lucide-react";
import { CTA, PageHero, SectionHeading } from "@/components/marketing/shared";

export const metadata: Metadata = { title: "About us | GetDarsgah", description: "Why GetDarsgah is building a clearer, more connected way to run schools." };

export default function AboutPage() {
  return <>
    <PageHero eyebrow="About GetDarsgah" title={<>Technology should make<br /><span className="text-primary">school feel simpler.</span></>} description="We are building Darsgah to give education teams the clarity, structure, and time they need to focus on the work that matters." />
    <section className="marketing-container grid items-center gap-14 py-24 lg:grid-cols-2">
      <SectionHeading eyebrow="Our perspective" title="Schools deserve software shaped around their reality." description="School operations are deeply connected, but the tools used to run them often are not. Student records live in one place, attendance in another, finance in spreadsheets, and approvals in conversations that are difficult to trace." />
      <div className="marketing-card rounded-[26px] border border-blue-100 bg-primary-soft p-8 sm:p-10"><p className="text-xl font-semibold leading-9 tracking-tight text-[#163263] sm:text-2xl">Darsgah brings those moving parts together in a system that feels calm, predictable, and understandable to the people using it every day.</p></div>
    </section>
    <section className="border-y border-slate-200 bg-slate-50"><div className="marketing-container py-24"><SectionHeading eyebrow="What guides us" title="Principles behind the product" centered /><div className="mt-14 grid gap-5 md:grid-cols-3"><Principle icon={Eye} title="Clarity first" text="People should understand where they are, what needs attention, and what happens next." /><Principle icon={Target} title="Useful by default" text="Every feature should solve a real operational problem, not simply add another screen." /><Principle icon={HeartHandshake} title="Built with respect" text="We design for busy school teams and the responsibility they carry every day." /></div></div></section>
    <section className="marketing-container grid gap-12 py-24 lg:grid-cols-[0.8fr_1.2fr]"><div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-button"><Lightbulb className="h-5 w-5" /></span><h2 className="mt-6 text-3xl font-bold tracking-tight text-ink">Our mission</h2></div><p className="text-2xl font-medium leading-10 tracking-tight text-slate-600 sm:text-3xl sm:leading-[1.45]">To help schools operate with greater clarity by connecting their people, information, and everyday workflows in one dependable system.</p></section>
    <CTA title="Build a clearer way of working" description="Talk with us about your school's current process and where Darsgah can remove friction." />
  </>;
}
function Principle({ icon: Icon, title, text }: { icon: typeof Eye; title: string; text: string }) { return <article className="marketing-card rounded-[20px] border border-slate-200 bg-white p-7"><Icon className="h-6 w-6 text-primary" /><h3 className="mt-6 text-lg font-bold text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{text}</p></article>; }
