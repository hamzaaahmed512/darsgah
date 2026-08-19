"use client";

import { useTransition } from "react";
import { Download, Upload, FileSpreadsheet, FileText } from "lucide-react";
import { exportStudentsAction, importStudentsAction } from "@/app/(app)/students/actions";
import type { StudentFilters } from "@/lib/services/students";

export function StudentActions({ filters }: { filters: StudentFilters }) {
  const [isPending, startTransition] = useTransition();

  const handleExport = (format: "csv" | "excel") => {
    startTransition(async () => {
      const res = await exportStudentsAction(filters);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.data) {
        const blob = new Blob([res.data], { type: format === "excel" ? "application/vnd.ms-excel" : "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_export_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xls" : "csv"}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const handleTemplate = () => {
    const headers = "Admission No,Name (EN),Name (UR),Father Name,Father Phone,Gender,Class,Status,DOB\n";
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleTemplate}
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20"
      >
        <Download className="h-4 w-4" /> Template
      </button>

      <form
        action={async (formData) => {
          const res = await importStudentsAction(formData);
          if (res.error) alert(res.error);
          else alert(`Successfully imported ${res.count} students!`);
        }}
        className="relative"
      >
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm font-semibold text-ink hover:bg-outline/20">
          <Upload className="h-4 w-4" /> Import Students
          <input type="file" name="file" accept=".csv" className="hidden" onChange={(e) => e.target.form?.requestSubmit()} />
        </label>
      </form>

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
  );
}
