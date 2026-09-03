"use client";

import { useState } from "react";
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

export function CreateAssessmentDialog({
  classId,
  subjectId
}: {
  classId: string;
  subjectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AssessmentCategory>("general");

  const isGeneral = category === "general";

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
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface-low hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form action={createExamAction} className="grid gap-4 p-5">
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
                        onChange={() => setCategory(option.value)}
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
                  <Select name="exam_type" defaultValue="monthly" required>
                    {EXAMINATION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Field>
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
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
