"use client";

import { BlobProvider } from "@react-pdf/renderer";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportTemplatePDF } from "./ReportTemplatePDF";
import { loadReportLogo } from "./report-logo";
import type { ReportTemplateData } from "./report-template-types";

export default function ReportExportDialog({ data, onClose }: { data: ReportTemplateData; onClose: () => void }) {
  const [generatedAt] = useState(() => new Date().toISOString());
  const [logo, setLogo] = useState<string | null | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const filename = `${data.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80)}-${generatedAt.slice(0, 10)}.pdf`;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLogo(undefined);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { controller.abort(); if (active) setLogo(null); }, 5000);
    void loadReportLogo(data.school?.logoUrl, controller.signal).then((value) => {
      if (active && !controller.signal.aborted) setLogo(value);
      window.clearTimeout(timeout);
    });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [data.school?.logoUrl]);

  const report = useMemo(() => <ReportTemplatePDF data={data} generatedAt={generatedAt} logoDataUrl={logo} />, [data, generatedAt, logo]);

  async function share(blob: Blob, url: string) {
    const file = new File([blob], filename, { type: "application/pdf" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: data.title });
      } else {
        const link = document.createElement("a");
        link.href = url; link.download = filename; link.click();
        setMessage("PDF downloaded. Attach it in WhatsApp, email, or your preferred app.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setMessage("Sharing failed. Download the PDF and attach it manually.");
    }
  }

  return createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pdf-export-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">School report</p><h2 id="pdf-export-title" className="mt-2 text-xl font-bold text-ink">{data.title}</h2></div>
        <button ref={closeRef} type="button" aria-label="Close report" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <p className="mt-3 text-sm text-muted">Your report uses the school&apos;s standard A4 template. Open the PDF to preview or print it.</p>
      <div className="mt-6">
        {logo === undefined ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Preparing report…</p> :
          <BlobProvider key={attempt} document={report}>{({ blob, url, loading, error }) =>
            error ? <div><p role="alert" className="mb-3 text-sm text-red-600">Could not generate this report.</p><Button onClick={() => setAttempt((value) => value + 1)}>Retry</Button></div>
              : loading || !url || !blob ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Preparing report…</p>
                : <div className="grid gap-3">
                  <a href={url} download={filename} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"><Download className="h-4 w-4" />Download PDF</a>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-ink ring-1 ring-outline"><ExternalLink className="h-4 w-4" />Preview / Print PDF</a>
                  <Button variant="secondary" onClick={() => void share(blob, url)}><Share2 className="h-4 w-4" />Share PDF</Button>
                </div>
          }</BlobProvider>}
      </div>
      {message ? <p role="status" className="mt-4 text-sm text-muted">{message}</p> : null}
    </div>
  </div>, document.body);
}
