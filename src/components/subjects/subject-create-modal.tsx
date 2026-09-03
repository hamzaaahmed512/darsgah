"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BookOpenCheck, Plus, X } from "lucide-react";
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

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
              <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline/40 px-4 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[1.7rem] font-bold text-ink">Create Subject</h2>
                    <p className="mt-1 break-words text-sm leading-5 text-muted">Add a subject to the school catalog for classes, combinations, and assessments.</p>
                  </div>
                  <button type="button" onClick={close} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink" aria-label="Close subject form">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                  {error ? (
                    <div className="mb-4 rounded-2xl border border-danger/20 bg-danger/10 p-4">
                      <p className="text-sm font-medium text-danger">{error}</p>
                    </div>
                  ) : null}

                  <section className="rounded-[28px] border border-outline/70 bg-white p-5 shadow-card sm:p-6">
                    <div className="mb-5 flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                        <BookOpenCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-[1.2rem] font-bold text-ink">Subject Details</h3>
                        <p className="mt-1 text-sm leading-5 text-muted">Keep the name clear and optionally add a short code for records.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Name" required>
                        <Input
                          name="name"
                          required
                          placeholder="Mathematics"
                          onChange={(event) => {
                            event.currentTarget.value = sanitizeEnglishNameInput(event.currentTarget.value);
                          }}
                        />
                      </Field>
                      <Field label="Code">
                        <Input name="code" placeholder="MTH-101" />
                      </Field>
                    </div>
                  </section>

                  <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-outline/50 bg-white/95 px-4 pt-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                    <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Creating..." : "Create subject"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
