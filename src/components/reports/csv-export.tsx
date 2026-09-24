"use client";

import { requestDownload } from "./DownloadActionModal";
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
        requestDownload({ title: filename.replace(/[-_]/g, " ").replace(/\.csv$/i, ""), filename,
          generate: async () => ({ blob: new Blob(["\uFEFF", toCsv(rows)], { type: "text/csv;charset=utf-8" }), filename }) });
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export CSV
    </Button>
  );
}
