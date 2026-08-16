"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { changePasswordAction } from "@/app/(auth)/change-password/actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await changePasswordAction({
          currentPassword: String(formData.get("currentPassword") ?? ""),
          password: String(formData.get("password") ?? ""),
          confirmPassword: String(formData.get("confirmPassword") ?? "")
        });
        router.replace("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Password could not be changed.");
      }
    });
  }

  return (
    <>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink">Change password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Enter your current password before choosing a new one.
      </p>
      {error ? <div className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div> : null}
      <form action={onSubmit} className="mt-6 grid gap-4">
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Button disabled={pending} className="mt-2 w-full">
          {pending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </>
  );
}
