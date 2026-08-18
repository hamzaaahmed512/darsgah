import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("marketing-eyebrow", className)}>{children}</span>;
}

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description: string }) {
  return (
    <section className="marketing-grid relative overflow-hidden border-b border-slate-200">
      <div className="marketing-orb left-[8%] top-[-120px]" />
      <div className="marketing-container relative py-20 text-center sm:py-24">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-ink sm:text-6xl">{title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">{description}</p>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description?: string; centered?: boolean }) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-muted sm:text-lg">{description}</p> : null}
    </div>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-slate-600">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><Check className="h-3.5 w-3.5" /></span>
      {children}
    </li>
  );
}

export function CTA({ title = "Ready for a calmer school day?", description = "See how Darsgah can bring your people, processes, and information together." }: { title?: string; description?: string }) {
  return (
    <section className="marketing-container py-20">
      <div className="marketing-card relative overflow-hidden rounded-[28px] border border-[#0f2652] bg-[#0f2652] px-6 py-12 text-white shadow-[0_24px_70px_rgba(15,38,82,0.22)] sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[48px] border-white/[0.04]" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Let&apos;s talk</p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{title}</h2>
          <p className="mt-4 leading-7 text-blue-100/80">{description}</p>
        </div>
        <div className="relative mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
          <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#0f2652] hover:bg-blue-50">
            Book a demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/features" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10">Explore features</Link>
        </div>
      </div>
    </section>
  );
}
