"use client";

import { useTransition } from "react";
import { Download, Printer } from "lucide-react";
import { exportReportCsvAction, type ReportCsvKey } from "@/app/(app)/reports/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { toCsv } from "@/lib/utils";

export function ReportActionButton({
  kind,
  href,
  month,
  exportKey
}: {
  kind: "print" | "csv";
  href: string;
  month: string;
  exportKey?: ReportCsvKey;
}) {
  const [pending, startTransition] = useTransition();
  const { pushToast } = useToast();

  function printReport() {
    const separator = href.includes("?") ? "&" : "?";
    const printWindow = window.open(`${href}${separator}print=1`, "_blank", "noopener,noreferrer");
    if (!printWindow) pushToast("Allow pop-ups to open the print report.", "error");
  }

  function downloadCsv() {
    if (!exportKey) return;
    startTransition(async () => {
      const result = await exportReportCsvAction(exportKey, month);
      if ("error" in result) {
        pushToast(result.error ?? "Could not generate this report.", "error");
        return;
      }
      if (!result.rows.length) {
        pushToast("No records are available for this report.", "info");
        return;
      }
      const blob = new Blob(["\uFEFF", toCsv(result.rows)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={kind === "print" ? printReport : downloadCsv}
      className="w-full justify-center min-[420px]:w-auto"
    >
      {kind === "print" ? <Printer className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {pending ? "Preparing…" : kind === "print" ? "Print/PDF" : "CSV"}
    </Button>
  );
}
