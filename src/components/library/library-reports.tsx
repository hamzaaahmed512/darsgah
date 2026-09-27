"use client";

import { requestDownload } from "@/components/reports/DownloadActionModal";
import React, { useState, useMemo, useId } from "react";
import {
  Download,
  ChevronDown,
  RotateCcw,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableHeader, DataTableRow, dataTableCellClassName, dataTableHeaderCellClassName } from "@/components/library/library-table";
import type { LibraryData, LibraryBook, LibraryCopy } from "@/lib/services/library";
import { DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import { libraryToday } from "@/lib/validation/library";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

type LibraryReportsProps = {
  data: LibraryData;
  onNavigateTab: (tab: string, targetId?: string) => void;
  formatMoney: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  overdueDays: (dueDateStr: string) => number;
};

export function LibraryReports({
  data,
  onNavigateTab,
  formatMoney,
  formatDate,
  overdueDays
}: LibraryReportsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();

  // Filter States
  const [dateRangePreset, setDateRangePreset] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedBorrowerType, setSelectedBorrowerType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLoanStatus, setSelectedLoanStatus] = useState<string>("all");

  // Derive today string in local PK time
  const todayStr = libraryToday();

  // Compute unique categories from books
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.books.forEach(b => {
      if (b.category && b.category.trim()) set.add(b.category.trim());
    });
    return Array.from(set).sort();
  }, [data.books]);

  // Restrict report options to school grade labels, excluding malformed name records.
  const reportGrades = useMemo(() => data.grades.flatMap(grade => {
    const name = grade.name.trim();
    const number = name.match(/^(?:grade\s*)?(1[0-2]|[1-9])$/i)?.[1];
    const label = number ? `Grade ${number}` : DEFAULT_GRADE_NAMES.find(item => item.toLowerCase() === name.toLowerCase());
    return label ? [{ ...grade, name: label }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [data.grades]);

  // Lookup maps for fast lookup
  const booksMap = useMemo(() => new Map<string, LibraryBook>(data.books.map(b => [b.id, b])), [data.books]);
  const copiesMap = useMemo(() => new Map<string, LibraryCopy>(data.copies.map(c => [c.id, c])), [data.copies]);
  const gradeMap = useMemo(() => new Map<string, string>(data.grades.map(g => [g.id, g.name])), [data.grades]);
  const sectionMap = useMemo(() => new Map<string, string>(data.sections.map(s => [s.id, s.name])), [data.sections]);

  // Reset all filters
  const handleResetFilters = () => {
    setDateRangePreset("all");
    setCustomFrom("");
    setCustomTo("");
    setSelectedGrade("all");
    setSelectedSection("all");
    setSelectedBorrowerType("all");
    setSelectedCategory("all");
    setSelectedLoanStatus("all");
  };

  // Evaluate date range bounds
  const { dateStart, dateEnd } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (dateRangePreset === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRangePreset === "this_week") {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      end = new Date();
    } else if (dateRangePreset === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date();
    } else if (dateRangePreset === "this_year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    } else if (dateRangePreset === "custom") {
      if (customFrom) start = new Date(`${customFrom}T00:00:00`);
      if (customTo) end = new Date(`${customTo}T23:59:59.999`);
    }

    return { dateStart: start, dateEnd: end };
  }, [dateRangePreset, customFrom, customTo]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return data.loans.filter(loan => {
      // Date filter (issued_at or returned_at)
      if (dateStart || dateEnd) {
        const issuedTime = new Date(loan.issued_at).getTime();
        const returnedTime = loan.returned_at ? new Date(loan.returned_at).getTime() : null;
        const inRange = (time: number) => (!dateStart || time >= dateStart.getTime()) && (!dateEnd || time <= dateEnd.getTime());
        const matchesDate = inRange(issuedTime) || (returnedTime !== null && inRange(returnedTime));
        if (!matchesDate) return false;
      }

      // Borrower Type filter
      if (selectedBorrowerType !== "all" && loan.borrower_kind !== selectedBorrowerType) {
        return false;
      }

      // Grade filter
      if (selectedGrade !== "all") {
        if (loan.borrower_kind !== "student") return false;
        if (loan.student_grade_id && loan.student_grade_id !== selectedGrade) return false;
        if (!loan.student_grade_id && loan.student_grade_name) {
          const selectedGradeName = gradeMap.get(selectedGrade);
          if (selectedGradeName && !loan.student_grade_name.toLowerCase().includes(selectedGradeName.toLowerCase())) return false;
        }
      }

      // Section filter
      if (selectedSection !== "all") {
        if (loan.borrower_kind !== "student") return false;
        if (loan.student_section_id && loan.student_section_id !== selectedSection) return false;
        if (!loan.student_section_id && loan.student_section_name) {
          const selectedSecName = sectionMap.get(selectedSection);
          if (selectedSecName && loan.student_section_name !== selectedSecName) return false;
        }
      }

      // Category filter
      if (selectedCategory !== "all") {
        const copy = copiesMap.get(loan.copy_id);
        const book = copy ? booksMap.get(copy.book_id) : null;
        const category = loan.book_category || book?.category || "";
        if (category !== selectedCategory) return false;
      }

      // Loan Status filter
      if (selectedLoanStatus === "active") {
        if (loan.returned_at !== null) return false;
      } else if (selectedLoanStatus === "overdue") {
        if (loan.returned_at !== null || loan.due_date >= todayStr) return false;
      } else if (selectedLoanStatus === "returned") {
        if (loan.returned_at === null) return false;
      }

      return true;
    });
  }, [data.loans, dateStart, dateEnd, selectedBorrowerType, selectedGrade, selectedSection, selectedCategory, selectedLoanStatus, copiesMap, booksMap, gradeMap, sectionMap, todayStr]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return data.reservations.filter(res => {
      // Date filter
      if (dateStart || dateEnd) {
        const createdTime = new Date(res.created_at).getTime();
        if (dateStart && createdTime < dateStart.getTime()) return false;
        if (dateEnd && createdTime > dateEnd.getTime()) return false;
      }

      // Borrower Type
      if (selectedBorrowerType !== "all" && res.borrower_kind !== selectedBorrowerType) return false;

      // Grade Filter
      if (selectedGrade !== "all") {
        if (res.borrower_kind !== "student") return false;
        const selectedGradeName = gradeMap.get(selectedGrade);
        if (selectedGradeName && res.grade_name && !res.grade_name.toLowerCase().includes(selectedGradeName.toLowerCase())) return false;
      }

      // Section Filter
      if (selectedSection !== "all") {
        if (res.borrower_kind !== "student") return false;
        const selectedSecName = sectionMap.get(selectedSection);
        if (selectedSecName && res.section_name && res.section_name !== selectedSecName) return false;
      }

      // Category Filter
      if (selectedCategory !== "all") {
        const book = booksMap.get(res.book_id);
        if (book && book.category !== selectedCategory) return false;
      }

      return true;
    });
  }, [data.reservations, dateStart, dateEnd, selectedBorrowerType, selectedGrade, selectedSection, selectedCategory, booksMap, gradeMap, sectionMap]);

  // ══════════════════════════════════════════════════════════════════════════
  // FINES SUMMARY CALCULATIONS
  // ══════════════════════════════════════════════════════════════════════════
  const finesSummary = useMemo(() => {
    let estimatedOverdueFines = 0;
    let collected = 0;
    let waived = 0;
    let balance = 0;

    data.loans.forEach(l => {
      collected += l.paid_amount || 0;
      waived += l.waived_amount || 0;
      const bal = Math.max(0, (l.fine_amount || 0) - (l.paid_amount || 0) - (l.waived_amount || 0));
      balance += bal;

      if (l.returned_at === null && l.due_date < todayStr) {
        const days = overdueDays(l.due_date);
        estimatedOverdueFines += days * (l.fine_per_day || data.settings.fine_per_day || 0);
      }
    });

    const lostDamagedReplacementCost = data.copies.reduce((sum, c) => {
      if ((c.status === "lost" || c.status === "damaged") && c.replacement_cost != null) {
        return sum + c.replacement_cost;
      }
      return sum;
    }, 0);

    return { estimatedOverdueFines, collected, waived, balance, lostDamagedReplacementCost };
  }, [data.loans, data.copies, data.settings.fine_per_day, todayStr, overdueDays]);

  // ══════════════════════════════════════════════════════════════════════════
  // CSV EXPORT GENERATOR HELPERS
  // ══════════════════════════════════════════════════════════════════════════
  const exportCsv = (rows: string[][], filename: string) => {
    const content = rows
      .map(row => row.map(cell => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    requestDownload({ title: filename.replace(/[-_]/g, " ").replace(/\.csv$/, ""), filename,
      generate: async () => ({ blob: new Blob([content], { type: "text/csv;charset=utf-8" }), filename }) });
  };

  const exportInventoryReport = () => {
    const rows = [
      ["Copy ID", "Title", "Author", "ISBN", "Shelf", "Category", "Copy Status", "Replacement Cost"],
      ...data.copies.map(copy => {
        const book = booksMap.get(copy.book_id);
        return [
          copy.accession,
          book?.title || "",
          book?.author || "",
          book?.isbn || "",
          book?.shelf || "",
          book?.category || "",
          copy.status,
          copy.replacement_cost != null ? String(copy.replacement_cost) : "Unspecified"
        ];
      })
    ];
    exportCsv(rows, "library-inventory-report.csv");
  };

  const exportLoanHistoryReport = () => {
    const rows = [
      ["Borrower Name", "Borrower Type", "Grade", "Section", "Registration / Staff ID", "Copy ID", "Title", "Issue Date", "Due Date", "Returned Date", "Loan Status", "Fine", "Paid", "Waived", "Balance"],
      ...filteredLoans.map(loan => {
        const copy = copiesMap.get(loan.copy_id);
        const book = booksMap.get(copy?.book_id || loan.book_id || "");
        const bal = Math.max(0, loan.fine_amount - loan.paid_amount - loan.waived_amount);
        return [
          loan.borrower_name,
          loan.borrower_kind,
          loan.student_grade_name || "",
          loan.student_section_name || "",
          loan.borrower_kind === "student" ? (loan.student_registration_number || "") : (loan.staff_id || ""),
          copy?.accession || loan.accession || "",
          book?.title || loan.book_title || "",
          formatDate(loan.issued_at),
          loan.due_date,
          loan.returned_at ? formatDate(loan.returned_at) : "",
          loan.outcome || (loan.returned_at ? "returned" : (loan.due_date < todayStr ? "overdue" : "active")),
          String(loan.fine_amount),
          String(loan.paid_amount),
          String(loan.waived_amount),
          String(bal)
        ];
      })
    ];
    exportCsv(rows, "library-loan-history-report.csv");
  };

  const exportOverdueReport = () => {
    const rows = [
      ["Borrower Name", "Borrower Type", "Grade/Section / Staff ID", "Copy ID", "Title", "Due Date", "Days Overdue", "Estimated Fine"],
      ...filteredLoans.filter(l => l.returned_at === null && l.due_date < todayStr).map(loan => {
        const copy = copiesMap.get(loan.copy_id);
        const book = booksMap.get(copy?.book_id || loan.book_id || "");
        const days = overdueDays(loan.due_date);
        const estFine = days * (loan.fine_per_day || data.settings.fine_per_day || 0);
        return [
          loan.borrower_name,
          loan.borrower_kind,
          loan.borrower_kind === "student" ? `${loan.student_grade_name || ""} ${loan.student_section_name || ""}` : (loan.staff_id || ""),
          copy?.accession || loan.accession || "",
          book?.title || loan.book_title || "",
          loan.due_date,
          String(days),
          String(estFine)
        ];
      })
    ];
    exportCsv(rows, "library-overdue-report.csv");
  };

  const exportReservationsReport = () => {
    const rows = [
      ["Book Title", "Queue Position", "Borrower Name", "Borrower Type", "Grade / Section / Staff ID", "Reservation Date", "Available Copies", "Status"],
      ...filteredReservations.map(res => [
        res.book_title || booksMap.get(res.book_id)?.title || "",
        res.queue_position ? `#${res.queue_position}` : "N/A",
        res.borrower_name,
        res.borrower_kind,
        res.borrower_kind === "student" ? `Grade ${res.grade_name || "N/A"} Sec ${res.section_name || "N/A"}` : (res.job_title || "Staff"),
        formatDate(res.created_at),
        String(res.available_copies ?? 0),
        res.is_ready_to_issue ? "Ready to issue" : "Waiting for a return"
      ])
    ];
    exportCsv(rows, "library-reservations-report.csv");
  };

  const exportFinesReport = () => {
    const rows = [
      ["Borrower Name", "Borrower Type", "Copy ID", "Title", "Fine Amount", "Paid Amount", "Waived Amount", "Outstanding Balance"],
      ...data.loans.filter(l => (l.fine_amount || 0) > 0 || (l.paid_amount || 0) > 0 || (l.waived_amount || 0) > 0).map(l => {
        const copy = copiesMap.get(l.copy_id);
        const book = booksMap.get(copy?.book_id || l.book_id || "");
        const bal = Math.max(0, l.fine_amount - l.paid_amount - l.waived_amount);
        return [
          l.borrower_name,
          l.borrower_kind,
          copy?.accession || l.accession || "",
          book?.title || l.book_title || "",
          String(l.fine_amount),
          String(l.paid_amount),
          String(l.waived_amount),
          String(bal)
        ];
      })
    ];
    exportCsv(rows, "library-fines-report.csv");
  };

  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════════════════════
          1. REPORTS HEADER & FILTER TOOLBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Library reports
            </h2>
            <p className="text-xs text-muted">
              Current totals and detailed library records.
            </p>
          </div>
          <details className="relative shrink-0" onKeyDown={event => {
            if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
          }} onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
          }}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              <Download className="h-4 w-4" /> Export Report <ChevronDown className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-outline bg-white p-1.5 shadow-lg">
              {[
                { label: "Inventory", action: exportInventoryReport },
                { label: "Loan History", action: exportLoanHistoryReport },
                { label: "Overdue Loans", action: exportOverdueReport },
                { label: "Reservations", action: exportReservationsReport },
                { label: "Fines", action: exportFinesReport }
              ].map(({ label, action }) => (
                <button key={label} type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-slate-100 focus-visible:bg-slate-100"
                  onClick={event => {
                    action();
                    const menu = event.currentTarget.closest("details");
                    if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); }
                  }}>{label}</button>
              ))}
            </div>
          </details>
        </div>

        <div>
          <button
            type="button"
            tabIndex={0}
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen(open => !open)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!event.repeat) setFiltersOpen(open => !open);
              }
            }}
            className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>Filter reports</span>
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          <div id={filtersId} hidden={!filtersOpen} className="pt-2">
        <Button type="button" variant="secondary" onClick={event => { event.stopPropagation(); handleResetFilters(); }} className="my-2 text-xs font-semibold">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset filters
        </Button>
        <p className="my-2 text-xs text-muted">Date, borrower, category, and status filters apply to the displayed loan and reservation reports.</p>
        {/* Filter Toolbar Controls */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {/* Date Range Preset */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Date Range</label>
            <select
              aria-label="Filter by date range"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={dateRangePreset}
              onChange={e => setDateRangePreset(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
              <option value="this_year">This year</option>
              <option value="custom">Custom range…</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Grade</label>
            <select
              aria-label="Filter by grade"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
            >
              <option value="all">All grades</option>
              {reportGrades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Section</label>
            <select
              aria-label="Filter by section"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
            >
              <option value="all">All sections</option>
              {data.sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Borrower Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Borrower Type</label>
            <select
              aria-label="Filter by borrower type"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={selectedBorrowerType}
              onChange={e => setSelectedBorrowerType(e.target.value)}
            >
              <option value="all">All borrowers</option>
              <option value="student">Students only</option>
              <option value="staff">Staff only</option>
            </select>
          </div>

          {/* Book Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Category</label>
            <select
              aria-label="Filter by category"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Loan Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Loan Status</label>
            <select
              aria-label="Filter by loan status"
              className="w-full rounded-xl border border-outline/70 bg-white px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
              value={selectedLoanStatus}
              onChange={e => setSelectedLoanStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active loans</option>
              <option value="overdue">Overdue</option>
              <option value="returned">Returned / closed</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {dateRangePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">From:</span>
              <input
                type="date"
                aria-label="Filter from date"
                className="rounded-xl border border-outline/70 bg-white px-3 py-1.5 text-xs font-medium text-ink focus:border-primary focus:outline-none"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To:</span>
              <input
                type="date"
                aria-label="Filter to date"
                className="rounded-xl border border-outline/70 bg-white px-3 py-1.5 text-xs font-medium text-ink focus:border-primary focus:outline-none"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. OVERDUE & RESERVATIONS FOCUSED LISTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Loans List */}
        <Panel title={`Overdue Loans (${filteredLoans.filter(l => l.returned_at === null && l.due_date < todayStr).length})`}>
          {(() => {
            const overdueLoans = filteredLoans.filter(loan => loan.returned_at === null && loan.due_date < todayStr);
            return <DataTable ariaLabel="Overdue library loans" count={overdueLoans.length} itemLabel="loans" minWidthClassName="min-w-[620px]">
              <DataTableHeader><tr>
                <th className={dataTableHeaderCellClassName}>Borrower</th>
                <th className={dataTableHeaderCellClassName}>Book / copy</th>
                <th className={dataTableHeaderCellClassName}>Due</th>
                <th className={dataTableHeaderCellClassName}>Fine</th>
                <th className={`${dataTableHeaderCellClassName} sticky right-0 bg-slate-50 text-right`}>Actions</th>
              </tr></DataTableHeader>
              <tbody>
            {overdueLoans.map(loan => {
              const copy = copiesMap.get(loan.copy_id);
              const book = booksMap.get(copy?.book_id || loan.book_id || "");
              const days = overdueDays(loan.due_date);
              const estFine = days * (loan.fine_per_day || data.settings.fine_per_day || 0);

              return (
                <DataTableRow key={loan.id}>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{loan.borrower_name}</p><p className="text-xs capitalize text-muted">{loan.borrower_kind}</p></td>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{book?.title || loan.book_title || "Book"}</p><p className="text-xs text-muted">Copy {copy?.accession || loan.accession || "N/A"}</p></td>
                  <td className={`${dataTableCellClassName} font-semibold text-red-700`}>{loan.due_date}<p className="text-xs font-normal">{days} days overdue</p></td>
                  <td className={dataTableCellClassName}>{formatMoney(estFine)}</td>
                  <td className={`${dataTableCellClassName} sticky right-0 bg-white group-hover:bg-blue-50 text-right`}><Button
                    type="button"
                    variant="secondary"
                    onClick={() => onNavigateTab("Issue & return")}
                    className="h-9 min-h-9 text-xs border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Manage
                  </Button></td>
                </DataTableRow>
              );
            })}
              </tbody>
            </DataTable>;
          })()}
        </Panel>

        {/* Waiting Reservations List */}
        <Panel title={`Waiting Reservations (${filteredReservations.length})`}>
          <DataTable ariaLabel="Library report reservations" count={filteredReservations.length} itemLabel="reservations" minWidthClassName="min-w-[620px]">
            <DataTableHeader><tr>
              <th className={dataTableHeaderCellClassName}>Book</th>
              <th className={dataTableHeaderCellClassName}>Borrower</th>
              <th className={dataTableHeaderCellClassName}>Queue</th>
              <th className={dataTableHeaderCellClassName}>Status</th>
              <th className={`${dataTableHeaderCellClassName} sticky right-0 bg-slate-50 text-right`}>Actions</th>
            </tr></DataTableHeader>
            <tbody>
            {filteredReservations.map(res => {
              const bookTitle = res.book_title || booksMap.get(res.book_id)?.title || "Book";
              return (
                <DataTableRow key={res.id}>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{bookTitle}</p><p className="text-xs text-muted">Reserved {formatDate(res.created_at)}</p></td>
                  <td className={dataTableCellClassName}><p className="font-semibold text-ink">{res.borrower_name}</p><p className="text-xs capitalize text-muted">{res.borrower_kind}</p></td>
                  <td className={dataTableCellClassName}>#{res.queue_position || 1}</td>
                  <td className={dataTableCellClassName}>{res.is_ready_to_issue ? <span className="font-semibold text-emerald-600">Ready to issue</span> : <span className="font-semibold text-amber-600">Waiting for return</span>}</td>
                  <td className={`${dataTableCellClassName} sticky right-0 bg-white group-hover:bg-blue-50 text-right`}><Button
                    type="button"
                    variant="secondary"
                    onClick={() => onNavigateTab(res.is_ready_to_issue ? "Issue & return" : "Reservations")}
                    className="h-9 min-h-9 text-xs"
                  >
                    {res.is_ready_to_issue ? "Fulfil" : "View queue"}
                  </Button></td>
                </DataTableRow>
              );
            })}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          6. FINES SUMMARY
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel title="Fines summary">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Est. Overdue Fines</p>
            <p className="text-lg font-bold text-amber-700">{formatMoney(finesSummary.estimatedOverdueFines)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Collected Fines</p>
            <p className="text-lg font-bold text-emerald-700">{formatMoney(finesSummary.collected)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Waived Fines</p>
            <p className="text-lg font-bold text-slate-700">{formatMoney(finesSummary.waived)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Outstanding Balance</p>
            <p className="text-lg font-bold text-rose-700">{formatMoney(finesSummary.balance)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Lost/Damaged Replace Value</p>
            <p className="text-lg font-bold text-ink">{formatMoney(finesSummary.lostDamagedReplacementCost)}</p>
          </div>
        </div>
        <p className="text-xs text-muted italic">
          Note: Fine payments and waivers are library internal records. They are managed independently and are not automatically posted to the general school finance ledger.
        </p>
      </Panel>

    </div>
  );
}
