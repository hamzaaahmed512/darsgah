"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeaveApplicationDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        Apply for Leave
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Apply for leave"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-lift">
            <div className="flex items-center justify-between gap-4 border-b border-outline/50 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-ink">Apply for Leave</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink"
                aria-label="Close leave application"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto bg-slate-50/30 p-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
