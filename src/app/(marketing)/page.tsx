import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, CheckCircle2, Coins, GraduationCap, Layers3, ShieldCheck, Sparkles, Users } from "lucide-react";
import { CTA, Eyebrow, SectionHeading } from "@/components/marketing/shared";
import { ProductPreview } from "@/components/marketing/product-preview";

export const metadata: Metadata = {
  title: "GetDarsgah | School management, made clear",
  description: "Run students, attendance, academics, finance, staff, and school operations from one connected workspace."
};

const features = [
  { icon: GraduationCap, title: "Student lifecycle", text: "Keep admissions, profiles, guardians, enrollment, and records organized from day one." },
  { icon: CalendarCheck, title: "Attendance that flows", text: "Give teachers a fast daily register while leadership sees clear school-wide patterns." },
  { icon: BarChart3, title: "Academics & results", text: "Coordinate exams, marks, approvals, and results with a process everyone can follow." },
  { icon: Coins, title: "Finance operations", text: "Manage fees, payments, payroll, and financial visibility without scattered spreadsheets." },
  { icon: Users, title: "Staff workspace", text: "Bring staff records, roles, leave, departments, and responsibilities into one place." },
  { icon: ShieldCheck, title: "Built around roles", text: "Each person sees the tools and information their school role requires, and nothing more." }
];

export default function OverviewPage() {
  return (
    <>
      <section className="marketing-grid relative overflow-hidden pb-20 pt-20 sm:pt-28">
        <div className="marketing-orb left-[15%] top-[-100px]" />
        <div className="marketing-container relative text-center">
          <Eyebrow><Sparkles className="h-3.5 w-3.5" /> One workspace for your whole school</Eyebrow>
          <h1 className="mx-auto mt-7 max-w-5xl font-display text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-ink sm:text-7xl lg:text-[82px]">
            School management,<br /><span className="text-primary">made clear.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-muted sm:text-xl">
            Darsgah connects students, staff, academics, attendance, and finance so your team spends less time chasing information and more time moving the school forward.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-button hover:bg-primary-ink">Book a personal demo <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/features" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-outline bg-white px-6 text-sm font-bold text-ink shadow-sm hover:bg-surface-low">See how it works</Link>
          </div>
          <p className="mt-5 text-xs font-medium text-muted">Built for principals, administrators, teachers, and school teams.</p>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="marketing-container grid gap-5 py-8 sm:grid-cols-3">
          <TrustPoint title="One source of truth" text="No duplicate records across departments." />
          <TrustPoint title="Role-aware by design" text="The right access for every responsibility." />
          <TrustPoint title="Made for real workflows" text="From attendance to approved results." />
        </div>
      </section>

      <section className="marketing-container py-24">
        <SectionHeading eyebrow="Everything connected" title="A complete operating system for your school" description="Darsgah replaces disconnected tools with focused modules that work together, giving every team a clearer day." centered />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="marketing-card group rounded-[20px] border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span><span className="text-xs font-bold text-slate-300">0{index + 1}</span></div>
              <h3 className="mt-6 text-lg font-bold tracking-tight text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center"><Link href="/features" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-ink">Explore every feature <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      <section className="overflow-hidden bg-[#f8fafc] py-24">
        <div className="marketing-container grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Built for focus" title="Less admin friction. More confident decisions." description="Every screen is designed to make the next action obvious, from the classroom register to the principal's approval queue." />
            <ul className="mt-8 grid gap-4">
              {["See what needs attention without digging through reports.", "Keep approvals and responsibility visible at every step.", "Give teams a familiar, consistent experience across modules."].map((item) => <li className="flex items-center gap-3 text-sm font-semibold text-slate-700" key={item}><CheckCircle2 className="h-5 w-5 text-success" />{item}</li>)}
            </ul>
          </div>
          <div className="marketing-card relative rounded-[28px] border border-[#0f2652] bg-[#0f2652] p-7 text-white shadow-[0_30px_80px_rgba(15,38,82,0.24)] sm:p-10">
            <div className="absolute right-6 top-6 h-28 w-28 rounded-full border-[24px] border-white/[0.04]" />
            <Layers3 className="h-8 w-8 text-blue-300" />
            <p className="mt-14 max-w-md font-display text-2xl font-semibold leading-snug tracking-[-0.025em] sm:text-3xl">One connected record follows every student, class, payment, and result.</p>
            <div className="mt-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-6 text-center"><MiniStat value="One" label="workspace" /><MiniStat value="Clear" label="ownership" /><MiniStat value="Live" label="visibility" /></div>
          </div>
        </div>
      </section>
      <CTA />
    </>
  );
}

function TrustPoint({ title, text }: { title: string; text: string }) { return <div className="flex gap-3 sm:justify-center"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-bold text-ink">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{text}</p></div></div>; }
function MiniStat({ value, label }: { value: string; label: string }) { return <div><p className="text-lg font-bold">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-blue-200/70">{label}</p></div>; }
