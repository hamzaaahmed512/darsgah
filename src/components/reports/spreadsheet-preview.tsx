"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpDown, Download, FileSpreadsheet, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  rowsToCsv,
  SPREADSHEET_PREVIEW_MESSAGE,
  SPREADSHEET_PREVIEW_READY_MESSAGE,
  type SpreadsheetPreviewPayload
} from "@/lib/spreadsheet-preview";

const PAGE_SIZE = 250;
const currencyColumn = /(amount|balance|fee|fine|salary|cost|price|paid|waived|revenue|expense|total)/i;
const dateColumn = /(date|created|updated|generated|issued|returned|due|month)/i;

function comparable(value: string) {
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  if (value.trim() && Number.isFinite(numeric)) return { kind: "number", value: numeric } as const;
  const date = Date.parse(value);
  if (value.trim() && Number.isFinite(date)) return { kind: "number", value: date } as const;
  return { kind: "text", value: value.toLocaleLowerCase() } as const;
}

function displayCell(value: string, heading: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (currencyColumn.test(heading) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2
    }).format(Number(trimmed));
  }

  if (dateColumn.test(heading) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(trimmed)) {
    const parsed = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00` : trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
    }
  }

  return value;
}

export function SpreadsheetPreview() {
  const [payload, setPayload] = useState<SpreadsheetPreviewPayload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sheetIndex, setSheetIndex] = useState(0);
  const [sort, setSort] = useState<{ column: number; direction: "asc" | "desc" } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previewId = new URLSearchParams(window.location.search).get("preview");
    const source = window.opener;
    if (!previewId || !source) {
      setError("This preview link has expired. Return to the report and open it again.");
      return;
    }

    let received = false;
    const announceReady = () => source.postMessage({ type: SPREADSHEET_PREVIEW_READY_MESSAGE, previewId }, window.location.origin);
    const interval = window.setInterval(announceReady, 500);
    const timeout = window.setTimeout(() => {
      if (!received) setError("The spreadsheet took too long to arrive. Return to the report and try again.");
    }, 60_000);

    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== source) return;
      if (event.data?.type !== SPREADSHEET_PREVIEW_MESSAGE || event.data.previewId !== previewId) return;
      received = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      setPayload(event.data.payload as SpreadsheetPreviewPayload);
      window.history.replaceState(null, "", window.location.pathname);
      window.opener = null;
    }

    window.addEventListener("message", receive);
    announceReady();
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, []);

  const sheet = payload?.sheets[sheetIndex];
  const headers = useMemo(() => {
    if (!sheet?.rows.length) return [];
    const width = Math.max(...sheet.rows.map((row) => row.length));
    return Array.from({ length: width }, (_, index) => sheet.rows[0]?.[index]?.trim() || `Column ${index + 1}`);
  }, [sheet]);

  const rows = useMemo(() => {
    if (!sheet) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = sheet.rows.slice(1).map((cells, sourceIndex) => ({ cells, sourceIndex })).filter(({ cells }) =>
      !normalizedQuery || cells.some((cell) => cell.toLocaleLowerCase().includes(normalizedQuery))
    );

    if (!sort) return filtered;
    return [...filtered].sort((left, right) => {
      const a = comparable(left.cells[sort.column] ?? "");
      const b = comparable(right.cells[sort.column] ?? "");
      const result = a.kind === "number" && b.kind === "number"
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [query, sheet, sort]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query, sheetIndex, sort]);

  useEffect(() => {
    const target = loadMore.current;
    if (!target || visibleCount >= rows.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((count) => Math.min(count + PAGE_SIZE, rows.length));
    }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [rows.length, visibleCount]);

  function changeSort(column: number) {
    setSort((current) => current?.column === column
      ? current.direction === "asc" ? { column, direction: "desc" } : null
      : { column, direction: "asc" });
  }

  function downloadCsv() {
    if (!sheet || !payload) return;
    const blob = new Blob(["\uFEFF", rowsToCsv(sheet.rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = payload.filename.toLowerCase().endsWith(".csv") ? payload.filename : `${sheet.name}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function printAllRows() {
    setVisibleCount(rows.length);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  function goBack() {
    window.close();
    window.setTimeout(() => window.history.back(), 50);
  }

  if (!payload) {
    return <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-ink">{error ? "Preview unavailable" : "Preparing spreadsheet"}</h1>
        <p role={error ? "alert" : "status"} className="mt-2 text-sm text-muted">{error || "Formatting rows and columns for preview…"}</p>
        {error && <Button className="mt-5" variant="secondary" onClick={goBack}><ArrowLeft className="h-4 w-4" />Go back</Button>}
      </div>
    </div>;
  }

  return <div className="mx-auto w-full max-w-[1600px] space-y-4 print:max-w-none print:space-y-2">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 print:hidden" aria-label="Back to report"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Spreadsheet preview</p>
            <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{payload.title}</h1>
            <p className="mt-1 text-xs text-muted">{rows.length.toLocaleString()} rows · {headers.length.toLocaleString()} columns · Data remains in this browser</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="secondary" onClick={downloadCsv}><Download className="h-4 w-4" />Download CSV</Button>
          <Button type="button" variant="secondary" onClick={printAllRows}><Printer className="h-4 w-4" />Print</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <label className="relative block w-full sm:max-w-md">
          <span className="sr-only">Search spreadsheet</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every column…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10" />
        </label>
        {payload.sheets.length > 1 && <div className="flex max-w-full gap-2 overflow-x-auto">
          {payload.sheets.map((item, index) => <button key={item.name} type="button" onClick={() => setSheetIndex(index)} className={cn("shrink-0 rounded-lg px-3 py-2 text-xs font-bold", index === sheetIndex ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{item.name}</button>)}
        </div>}
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-slate-300 print:shadow-none">
      <div className="max-h-[calc(100dvh-16rem)] overflow-auto print:max-h-none print:overflow-visible">
        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20 bg-slate-100 print:static">
            <tr>
              <th className="sticky left-0 z-30 w-14 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-center text-xs font-bold text-slate-500 print:static">#</th>
              {headers.map((heading, column) => <th key={`${heading}-${column}`} className="min-w-40 border-b border-r border-slate-200 bg-slate-100 p-0 text-xs font-bold uppercase tracking-wide text-slate-600">
                <button type="button" onClick={() => changeSort(column)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-200/70 print:pointer-events-none">
                  <span>{heading}</span><ArrowUpDown className={cn("h-3.5 w-3.5 shrink-0 print:hidden", sort?.column === column ? "text-primary" : "text-slate-400")} />
                </button>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visibleCount).map(({ cells, sourceIndex }) => <tr key={sourceIndex} className="group even:bg-slate-50/60 hover:bg-blue-50/60">
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-400 group-even:bg-slate-50 group-hover:bg-blue-50 print:static">{sourceIndex + 1}</th>
              {headers.map((heading, column) => {
                const value = cells[column] ?? "";
                const formatted = displayCell(value, heading);
                return <td key={column} title={value || "Empty cell"} className={cn("max-w-[28rem] border-b border-r border-slate-200 px-4 py-3 align-top text-slate-700", !formatted && "bg-amber-50/70 text-amber-700")}>
                  <span className="block whitespace-pre-wrap break-words">{formatted ?? <span className="italic">—</span>}</span>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
        {!rows.length && <div className="p-12 text-center text-sm text-muted">No rows match your search.</div>}
        <div ref={loadMore} className="h-px" aria-hidden="true" />
      </div>
      {visibleCount < rows.length && <div className="border-t border-slate-200 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500 print:hidden">Showing {visibleCount.toLocaleString()} of {rows.length.toLocaleString()} rows. More rows load as you scroll.</div>}
    </div>
  </div>;
}
