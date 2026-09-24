"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportBranding } from "./report-branding";
import type { ReportTemplateData } from "./report-template-types";

const ReportExportDialog = dynamic(() => import("./ReportExportDialog"), { ssr: false });

export function ReportExport({ data, autoOpen = false, label = "Generate Report" }: { data: ReportTemplateData; autoOpen?: boolean; label?: string }) {
  const school = useReportBranding();
  const [open, setOpen] = useState(autoOpen);
  const close = useCallback(() => setOpen(false), []);
  const resolvedSchool = { ...school, ...Object.fromEntries(Object.entries(data.school ?? {}).filter(([, value]) => value != null)) };
  return <>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}><FileText className="h-4 w-4" />{label}</Button>
    {open ? <ReportExportDialog data={{ ...data, school: resolvedSchool }} onClose={close} /> : null}
  </>;
}
