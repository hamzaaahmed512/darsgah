"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { createSubjectAction } from "@/app/(app)/subjects/actions";
import { sanitizeEnglishNameInput } from "@/lib/validation/names";

export function SubjectCreateModal() {
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
        await createSubjectAction(formData);
        close();
      } catch (err: any) {
        setError(err?.message ?? "Failed to create subject.");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create subject
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Create subject</h2>
                <p className="mt-1 text-sm text-muted">Add a subject to the school catalog.</p>
              </div>
              <button type="button" onClick={close} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close subject form">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 p-6">
              {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
              <Field label="Name">
                <Input name="name" required placeholder="Mathematics" onChange={(event) => { event.currentTarget.value = sanitizeEnglishNameInput(event.currentTarget.value); }} />
              </Field>
              <Field label="Code">
                <Input name="code" placeholder="MTH-101" />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating..." : "Create subject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
