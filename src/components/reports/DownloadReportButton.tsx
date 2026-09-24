"use client";

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DownloadReportButtonProps } from "./profile-report-types";
import { useReportBranding } from "./report-branding";

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
  const school = useReportBranding();
  const resolvedSchool = { ...school, ...Object.fromEntries(Object.entries(props.data.school ?? {}).filter(([, value]) => value != null)) };
  const [request, setRequest] = useState<{ generatedAt: string; key: number } | null>(null);
  const prepare = () => setRequest({ generatedAt: new Date().toISOString(), key: Date.now() });
  return <div className={props.className}>
    <Button type="button" variant="secondary" onClick={prepare}><Download className="h-4 w-4" />Download report</Button>
    {request ? <PDFErrorBoundary key={request.key} onRetry={prepare}>
      <ReportDownloadLink {...(props.type === "staff" ? { type: "staff" as const, data: { ...props.data, school: resolvedSchool } } : { type: "student" as const, data: { ...props.data, school: resolvedSchool } })} generatedAt={request.generatedAt} onRetry={prepare} onClose={() => setRequest(null)} />
    </PDFErrorBoundary> : null}
  </div>;
}
