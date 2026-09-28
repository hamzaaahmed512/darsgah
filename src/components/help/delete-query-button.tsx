"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteInternalQueryAction } from "@/app/(app)/help/actions";

export function DeleteQueryButton({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className="mt-3"><button type="button" disabled={pending} onClick={() => { if (!window.confirm("Delete this query and all of its remarks? This cannot be undone.")) return; setError(null); startTransition(async () => { const result = await deleteInternalQueryAction(queryId); if (!result.success) { setError(result.error ?? "Could not delete the query."); return; } router.refresh(); }); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0 text-danger ring-1 ring-red-100 hover:bg-red-50 disabled:opacity-60" aria-label="Delete query"><Trash2 className="h-3.5 w-3.5" /></button>{error ? <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p> : null}</div>;
}
