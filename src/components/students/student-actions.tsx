"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { exportStudentsAction } from "@/app/(app)/students/actions";
import type { StudentFilters } from "@/lib/services/students";
import { StudentImportModal } from "./student-import-modal";

export function StudentActions({ filters }: { filters: StudentFilters }) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExport = (format: "csv" | "excel") => {
    startTransition(async () => {
      const res = await exportStudentsAction(filters);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.data) {
        const XLSX = await import("xlsx");
        if (format === "csv") {
          // Generate CSV directly from JSON using SheetJS
          const worksheet = XLSX.utils.json_to_sheet(res.data);
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          const blob = new Blob([csvText], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Generate Excel from JSON
          const worksheet = XLSX.utils.json_to_sheet(res.data);
          
          // Auto-fit column widths
          const keys = Object.keys(res.data[0] || {});
          const colWidths = keys.map((key) => {
            return {
              wch: Math.max(key.length, ...res.data.map((row: any) => (row[key] ? String(row[key]).length : 0)))
            };
          });
          worksheet["!cols"] = colWidths;
          
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
          XLSX.writeFile(workbook, `students_export_${new Date().toISOString().split("T")[0]}.xlsx`);
        }
      }
    });
  };

  const handleTemplate = async () => {
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
    XLSX.writeFile(workbook, "student_import_template.xlsx");
  };

  return (
    <>
      <details className="group relative">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-outline/80 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface-low">
          <Download className="h-4 w-4" />
          Import & Export
          <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-2xl border border-outline/70 bg-white p-2 shadow-lift">
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
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-surface-low disabled:opacity-50"
          >
            <FileText className="h-4 w-4 text-muted" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("excel")}
            disabled={isPending}
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
