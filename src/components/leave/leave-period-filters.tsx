"use client";

import { CalendarRange } from "lucide-react";
import { Input, Select } from "@/components/ui/form-field";

type LeavePeriodFiltersProps = {
  mode: "month" | "year" | "lifetime" | "custom";
  from: string;
  to: string;
  action?: string;
};

export function LeavePeriodFilters({ mode, from, to, action = "/leave" }: LeavePeriodFiltersProps) {
  function submit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="mb-6 grid gap-3 rounded-2xl border border-outline/60 bg-surface-low/70 p-3 shadow-sm md:grid-cols-[220px_1px_minmax(0,420px)] md:items-end md:gap-4">
      <form action={action} className="relative">
        <Select name="range" value={mode === "custom" ? "" : mode} onChange={submit} className="h-11 bg-white font-semibold">
          <option value="" disabled>Period</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
          <option value="lifetime">Lifetime</option>
        </Select>
      </form>

      <div className="hidden h-11 bg-outline/60 md:block" aria-hidden="true" />

      <form action={action} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <input type="hidden" name="range" value="custom" />
        <CalendarRange className="hidden h-4 w-4 text-primary sm:block" aria-hidden="true" />
        <label className="contents">
          <span className="sr-only">From date</span>
          <Input name="from" type="date" defaultValue={from} onChange={submit} aria-label="From date" className="h-11 bg-white" />
        </label>
        <span className="text-xs font-bold uppercase tracking-wide text-muted">to</span>
        <label className="contents">
          <span className="sr-only">To date</span>
          <Input name="to" type="date" defaultValue={to} onChange={submit} aria-label="To date" className="h-11 bg-white" />
        </label>
      </form>
    </div>
  );
}
