"use client";

import type { ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

type DataTableProps = {
  ariaLabel: string;
  children: ReactNode;
  count: number;
  itemLabel: string;
  page?: number;
  pageSize?: number;
  minWidthClassName?: string;
  onPageChange?: (page: number) => void;
};

/**
 * Library table styling follows the Students List. It keeps the header,
 * row treatment, horizontal scrolling, and result footer consistent while
 * allowing each feature to own its columns and row content.
 */
export function DataTable({
  ariaLabel,
  children,
  count,
  itemLabel,
  page = 1,
  pageSize = count || 1,
  minWidthClassName = "min-w-full",
  onPageChange
}: DataTableProps) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const first = count ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, count);

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[22px] border border-blue-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4 border-b border-blue-200 px-5 py-4 sm:px-6">
        <h2 className="flex min-w-0 flex-wrap items-center gap-2 font-display text-xl font-bold text-ink"><BookOpen className="h-5 w-5 shrink-0 text-primary" />{ariaLabel}</h2>
        <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-primary">{count} {itemLabel}</span>
      </div>
      <div className="student-table-scroll overflow-x-auto">
        <table aria-label={ariaLabel} className={`w-full text-left text-sm ${minWidthClassName}`}>
          {children}
        </table>
      </div>
      <div className="flex flex-col gap-4 border-t border-blue-200 px-5 py-3.5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {first} to {last} of {count} {itemLabel}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={!onPageChange || page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1)
            .filter((item) => pageCount <= 5 || item === 1 || item === pageCount || Math.abs(item - page) <= 1)
            .map((item, index, pages) => (
              <span key={item} className="contents">
                {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1">…</span> : null}
                <button type="button" disabled={!onPageChange} onClick={() => onPageChange?.(item)} aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined} className={`h-9 min-w-9 rounded-lg border px-2 font-semibold ${item === page ? "border-primary text-primary ring-1 ring-primary" : "border-slate-200 bg-white text-slate-700"}`}>{item}</button>
              </span>
            ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={!onPageChange || page >= pageCount}
            onClick={() => onPageChange?.(page + 1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/90 font-label text-xs uppercase tracking-[0.12em] text-slate-500">{children}</thead>;
}

export function DataTableRow({ children }: { children: ReactNode }) {
  return <tr className="group border-t border-slate-100 align-middle transition hover:bg-blue-50/30">{children}</tr>;
}

export const dataTableHeaderCellClassName = "px-6 py-4";
export const dataTableCellClassName = "px-6 py-5 text-sm align-middle";
