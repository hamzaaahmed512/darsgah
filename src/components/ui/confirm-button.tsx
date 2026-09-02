"use client";

import { useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  confirmText,
  action,
  variant = "danger",
  icon,
  className
}: {
  label: string;
  confirmText: string;
  action: () => Promise<void>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        startTransition(async () => {
          await action();
        });
      }}
    >
      {!pending ? icon : null}
      {pending ? "Working..." : label}
    </Button>
  );
}
