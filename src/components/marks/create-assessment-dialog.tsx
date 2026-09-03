"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, X } from "lucide-react";
import { createExamAction } from "@/app/(app)/marks/actions";
import { examinationTypeLabels, type ExaminationExamType } from "@/lib/validation/marks";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";

type AssessmentCategory = "general" | "examination";

const CATEGORY_OPTIONS: { value: AssessmentCategory; label: string; description: string }[] = [
  {
    value: "general",
    label: "General Assessment",
    description: "Quiz, assignment, presentation, lab work, etc."
  },
  {
    value: "examination",
    label: "Examination",
    description: "Monthly Test, 1st Term, 2nd Term, 3rd Term."
  }
];

const EXAMINATION_TYPE_OPTIONS: { value: ExaminationExamType; label: string }[] = (
  Object.entries(examinationTypeLabels) as [ExaminationExamType, string][]
).map(([value, label]) => ({ value, label }));

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

export function CreateAssessmentDialog({
  classId,
  subjectId
}: {
  classId: string;
  subjectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AssessmentCategory>("general");
  const [examinationType, setExaminationType] = useState<ExaminationExamType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthError, setMonthError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isGeneral = category === "general";
  const isMonthlyTest = !isGeneral && examinationType === "monthly";

  function handleCategoryChange(next: AssessmentCategory) {
    setCategory(next);
    // Reset month-related state when switching away from examination
    if (next !== "examination") {
      setSelectedMonth("");
      setMonthError(false);
    }
  }

  function handleExaminationTypeChange(next: ExaminationExamType) {
    setExaminationType(next);
    // Clear month selection when switching away from Monthly Test
    if (next !== "monthly") {
      setSelectedMonth("");
      setMonthError(false);
    }
  }

  function handleMonthChange(value: string) {
    setSelectedMonth(value);
    if (value) setMonthError(false);
  }

  function handleClose() {
    setOpen(false);
    // Reset all dynamic state on close
    setCategory("general");
    setExaminationType("monthly");
    setSelectedMonth("");
    setMonthError(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Client-side guard: Month is required for Monthly Test
    if (isMonthlyTest && !selectedMonth) {
      e.preventDefault();
      setMonthError(true);
      return;
    }
    setMonthError(false);
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createExamAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="min-h-12 rounded-2xl px-6 text-sm">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Assessment
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lift ring-1 ring-outline">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-outline px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Create Assessment</h2>
                <p className="mt-1 text-sm text-muted">Create it for the selected class and subject.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-muted hover:bg-surface-low hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-5">
              {error ? <p className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
              {/* Hidden identifiers */}
              <input type="hidden" name="class_id" value={classId} />
              <input type="hidden" name="subject_id" value={subjectId} />
              <input type="hidden" name="assessment_category" value={category} />

              {/* ── Category selection ── */}
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-2 text-sm font-medium text-ink">Assessment type</legend>
                {CATEGORY_OPTIONS.map((option) => {
                  const checked = category === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 transition-colors ${
                        checked
                          ? "border-primary/40 bg-primary-soft text-primary"
                          : "border-outline bg-white text-ink hover:bg-surface-low"
                      }`}
                    >
                      <input
                        type="radio"
                        name="_ui_category"
                        value={option.value}
                        checked={checked}
                        onChange={() => handleCategoryChange(option.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold leading-tight">
                        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {option.label}
                      </span>
                      <span className={`text-xs leading-snug ${checked ? "text-primary/70" : "text-muted"}`}>
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {/* ── General Assessment: Title field ── */}
              {isGeneral && (
                <Field label="Title">
                  <Input
                    name="title"
                    placeholder="e.g. Quiz 1, Assignment, Presentation…"
                    required
                    autoFocus
                  />
                </Field>
              )}

              {/* ── Examination: Examination Type dropdown ── */}
              {!isGeneral && (
                <Field label="Examination type">
                  <Select
                    name="exam_type"
                    value={examinationType}
                    onChange={(e) => handleExaminationTypeChange(e.target.value as ExaminationExamType)}
                    required
                  >
                    {EXAMINATION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {/* ── Monthly Test: Month dropdown ── */}
              {isMonthlyTest && (
                <div className="grid gap-1">
                  <Field label="Month *">
                    <Select
                      name="month"
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      aria-describedby={monthError ? "month-error" : undefined}
                      aria-invalid={monthError}
                    >
                      <option value="" disabled>
                        Select month…
                      </option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {monthError && (
                    <p id="month-error" className="text-xs font-medium text-red-600" role="alert">
                      Please select a month for the monthly test.
                    </p>
                  )}
                </div>
              )}

              {/* ── Shared: Date + Max Marks ── */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    name="exam_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </Field>
                <Field label="Max marks">
                  <Input
                    name="max_marks"
                    type="number"
                    min="1"
                    step="0.01"
                    defaultValue="100"
                    required
                  />
                </Field>
              </div>

              {/* ── Actions ── */}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={handleClose} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
