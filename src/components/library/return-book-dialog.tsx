"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-field";
import { LibraryDialog } from "./library-dialog";
import type { LibraryLoan, LibraryCopy } from "@/lib/services/library";

interface ReturnBookDialogProps {
  loan: LibraryLoan;
  copy?: LibraryCopy;
  bookTitle?: string;
  onClose: () => void;
}

export function ReturnBookDialog({
  loan,
  copy,
  bookTitle = "Book",
  onClose
}: ReturnBookDialogProps) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"returned" | "damaged" | "lost">("returned");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("action", "return");
    formData.append("id", loan.id);
    formData.append("outcome", outcome);

    startTransition(async () => {
      try {
        const result = await libraryAction(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("Connection error. Please try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="dialog-panel w-full flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden max-w-lg rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
        <div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <BookCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Return book</h2>
              <p className="text-xs text-muted">Process copy return and update availability</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-muted hover:bg-surface-low"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 sm:p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loan Overview Summary */}
          <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
            <p className="break-words"><strong className="text-ink">Title:</strong> {bookTitle}</p>
            <p><strong className="text-ink">Copy ID:</strong> {copy?.accession || "N/A"}</p>
            <p className="break-words"><strong className="text-ink">Borrower:</strong> {loan.borrower_name} ({loan.borrower_kind})</p>
            <p><strong className="text-ink">Due Date:</strong> {loan.due_date}</p>
          </div>

          <Field label="Return Condition">
            <Select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "returned" | "damaged" | "lost")}
              required
            >
              <option value="returned">Returned in good condition (Copy becomes Available)</option>
              <option value="damaged">Returned damaged (Copy status updated to Damaged)</option>
              <option value="lost">Lost copy (Copy status updated to Lost)</option>
            </Select>
          </Field>

          {outcome === "damaged" && (
            <p className="text-xs text-amber-700 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚠️ Damaged copies are marked as damaged and will not automatically return to available stock for circulation.
            </p>
          )}

          {outcome === "lost" && (
            <p className="text-xs text-red-700 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
              {copy?.replacement_cost != null
                ? `This copy will be marked lost. Rs ${copy.replacement_cost} replacement cost will be added to the library balance, plus any overdue fine.`
                : "This copy will be marked lost. No replacement cost is recorded, so only any overdue fine will apply."}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-outline/50 bg-white/95 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Processing..." : "Confirm return"}
            </Button>
          </div>
        </form>
    </LibraryDialog>
  );
}
