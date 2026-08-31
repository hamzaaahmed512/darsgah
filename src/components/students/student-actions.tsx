"use client";

import { useState, useTransition } from "react";
import { Download, Upload, FileSpreadsheet, FileText } from "lucide-react";
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleTemplate}
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20"
        >
          <Download className="h-4 w-4" /> Template
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20"
        >
          <Upload className="h-4 w-4" /> Import Students
        </button>

        <button
          onClick={() => handleExport("csv")}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" /> Export CSV
        </button>

        <button
          onClick={() => handleExport("excel")}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Excel
        </button>
      </div>
      
      <StudentImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
