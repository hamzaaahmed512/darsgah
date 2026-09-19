"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { MessageSquarePlus, X } from "lucide-react";
import { addInternalQueryRemarkAction } from "@/app/(app)/help/actions";

export function AddQueryRemark({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-sm font-bold text-ink hover:bg-slate-200">
      <MessageSquarePlus className="h-4 w-4" />Add Remark
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div role="dialog" aria-modal="true" aria-labelledby={`remark-title-${queryId}`} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-outline/70 bg-white shadow-xl sm:rounded-[28px]">
          <div className="flex items-center justify-between border-b border-outline/40 px-5 py-4 sm:px-6">
            <h2 id={`remark-title-${queryId}`} className="font-display text-xl font-bold text-ink">Add Remark</h2>
            <button type="button" onClick={close} aria-label="Close" className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button>
          </div>
          <form className="min-h-0 overflow-y-auto p-5 sm:p-6" onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            setError(null);
            startTransition(async () => {
              const result = await addInternalQueryRemarkAction(queryId, formData);
              if (!result.success) { setError(result.error ?? "Could not save the remark."); return; }
              setOpen(false);
              router.refresh();
            });
          }}>
            <label htmlFor={`remark-${queryId}`} className="mb-2 block text-sm font-bold text-ink">Remark</label>
            <textarea id={`remark-${queryId}`} name="remark" required maxLength={3000} rows={5} placeholder="Write a remark about this query…" className="w-full resize-y rounded-xl border border-outline bg-white px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none" />
            {error && <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={close} className="min-h-10 rounded-xl border border-outline px-4 text-sm font-bold text-ink hover:bg-surface-low">Cancel</button>
              <button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-button disabled:opacity-60">{pending ? "Saving…" : "Save Remark"}</button>
            </div>
          </form>
        </div>
      </div>, document.body
    )}
  </>;
}
