import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 * The shared table frame used by application data views. It keeps the header,
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
    <div className="min-w-0 overflow-hidden rounded-[22px] border border-outline/65 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table aria-label={ariaLabel} className={`w-full text-left text-sm ${minWidthClassName}`}>
          {children}
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-outline/60 px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Showing {first} to {last} of {count} {itemLabel}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={!onPageChange || page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-outline/70 bg-white text-ink transition hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-16 text-center text-xs font-semibold text-ink">Page {page} of {pageCount}</span>
          <button
            type="button"
            aria-label="Next page"
            disabled={!onPageChange || page >= pageCount}
            onClick={() => onPageChange?.(page + 1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-outline/70 bg-white text-ink transition hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-low font-label text-xs font-semibold uppercase tracking-wide text-muted">{children}</thead>;
}

export function DataTableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-outline/60 align-middle transition hover:bg-surface-low/70">{children}</tr>;
}

export const dataTableHeaderCellClassName = "px-4 py-3 text-xs font-semibold uppercase text-muted";
export const dataTableCellClassName = "px-4 py-4 text-sm align-middle";
