"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { signInAction } from "@/app/(auth)/sign-in/actions";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await signInAction({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? "")
        });
        router.replace("/");
        router.refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to sign in right now. Please try again.");
      }
    });
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Use your school invitation or Supabase Auth account to enter GoCampusFlow.</p>
      {error ? <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
      <form className="mt-6 grid gap-4" action={onSubmit}>
        <Field label="Email address">
          <Input name="email" type="email" autoComplete="email" required placeholder="you@school.edu" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button disabled={pending} className="mt-2 w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-semibold text-primary hover:underline" href="/forgot-password">
          Forgot password?
        </Link>
        <span className="text-muted">Invitation required</span>
      </div>
    </>
  );
}
