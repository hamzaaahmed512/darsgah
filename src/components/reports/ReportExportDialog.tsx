"use client";
import { useState } from "react";
import { DownloadActionModal } from "./DownloadActionModal";
import type { ReportTemplateData } from "./report-template-types";

export default function ReportExportDialog({ data, onClose }: { data: ReportTemplateData; onClose: () => void }) {
  const [generatedAt] = useState(() => new Date().toISOString());
  const filename = `${data.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80)}-${generatedAt.slice(0, 10)}.pdf`;
  return <DownloadActionModal title={data.title} filename={filename} onClose={onClose} generate={async () => {
    const [{ pdf }, { ReportTemplatePDF }, { loadReportLogo }] = await Promise.all([import("@react-pdf/renderer"), import("./ReportTemplatePDF"), import("./report-logo")]);
    const logo = await loadReportLogo(data.school?.logoUrl, AbortSignal.timeout(5000));
    return { blob: await pdf(<ReportTemplatePDF data={data} generatedAt={generatedAt} logoDataUrl={logo} />).toBlob(), filename };
  }} />;
}
