"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
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
        if (format === "csv") {
          // Use the raw CSV string provided by the backend
          const blob = new Blob([res.data], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Parse the CSV data back to an array of arrays to build a proper XLSX
          const rows = res.data.split("\n").map(line => line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, "")) || []);
          const worksheet = XLSX.utils.aoa_to_sheet(rows);
          
          // Auto-fit column widths
          const colWidths = rows[0].map((_, colIndex) => {
            return {
              wch: Math.max(...rows.map(row => (row[colIndex] ? String(row[colIndex]).length : 0)))
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

  const handleTemplate = () => {
    // Generate an XLSX template with standard headers and sample data
    const headers = ["Admission Number", "First Name", "Last Name", "Grade", "Section", "Gender", "Date of Birth", "Guardian Name", "Contact Number"];
    const dummyData = [
      ["ADM-2026-001", "Ali", "Khan", "Class 10", "A", "Male", "2010-05-14", "Ahmad Khan", "0300-1234567"],
      ["ADM-2026-002", "Fatima", "Bibi", "Class 10", "A", "Female", "2010-08-22", "Omar Farooq", "0300-7654321"]
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
