"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { updateLeavePolicyAction } from "@/app/(app)/leave/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";

export function LeavePolicyModal({ annualLimit, monthlyLimit, weeklyLimit }: { annualLimit: number; monthlyLimit: number | null; weeklyLimit: number | null }) {
  const [open, setOpen] = useState(false);
  return <><Button type="button" variant="secondary" onClick={() => setOpen(true)} className="rounded-2xl border border-primary/15 bg-primary-soft/45 px-4 text-primary shadow-none hover:bg-primary-soft"><Settings2 className="h-4 w-4" /> Leave policy</Button>{open ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="w-full max-w-xl rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]"><div className="flex items-start justify-between border-b border-outline/50 px-5 py-4 sm:px-6"><div><h2 className="font-display text-2xl font-bold text-ink">Leave policy</h2><p className="mt-1 text-sm text-muted">Set limits applied to all staff. Leave optional limits empty for no restriction.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button></div><form action={updateLeavePolicyAction} className="grid gap-4 p-5 sm:p-6"><Field label="Annual leave limit (days)"><Input name="annual_limit" type="number" min="0" defaultValue={annualLimit} required /></Field><Field label="Monthly leave limit (days) [Optional]"><Input name="monthly_limit" type="number" min="0" defaultValue={monthlyLimit ?? ""} placeholder="No monthly limit" /></Field><Field label="Weekly leave limit (days) [Optional]"><Input name="weekly_limit" type="number" min="0" defaultValue={weeklyLimit ?? ""} placeholder="No weekly limit" /></Field><div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save policy</Button></div></form></div></div> : null}</>;
}
