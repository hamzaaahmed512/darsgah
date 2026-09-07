"use client";

import React, { useState, useMemo } from "react";
import {
  Download,
  RotateCcw,
  BookCopy,
  BookOpen,
  Clock,
  AlertTriangle,
  Coins,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LibraryData, LibraryBook, LibraryCopy } from "@/lib/services/library";
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
  canManage: boolean;
  canAdmin: boolean;
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
  const [report, setReport] = useState("Overview");
  // Filter States
  const [dateRangePreset, setDateRangePreset] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedBorrowerType, setSelectedBorrowerType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLoanStatus, setSelectedLoanStatus] = useState<string>("all");

  // Activity Log State
  const [activityActionFilter, setActivityActionFilter] = useState<string>("all");
  const [activityQuery, setActivityQuery] = useState<string>("");
  const [activityPage, setActivityPage] = useState<number>(1);
  const ACTIVITY_PER_PAGE = 10;

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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return data.events.filter(event => {
      // Date filter
      if (dateStart || dateEnd) {
        const eventTime = new Date(event.created_at).getTime();
        if (dateStart && eventTime < dateStart.getTime()) return false;
        if (dateEnd && eventTime > dateEnd.getTime()) return false;
      }

      // Action Filter
      if (activityActionFilter !== "all") {
        if (!event.action.toLowerCase().includes(activityActionFilter.toLowerCase())) return false;
      }

      // Search Query Filter
      if (activityQuery.trim()) {
        const q = activityQuery.toLowerCase();
        const actionStr = event.action.replaceAll("_", " ").toLowerCase();
        const titleStr = (event.details.title || "").toLowerCase();
        const accessionStr = (event.details.accession || "").toLowerCase();
        const reasonStr = (event.details.reason || "").toLowerCase();
        const borrowerStr = (event.details.borrower || event.details.borrower_name || "").toLowerCase();
        if (
          !actionStr.includes(q) &&
          !titleStr.includes(q) &&
          !accessionStr.includes(q) &&
          !reasonStr.includes(q) &&
          !borrowerStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data.events, dateStart, dateEnd, activityActionFilter, activityQuery]);

  // Paginated Activity Log
  const totalActivityPages = Math.max(1, Math.ceil(filteredEvents.length / ACTIVITY_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const startIdx = (activityPage - 1) * ACTIVITY_PER_PAGE;
    return filteredEvents.slice(startIdx, startIdx + ACTIVITY_PER_PAGE);
  }, [filteredEvents, activityPage]);

  // ══════════════════════════════════════════════════════════════════════════
  // KPI CALCULATIONS (Using complete system data for absolute health KPIs)
  // ══════════════════════════════════════════════════════════════════════════
  const activeBooks = useMemo(() => data.books.filter(b => !b.archived), [data.books]);
  const activeCopies = useMemo(() => data.copies.filter(c => c.status !== "withdrawn"), [data.copies]);
  const availableCopies = useMemo(() => data.copies.filter(c => c.status === "available"), [data.copies]);
  const activeLoans = useMemo(() => data.loans.filter(l => l.returned_at === null), [data.loans]);
  const overdueLoans = useMemo(() => data.loans.filter(l => l.returned_at === null && l.due_date < todayStr), [data.loans, todayStr]);
  const waitingReservations = useMemo(() => data.reservations.filter(r => r.status === "waiting"), [data.reservations]);
  const lostOrDamagedCopies = useMemo(() => data.copies.filter(c => c.status === "lost" || c.status === "damaged"), [data.copies]);

  const totalOutstandingFines = useMemo(() => {
    return data.loans.reduce((sum, loan) => {
      const bal = Math.max(0, loan.fine_amount - loan.paid_amount - loan.waived_amount);
      return sum + bal;
    }, 0);
  }, [data.loans]);

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTORY HEALTH CALCULATIONS
  // ══════════════════════════════════════════════════════════════════════════
  const copyStatusCounts = useMemo(() => {
    let available = 0, onLoan = 0, damaged = 0, lost = 0, withdrawn = 0;
    data.copies.forEach(c => {
      if (c.status === "available") available++;
      else if (c.status === "on_loan") onLoan++;
      else if (c.status === "damaged") damaged++;
      else if (c.status === "lost") lost++;
      else if (c.status === "withdrawn") withdrawn++;
    });
    return { available, onLoan, damaged, lost, withdrawn, total: data.copies.length };
  }, [data.copies]);

  // Low Availability / Most Requested Titles
  const lowAvailabilityTitles = useMemo(() => {
    return activeBooks.map(book => {
      const bookCopies = data.copies.filter(c => c.book_id === book.id && c.status !== "withdrawn");
      const available = bookCopies.filter(c => c.status === "available").length;
      const onLoan = bookCopies.filter(c => c.status === "on_loan").length;
      const waiting = data.reservations.filter(r => r.book_id === book.id && r.status === "waiting").length;
      return {
        book,
        totalCopies: bookCopies.length,
        available,
        onLoan,
        waiting,
        isLow: available === 0 || waiting > 0
      };
    }).filter(item => item.isLow)
      .sort((a, b) => b.waiting - a.waiting || a.available - b.available);
  }, [activeBooks, data.copies, data.reservations]);

  // ══════════════════════════════════════════════════════════════════════════
  // CIRCULATION INSIGHTS (Respecting active date range & filters)
  // ══════════════════════════════════════════════════════════════════════════
  const periodStats = useMemo(() => {
    let issues = 0, returns = 0, renewals = 0, totalDurationDays = 0, durationCount = 0;

    filteredLoans.forEach(loan => {
      if (dateStart || dateEnd) {
        const issuedTime = new Date(loan.issued_at).getTime();
        const returnedTime = loan.returned_at ? new Date(loan.returned_at).getTime() : null;
        if (dateStart && issuedTime >= dateStart.getTime() && (!dateEnd || issuedTime <= dateEnd.getTime())) {
          issues++;
        }
        if (returnedTime && dateStart && returnedTime >= dateStart.getTime() && (!dateEnd || returnedTime <= dateEnd.getTime())) {
          returns++;
        }
      } else {
        issues++;
        if (loan.returned_at) returns++;
      }

      renewals += loan.renewals || 0;

      if (loan.returned_at) {
        const startMs = new Date(loan.issued_at).getTime();
        const endMs = new Date(loan.returned_at).getTime();
        const diffDays = Math.max(0, (endMs - startMs) / (1000 * 60 * 60 * 24));
        totalDurationDays += diffDays;
        durationCount++;
      }
    });

    const avgDuration = durationCount > 0 ? (totalDurationDays / durationCount).toFixed(1) : "N/A";
    return { issues, returns, renewals, avgDuration };
  }, [filteredLoans, dateStart, dateEnd]);

  // Most Borrowed Titles in Filtered Set
  const mostBorrowedTitles = useMemo(() => {
    const countMap = new Map<string, number>();
    filteredLoans.forEach(l => {
      const copy = copiesMap.get(l.copy_id);
      const bookId = l.book_id || copy?.book_id;
      if (bookId) {
        countMap.set(bookId, (countMap.get(bookId) || 0) + 1);
      }
    });

    return Array.from(countMap.entries())
      .map(([bookId, count]) => {
        const book = booksMap.get(bookId);
        const bookCopies = data.copies.filter(c => c.book_id === bookId && c.status === "available").length;
        const waiting = data.reservations.filter(r => r.book_id === bookId && r.status === "waiting").length;
        return { bookTitle: book?.title || "Unknown Book", count, available: bookCopies, waiting };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredLoans, copiesMap, booksMap, data.copies, data.reservations]);

  // Borrowing by Grade
  const gradeBorrowingStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredLoans.forEach(l => {
      if (l.borrower_kind === "student") {
        const gName = l.student_grade_name || "Grade Not Specified";
        map.set(gName, (map.get(gName) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredLoans]);

  // Student vs Staff Borrowing Breakdown
  const borrowerTypeStats = useMemo(() => {
    let student = 0, staff = 0;
    filteredLoans.forEach(l => {
      if (l.borrower_kind === "student") student++;
      else if (l.borrower_kind === "staff") staff++;
    });
    const total = student + staff;
    const studentPct = total > 0 ? Math.round((student / total) * 100) : 0;
    const staffPct = total > 0 ? Math.round((staff / total) * 100) : 0;
    return { student, staff, total, studentPct, staffPct };
  }, [filteredLoans]);

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
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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

  const exportActivityReport = () => {
    const rows = [
      ["Action", "Timestamp", "User / Details", "Title / Copy ID", "Borrower", "Reason / Amount"],
      ...filteredEvents.map(e => [
        e.action,
        new Date(e.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" }),
        e.details.user || e.details.by || "",
        e.details.title || e.details.accession || "",
        e.details.borrower || e.details.borrower_name || "",
        e.details.reason || (e.details.amount ? `Rs ${e.details.amount}` : "")
      ])
    ];
    exportCsv(rows, "library-activity-log-report.csv");
  };

  return (
    <div className="space-y-8">
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
              Choose a report to view or download. Inventory totals show the current position; date filters apply to activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleResetFilters} className="text-xs font-semibold">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset filters
            </Button>
          </div>
        </div>

        <div role="group" aria-label="Report type" className="flex flex-wrap gap-2">
          {["Overview", "Inventory", "Loans & waiting list", "Fines", "Activity"].map(item => (
            <Button key={item} type="button" variant={report === item ? "primary" : "secondary"} aria-pressed={report === item} onClick={() => setReport(item)}>{item}</Button>
          ))}
        </div>
        <details><summary className="cursor-pointer text-sm font-semibold text-primary">Filter reports</summary>
        <p className="my-2 text-xs text-muted">Date and borrower filters apply to loans; inventory uses the category filter. Activity uses its own action and date filters.</p>
        {/* Filter Toolbar Controls */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
              {data.grades.map(g => (
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
              <option value="overdue">Overdue loans</option>
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
        </details>
      </div>

      {report === "Overview" && <>
      {/* ══════════════════════════════════════════════════════════════════════
          2. KPI OVERVIEW (8 CARDS)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h3 className="font-display text-base font-bold text-ink">Current library totals</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Titles */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-blue-50 text-blue-600">
                <BookCopy className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Total titles</p>
                <p className="text-2xl font-bold text-ink">{activeBooks.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Catalogue")}
              className="mt-3 text-left text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View Catalogue <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 2: Total Physical Copies */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-blue-50 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Total physical copies</p>
                <p className="text-2xl font-bold text-ink">{activeCopies.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Catalogue")}
              className="mt-3 text-left text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View Inventory <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 3: Available Now */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Available now</p>
                <p className="text-2xl font-bold text-emerald-700">{availableCopies.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Catalogue")}
              className="mt-3 text-left text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Available Titles <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 4: On Loan */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">On loan</p>
                <p className="text-2xl font-bold text-ink">{activeLoans.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Issue & return")}
              className="mt-3 text-left text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Active Loans <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 5: Overdue Loans */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Overdue loans</p>
                <p className="text-2xl font-bold text-red-600">{overdueLoans.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Issue & return")}
              className="mt-3 text-left text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1"
            >
              Manage Overdue <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 6: Waiting Reservations */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-teal-50 text-teal-600">
                <Bookmark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Waiting reservations</p>
                <p className="text-2xl font-bold text-teal-700">{waitingReservations.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Reservations")}
              className="mt-3 text-left text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-1"
            >
              Waiting Queues <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 7: Lost or Damaged Copies */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Lost / Damaged</p>
                <p className="text-2xl font-bold text-amber-700">{lostOrDamagedCopies.length}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Catalogue")}
              className="mt-3 text-left text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1"
            >
              Inspect Copies <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Card 8: Outstanding Fines */}
          <div className="flex flex-col justify-between rounded-2xl border border-outline/70 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2.5 bg-rose-50 text-rose-600">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Outstanding fines</p>
                <p className="text-2xl font-bold text-rose-700">{formatMoney(totalOutstandingFines)}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("Issue & return")}
              className="mt-3 text-left text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
            >
              Unpaid Balances <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      </>}

      {report === "Inventory" && <>
      {/* ══════════════════════════════════════════════════════════════════════
          3. INVENTORY HEALTH
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Inventory copy status breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-outline/60 text-muted font-bold">
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Copies</th>
                  <th className="pb-2 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/40 font-medium">
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    Available copies
                  </td>
                  <td className="py-2.5 text-right font-bold">{copyStatusCounts.available}</td>
                  <td className="py-2.5 text-right text-muted">
                    {copyStatusCounts.total > 0 ? ((copyStatusCounts.available / copyStatusCounts.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                    On loan
                  </td>
                  <td className="py-2.5 text-right font-bold">{copyStatusCounts.onLoan}</td>
                  <td className="py-2.5 text-right text-muted">
                    {copyStatusCounts.total > 0 ? ((copyStatusCounts.onLoan / copyStatusCounts.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    Damaged
                  </td>
                  <td className="py-2.5 text-right font-bold text-amber-700">{copyStatusCounts.damaged}</td>
                  <td className="py-2.5 text-right text-muted">
                    {copyStatusCounts.total > 0 ? ((copyStatusCounts.damaged / copyStatusCounts.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    Lost
                  </td>
                  <td className="py-2.5 text-right font-bold text-red-600">{copyStatusCounts.lost}</td>
                  <td className="py-2.5 text-right text-muted">
                    {copyStatusCounts.total > 0 ? ((copyStatusCounts.lost / copyStatusCounts.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                    Withdrawn / removed
                  </td>
                  <td className="py-2.5 text-right font-bold text-muted">{copyStatusCounts.withdrawn}</td>
                  <td className="py-2.5 text-right text-muted">
                    {copyStatusCounts.total > 0 ? ((copyStatusCounts.withdrawn / copyStatusCounts.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Low availability & high demand titles">
          <p className="text-xs text-muted mb-3">Titles with zero available copies or active waiting reservations</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {lowAvailabilityTitles.map(({ book, totalCopies, available, onLoan, waiting }) => (
              <div key={book.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                  <strong className="font-bold text-ink block">{book.title}</strong>
                  <p className="text-[11px] text-muted">
                    {totalCopies} total · <span className={available === 0 ? "font-bold text-red-600" : "text-emerald-700"}>{available} available</span> · {onLoan} on loan · <span className={waiting > 0 ? "font-bold text-teal-700" : ""}>{waiting} waiting</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onNavigateTab("Catalogue", book.id)}
                  className="text-[11px] px-2.5 py-1"
                >
                  View
                </Button>
              </div>
            ))}
            {!lowAvailabilityTitles.length && (
              <p className="text-xs text-muted py-4 text-center">All titles have good availability and no waiting queues.</p>
            )}
          </div>
        </Panel>
      </div>
      </>}

      {report === "Overview" && <>
      {/* ══════════════════════════════════════════════════════════════════════
          4. CIRCULATION INSIGHTS
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel title="Circulation Insights">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Period Issues</p>
            <p className="text-xl font-bold text-ink">{periodStats.issues}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Period Returns</p>
            <p className="text-xl font-bold text-ink">{periodStats.returns}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Period Renewals</p>
            <p className="text-xl font-bold text-ink">{periodStats.renewals}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-muted">Avg Loan Duration</p>
            <p className="text-xl font-bold text-ink">{periodStats.avgDuration} {periodStats.avgDuration !== "N/A" ? "days" : ""}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Most Borrowed Titles */}
          <div>
            <h4 className="font-bold text-xs text-ink uppercase tracking-wider mb-2">Most Borrowed Titles</h4>
            <div className="space-y-2 text-xs">
              {mostBorrowedTitles.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-outline/50 p-2.5">
                  <div className="min-w-0 pr-2">
                    <strong className="font-semibold text-ink block truncate">{item.bookTitle}</strong>
                    <span className="text-[11px] text-muted">{item.available} available · {item.waiting} waiting</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {item.count} issues
                  </span>
                </div>
              ))}
              {!mostBorrowedTitles.length && <p className="text-muted text-xs py-2">No loans recorded in selected period.</p>}
            </div>
          </div>

          {/* Borrowing by Grade */}
          <div>
            <h4 className="font-bold text-xs text-ink uppercase tracking-wider mb-2">Student Borrowing by Grade</h4>
            <div className="space-y-2 text-xs">
              {gradeBorrowingStats.map(([gName, count]) => (
                <div key={gName} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{gName}</span>
                    <span className="font-bold">{count} issues</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (count / (periodStats.issues || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {!gradeBorrowingStats.length && <p className="text-muted text-xs py-2">No student borrowing data in filter.</p>}
            </div>
          </div>

          {/* Student vs Staff */}
          <div>
            <h4 className="font-bold text-xs text-ink uppercase tracking-wider mb-2">Student vs Staff Borrowing</h4>
            <div className="rounded-xl border border-outline/50 p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-ink">Students</span>
                <span className="font-bold text-ink">{borrowerTypeStats.student} loans ({borrowerTypeStats.studentPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: `${borrowerTypeStats.studentPct}%` }} />
                <div className="bg-teal-600 h-full" style={{ width: `${borrowerTypeStats.staffPct}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-ink">Staff</span>
                <span className="font-bold text-ink">{borrowerTypeStats.staff} loans ({borrowerTypeStats.staffPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>
      </>}

      {report === "Loans & waiting list" && <>
      {/* ══════════════════════════════════════════════════════════════════════
          5. OVERDUE & RESERVATIONS FOCUSED LISTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Loans List */}
        <Panel title={`Overdue Loans (${filteredLoans.filter(l => l.returned_at === null && l.due_date < todayStr).length})`}>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredLoans.filter(l => l.returned_at === null && l.due_date < todayStr).map(loan => {
              const copy = copiesMap.get(loan.copy_id);
              const book = booksMap.get(copy?.book_id || loan.book_id || "");
              const days = overdueDays(loan.due_date);
              const estFine = days * (loan.fine_per_day || data.settings.fine_per_day || 0);

              return (
                <div key={loan.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs gap-2">
                  <div>
                    <strong className="font-bold text-ink block">{loan.borrower_name} <span className="font-normal text-muted capitalize">({loan.borrower_kind})</span></strong>
                    <p className="text-[11px] text-muted">
                      {book?.title || loan.book_title || "Book"} (Copy: {copy?.accession || loan.accession || "N/A"})
                    </p>
                    <p className="text-[11px] font-semibold text-red-600 mt-0.5">
                      Due {loan.due_date} · {days} days overdue · Est. Fine: {formatMoney(estFine)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onNavigateTab("Issue & return")}
                    className="shrink-0 text-[11px] py-1 px-2.5 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Manage
                  </Button>
                </div>
              );
            })}
            {!filteredLoans.filter(l => l.returned_at === null && l.due_date < todayStr).length && (
              <p className="text-xs text-muted py-4 text-center">No overdue loans matching current filters.</p>
            )}
          </div>
        </Panel>

        {/* Waiting Reservations List */}
        <Panel title={`Waiting Reservations (${filteredReservations.length})`}>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredReservations.map(res => {
              const bookTitle = res.book_title || booksMap.get(res.book_id)?.title || "Book";
              return (
                <div key={res.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-outline/60 bg-white p-3 text-xs gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-bold text-ink">{bookTitle}</strong>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        Position #{res.queue_position || 1}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-muted mt-0.5">
                      {res.borrower_name} ({res.borrower_kind}) · Reserved {formatDate(res.created_at)}
                    </p>
                    <p className="text-[11px] font-bold mt-0.5">
                      {res.is_ready_to_issue ? (
                        <span className="text-emerald-600">Ready to issue ({res.available_copies} available copy)</span>
                      ) : (
                        <span className="text-amber-600">Waiting for a return</span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onNavigateTab(res.is_ready_to_issue ? "Issue & return" : "Reservations")}
                    className="shrink-0 text-[11px] py-1 px-2.5"
                  >
                    {res.is_ready_to_issue ? "Fulfil" : "View queue"}
                  </Button>
                </div>
              );
            })}
            {!filteredReservations.length && (
              <p className="text-xs text-muted py-4 text-center">No active waiting reservations matching current filters.</p>
            )}
          </div>
        </Panel>
      </div>
      </>}

      {report === "Fines" && <>
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
      </>}

      {report === "Activity" && <>
      {/* ══════════════════════════════════════════════════════════════════════
          7. RECENT ACTIVITY & AUDIT LOG
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel title={`Recent activity (${filteredEvents.length} records)`}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["all", "issue", "return", "renew", "reserve", "cancel", "copy", "payment", "waiver"].map(action => (
                <button
                  key={action}
                  type="button"
                  onClick={() => { setActivityActionFilter(action); setActivityPage(1); }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition-colors ${
                    activityActionFilter === action
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search audit activity..."
                className="w-full rounded-xl border border-outline/70 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-ink focus:border-primary focus:outline-none"
                value={activityQuery}
                onChange={e => { setActivityQuery(e.target.value); setActivityPage(1); }}
              />
            </div>
          </div>

          {/* Log Table / List */}
          <div className="space-y-2">
            {paginatedEvents.map(event => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-slate-50 p-3 text-xs gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="capitalize font-bold text-ink">{event.action.replaceAll("_", " ")}</strong>
                    <span className="text-[11px] text-muted">
                      {new Date(event.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-700 mt-1">
                    {event.details.title && <span>Title: <strong>{event.details.title}</strong></span>}
                    {event.details.accession && <span>Copy ID: <strong>{event.details.accession}</strong></span>}
                    {event.details.borrower && <span>Borrower: <strong>{event.details.borrower}</strong></span>}
                    {event.details.amount && <span>Amount: <strong>Rs {event.details.amount}</strong></span>}
                  </div>
                  {event.details.reason && <p className="mt-1 text-[11px] text-muted italic">{event.details.reason}</p>}
                </div>
              </div>
            ))}
            {!paginatedEvents.length && (
              <p className="text-xs text-muted py-6 text-center">No activity log entries match your filter criteria.</p>
            )}
          </div>

          {/* Pagination Controls */}
          {totalActivityPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-outline/40">
              <span className="text-xs text-muted">
                Page {activityPage} of {totalActivityPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                  className="text-xs px-2.5 py-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activityPage >= totalActivityPages}
                  onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                  className="text-xs px-2.5 py-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Panel>
      </>}

      {/* ══════════════════════════════════════════════════════════════════════
          8. FILTERED CSV EXPORTS TOOLBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <Panel title="Export Filtered CSV Reports">
        <p className="text-xs text-muted mb-4">
          Download the report you need. Loan exports use loan filters; inventory uses category; activity uses date and action filters.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={exportInventoryReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Inventory CSV
          </Button>
          <Button type="button" variant="secondary" onClick={exportLoanHistoryReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Loan History CSV
          </Button>
          <Button type="button" variant="secondary" onClick={exportOverdueReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Overdue Loans CSV
          </Button>
          <Button type="button" variant="secondary" onClick={exportReservationsReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Reservations CSV
          </Button>
          <Button type="button" variant="secondary" onClick={exportFinesReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Fines CSV
          </Button>
          <Button type="button" variant="secondary" onClick={exportActivityReport} className="text-xs">
            <Download className="mr-2 h-4 w-4" /> Audit Activity CSV
          </Button>
        </div>
      </Panel>
    </div>
  );
}
