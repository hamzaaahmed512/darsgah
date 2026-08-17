"use client";

import { useState, useTransition } from "react";
import { generateFeeChallansAction } from "@/app/(app)/finance/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/permissions";
import type { AppUser } from "@/types/database";

export function ChallanGeneration({ user, month, accounts, classes }: { user: AppUser; month: string; accounts: any[]; classes: any[] }) {
  const [scope, setScope] = useState<"student" | "class" | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!hasPermission(user.role, "finance:manage", user.permissions)) return null;

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const result = await generateFeeChallansAction({ month: selectedMonth, student_id: scope === "student" ? target || undefined : undefined, class_id: scope === "class" ? target || undefined : undefined });
      if (result.error) setMessage(result.error);
      else { setMessage(`Created ${result.created} challan(s); skipped ${result.skipped} already generated.`); window.setTimeout(() => window.location.reload(), 900); }
    });
  }

  return <Card className="mb-8"><CardHeader><CardTitle>Generate Monthly Challans</CardTitle></CardHeader><CardContent>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-semibold text-muted">Month<input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mt-1 block rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-ink" /></label>
      <label className="text-sm font-semibold text-muted">Generate for<select value={scope} onChange={(e) => { setScope(e.target.value as typeof scope); setTarget(""); }} className="mt-1 block rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-ink"><option value="all">All enrolled students</option><option value="class">A class</option><option value="student">A student</option></select></label>
      {scope === "class" && <label className="text-sm font-semibold text-muted">Class<select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 block rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-ink"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.grade_name ? `${item.grade_name} — ` : ""}{item.name}</option>)}</select></label>}
      {scope === "student" && <label className="text-sm font-semibold text-muted">Student<select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 block max-w-xs rounded-lg border border-outline/60 bg-surface-low px-3 py-2 text-ink"><option value="">Select student</option>{accounts.map((item) => <option key={item.student_id} value={item.student_id}>{item.student_name} ({item.admission_number})</option>)}</select></label>}
      <button type="button" disabled={pending || (scope !== "all" && !target)} onClick={generate} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:brightness-105 disabled:opacity-60">{pending ? "Generating…" : "Generate Challans"}</button>
    </div>
    {message && <p className="mt-3 text-sm font-semibold text-success">{message}</p>}
  </CardContent></Card>;
}
