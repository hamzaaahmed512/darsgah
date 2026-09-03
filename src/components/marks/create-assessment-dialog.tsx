"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createExamAction } from "@/app/(app)/marks/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-field";
import type { ExamType } from "@/types/database";

type ExamTypeOption = {
  value: ExamType;
  label: string;
  group: "regular" | "major";
};

export function CreateAssessmentDialog({
  classId,
  subjectId,
  examTypes
}: {
  classId: string;
  subjectId: string;
  examTypes: ExamTypeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [examType, setExamType] = useState<string>("quiz");

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="min-h-12 rounded-2xl px-6 text-sm">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create Assessment
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-lift ring-1 ring-outline">
            <div className="flex items-center justify-between gap-3 border-b border-outline px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Create Assessment</h2>
                <p className="mt-1 text-sm text-muted">Create it for the selected class and subject.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface-low hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form action={createExamAction} className="grid gap-3 p-5">
              <input type="hidden" name="class_id" value={classId} />
              <input type="hidden" name="subject_id" value={subjectId} />
              <Field label="Assessment type">
                <Select
                  name="exam_type"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <optgroup label="Regular assessments">
                    {examTypes
                      .filter((type) => type.group === "regular")
                      .map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Major examinations">
                    {examTypes
                      .filter((type) => type.group === "major")
                      .map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                  </optgroup>
                </Select>
              </Field>
              {examType === "monthly" ? (
                <Field label="Month">
                  <Select name="month" defaultValue={new Date().getMonth() + 1} required>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Title">
                <Input name="title" placeholder="Quiz 1, August Monthly, 1st Term..." required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Term">
                  <Input name="term" defaultValue="Term 1" required />
                </Field>
                <Field label="Date">
                  <Input name="exam_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </Field>
              </div>
              <Field label="Max marks">
                <Input name="max_marks" type="number" min="1" step="0.01" defaultValue="100" required />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
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
