import { formatWorkflowStatus } from "@/lib/services/marks";
import type { ResultWorkflowStatus } from "@/types/database";

export function WorkflowStatusBadge({ status }: { status: ResultWorkflowStatus }) {
  const style = status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-rose-50 text-rose-700" : status === "pending_approval" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{formatWorkflowStatus(status)}</span>;
}
