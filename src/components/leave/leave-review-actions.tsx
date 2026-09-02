"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { reviewLeaveAction } from "@/app/(app)/leave/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-field";

export function LeaveReviewActions({ leaveId }: { leaveId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!rejecting) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setRejecting(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pending, rejecting]);

  function review(decision: "approved" | "rejected") {
    setError("");

    const formData = new FormData();
    formData.set("leave_id", leaveId);
    formData.set("decision", decision);
    formData.set("principal_remarks", decision === "rejected" ? remarks.trim() : "");

    startTransition(async () => {
      const result = await reviewLeaveAction(formData);
      if (result && "error" in result) {
        setError(result.error ?? "Leave could not be reviewed. Please try again.");
        return;
      }
      setRejecting(false);
      setRemarks("");
    });
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => review("approved")} className="min-h-10 rounded-xl border-primary/50 px-4 text-primary hover:bg-primary-soft">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {pending && !rejecting ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError("");
            setRejecting(true);
          }}
          className="min-h-10 rounded-xl border-danger/40 px-4 text-danger hover:bg-danger-soft"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
      </div>

      {!rejecting && error ? <p className="mt-2 max-w-xs text-right text-xs font-semibold text-danger">{error}</p> : null}

      {mounted && rejecting ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`reject-leave-${leaveId}`}
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setRejecting(false);
          }}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[18px] bg-white shadow-lift ring-1 ring-outline">
            <div className="flex items-center justify-between gap-4 border-b border-outline/50 px-5 py-4">
              <div className="min-w-0">
                <h2 id={`reject-leave-${leaveId}`} className="font-display text-lg font-bold text-ink">Reject Leave Request</h2>
                <p className="mt-1 text-sm text-muted">Add a reason if you want it saved with this decision.</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRejecting(false)}
                className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink disabled:opacity-50"
                aria-label="Close rejection dialog"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <Field label="Reason for rejection (optional)">
                <Textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  maxLength={500}
                  rows={4}
                  autoFocus
                  disabled={pending}
                  placeholder="Explain why this request cannot be approved"
                />
              </Field>
              <div className="mt-1 flex justify-between gap-3 text-xs">
                <span className="font-semibold text-danger">{error}</span>
                <span className="shrink-0 text-muted">{remarks.length}/500</span>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => setRejecting(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" disabled={pending} onClick={() => review("rejected")}>
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {pending ? "Rejecting…" : "Reject leave"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
