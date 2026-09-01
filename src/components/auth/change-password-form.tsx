"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { changePasswordAction } from "@/app/(auth)/change-password/actions";

export function ChangePasswordForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        const result = await changePasswordAction({
          currentPassword: String(formData.get("currentPassword") ?? ""),
          password: String(formData.get("password") ?? ""),
          confirmPassword: String(formData.get("confirmPassword") ?? ""),
          next
        });
        
        if ("destination" in result && result.destination) {
          router.replace(result.destination);
          router.refresh();
        } else {
          setError(result.error ?? "Password could not be changed. Please try again.");
        }
      } catch {
        setError("Password could not be changed. Please try again.");
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
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            visible={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((value) => !value)}
          />
        </Field>
        <Field label="New password">
          <PasswordInput
            name="password"
            autoComplete="new-password"
            minLength={8}
            visible={showNewPassword}
            onToggle={() => setShowNewPassword((value) => !value)}
          />
        </Field>
        <Field label="Confirm password">
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
          />
        </Field>
        <Button disabled={pending} className="mt-2 w-full">
          {pending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </>
  );
}

function PasswordInput({
  visible,
  onToggle,
  ...props
}: React.ComponentProps<typeof Input> & {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        required
        className={`pr-11 ${props.className ?? ""}`.trim()}
      />
      <button
        type="button"
        onClick={onToggle}
        onMouseDown={(event) => event.preventDefault()}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-ink focus:outline-none focus:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
