"use client";

import Link from "next/link";
import { Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type BillingCycle, plans } from "./pricing-data";

const sharedBenefits = ["Lifetime Software Updates", "AI Features", "WhatsApp Support"];

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  return <>
    <div className="mx-auto flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Billing frequency">
      {(["monthly", "yearly"] as const).map((cycle) => <button key={cycle} type="button" onClick={() => setBilling(cycle)} aria-pressed={billing === cycle} className={`min-h-10 rounded-full px-5 text-sm font-bold capitalize transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${billing === cycle ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink"}`}>{cycle}</button>)}
    </div>
    <div className={`mt-10 grid gap-5 md:grid-cols-2 ${compact ? "" : "xl:grid-cols-4"}`}>
      {plans.map((plan) => <PlanCard key={plan.id} plan={plan} billing={billing} compact={compact} />)}
    </div>
  </>;
}

function PlanCard({ plan, billing, compact }: { plan: (typeof plans)[number]; billing: BillingCycle; compact: boolean }) {
  const benefits = compact ? ["Student & guardian records", "Daily attendance", "Fees, challans & payments", "Exams, marks & results"] : ["Student & guardian records", "Daily attendance and class registers", "Fees, challans & payment tracking", "Exams, marks & results", "Staff, leave & approvals"];
  const href = `/contact?plan=${plan.id}&billing=${billing}`;
  return <article className={`relative flex min-w-0 flex-col rounded-3xl border p-6 sm:p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,38,82,0.12)] ${plan.popular ? "border-primary bg-blue-50/50 ring-1 ring-primary/20" : "border-slate-200 bg-white hover:border-blue-200"}`}>
    {plan.popular ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Most Popular</span> : null}
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{plan.bestFor}</p>
    <h3 className="mt-3 text-2xl font-bold tracking-tight text-ink">{plan.name}</h3>
    <p className="mt-2 text-sm text-muted">{plan.students} students</p>
    <div className="mt-7 min-h-[164px] border-b border-slate-200 pb-5">
      {billing === "monthly" ? <><span className="inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">Early bird discount · Save {plan.discount}</span><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-primary">Early bird</p><p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.05em] text-ink sm:text-3xl">{plan.monthly}<span className="ml-1 text-xs font-bold tracking-normal text-muted">/mo</span></p></div><div className="border-l border-slate-200 pl-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Regular price</p><p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.05em] text-slate-400 decoration-2 line-through sm:text-3xl">{plan.regular}<span className="ml-1 text-xs font-bold tracking-normal">/mo</span></p></div></div><p className="mt-3 text-xs font-bold text-primary">Early bird rate for the first 12 months</p></> : <><span className="inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">Annual saving · Save 13.5%</span><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-primary">Your annual price</p><p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.05em] text-ink sm:text-3xl">{plan.yearly}<span className="ml-1 text-xs font-bold tracking-normal text-muted">/yr</span></p></div><div className="border-l border-slate-200 pl-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly total</p><p className="mt-1 text-2xl font-extrabold leading-none tracking-[-0.05em] text-slate-400 decoration-2 line-through sm:text-3xl">{plan.annualRegular}<span className="ml-1 text-xs font-bold tracking-normal">/yr</span></p></div></div><p className="mt-3 text-xs font-bold text-primary">Billed annually</p></>}
    </div>
    <ul className="mt-6 flex-1 space-y-3">{[...benefits, ...sharedBenefits].map((benefit) => <li key={benefit} className="flex gap-2 text-sm leading-5 text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{benefit}</li>)}</ul>
    <Link href={href} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white hover:bg-primary-ink focus:outline-none focus:ring-4 focus:ring-blue-100">Book a demo</Link>
  </article>;
}

export function PricingComparison() {
  const rows = [["Student limit", ...plans.map(p => p.students)], ["Student & guardian records", ...plans.map(() => "Included")], ["Daily attendance and class registers", ...plans.map(() => "Included")], ["Fees, challans & payment tracking", ...plans.map(() => "Included")], ["Exams, marks & results", ...plans.map(() => "Included")], ["Staff, leave & approvals", ...plans.map(() => "Included")], ["Reports & operational visibility", ...plans.map(() => "Included")], ["Unlimited CSV/Excel imports", ...plans.map(() => "Included")], ["Email support", ...plans.map(() => "Included")]];
  rows.push(...sharedBenefits.map((benefit) => [benefit, ...plans.map(() => "Included")]));
  return <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Darsgah plan feature comparison</caption><thead className="bg-slate-50"><tr><th scope="col" className="p-4 font-bold text-ink">Feature</th>{plans.map(p => <th key={p.id} scope="col" className="p-4 font-bold text-ink">{p.name}</th>)}</tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature} className="border-t border-slate-200"><th scope="row" className="p-4 font-semibold text-ink">{feature}</th>{values.map((value, i) => <td key={i} className="p-4 text-muted">{value === "Included" ? <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-4 w-4" />Included</span> : value}</td>)}</tr>)}</tbody></table></div>;
}
