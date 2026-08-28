"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { getSupabaseBrowserErrorMessage } from "@/lib/supabase/browser-error";
import { createClient } from "@/lib/supabase/browser";
import { normalizeEmail } from "@/lib/email";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const email = normalizeEmail(String(new FormData(event.currentTarget).get("email") ?? ""));
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (resetError) setError(resetError.message);
      else setMessage("Password reset instructions have been sent if an account exists for that email.");
    } catch (error) {
      setError(getSupabaseBrowserErrorMessage(error, "Unable to send a reset link right now. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Enter your school email and we will send a secure reset link.</p>
      {message ? <div className="mt-4 rounded-lg bg-success-soft px-4 py-3 text-sm font-semibold text-success">{message}</div> : null}
      {error ? <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <Field label="Email address">
          <Input name="email" type="email" autoComplete="email" onChange={(event) => { event.currentTarget.value = normalizeEmail(event.currentTarget.value); }} required />
        </Field>
        <Button disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
      </form>
      <Link className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline" href="/sign-in">
        Back to sign in
      </Link>
    </>
  );
}
