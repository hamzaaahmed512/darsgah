"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCopyStatusAction } from "@/app/(app)/library/actions";

export function CopyStatusEditor({ copyId, bookId, initialStatus }: { copyId: string; bookId: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <form className="flex flex-wrap items-center gap-2" onSubmit={event => {
    event.preventDefault();
    setError("");
    const form = new FormData(); form.set("id", copyId); form.set("book_id", bookId); form.set("status", status);
    startTransition(async () => {
      try {
        const result = await updateCopyStatusAction(form);
        if (result.error) { setError(result.error); return; }
        router.refresh();
      } catch { setError("Connection interrupted. Refresh to check the copy status."); }
    });
  }}>
    <select aria-label="Copy status" value={status} onChange={event => setStatus(event.target.value)} disabled={pending} className="rounded-lg border border-outline bg-white px-2.5 py-1.5 text-sm font-semibold capitalize text-ink">
      <option value="available">Available</option><option value="damaged">Damaged</option><option value="lost">Lost</option><option value="withdrawn">Withdrawn</option>
    </select>
    <button type="submit" disabled={pending} className="text-xs font-bold text-primary hover:underline disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
    {error && <p role="alert" className="basis-full text-xs text-red-700">{error}</p>}
  </form>;
}
