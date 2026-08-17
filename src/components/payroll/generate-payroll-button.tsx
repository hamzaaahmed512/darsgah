"use client";

import { useState, useTransition } from "react";
import { generatePayrollAction } from "@/app/(app)/finance/payroll/actions";

export function GeneratePayrollButton({ month, staff }: { month: string; staff: { id: string; name: string; email: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [teacherId, setTeacherId] = useState("");

  function handleGenerate() {
    setMessage(null);
    startTransition(async () => {
      const result = await generatePayrollAction(month, teacherId || undefined);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Created ${result.created ?? 0}; skipped ${result.skipped ?? 0} already generated.` });
        // Refresh page after success
        setTimeout(() => window.location.reload(), 1200);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select aria-label="Staff member" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="h-10 max-w-48 rounded-lg border border-outline/60 bg-surface-low px-2 text-sm text-ink"><option value="">All eligible staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
      <button
        type="button"
        disabled={isPending}
        onClick={handleGenerate}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:brightness-105 disabled:opacity-60"
      >
        {isPending ? "Generating…" : "Generate Payroll"}
      </button>
      {message && (
        <p className={`text-xs font-semibold ${message.type === "error" ? "text-danger" : "text-success"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
