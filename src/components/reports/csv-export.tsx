"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/utils";

export function CsvExport({ rows, filename }: { rows: Array<Record<string, string | number | null | undefined>>; filename: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={!rows.length}
      onClick={() => {
        const blob = new Blob(["\uFEFF", toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export CSV
    </Button>
  );
}
