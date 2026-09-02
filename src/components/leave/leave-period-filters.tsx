"use client";

import { CalendarDays, CalendarRange, Filter } from "lucide-react";
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
    <div className="mb-6 rounded-[24px] border border-outline/60 bg-slate-50/65 p-4">
      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-end">
        <form action={action} className="relative">
          <Select name="range" value={mode === "custom" ? "" : mode} onChange={submit} className="h-12 rounded-2xl border-outline/70 bg-white font-semibold shadow-none">
            <option value="" disabled>Period</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="lifetime">Lifetime</option>
          </Select>
        </form>

        <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <input type="hidden" name="range" value="custom" />
          <label className="grid gap-2">
            <span className="sr-only">From date</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
              <Input name="from" type="date" defaultValue={from} onChange={submit} aria-label="From date" className="h-12 rounded-2xl border-outline/70 bg-white pl-11 shadow-none" />
            </div>
          </label>
          <div className="hidden items-center justify-center text-sm font-bold uppercase tracking-wide text-muted sm:flex">
            to
          </div>
          <label className="grid gap-2">
            <span className="sr-only">To date</span>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
              <Input name="to" type="date" defaultValue={to} onChange={submit} aria-label="To date" className="h-12 rounded-2xl border-outline/70 bg-white pl-11 shadow-none" />
            </div>
          </label>
        </form>

        <form action={action} className="xl:justify-self-end">
          <input type="hidden" name="range" value="custom" />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-button hover:bg-primary-ink xl:w-auto"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>
        </form>
      </div>
    </div>
  );
}
