import { ClipboardCheck, Eye, Printer, UserRound } from "lucide-react";
import { ApprovalActions } from "@/app/(app)/results/_components/approval-actions";
import { ReturnApprovedResult } from "@/app/(app)/results/_components/return-approved-result";
import { WorkflowStatusBadge } from "@/app/(app)/results/_components/workflow-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { formatExamType } from "@/lib/services/marks";
import type { ResultWorkflowStatus } from "@/types/database";
import { StudentPagination } from "@/components/students/student-pagination";

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

function ResultActions({ row, showPrint, inlineApproval }: { row: ResultRow; showPrint: boolean; inlineApproval: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ButtonLink
        href={`/results/${row.id}`}
        variant="secondary"
        size="sm"
        className="h-9 w-9 rounded-xl bg-blue-50 px-0 text-primary hover:bg-blue-100"
        aria-label={`View ${row.title}`}
        
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
      {showPrint && row.canPrint ? (
        <ButtonLink
          href={`/results/print?classId=${row.class_id}&examType=${row.exam_type}${row.month ? `&month=${row.month}` : ""}`}
          target="_blank"
          size="sm"
          className="h-9 w-9 rounded-xl px-0"
          aria-label={`Print ${row.title}`}
          
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      ) : null}
      {showPrint && !row.canPrint ? (
        <span title="Printing is unavailable until all required results are approved" aria-label="Printing unavailable" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface-low text-muted">
          <Printer className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
      {row.canReturn ? <ReturnApprovedResult examId={row.id} compact /> : null}
      {inlineApproval && row.canApprove && row.approvalId ? <ApprovalActions approvalId={row.approvalId} /> : null}
    </div>
  );
}

export function ResultsTable({
  rows,
  showApprovalColumns = true,
  showPrint = false,
  inlineApproval = false,
  pagination
}: {
  rows: ResultRow[];
  showApprovalColumns?: boolean;
  showPrint?: boolean;
  inlineApproval?: boolean;
  pagination?: { count: number; page: number; pageSize: number };
}) {
  const resultCount = pagination?.count ?? rows.length;
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><ClipboardCheck className="h-5 w-5 text-primary" />Result Register</h2>
        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
      </div>
      <div className="results-table-scroll hidden overflow-x-auto lg:block">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-6 py-4">Exam Type</th>
            <th className="px-6 py-4">Subject</th>
            <th className="px-6 py-4">Class</th>
            <th className="px-6 py-4">Uploaded By</th>
            <th className="px-6 py-4">Upload Date</th>
            <th className="px-6 py-4">Status</th>
            {showApprovalColumns ? (
              <>
                <th className="px-6 py-4">Approved By</th>
              </>
            ) : null}
            <th className="px-6 py-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 transition hover:bg-blue-50/30">
              <td className="px-6 py-5">
                <p className="font-semibold text-ink">{formatExamType(row.exam_type as any)}</p><p className="mt-0.5 text-xs text-muted">{row.title}</p>
              </td>
              <td className="px-6 py-5"><span title={row.subjects?.name ?? "—"} className="inline-flex rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{row.subjects?.name ?? "—"}</span></td>
              <td className="px-6 py-5"><span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{formatClassDisplayName(row.classes?.grades?.name, row.classes?.name, row.classes?.sections?.name) || "—"}</span></td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><UserRound className="h-4 w-4" /></span><div><p className="font-semibold">{row.uploadedByTeacherName}</p><p className="text-xs text-muted">Teacher</p></div></div>
              </td>
              <td className="px-6 py-5">{formatDate(row.uploaded_at)}</td>
              <td className="px-6 py-5">
                <WorkflowStatusBadge status={row.workflowStatus} />
              </td>
              {showApprovalColumns ? (
                <>
                  <td className="px-6 py-5">{row.approved_by_principal_name ?? "—"}</td>
                </>
              ) : null}
              <td className="px-6 py-5">
                <ResultActions row={row} showPrint={showPrint} inlineApproval={inlineApproval} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {rows.map((row) => (
          <article key={row.id} className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <h4 className="font-display text-lg font-bold text-ink">{formatExamType(row.exam_type as any)}</h4>
                <p className="mt-0.5 truncate text-sm text-muted">{row.title}</p>
              </div>
              <WorkflowStatusBadge status={row.workflowStatus} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full truncate rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700">{row.subjects?.name ?? "—"}</span>
              <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">{formatClassDisplayName(row.classes?.grades?.name, row.classes?.name, row.classes?.sections?.name) || "—"}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Uploaded by</dt><dd className="mt-1 font-semibold text-slate-700">{row.uploadedByTeacherName}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Upload date</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(row.uploaded_at)}</dd></div>
              {showApprovalColumns ? <div><dt className="text-xs font-bold uppercase tracking-wide text-muted">Approved by</dt><dd className="mt-1 font-semibold text-slate-700">{row.approved_by_principal_name ?? "—"}</dd></div> : null}
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <ResultActions row={row} showPrint={showPrint} inlineApproval={inlineApproval} />
            </div>
          </article>
        ))}
      </div>
      {pagination ? <StudentPagination {...pagination} itemLabel="results" /> : null}
    </div>
  );
}
