"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { deleteGradeAction } from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";

export function DeleteGradeModal({ gradeId, gradeName, sectionCount }: { gradeId: string; gradeName: string; sectionCount: number }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  function remove() {
    if (confirmation.trim() !== gradeName || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteGradeAction(gradeId);
        pushToast(`${gradeName} deleted.`, "success");
        setOpen(false);
        router.replace("/classes");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to delete this grade.");
      }
    });
  }

  return <>
    <Button type="button" variant="danger" size="sm" className="rounded-2xl border border-red-200 bg-red-50 px-4 text-red-700 shadow-none hover:bg-red-100" onClick={() => setOpen(true)}>
      <Trash2 className="h-4 w-4" /> Delete grade
    </Button>
    {mounted && open ? createPortal(
      <div role="dialog" aria-modal="true" aria-labelledby="delete-grade-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-outline/70 bg-white shadow-xl">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline/40 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id="delete-grade-title" className="font-display text-xl font-bold text-ink">Delete {gradeName}?</h2>
              <p className="mt-1 text-sm text-muted">This deletes the entire grade, not just one section.</p>
            </div>
            <button type="button" aria-label="Close" onClick={close} disabled={pending} className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            <p className="text-sm leading-6 text-ink">
              {sectionCount} class section record{sectionCount === 1 ? "" : "s"} across academic years, plus their teacher assignments, subject links, and combination settings, will be removed. Shared section names remain available to other grades.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">Deletion is blocked if student, attendance, exam, fee, or promotion history still uses this grade.</p>
            <div className="mt-5"><Field label={`Type ${gradeName} to confirm`}><Input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} /></Field></div>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
              <Button type="button" variant="danger" onClick={remove} disabled={pending || confirmation.trim() !== gradeName}>{pending ? "Deleting…" : "Delete grade"}</Button>
            </div>
          </div>
        </div>
      </div>, document.body
    ) : null}
  </>;
}
