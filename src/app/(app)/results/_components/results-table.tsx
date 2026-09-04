import { Eye, Printer } from "lucide-react";
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

import { formatClassDisplayName, formatDateTimePK, formatGradeSection } from "@/lib/utils";

function formatDateTime(value: string | null) {
  return formatDateTimePK(value);
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
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-outline/50">
      <div className="scrollbar-thin max-w-full overflow-x-auto">
      <table className="w-max min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50/80">
          <tr className="border-b border-outline/40 text-xs uppercase tracking-[0.14em] text-muted">
            <th className="px-5 py-4">Exam Type</th>
            <th className="px-5 py-4">Subject</th>
            <th className="px-5 py-4">Class</th>
            <th className="px-5 py-4">Section</th>
            <th className="px-5 py-4">Uploaded By</th>
            <th className="px-5 py-4">Upload Date</th>
            <th className="px-5 py-4">Status</th>
            {showApprovalColumns ? (
              <>
                <th className="px-5 py-4">Approved By</th>
                <th className="px-5 py-4">Approval Date</th>
              </>
            ) : null}
            <th className="min-w-[220px] px-5 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-outline/25 align-top last:border-b-0">
              <td className="min-w-[220px] px-5 py-4">
                <p className="font-semibold text-ink">{formatExamType(row.exam_type as any)}</p>
                <p className="text-xs text-muted">{row.title}</p>
              </td>
              <td className="px-5 py-4">{row.subjects?.name ?? "—"}</td>
              <td className="px-5 py-4">{formatClassDisplayName(row.classes?.grades?.name, row.classes?.name, row.classes?.sections?.name) || "—"}</td>
              <td className="px-5 py-4">{formatGradeSection(null, row.classes?.sections?.name) || "—"}</td>
              <td className="px-5 py-4">
                <p className="font-semibold">{row.uploadedByTeacherName}</p>
                {row.uploadedByTeacherId ? <p className="text-xs text-muted">{row.uploadedByTeacherId.slice(0, 8)}…</p> : null}
              </td>
              <td className="px-5 py-4">{formatDateTime(row.uploaded_at)}</td>
              <td className="px-5 py-4">
                <WorkflowStatusBadge status={row.workflowStatus} />
              </td>
              {showApprovalColumns ? (
                <>
                  <td className="px-5 py-4">{row.approved_by_principal_name ?? "—"}</td>
                  <td className="px-5 py-4">{formatDateTime(row.approved_at)}</td>
                </>
              ) : null}
              <td className="px-5 py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/results/${row.id}`} variant="secondary" size="sm" className="rounded-xl">
                      <Eye className="h-4 w-4" /> View
                    </ButtonLink>
                    {showPrint && row.canPrint ? (
                      <ButtonLink
                        href={`/results/print?classId=${row.class_id}&examType=${row.exam_type}${row.month ? `&month=${row.month}` : ""}`}
                        target="_blank"
                        size="sm"
                        className="rounded-xl"
                      >
                        <Printer className="h-4 w-4" /> Print
                      </ButtonLink>
                    ) : null}
                    {showPrint && !row.canPrint ? (
                      <span className="inline-flex min-h-8 items-center rounded-lg bg-surface-low px-3 text-xs font-semibold text-muted">
                        Print disabled
                      </span>
                    ) : null}
                    {row.canReturn ? <ReturnApprovedResult examId={row.id} compact /> : null}
                  </div>
                  {inlineApproval && row.canApprove && row.approvalId ? (
                    <ApprovalActions approvalId={row.approvalId} />
                  ) : null}
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
