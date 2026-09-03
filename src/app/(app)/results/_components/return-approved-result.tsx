"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2, X } from "lucide-react";
import { returnApprovedResultAction } from "@/app/(app)/results/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-field";

export function ReturnApprovedResult({ examId, compact = false }: { examId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setReason("");
    setError("");
  }

  function submit() {
    const comment = reason.trim();
    if (!comment) {
      setError("Enter a reason for returning this result.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await returnApprovedResultAction(examId, comment);
      if ("error" in result) {
        setError(result.error ?? "Approved result could not be returned.");
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size={compact ? "sm" : "md"} className="text-warning hover:bg-warning-soft" onClick={() => setOpen(true)}>
        <Undo2 className="h-4 w-4" /> Return for Revision
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`return-result-${examId}`}>
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-lift sm:rounded-[24px] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id={`return-result-${examId}`} className="font-display text-xl font-bold text-ink">Return approved result?</h2>
                <p className="mt-1 text-sm text-muted">The teacher will be able to edit the marks and resubmit them for approval.</p>
              </div>
              <button type="button" onClick={close} disabled={pending} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface-low hover:text-ink disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <Field label="Reason for revision" required error={error || undefined}>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: Please correct the marks entered for the listed students." required disabled={pending} />
            </Field>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
              <Button type="button" variant="danger" onClick={submit} disabled={pending || !reason.trim()}>
                <Undo2 className="h-4 w-4" /> {pending ? "Returning…" : "Return to Teacher"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
