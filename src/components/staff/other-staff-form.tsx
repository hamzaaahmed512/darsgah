"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createOtherStaffAction } from "@/app/(app)/teachers/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";
import { PakistaniPhoneInput } from "@/components/ui/pakistani-phone-input";
import { OTHER_STAFF_CATEGORIES, OTHER_STAFF_CATEGORY_LABELS, type OtherStaffCategory } from "@/lib/constants/staff";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";

export function OtherStaffFormModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    category: "peon" as OtherStaffCategory,
    department: "Others",
    jobTitle: "",
    phone: "",
    monthlySalary: ""
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createOtherStaffAction({
          fullName: form.fullName,
          category: form.category,
          department: form.department,
          jobTitle: form.jobTitle,
          phone: form.phone,
          monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : null
        });
        setForm({ fullName: "", category: "peon", department: "Others", jobTitle: "", phone: "", monthlySalary: "" });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add staff record.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Other Staff
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-lift">
            <div className="flex items-center justify-between gap-4 border-b border-outline/50 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Add Other Staff</h2>
                <p className="mt-1 text-sm text-muted">Record-only staff do not get app accounts or login access.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submit} className="grid gap-4 overflow-y-auto bg-slate-50/30 p-5">
              {error ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
              <Field label="Full name"><Input required value={form.fullName} onChange={(event) => update("fullName", sanitizeEnglishNameInput(event.target.value))} /></Field>
              <Field label="Category" required>
                <Select value={form.category} onChange={(event) => update("category", event.target.value as OtherStaffCategory)}>
                  {OTHER_STAFF_CATEGORIES.map((category) => <option key={category} value={category}>{OTHER_STAFF_CATEGORY_LABELS[category]}</option>)}
                </Select>
              </Field>
              <Field label="Department"><Input value={form.department} onChange={(event) => update("department", event.target.value)} placeholder="Others" /></Field>
              <Field label="Job title"><Input value={form.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder="Peon, Guard, Cleaner..." /></Field>
              <Field label="Phone"><PakistaniPhoneInput value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
              <Field label="Monthly salary"><Input type="number" min="0" step="0.01" value={form.monthlySalary} onChange={(event) => update("monthlySalary", event.target.value)} placeholder="Optional" /></Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Record"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
