"use client";

import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { annualPrice, formatPrice, pricingPlans } from "./pricing-data";
import { cn } from "@/lib/utils";
import { useState } from "react";

type BillingCycle = "monthly" | "annual";

export function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const suffix = billingCycle === "monthly" ? "/month" : "/year";

  return <>
    <div className="mx-auto flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Billing cycle">
      {(["monthly", "annual"] as BillingCycle[]).map((cycle) => <button key={cycle} type="button" onClick={() => setBillingCycle(cycle)} className={cn("rounded-lg px-4 py-2 text-sm font-bold capitalize", billingCycle === cycle ? "bg-primary text-white" : "text-muted hover:text-ink")} aria-pressed={billingCycle === cycle}>{cycle}{cycle === "annual" ? " (2 months free)" : ""}</button>)}
    </div>
    <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-5 text-muted">Early bird prices apply for the first 12 months. They can be combined with annual billing; annual totals are priced at ten months.</p>
    <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {pricingPlans.map((plan) => {
        const regular = billingCycle === "monthly" ? plan.monthlyRegular : annualPrice(plan.monthlyRegular);
        const earlyBird = billingCycle === "monthly" ? plan.monthlyEarlyBird : annualPrice(plan.monthlyEarlyBird);
        const featured = plan.name === "Standard";
        return <article key={plan.name} className={cn("marketing-card relative flex flex-col rounded-[20px] border-2 bg-white p-6", featured ? "border-primary shadow-[0_18px_50px_rgba(37,99,235,0.16)]" : "border-slate-200")}>
          {featured ? <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"><Star className="h-3 w-3 fill-current" /> Most Popular</span> : null}
          <h2 className="text-xl font-bold text-ink">{plan.name}</h2>
          <p className="mt-2 text-sm font-semibold text-primary">{plan.capacity}</p>
          <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{plan.description}</p>
          <div className="mt-6 border-y border-slate-100 py-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Early bird</p><p className="mt-1 text-2xl font-bold tracking-tight text-ink">{formatPrice(earlyBird)}<span className="text-xs font-semibold text-muted">{suffix}</span></p><p className="mt-1 text-xs text-muted line-through">Regular {formatPrice(regular)}{suffix}</p></div>
          <Link href={`/contact?plan=${encodeURIComponent(plan.name)}`} className={cn("mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold", featured ? "bg-primary text-white shadow-button hover:bg-primary-ink" : "border border-outline text-primary hover:bg-primary-soft")}>Book a demo <ArrowRight className="h-4 w-4" /></Link>
          <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-6">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm leading-5 text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{feature}</li>)}</ul>
        </article>;
      })}
    </div>
  </>;
}

export function PricingComparison() {
  const rows = [
    ["Student records", "Included", "Included", "Included", "Included"],
    ["Attendance", "Included", "Included", "Included", "Included"],
    ["Academics and exams", "Basic", "Full", "Full", "Full"],
    ["Fees and finance", "Collection", "Reports", "Advanced", "Advanced"],
    ["Staff and payroll", "-", "Staff", "Full", "Full"],
    ["Transport", "-", "-", "Included", "Included"],
    ["Reporting and approvals", "Core", "Full", "Advanced", "Advanced"],
    ["Onboarding and support", "Guided", "Guided", "Priority", "Dedicated"]
  ];
  return <div className="mt-12 overflow-x-auto rounded-[20px] border border-slate-200 bg-white"><table className="min-w-[760px] w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="px-5 py-4 font-bold text-ink">Features</th>{pricingPlans.map((plan) => <th key={plan.name} className={cn("px-5 py-4 font-bold", plan.name === "Standard" ? "text-primary" : "text-ink")}>{plan.name}</th>)}</tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature} className="border-b border-slate-100 last:border-0"><th className="px-5 py-4 font-semibold text-slate-700">{feature}</th>{values.map((value, index) => <td key={`${feature}-${index}`} className="px-5 py-4 text-slate-600">{value}</td>)}</tr>)}</tbody></table></div>;
}
