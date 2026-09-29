"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { reviewParentComplaintAction } from "@/app/(app)/parent-queries/actions";

export function ComplaintReviewForm({ complaintId, status, response }: { complaintId: string; status: string; response: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!editing) return <button type="button" onClick={() => setEditing(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-button"><Save className="h-4 w-4" />Review complaint</button>;
  return <form className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; setError(null); startTransition(async () => { const result = await reviewParentComplaintAction(complaintId, new FormData(form)); if (!result.success) { setError(result.error ?? "Could not save the review."); return; } setEditing(false); router.refresh(); }); }}>
    <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]"><label className="grid gap-2 text-sm font-bold text-ink">Status<select name="status" defaultValue={status} className="h-11 rounded-xl border border-outline bg-white px-3 text-sm font-normal"><option value="submitted">Submitted</option><option value="reviewing">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label><label className="grid gap-2 text-sm font-bold text-ink">Official response<textarea name="response" defaultValue={response ?? ""} maxLength={3000} rows={4} placeholder="Explain the action taken or outcome for the parent…" className="resize-y rounded-xl border border-outline bg-white px-4 py-3 text-sm font-normal" /></label></div>
    {error ? <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
    <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-outline bg-white px-4 py-2 text-sm font-bold">Cancel</button><button disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{pending ? "Saving…" : "Save review"}</button></div>
  </form>;
}
