"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { normalizeEmail } from "@/lib/email";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  function submit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const school = String(formData.get("school") ?? "");
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const message = String(formData.get("message") ?? "");
    const subject = encodeURIComponent(`Darsgah enquiry from ${school || name}`);
    const body = encodeURIComponent(`Name: ${name}\nSchool: ${school}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:hello@getdarsgah.com?subject=${subject}&body=${body}`;
    setSent(true);
  }
  if (sent) return <div className="flex min-h-[450px] flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-7 w-7" /></span><h2 className="mt-6 text-2xl font-bold text-ink">Your email is ready</h2><p className="mt-3 max-w-sm text-sm leading-6 text-muted">Your email app should now be open with your enquiry. Send the prepared message and our team will reply.</p><button onClick={() => setSent(false)} className="mt-6 text-sm font-bold text-primary">Back to form</button></div>;
  return <form action={submit} className="grid gap-5">
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" name="name" placeholder="Full name" /><Field label="School name" name="school" placeholder="Your school" /></div>
    <Field label="Work email" name="email" type="email" placeholder="you@school.edu" />
    <label className="grid gap-2 text-sm font-bold text-ink">How can we help?<textarea name="message" required rows={5} placeholder="Tell us about your school and what you would like to improve." className="resize-none rounded-xl border border-outline bg-white px-4 py-3 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" /></label>
    <button type="submit" className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-button hover:bg-primary-ink">Send enquiry <ArrowRight className="h-4 w-4" /></button>
    <p className="text-center text-[11px] leading-5 text-muted">Submitting opens your email app. Your information is not stored by this website form.</p>
  </form>;
}
function Field({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder: string }) { return <label className="grid gap-2 text-sm font-bold text-ink">{label}<input name={name} type={type} required placeholder={placeholder} onChange={type === "email" ? (event) => { event.currentTarget.value = normalizeEmail(event.currentTarget.value); } : undefined} className="h-12 rounded-xl border border-outline bg-white px-4 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100" /></label>; }
