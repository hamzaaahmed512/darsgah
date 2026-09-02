"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Coins, X } from "lucide-react";
import { createManualTransactionAction } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

export function AddCashModal() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("direction", "income");
    formData.set("category", "other_income");
    formData.set("payment_method", "cash");
    setError(null);
    startTransition(async () => {
      try {
        await createManualTransactionAction(formData);
        pushToast("Cash added.", "success");
        form.reset();
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to add cash.");
      }
    });
  }

  return <>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
      <Coins className="h-4 w-4" />
      Add cash
    </Button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[20px] bg-white shadow-lift">
        <div className="flex items-start justify-between border-b border-outline/50 px-6 py-5">
          <h2 className="font-display text-xl font-bold text-ink">Add cash</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-6">
          {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
          <Field label="Amount" required>
            <Input name="amount" type="number" min="0.01" step="0.01" required />
          </Field>
          <Field label="Date" required>
            <Input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={pending}>{pending ? "Saving..." : "Add cash"}</Button>
          </div>
        </form>
      </div>
    </div> : null}
  </>;
}
