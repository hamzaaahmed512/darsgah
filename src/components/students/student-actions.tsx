"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { exportStudentsAction } from "@/app/(app)/students/actions";
import type { StudentFilters } from "@/lib/services/students";
import { requestDownload } from "@/components/reports/DownloadActionModal";
import { StudentImportModal } from "./student-import-modal";

export function StudentActions({ filters }: { filters: StudentFilters }) {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExport = (format: "csv" | "excel") => {
    const filename = `students_export_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
    requestDownload({ title: "Students Report", filename, generate: async () => {
      const res = await exportStudentsAction(filters);
      if (res.error) throw new Error(res.error);
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(res.data ?? []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      const blob = format === "csv" ? new Blob(["\uFEFF", XLSX.utils.sheet_to_csv(worksheet)], { type: "text/csv;charset=utf-8" })
        : new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      return { blob, filename };
    }});
  };

  const handleTemplate = async () => {
    requestDownload({ title: "Student Import Template", filename: "student_import_template.xlsx", generate: async () => {
    const XLSX = await import("xlsx");
    // Generate an XLSX template with standard headers and sample data
    const headers = ["Admission Number", "First Name", "Last Name", "Grade", "Section", "Gender", "Date of Birth", "Guardian Name", "Contact Number"];
    const dummyData = [
      ["2026-1", "Ali", "Khan", "Class 10", "A", "Male", "2010-05-14", "Ahmad Khan", "0300-1234567"],
      ["2026-2", "Fatima", "Bibi", "Class 10", "A", "Female", "2010-08-22", "Omar Farooq", "0300-7654321"]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dummyData]);
    
    // Auto-fit column widths
    worksheet["!cols"] = headers.map((_, colIndex) => ({
      wch: Math.max(...[headers, ...dummyData].map(row => (row[colIndex] ? String(row[colIndex]).length : 0))) + 2
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    return { blob: new Blob([XLSX.write(workbook, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename: "student_import_template.xlsx" };
    }});
  };

  return (
    <>
      <details className="group relative w-full min-w-0 sm:w-auto">
        <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-outline/80 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface-low sm:w-auto">
          <Download className="h-4 w-4" />
          Import & Export
          <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="absolute left-0 right-auto top-[calc(100%+8px)] z-30 w-full min-w-0 rounded-2xl border border-outline/70 bg-white p-2 shadow-lift sm:left-auto sm:right-0 sm:w-56">
          <button
            onClick={handleTemplate}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-low"
          >
            <Download className="h-4 w-4 text-muted" />
            Download template
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-low"
          >
            <Upload className="h-4 w-4 text-muted" />
            Import students
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-low disabled:opacity-50"
          >
            <FileText className="h-4 w-4 text-muted" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-low disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted" />
            Export Excel
          </button>
        </div>
      </details>
      
      <StudentImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
