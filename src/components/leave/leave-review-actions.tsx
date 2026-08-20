"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { reviewLeaveAction } from "@/app/(app)/leave/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-field";

export function LeaveReviewActions({ leaveId }: { leaveId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
    if (decision === "rejected" && !remarks.trim()) {
      setError("Add a comment explaining why this leave is being rejected.");
      return;
    }

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
        <Button type="button" size="sm" disabled={pending} onClick={() => review("approved")}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {pending && !rejecting ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError("");
            setRejecting(true);
          }}
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
      </div>

      {!rejecting && error ? <p className="mt-2 max-w-xs text-right text-xs font-semibold text-danger">{error}</p> : null}

      {rejecting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`reject-leave-${leaveId}`}
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setRejecting(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[18px] bg-white p-5 shadow-lift ring-1 ring-outline">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`reject-leave-${leaveId}`} className="font-display text-xl font-bold text-ink">Reject leave request</h2>
                <p className="mt-1 text-sm text-muted">Give the employee a clear reason for this decision.</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRejecting(false)}
                className="rounded-xl p-2 text-muted hover:bg-surface-low hover:text-ink disabled:opacity-50"
                aria-label="Close rejection dialog"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5">
              <Field label="Reason for rejection">
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
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={pending || !remarks.trim()} onClick={() => review("rejected")}>
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {pending ? "Rejecting…" : "Reject leave"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
