"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffReportPDF } from "./StaffReportPDF";
import { StudentReportPDF } from "./StudentReportPDF";
import { reportFilename } from "./profile-report-format";
import { loadReportLogo } from "./report-logo";
import type { DownloadReportButtonProps } from "./profile-report-types";

type Props = DownloadReportButtonProps & { generatedAt: string; onRetry: () => void };
type DownloadState = "loading" | "ready" | "error";

function DownloadLabel({ state, onStateChange }: { state: DownloadState; onStateChange: (state: DownloadState) => void }) {
  useEffect(() => onStateChange(state), [state, onStateChange]);
  if (state === "error") return <span role="alert">Could not create PDF.</span>;
  if (state === "loading") return <span role="status" className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF…</span>;
  return <><Download className="h-4 w-4" />Download PDF</>;
}

export default function ReportDownloadLink(props: Props) {
  const logoUrl = props.data.school?.logoUrl;
  const [downloadState, setDownloadState] = useState<DownloadState>("loading");
  const [logo, setLogo] = useState<{ source: typeof logoUrl; dataUrl: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // A slow, unavailable, unsupported or CORS-blocked logo must not block downloads.
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (active) setLogo({ source: logoUrl, dataUrl: null });
    }, 5000);
    void loadReportLogo(logoUrl, controller.signal).then((dataUrl) => {
      if (active && !controller.signal.aborted) setLogo({ source: logoUrl, dataUrl });
      window.clearTimeout(timeout);
    });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [logoUrl]);

  const document = useMemo(() => {
    const options = { generatedAt: props.generatedAt, logoDataUrl: logo?.dataUrl };
    return props.type === "staff" ? <StaffReportPDF data={props.data} {...options} /> : <StudentReportPDF data={props.data} {...options} />;
  }, [props.type, props.data, props.generatedAt, logo?.dataUrl]);

  if (!logo || logo.source !== logoUrl) return <Button variant="secondary" disabled aria-busy="true"><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF…</Button>;

  return <div className="flex flex-wrap items-center gap-2">
    <PDFDownloadLink document={document} fileName={reportFilename(props.type, props.data.fullName, props.generatedAt)}
      aria-disabled={downloadState !== "ready"} aria-busy={downloadState === "loading"}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-outline hover:bg-surface-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      onClick={(event) => { if (downloadState !== "ready" || !event.currentTarget.getAttribute("href")) event.preventDefault(); }}>
      {({ loading, error, url }) => <DownloadLabel state={error ? "error" : loading || !url ? "loading" : "ready"} onStateChange={setDownloadState} />}
    </PDFDownloadLink>
    {downloadState === "error" ? <Button type="button" variant="secondary" size="sm" onClick={props.onRetry}>Retry</Button> : null}
  </div>;
}
