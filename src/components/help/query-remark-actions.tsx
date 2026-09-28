"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteInternalQueryRemarkAction, updateInternalQueryRemarkAction } from "@/app/(app)/help/actions";

export function QueryRemarkActions({ remarkId, remark }: { remarkId: string; remark: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Delete this remark? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteInternalQueryRemarkAction(remarkId);
      if (!result.success) setError(result.error ?? "Could not delete the remark.");
      else router.refresh();
    });
  }

  return <>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => { setEditing(true); setError(null); }} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0 text-primary ring-1 ring-blue-100 hover:bg-blue-50 disabled:opacity-60" aria-label="Edit remark"><Pencil className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={remove} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0 text-danger ring-1 ring-red-100 hover:bg-red-50 disabled:opacity-60" aria-label="Delete remark"><Trash2 className="h-3.5 w-3.5" /></button>
      {error ? <p role="alert" className="self-center text-xs font-semibold text-danger">{error}</p> : null}
    </div>
    {editing && createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby={`edit-remark-${remarkId}`} className="w-full max-w-lg rounded-t-[28px] bg-white shadow-xl sm:rounded-[28px]"><div className="flex items-center justify-between border-b border-outline/50 px-5 py-4 sm:px-6"><h2 id={`edit-remark-${remarkId}`} className="font-display text-xl font-bold text-ink">Edit Remark</h2><button type="button" disabled={pending} onClick={() => setEditing(false)} aria-label="Close" className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button></div><form className="p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); setError(null); const formData = new FormData(event.currentTarget); startTransition(async () => { const result = await updateInternalQueryRemarkAction(remarkId, formData); if (!result.success) { setError(result.error ?? "Could not update the remark."); return; } setEditing(false); router.refresh(); }); }}><label className="grid gap-2 text-sm font-bold text-ink">Remark<textarea name="remark" required maxLength={3000} rows={6} defaultValue={remark} className="resize-y rounded-xl border border-outline bg-white px-4 py-3 text-sm font-normal text-ink focus:border-primary focus:outline-none" /></label>{error ? <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<div className="mt-5 flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setEditing(false)} className="min-h-10 rounded-xl border border-outline px-4 text-sm font-bold text-ink hover:bg-surface-low">Cancel</button><button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-button disabled:opacity-60">{pending ? "Saving…" : "Save changes"}</button></div></form></div></div>, document.body)}
  </>;
}
