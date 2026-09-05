"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { sendContactEnquiryAction, type ContactFormState } from "@/app/(marketing)/contact/actions";
import { normalizeEmail } from "@/lib/email";
import { isBillingCycle, isPlanId, plans } from "./pricing-data";

const initialState: ContactFormState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactEnquiryAction, initialState);
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const billing = searchParams.get("billing");
  const enquiry = searchParams.get("enquiry");
  const plan = isPlanId(planId) ? plans.find((item) => item.id === planId) : undefined;
  const validBilling = isBillingCycle(billing) ? billing : undefined;
  const customDevelopment = enquiry === "custom-development";

  if (state.status === "success") {
    return <div className="flex min-h-[450px] flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-7 w-7" /></span><h2 className="mt-6 text-2xl font-bold text-ink">Enquiry sent</h2><p className="mt-3 max-w-sm text-sm leading-6 text-muted">Thank you. Your demo request has been delivered to the Darsgah team, and we will reply to your email.</p></div>;
  }

  return <form action={action} className="relative grid gap-5">
    {plan ? <div className="rounded-xl border border-blue-100 bg-primary-soft px-4 py-3 text-sm"><p className="font-bold text-ink">Your selected plan</p><p className="mt-1 text-muted">{plan.name} · {validBilling === "yearly" ? "Yearly billing" : "Monthly billing"}</p><input type="hidden" name="plan" value={plan.id} /><input type="hidden" name="billing" value={validBilling ?? "monthly"} /></div> : null}
    {customDevelopment ? <div className="rounded-xl border border-blue-100 bg-primary-soft px-4 py-3 text-sm"><p className="font-bold text-ink">Custom development enquiry</p><p className="mt-1 text-muted">Tell us about the solution you need and we will discuss the scope with you.</p><input type="hidden" name="enquiry" value="custom-development" /></div> : null}
    <div className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" name="name" placeholder="Full name" error={state.errors?.name} /><Field label="School name" name="school" placeholder="Your school" error={state.errors?.school} /></div>
    <Field label="Work email" name="email" type="email" placeholder="you@school.edu" error={state.errors?.email} />
    <label className="grid gap-2 text-sm font-bold text-ink"><span>How can we help?<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span><textarea name="message" required aria-required="true" rows={5} maxLength={3000} placeholder="Tell us about your school and what you would like to improve." className="resize-none rounded-xl border border-outline bg-white px-4 py-3 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" />{state.errors?.message ? <span className="text-xs font-semibold text-danger">{state.errors.message}</span> : null}</label>
    {state.message ? <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{state.message}</p> : null}
    <button type="submit" disabled={pending} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-button hover:bg-primary-ink disabled:cursor-not-allowed disabled:bg-surface-high disabled:text-muted">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : <>Send enquiry <ArrowRight className="h-4 w-4" /></>}</button>
    <p className="text-center text-[11px] leading-5 text-muted">Your details are sent securely to the Darsgah team so we can respond to your enquiry.</p>
  </form>;
}

function Field({ label, name, type = "text", placeholder, error }: { label: string; name: string; type?: string; placeholder: string; error?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-ink"><span>{label}<span className="ml-0.5 text-danger" aria-hidden="true">*</span></span><input name={name} type={type} required aria-required="true" maxLength={type === "email" ? 254 : 150} placeholder={placeholder} onChange={type === "email" ? (event) => { event.currentTarget.value = normalizeEmail(event.currentTarget.value); } : undefined} className="h-12 rounded-xl border border-outline bg-white px-4 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" />{error ? <span className="text-xs font-semibold text-danger">{error}</span> : null}</label>;
}
