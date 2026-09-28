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
  className,
  iconOnly = false
}: {
  label: string;
  confirmText: string;
  action: () => Promise<void>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
  className?: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      className={iconOnly ? `h-10 w-10 rounded-xl px-0 ${className ?? ""}` : className}
      aria-label={iconOnly ? label : undefined}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        startTransition(async () => {
          await action();
        });
      }}
    >
      {icon}
      {!iconOnly ? (pending ? "Working..." : label) : null}
    </Button>
  );
}
