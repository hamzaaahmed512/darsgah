"use client";

import { useState, useTransition } from "react";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { submitLeaveAction } from "@/app/(app)/leave/actions";

export function LeaveApplicationDialog({ migrationRequired }: { migrationRequired: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await submitLeaveAction(formData);
      if (result && "error" in result) {
        setError(result.error ?? "Failed to submit leave request.");
      } else {
        setOpen(false);
      }
    });
  }

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
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-lift">
            <div className="flex items-center justify-between gap-4 border-b border-outline/50 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-ink">Apply for Leave</h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink disabled:opacity-50"
                aria-label="Close leave application"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto bg-slate-50/30 p-5">
              {migrationRequired ? (
                <EmptyState
                  title="Database migration required"
                  description="Apply the latest School OS migration to enable staff leave requests."
                />
              ) : (
                <form action={handleSubmit} className="grid gap-4">
                  <Field label="Leave type">
                    <Select name="leave_type" required defaultValue="casual" disabled={pending}>
                      <option value="casual">Casual</option>
                      <option value="medical">Medical</option>
                      <option value="annual">Annual</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Start date">
                      <Input name="start_date" type="date" required disabled={pending} />
                    </Field>
                    <Field label="End date">
                      <Input name="end_date" type="date" required disabled={pending} />
                    </Field>
                  </div>
                  <Field label="Reason">
                    <Textarea name="reason" required placeholder="Briefly explain the leave request" disabled={pending} />
                  </Field>

                  {error ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      <strong>Validation Error:</strong> {error}
                    </div>
                  ) : null}

                  <Button type="submit" disabled={pending}>
                    {pending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
