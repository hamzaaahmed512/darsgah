"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { signInAction } from "@/app/(auth)/sign-in/actions";
import { normalizeEmail } from "@/lib/email";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const result = await signInAction({
          email: normalizeEmail(String(formData.get("email") ?? "")),
          password: String(formData.get("password") ?? ""),
          next: new URLSearchParams(window.location.search).get("next") ?? undefined
        });

        if (result?.error) {
          setError(result.error);
          return;
        }

        if (result?.destination) {
          router.replace(result.destination);
          router.refresh();
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to sign in right now. Please try again.");
      }
    });
  }

  return (
    <>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#153476] sm:text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted sm:text-base">Enter your details to sign in to Darsgah.</p>
      </div>
      {error ? <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
      <form className="mt-8 grid gap-4" action={onSubmit}>
        <label className="relative block">
          <span className="sr-only">Email address</span>
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input name="email" type="email" autoComplete="email" required placeholder="Email address" onChange={(event) => { event.currentTarget.value = normalizeEmail(event.currentTarget.value); }} className="h-14 rounded-2xl bg-slate-50/80 pl-12 text-base shadow-none" />
        </label>
        <label className="relative block">
          <span className="sr-only">Password</span>
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Password"
            className="h-14 rounded-2xl bg-slate-50/80 pl-12 pr-12 text-base shadow-none"
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-ink"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </label>
        <div className="flex justify-end">
          <Link className="text-sm font-semibold text-primary hover:text-primary-ink hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <Button disabled={pending} className="mt-1 h-14 w-full rounded-2xl text-base">
          {pending ? (
            "Signing in..."
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">Access is provided by your school administrator.</p>
    </>
  );
}
