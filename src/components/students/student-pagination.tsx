"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function StudentPagination({ count, page, pageSize }: { count: number; page: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const first = count ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, count);

  function navigate(nextPage: number, nextPageSize = pageSize) {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) params.set("page", String(nextPage)); else params.delete("page");
    if (nextPageSize !== 10) params.set("pageSize", String(nextPageSize)); else params.delete("pageSize");
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (item) => pageCount <= 5 || item === 1 || item === pageCount || Math.abs(item - page) <= 1
  );

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-3.5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>Showing {first} to {last} of {count} students</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate(page - 1)} disabled={page <= 1} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        {visiblePages.map((item, index) => (
          <span key={item} className="contents">
            {index > 0 && item - visiblePages[index - 1] > 1 ? <span className="px-1">…</span> : null}
            <button type="button" onClick={() => navigate(item)} aria-current={item === page ? "page" : undefined} className={`h-9 min-w-9 rounded-lg border px-2 font-semibold ${item === page ? "border-primary text-primary ring-1 ring-primary" : "border-slate-200 bg-white text-slate-700"}`}>{item}</button>
          </span>
        ))}
        <button type="button" onClick={() => navigate(page + 1)} disabled={page >= pageCount} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        <select value={pageSize} onChange={(event) => navigate(1, Number(event.target.value))} aria-label="Students per page" className="h-9 max-w-full rounded-lg border border-slate-200 bg-white px-2 font-semibold text-slate-700 sm:ml-2 sm:px-3">
          <option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option>
        </select>
      </div>
    </div>
  );
}
