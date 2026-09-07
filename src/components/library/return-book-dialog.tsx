"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookCheck, AlertCircle } from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, Input } from "@/components/ui/form-field";
import type { LibraryLoan, LibraryCopy, LibraryBook } from "@/lib/services/library";

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
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("action", "return");
    formData.append("id", loan.id);
    formData.append("outcome", outcome);
    if (note.trim()) formData.append("note", note.trim());

    startTransition(async () => {
      try {
        const result = await libraryAction(formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        onClose();
        router.refresh();
      } catch (err) {
        setError("Connection error. Please try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
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
          <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-1">
            <p><strong className="text-ink">Title:</strong> {bookTitle}</p>
            <p><strong className="text-ink">Copy ID:</strong> {copy?.accession || "N/A"}</p>
            <p><strong className="text-ink">Borrower:</strong> {loan.borrower_name} ({loan.borrower_kind})</p>
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
              ⚠️ Missing or lost copies will be marked as lost. Replacement cost of {copy?.replacement_cost != null ? `Rs ${copy.replacement_cost}` : "configured cost"} will apply.
            </p>
          )}

          <Field label="Return Note / Remarks (Optional)">
            <Input
              type="text"
              placeholder="e.g. Returned on time, clean copy..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline/50">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Processing..." : "Confirm return"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
