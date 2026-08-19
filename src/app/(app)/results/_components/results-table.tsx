import { Eye, Printer } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
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
  canPrint: boolean;
  classes?: { name?: string; grades?: { name?: string }; sections?: { name?: string } };
  subjects?: { name?: string };
};

import { formatDateTimePK } from "@/lib/utils";

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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-outline/40 text-xs uppercase tracking-wide text-muted">
            <th className="py-3 pr-3">Exam Type</th>
            <th className="py-3 pr-3">Subject</th>
            <th className="py-3 pr-3">Class</th>
            <th className="py-3 pr-3">Section</th>
            <th className="py-3 pr-3">Uploaded By</th>
            <th className="py-3 pr-3">Upload Date</th>
            <th className="py-3 pr-3">Status</th>
            {showApprovalColumns ? (
              <>
                <th className="py-3 pr-3">Approved By</th>
                <th className="py-3 pr-3">Approval Date</th>
              </>
            ) : null}
            <th className="py-3 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-outline/25 align-top">
              <td className="py-3 pr-3">
                <p className="font-semibold text-ink">{formatExamType(row.exam_type as any)}</p>
                <p className="text-xs text-muted">{row.title}</p>
              </td>
              <td className="py-3 pr-3">{row.subjects?.name ?? "—"}</td>
              <td className="py-3 pr-3">
                {row.classes?.grades?.name ? `${row.classes.grades.name} / ` : ""}
                {row.classes?.name ?? "—"}
              </td>
              <td className="py-3 pr-3">{row.classes?.sections?.name ?? "—"}</td>
              <td className="py-3 pr-3">
                <p className="font-semibold">{row.uploadedByTeacherName}</p>
                {row.uploadedByTeacherId ? <p className="text-xs text-muted">{row.uploadedByTeacherId.slice(0, 8)}…</p> : null}
              </td>
              <td className="py-3 pr-3">{formatDateTime(row.uploaded_at)}</td>
              <td className="py-3 pr-3">
                <WorkflowStatusBadge status={row.workflowStatus} />
              </td>
              {showApprovalColumns ? (
                <>
                  <td className="py-3 pr-3">{row.approved_by_principal_name ?? "—"}</td>
                  <td className="py-3 pr-3">{formatDateTime(row.approved_at)}</td>
                </>
              ) : null}
              <td className="py-3 pr-3">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/results/${row.id}`} variant="secondary" size="sm">
                      <Eye className="h-4 w-4" /> View
                    </ButtonLink>
                    {showPrint && row.canPrint ? (
                      <ButtonLink
                        href={`/results/print?classId=${row.class_id}&examType=${row.exam_type}${row.month ? `&month=${row.month}` : ""}`}
                        target="_blank"
                        size="sm"
                      >
                        <Printer className="h-4 w-4" /> Print
                      </ButtonLink>
                    ) : null}
                    {showPrint && !row.canPrint ? (
                      <span className="inline-flex min-h-8 items-center rounded-lg bg-surface-low px-3 text-xs font-semibold text-muted">
                        Print disabled
                      </span>
                    ) : null}
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
  );
}
