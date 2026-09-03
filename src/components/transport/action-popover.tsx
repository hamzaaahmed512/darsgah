"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Bus, MapPin, UserRoundPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type TransportActionIcon = "driver" | "route" | "vehicle" | "student";
type TransportActionVariant = "primary" | "secondary";

const icons: Record<TransportActionIcon, ReactNode> = {
  driver: <UserRoundPlus className="h-4 w-4" aria-hidden="true" />,
  route: <MapPin className="h-4 w-4" aria-hidden="true" />,
  vehicle: <Bus className="h-4 w-4" aria-hidden="true" />,
  student: <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
};

const triggerStyles: Record<TransportActionVariant, string> = {
  primary: "bg-primary px-5 py-2.5 text-sm text-white shadow-button hover:bg-primary-ink",
  secondary: "bg-white px-4 py-2 text-sm text-primary ring-1 ring-outline hover:bg-primary-soft"
};

export function TransportActionPopover({
  title,
  triggerLabel,
  icon,
  variant = "primary",
  children
}: {
  title: string;
  triggerLabel: string;
  icon: TransportActionIcon;
  variant?: TransportActionVariant;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeOnSuccess() {
      setOpen(false);
    }

    window.addEventListener("transport-action-success", closeOnSuccess);
    return () => window.removeEventListener("transport-action-success", closeOnSuccess);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl font-semibold transition",
          variant === "secondary" && "min-h-10 rounded-xl",
          triggerStyles[variant]
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {icons[icon]}
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[18px] bg-white shadow-lift ring-1 ring-outline">
            <div className="flex items-center justify-between gap-4 border-b border-outline/50 px-4 py-3">
              <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink"
                aria-label={`Close ${title}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
