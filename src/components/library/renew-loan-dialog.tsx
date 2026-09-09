"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { libraryAction } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { libraryDueDate, libraryToday, overdueDays } from "@/lib/validation/library";
import type { LibraryLoan, LibraryCopy, LibrarySettings, LibraryReservation } from "@/lib/services/library";

interface RenewLoanDialogProps {
  loan: LibraryLoan;
  copy?: LibraryCopy;
  bookTitle?: string;
  settings: LibrarySettings;
  waitingReservations: LibraryReservation[];
  onClose: () => void;
}

export function RenewLoanDialog({
  loan,
  copy,
  bookTitle = "Book",
  settings,
  waitingReservations,
  onClose
}: RenewLoanDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = libraryToday();
  const isOverdue = loan.due_date < today;

  // Get policy renewal duration and max renewals based on borrower kind
  const renewalDays = loan.borrower_kind === "student"
    ? (settings.student_renewal_days ?? settings.loan_days ?? 14)
    : (settings.staff_renewal_days ?? 30);
  const maxRenewals = loan.borrower_kind === "student"
    ? (settings.student_max_renewals ?? settings.max_renewals ?? 2)
    : (settings.staff_max_renewals ?? 3);

  // Compute new proposed due date: extend from today if overdue, otherwise extend from current due date
  const proposedDueDate = isOverdue
    ? libraryDueDate(renewalDays, today)
    : libraryDueDate(renewalDays, loan.due_date);

  // Check validation rules
  const limitReached = loan.renewals >= maxRenewals;
  const hasReservation = copy ? waitingReservations.some(r => r.book_id === copy.book_id && r.status === "waiting") : false;

  let blockReason: string | null = null;
  if (limitReached) {
    blockReason = `Renewal limit reached (${loan.renewals} of ${maxRenewals} renewals used).`;
  } else if (hasReservation) {
    blockReason = "This title has a waiting reservation for another borrower; return it to fulfill the queue.";
  }

  function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (blockReason) return;

    setError(null);
    const formData = new FormData();
    formData.append("action", "renew");
    formData.append("id", loan.id);

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
      <div className="dialog-panel w-full max-w-lg rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
        <div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Renew loan</h2>
              <p className="text-xs text-muted">Extend borrowing due date based on school policy</p>
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

        <form onSubmit={handleConfirm} className="p-5 space-y-4 sm:p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {blockReason && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{blockReason}</span>
            </div>
          )}

          {/* Loan Overview */}
          <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-2">
            <p><strong className="text-ink">Title:</strong> {bookTitle}</p>
            <p><strong className="text-ink">Copy ID:</strong> {copy?.accession || "N/A"}</p>
            <p><strong className="text-ink">Borrower:</strong> {loan.borrower_name} ({loan.borrower_kind})</p>
          </div>

          {/* Renewal Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-outline/70 p-3 bg-white">
              <span className="text-muted block font-medium">Current due date</span>
              <strong className="text-sm text-ink">{loan.due_date}</strong>
              {isOverdue && (
                <span className="mt-1 block text-[11px] font-bold text-red-600">
                  ({overdueDays(loan.due_date, today)} days overdue)
                </span>
              )}
            </div>

            <div className="rounded-xl border border-primary/30 p-3 bg-primary-soft/20">
              <span className="text-muted block font-medium">New proposed due date</span>
              <strong className="text-sm text-primary font-bold">{proposedDueDate}</strong>
              <span className="mt-1 block text-[11px] text-muted">
                (+{renewalDays} days {isOverdue ? "from today" : ""})
              </span>
            </div>

            <div className="rounded-xl border border-outline/70 p-3 bg-white">
              <span className="text-muted block font-medium">Renewals used</span>
              <strong className="text-sm text-ink">{loan.renewals} of {maxRenewals}</strong>
            </div>

            <div className="rounded-xl border border-outline/70 p-3 bg-white">
              <span className="text-muted block font-medium">Renewal duration</span>
              <strong className="text-sm text-ink">{renewalDays} days</strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline/50">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || Boolean(blockReason)}>
              {pending ? "Renewing..." : "Confirm renewal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
