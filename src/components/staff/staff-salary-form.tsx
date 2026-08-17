"use client";

import { useState, useTransition } from "react";
import { setStaffSalaryAction } from "@/app/(app)/teachers/actions";

export function StaffSalaryForm({ staffId, initialSalary }: { staffId: string; initialSalary?: number | null }) {
  const [salary, setSalary] = useState(initialSalary?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return <div className="rounded-lg border border-outline/40 bg-surface-low p-3 text-sm"><p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-muted">Monthly salary</p><div className="flex gap-2"><input aria-label="Monthly salary" type="number" min="0.01" step="0.01" value={salary} onChange={(event) => setSalary(event.target.value)} className="min-w-0 rounded-lg border border-outline/60 bg-white px-3 py-2 text-ink" placeholder="Not set" /><button type="button" disabled={pending || !salary} onClick={() => startTransition(async () => { try { await setStaffSalaryAction(staffId, Number(salary)); setMessage("Saved"); } catch (error: any) { setMessage(error.message ?? "Unable to save"); } })} className="rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save"}</button></div>{message ? <p className="mt-2 text-xs font-semibold text-success">{message}</p> : null}</div>;
}
