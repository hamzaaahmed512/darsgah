"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { createAdjustmentAction } from "@/app/(app)/finance/payroll/actions";
import type { AdjustmentType } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  month: string;
  staff: Array<{ id: string; name: string; email?: string; role?: string }>;
}

export function AddAdjustmentDialog({ month, staff }: Props) {
  const [open, setOpen] = useState(false);
  const [staffSelectOpen, setStaffSelectOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [form, setForm] = useState({
    staffId: "",
    amount: "",
    type: "bonus" as AdjustmentType,
    reason: "",
    effective_date: `${month}-01`
  });

  const selectedStaff = staff.find((person) => person.id === form.staffId) ?? null;
  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLocaleLowerCase();
    if (!query) return staff;
    return staff.filter((person) =>
      [person.name, person.email, person.role]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query))
    );
  }, [staffSearch, staff]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function selectStaff(staffId: string) {
    handleChange("staffId", staffId);
    setStaffSelectOpen(false);
    setStaffSearch("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.staffId || !form.amount || !form.reason) {
      setError("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      const res = await createAdjustmentAction({
        staffId: form.staffId,
        amount: Number(form.amount),
        type: form.type,
        reason: form.reason,
        effective_date: form.effective_date
      });
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-soft hover:brightness-105"
      >
        Add Adjustment
      </button>

      {mounted && open ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-outline px-6 py-5">
              <h2 className="font-display text-xl font-bold text-ink">Add Salary Adjustment</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="space-y-4 min-h-0 flex-1 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Select Staff<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStaffSelectOpen((value) => !value)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-outline bg-white px-4 py-2.5 text-left text-sm font-medium text-ink shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
                    aria-haspopup="listbox"
                    aria-expanded={staffSelectOpen}
                  >
                    <span className={cn("min-w-0 flex-1 truncate", !selectedStaff && "text-muted/70")}>
                      {selectedStaff ? selectedStaff.name : "Choose staff"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>

                  {staffSelectOpen ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-outline bg-white shadow-lift">
                      <div className="flex items-center gap-2 border-b border-outline/60 px-3 py-2">
                        <Search className="h-4 w-4 text-muted" aria-hidden="true" />
                        <input
                          value={staffSearch}
                          onChange={(event) => setStaffSearch(event.target.value)}
                          placeholder="Search staff"
                          className="min-h-9 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted/60"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 min-h-0 flex-1 overflow-y-auto p-1" role="listbox">
                        {!filteredStaff.length ? (
                          <p className="px-3 py-3 text-sm font-medium text-muted">No staff found.</p>
                        ) : (
                          filteredStaff.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => selectStaff(person.id)}
                              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-surface-low"
                              role="option"
                              aria-selected={person.id === form.staffId}
                            >
                              <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", person.id === form.staffId ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">{person.name}</span>
                                <span className="block truncate text-xs font-medium text-muted">
                                  {[person.email, person.role?.replace("_", " ")].filter(Boolean).join(" • ")}
                                </span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="bonus">Bonus</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">
                    Amount (PKR)<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Reason<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  value={form.reason}
                  required
                  onChange={(e) => handleChange("reason", e.target.value)}
                  placeholder="e.g. Performance bonus, Late attendance deduction"
                  className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Effective Date</label>
                <input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => handleChange("effective_date", e.target.value)}
                  className="w-full rounded-lg border border-outline/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-outline px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setStaffSelectOpen(false);
                  }}
                  className="rounded-lg border border-outline/60 px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !form.staffId}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
