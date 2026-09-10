import { ClipboardCheck, Eye, Printer, UserRound } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
import { ReturnApprovedResult } from "@/app/(app)/results/_components/return-approved-result";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { formatExamType } from "@/lib/services/marks";
import type { ResultWorkflowStatus } from "@/types/database";

type ResultRow = {
  id: string;
  class_id: string;
  title: string;
  exam_type: string;
  month?: number | null;
  term: string;
  workflowStatus: ResultWorkflowStatus;
  uploadedByTeacherId: string | null;
  uploadedByTeacherName: string;
  uploaded_at: string | null;
  approved_by_principal_name: string | null;
  approved_at: string | null;
  approvalId: string | null;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  canPrint: boolean;
  classes?: { name?: string; grades?: { name?: string }; sections?: { name?: string } };
  subjects?: { name?: string };
};

import { formatClassDisplayName, formatDatePK } from "@/lib/utils";

function formatDate(value: string | null) {
  return formatDatePK(value);
}

export function ResultsTable({
  rows,
  showApprovalColumns = true,
  showPrint = false,
  inlineApproval = false
}: {
  rows: ResultRow[];
  showApprovalColumns?: boolean;
  showPrint?: boolean;
  inlineApproval?: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_10px_28px_rgba(37,99,235,0.04)]">
      <div className="flex flex-col items-start gap-2 px-5 py-4 sm:px-6">
        <h3 className="flex whitespace-nowrap items-center gap-2 font-display text-lg font-bold text-ink"><ClipboardCheck className="h-5 w-5 text-primary" />Result Register</h3>
        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{rows.length} result{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="results-table-scroll scrollbar-thin max-w-full overflow-x-auto">
      <table className="w-full min-w-[1020px] text-left text-sm">
        <thead className="bg-slate-50/90">
          <tr className="border-b border-blue-100 text-xs uppercase tracking-[0.14em] text-muted">
            <th className="px-5 py-4">Exam Type</th>
            <th className="px-5 py-4">Subject</th>
            <th className="px-5 py-4">Class</th>
            <th className="px-5 py-4">Uploaded By</th>
            <th className="px-5 py-4">Upload Date</th>
            <th className="px-5 py-4">Status</th>
            {showApprovalColumns ? (
              <>
                <th className="px-5 py-4">Approved By</th>
              </>
            ) : null}
            <th className="min-w-[160px] px-5 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-blue-100/70 align-top last:border-b-0 hover:bg-blue-50/35">
              <td className="min-w-[155px] px-5 py-4">
                <p className="font-semibold text-ink">{formatExamType(row.exam_type as any)}</p><p className="mt-0.5 text-xs text-muted">{row.title}</p>
              </td>
              <td className="px-5 py-4"><span title={row.subjects?.name ?? "—"} className="inline-flex max-w-[150px] truncate rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700">{row.subjects?.name ?? "—"}</span></td>
              <td className="px-5 py-4"><span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{formatClassDisplayName(row.classes?.grades?.name, row.classes?.name, row.classes?.sections?.name) || "—"}</span></td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><UserRound className="h-4 w-4" /></span><div><p className="font-semibold">{row.uploadedByTeacherName}</p><p className="text-xs text-muted">Teacher</p></div></div>
              </td>
              <td className="px-5 py-4">{formatDate(row.uploaded_at)}</td>
              <td className="px-5 py-4">
                <WorkflowStatusBadge status={row.workflowStatus} />
              </td>
              {showApprovalColumns ? (
                <>
                  <td className="px-5 py-4">{row.approved_by_principal_name ?? "—"}</td>
                </>
              ) : null}
              <td className="px-5 py-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/results/${row.id}`} variant="secondary" size="sm" className="rounded-xl bg-blue-50 text-primary hover:bg-blue-100" aria-label="View result" title="View result">
                      <Eye className="h-4 w-4" /> View
                    </ButtonLink>
                    {showPrint && row.canPrint ? (
                      <ButtonLink
                        href={`/results/print?classId=${row.class_id}&examType=${row.exam_type}${row.month ? `&month=${row.month}` : ""}`}
                        target="_blank"
                        size="sm"
                        className="rounded-xl"
                        aria-label="Print result"
                        title="Print result"
                      >
                        <Printer className="h-4 w-4" /> Print
                      </ButtonLink>
                    ) : null}
                    {showPrint && !row.canPrint ? (
                      <span title="Printing is unavailable until all required results are approved" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface-low px-3 text-xs font-semibold text-muted">
                        <Printer className="h-4 w-4" /> Print
                      </span>
                    ) : null}
                    {row.canReturn ? <ReturnApprovedResult examId={row.id} compact /> : null}
                  </div>
                  {inlineApproval && row.canApprove && row.approvalId ? <ApprovalActions approvalId={row.approvalId} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
