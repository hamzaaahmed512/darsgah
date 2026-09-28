"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function StudentPagination({
  count,
  page,
  pageSize,
  itemLabel = "students",
  onPageChange,
  onPageSizeChange
}: {
  count: number;
  page: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const first = count ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, count);
  const previousPageLabel = itemLabel === "students" ? "Previous page" : `Previous ${itemLabel} page`;
  const nextPageLabel = itemLabel === "students" ? "Next page" : `Next ${itemLabel} page`;
  const perPageLabel = itemLabel === "students" ? "Students per page" : `${itemLabel} per page`;

  function pageHref(nextPage: number, nextPageSize = pageSize) {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) params.set("page", String(nextPage)); else params.delete("page");
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize)); else params.delete("pageSize");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function changePageSize(nextPageSize: number) {
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
      return;
    }
    router.replace(pageHref(1, nextPageSize));
  }

  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (item) => pageCount <= 5 || item === 1 || item === pageCount || Math.abs(item - page) <= 1
  );

  return (
    <div className="flex flex-col gap-4 border-t border-blue-200 px-5 py-3.5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>Showing {first} to {last} of {count} {itemLabel}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {page > 1
          ? onPageChange
            ? <button type="button" onClick={() => onPageChange(page - 1)} aria-label={previousPageLabel} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white transition hover:border-primary/40 hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
            : <Link replace prefetch={true} href={pageHref(page - 1)} aria-label={previousPageLabel} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white transition hover:border-primary/40 hover:text-primary"><ChevronLeft className="h-4 w-4" /></Link>
          : <span aria-label={previousPageLabel} aria-disabled="true" className="grid h-9 w-9 cursor-not-allowed place-items-center rounded-lg border border-slate-200 bg-white opacity-40"><ChevronLeft className="h-4 w-4" /></span>}
        {visiblePages.map((item, index) => (
          <span key={item} className="contents">
            {index > 0 && item - visiblePages[index - 1] > 1 ? <span className="px-1">…</span> : null}
            {item === page
              ? <span aria-current="page" className="grid h-9 min-w-9 place-items-center rounded-lg border border-primary px-2 font-semibold text-primary ring-1 ring-primary">{item}</span>
              : onPageChange
                ? <button type="button" onClick={() => onPageChange(item)} aria-label={`${itemLabel} page ${item}`} className="grid h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary">{item}</button>
                : <Link replace prefetch={true} href={pageHref(item)} aria-label={`${itemLabel} page ${item}`} className="grid h-9 min-w-9 place-items-center rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary">{item}</Link>}
          </span>
        ))}
        {page < pageCount
          ? onPageChange
            ? <button type="button" onClick={() => onPageChange(page + 1)} aria-label={nextPageLabel} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white transition hover:border-primary/40 hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
            : <Link replace prefetch={true} href={pageHref(page + 1)} aria-label={nextPageLabel} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white transition hover:border-primary/40 hover:text-primary"><ChevronRight className="h-4 w-4" /></Link>
          : <span aria-label={nextPageLabel} aria-disabled="true" className="grid h-9 w-9 cursor-not-allowed place-items-center rounded-lg border border-slate-200 bg-white opacity-40"><ChevronRight className="h-4 w-4" /></span>}
        <select value={pageSize} onChange={(event) => changePageSize(Number(event.target.value))} aria-label={perPageLabel} className="h-9 max-w-full rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700 sm:ml-2 sm:px-3">
          <option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
        </select>
      </div>
    </div>
  );
}
