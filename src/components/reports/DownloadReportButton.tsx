"use client";

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DownloadReportButtonProps } from "./profile-report-types";

const ReportDownloadLink = dynamic(() => import("./ReportDownloadLink"), {
  ssr: false,
  loading: () => <Button variant="secondary" disabled aria-busy="true"><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF…</Button>
});

class PDFErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="flex items-center gap-2"><span role="alert" className="text-sm text-red-600">Could not create PDF.</span><Button variant="secondary" onClick={this.props.onRetry}>Retry</Button></div>;
    return this.props.children;
  }
}

/** Safe to import into App Router server pages; renderer loads only after a click. */
export function DownloadReportButton(props: DownloadReportButtonProps) {
  const [request, setRequest] = useState<{ generatedAt: string; key: number } | null>(null);
  const prepare = () => setRequest({ generatedAt: new Date().toISOString(), key: Date.now() });
  return <div className={props.className}>
    {request ? <PDFErrorBoundary key={request.key} onRetry={prepare}>
      <ReportDownloadLink {...props} generatedAt={request.generatedAt} onRetry={prepare} />
    </PDFErrorBoundary> : <Button type="button" variant="secondary" onClick={prepare}><Download className="h-4 w-4" />Download report</Button>}
  </div>;
}
