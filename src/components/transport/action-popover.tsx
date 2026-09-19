"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bus, MapPin, UserRoundPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TransportActionIcon = "driver" | "route" | "vehicle" | "student" | "staff";
type TransportActionVariant = "primary" | "secondary";

const icons: Record<TransportActionIcon, ReactNode> = {
  driver: <UserRoundPlus className="h-4 w-4" aria-hidden="true" />,
  route: <MapPin className="h-4 w-4" aria-hidden="true" />,
  vehicle: <Bus className="h-4 w-4" aria-hidden="true" />,
  student: <UserRoundPlus className="h-4 w-4" aria-hidden="true" />,
  staff: <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
};

export function TransportActionPopover({
  title,
  triggerLabel,
  icon,
  variant = "primary",
  footer,
  children
}: {
  title: string;
  triggerLabel: string;
  icon: TransportActionIcon;
  variant?: TransportActionVariant;
  footer?: ReactNode;
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
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant={variant}
        size={variant === "secondary" ? "sm" : "md"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {icons[icon]}
        {triggerLabel}
      </Button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline/50 px-5 py-4">
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
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 p-5">{children}</div>
            {footer ? <div className="shrink-0 border-t border-outline/50 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
          </div>
        </div>, document.body
      ) : null}
    </div>
  );
}
