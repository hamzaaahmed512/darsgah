"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, IdCard, LockKeyhole, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { parentSignInAction } from "@/app/(auth)/parent-portal/actions";
import { formatCnic, formatPakistaniPhone } from "@/lib/pakistan-format";

export default function ParentPortalSignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await parentSignInAction({ school: String(form.get("school") ?? ""), cnic: String(form.get("cnic") ?? ""), phone: String(form.get("phone") ?? "") });
      if (result.error) setError(result.error);
      else router.replace("destination" in result ? result.destination : "/parent-portal");
    });
  }

  return <>
    <div className="text-center"><h1 className="font-display text-3xl font-bold tracking-tight text-[#153476]">Parent Portal</h1><p className="mt-2 text-sm leading-6 text-muted">Sign in to view your children&apos;s school records.</p></div>
    {error ? <div role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
    <form className="mt-8 grid gap-4" onSubmit={submit}>
      <label className="relative block"><span className="sr-only">School portal code</span><School className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input name="school" required placeholder="School portal code" autoComplete="organization" className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" /></label>
      <label className="relative block"><span className="sr-only">Guardian CNIC</span><IdCard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input name="cnic" required placeholder="Guardian CNIC" inputMode="numeric" autoComplete="username" className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" onChange={(event) => { event.currentTarget.value = formatCnic(event.currentTarget.value); }} /></label>
      <label className="relative block"><span className="sr-only">Guardian phone number</span><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input name="phone" required placeholder="Guardian phone number" inputMode="tel" autoComplete="current-password" className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" onChange={(event) => { event.currentTarget.value = formatPakistaniPhone(event.currentTarget.value); }} /></label>
      <Button disabled={pending} className="mt-1 h-14 w-full rounded-2xl text-base">{pending ? "Signing in..." : <><span>Continue</span><ArrowRight className="h-5 w-5" /></>}</Button>
    </form>
    <p className="mt-7 text-center text-sm text-muted">Use the school portal code provided by your school.</p>
  </>;
}