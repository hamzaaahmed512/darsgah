"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X } from "lucide-react";
import { updateLeavePolicyAction } from "@/app/(app)/leave/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";

export function LeavePolicyModal({ annualLimit, monthlyLimit, weeklyLimit }: { annualLimit: number; monthlyLimit: number | null; weeklyLimit: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await updateLeavePolicyAction(data);
        if (result.error) { setError(result.error); return; }
        setOpen(false);
        setSaved(true);
        router.refresh();
      } catch {
        setError("Could not save leave policy. Please try again.");
      }
    });
  }

  return <>
    <Button type="button" variant="secondary" onClick={() => { setOpen(true); setError(""); setSaved(false); }} className="rounded-2xl border border-primary/15 bg-primary-soft/45 px-4 text-primary shadow-none hover:bg-primary-soft">
      <Settings2 className="h-4 w-4" /> Leave policy
    </Button>
    {saved && <p role="status" className="text-sm font-semibold text-success">Leave policy saved.</p>}
    {open && <div role="dialog" aria-modal="true" aria-labelledby="leave-policy-title" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]">
        <div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6">
          <div><h2 id="leave-policy-title" className="font-display text-2xl font-bold text-ink">Leave policy</h2><p className="mt-1 text-sm text-muted">Set limits applied to all staff. Leave optional limits empty for no restriction.</p></div>
          <button type="button" aria-label="Close leave policy" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6" aria-busy={pending}>
          <Field label="Annual leave limit (days)"><Input name="annual_limit" type="number" min="0" step="1" defaultValue={annualLimit} required disabled={pending} /></Field>
          <Field label="Monthly leave limit (days) [Optional]"><Input name="monthly_limit" type="number" min="0" step="1" defaultValue={monthlyLimit ?? ""} placeholder="No monthly limit" disabled={pending} /></Field>
          <Field label="Weekly leave limit (days) [Optional]"><Input name="weekly_limit" type="number" min="0" step="1" defaultValue={weeklyLimit ?? ""} placeholder="No weekly limit" disabled={pending} /></Field>
          {error && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save policy"}</Button></div>
        </form>
      </div>
    </div>}
  </>;
}
