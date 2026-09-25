"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { libraryAction } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import type { LibraryData } from "@/lib/services/library";

export function LibraryRulesForm({ settings }: { settings: LibraryData["settings"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="max-w-3xl rounded-[22px] border border-blue-200 bg-white p-5 shadow-card sm:p-8" onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const payload = new FormData(event.currentTarget);
      setError(null);
      startTransition(async () => {
        try {
          const result = await libraryAction(payload);
          if (!result.ok) {
            setError(result.error || "Could not save changes. Please try again.");
            return;
          }
          router.push("/library");
          router.refresh();
        } catch {
          setError("Could not save changes. Please check your connection and try again.");
        }
      });
    }}>
      <input type="hidden" name="action" value="settings" />
      <fieldset disabled={pending} className="grid min-w-0 gap-6">
                <p className="text-sm text-muted">
                  Changes apply to new issues and future renewals.
                </p>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Student Policy</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Loan period (days)">
                      <Input name="student_loan_days" type="number" required min="1" max="90" defaultValue={settings.student_loan_days ?? settings.loan_days} />
                    </Field>
                    <Field label="Max active loans">
                      <Input name="student_max_loans" type="number" required min="1" max="30" defaultValue={settings.student_max_loans ?? settings.max_loans} />
                    </Field>
                    <Field label="Max renewals">
                      <Input name="student_max_renewals" type="number" required min="0" max="10" defaultValue={settings.student_max_renewals ?? settings.max_renewals} />
                    </Field>
                    <Field label="Renewal duration (days)">
                      <Input name="student_renewal_days" type="number" required min="1" max="90" defaultValue={settings.student_renewal_days ?? settings.loan_days} />
                    </Field>
                  </div>

                  <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted border-t border-outline/50">Staff Policy</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Loan period (days)">
                      <Input name="staff_loan_days" type="number" required min="1" max="90" defaultValue={settings.staff_loan_days ?? 30} />
                    </Field>
                    <Field label="Max active loans">
                      <Input name="staff_max_loans" type="number" required min="1" max="30" defaultValue={settings.staff_max_loans ?? 5} />
                    </Field>
                    <Field label="Max renewals">
                      <Input name="staff_max_renewals" type="number" required min="0" max="10" defaultValue={settings.staff_max_renewals ?? 3} />
                    </Field>
                    <Field label="Renewal duration (days)">
                      <Input name="staff_renewal_days" type="number" required min="1" max="90" defaultValue={settings.staff_renewal_days ?? 30} />
                    </Field>
                  </div>

                  <h3 className="pt-2 text-xs font-bold uppercase tracking-wider text-muted border-t border-outline/50">Overdue Fines</h3>
                  <Field label="Overdue fine per day (Rs)">
                    <Input name="fine_per_day" type="number" required min="0" max="10000" step="0.01" defaultValue={settings.fine_per_day} />
                  </Field>
                </div>

        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3 border-t border-blue-100 pt-5">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Changes"}</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => router.push("/library")}>Cancel</Button>
        </div>
      </fieldset>
    </form>
  );
}
