"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form-field";
import { createSpecialExamAction } from "@/app/(app)/special-exams/actions";

type AssignmentOption = {
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  grade_name: string;
  subject_id: string;
  subject_name: string;
};

export function SpecialExamCreateModal({
  assignments,
  migrationRequired
}: {
  assignments: AssignmentOption[];
  migrationRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setError(null);
    startTransition(async () => {
      try {
        await createSpecialExamAction(formData);
        close();
      } catch (err: any) {
        setError(err?.message ?? "Failed to create special exam.");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create special exam
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Create special exam</h2>
                <p className="mt-1 text-sm text-muted">Create a special exam for one assigned teacher, class, and subject.</p>
              </div>
              <button type="button" onClick={close} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close special exam form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {migrationRequired ? (
                <EmptyState title="Database migration required" description="Apply the latest School OS migration to enable special exams." />
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-4">
                  {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
                  <Field label="Teacher assignment">
                    <Select name="assignment_key" required>
                      <option value="">Choose teacher / class / subject</option>
                      {assignments.map((assignment) => (
                        <option
                          key={`${assignment.teacher_id}:${assignment.class_id}:${assignment.subject_id}`}
                          value={`${assignment.teacher_id}:${assignment.class_id}:${assignment.subject_id}`}
                        >
                          {assignment.teacher_name} / {assignment.grade_name} {assignment.class_name} / {assignment.subject_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Exam name">
                    <Input name="title" placeholder="Special Exam - Algebra Retake" required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Date">
                      <Input name="exam_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                    </Field>
                    <Field label="Max marks">
                      <Input name="max_marks" type="number" min="1" step="0.01" defaultValue="100" required />
                    </Field>
                  </div>
                  <Field label="Term">
                    <Input name="term" defaultValue="Special Exams" required />
                  </Field>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Creating..." : "Create special exam"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
