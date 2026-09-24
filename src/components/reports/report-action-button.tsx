"use client";

import { requestDownload } from "./DownloadActionModal";
import { Download, Printer } from "lucide-react";
import { exportReportCsvAction, type ReportCsvKey } from "@/app/(app)/reports/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toCsv } from "@/lib/utils";

export function ReportActionButton({
  title = "School Report",
  kind,
  href,
  month,
  exportKey
}: {
  title?: string;
  kind: "print" | "csv";
  href: string;
  month: string;
  exportKey?: ReportCsvKey;
}) {

  const router = useRouter();

  function printReport() {
    const separator = href.includes("?") ? "&" : "?";
    router.push(`${href}${separator}print=1`);
  }

  function downloadCsv() {
    if (!exportKey) return;
    requestDownload({ title, filename: `${exportKey}.csv`, generate: async () => {
      const result = await exportReportCsvAction(exportKey, month);
      if ("error" in result) throw new Error(result.error ?? "Could not generate this report.");
      if (!result.rows.length) throw new Error("No records are available for this report.");
      return { blob: new Blob(["\uFEFF", toCsv(result.rows)], { type: "text/csv;charset=utf-8" }), filename: result.filename };
    }});
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={kind === "print" ? printReport : downloadCsv}
      className="w-full justify-center min-[420px]:w-auto"
    >
      {kind === "print" ? <Printer className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {kind === "print" ? "Print/PDF" : "CSV"}
    </Button>
  );
}
