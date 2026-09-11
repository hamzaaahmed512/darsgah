"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRight, IdCard, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { parentSignInAction } from "@/app/(auth)/parent-portal/actions";
import { formatCnic } from "@/lib/pakistan-format";

export default function ParentPortalSignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
        const result = await parentSignInAction({ cnic: String(form.get("cnic") ?? ""), dateOfBirth: String(form.get("dateOfBirth") ?? "") });
      if (result.error) setError(result.error);
      else {
        const destination = "destination" in result && result.destination ? result.destination : "/parent-portal";
        router.replace(destination);
      }
    });
  }

  return <>
    <div className="text-center"><h1 className="font-display text-3xl font-bold tracking-tight text-[#153476]">Student Portal</h1><p className="mt-2 text-sm leading-6 text-muted">Sign in to view one student&apos;s school record.</p></div>
    {error ? <div role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
    <form className="mt-8 grid gap-4" onSubmit={submit}>
      <label className="relative block"><span className="sr-only">Student CNIC or Form-B</span><IdCard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input name="cnic" required placeholder="Student CNIC / Form-B" inputMode="numeric" autoComplete="username" className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" onChange={(event) => { event.currentTarget.value = formatCnic(event.currentTarget.value); }} /></label>
      <label className="relative block"><span className="sr-only">Date of birth password</span><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input name="dateOfBirth" required placeholder="Date of birth (DDMMYYYY)" inputMode="numeric" maxLength={8} autoComplete="current-password" className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" onChange={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 8); }} /></label>
      <Button disabled={pending} className="mt-1 h-14 w-full rounded-2xl text-base">{pending ? "Signing in..." : <><span>Continue</span><ArrowRight className="h-5 w-5" /></>}</Button>
    </form>
    <p className="mt-7 text-center text-sm text-muted">Your student CNIC and date of birth securely identify the correct school record.</p>
    <p className="mt-3 text-center text-sm"><Link className="font-semibold text-primary hover:text-primary-ink hover:underline" href="/sign-in">School staff? Go to the normal sign in</Link></p>
  </>;
}
