"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DownloadDocument = { blob: Blob; filename: string };
export type DownloadActionOptions = {
  title: string;
  description?: string;
  filename?: string;
  url?: string;
  generate?: () => Promise<DownloadDocument>;
  /** Only supply a server-issued, authorized share link. Never a local blob URL. */
  shareUrl?: string;
};
export function requestDownload(options: DownloadActionOptions) {
  window.dispatchEvent(new CustomEvent("document-action", { detail: options }));
}

export function DownloadActionModal({ title, description, filename = "report.pdf", url, generate, shareUrl, onClose }: DownloadActionOptions & { onClose: () => void }) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const active = useRef(true);
  const busy = useRef(false);
  const cached = useRef<DownloadDocument | undefined>(undefined);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [emailPrompt, setEmailPrompt] = useState(false);
  const [failed, setFailed] = useState(false);
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    active.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function focusin(event: FocusEvent) {
      if (!dialog.current?.contains(event.target as Node)) dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      active.current = false;
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      previous?.focus();
    };
  }, []);

  async function perform(action: "download" | "preview" | "share") {
    if (busy.current) return;
    busy.current = true;
    setPending(action); setMessage(""); setFailed(false); setEmailPrompt(false);
    // Reserve the window during the click so async generation does not trigger popup blockers.
    const viewer = action === "preview" ? window.open("about:blank", "_blank") : null;
    if (viewer) { viewer.opener = null; viewer.document.title = "Preparing document…"; }
    try {
      if (action === "preview" && !viewer) throw new Error("Allow pop-ups to preview this document.");
      if (!cached.current) {
        if (generate) cached.current = await generate();
        else {
          if (!url) throw new Error("No document is available.");
          const response = await fetch(url);
          if (!response.ok) throw new Error("Could not fetch this document. Please try again.");
          cached.current = { blob: await response.blob(), filename };
        }
      }
      if (!active.current) { viewer?.close(); return; }
      const file = cached.current;
      if (action === "share") {
        const attachment = new File([file.blob], file.filename, { type: file.blob.type });
        if (navigator.share && navigator.canShare?.({ files: [attachment] })) {
          await navigator.share({ files: [attachment], title });
        } else if (shareUrl && new URL(shareUrl, location.origin).protocol === "https:") {
          await navigator.clipboard.writeText(new URL(shareUrl, location.origin).href);
          setMessage("Share link copied.");
        } else {
          setEmailPrompt(true);
          setMessage("File sharing is unavailable in this browser. Download the file, then attach it to an email.");
        }
      } else if (action === "preview" && viewer) {
        let previewBlob = file.blob;
        if (!file.blob.type.includes("pdf") && !file.blob.type.startsWith("image/")) {
          let text: string;
          if (file.filename.endsWith(".xlsx")) {
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(await file.blob.arrayBuffer());
            text = workbook.SheetNames.map(name => `${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n");
          } else text = await file.blob.text();
          const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
          previewBlob = new Blob([`<!doctype html><title>${escape(title)}</title><style>body{font:14px system-ui;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>${escape(title)}</h1><p>Use your browser's Print command to print or save as PDF.</p><pre>${escape(text)}</pre>`], { type: "text/html" });
        }
        if (!active.current) { viewer.close(); return; }
        const objectUrl = URL.createObjectURL(previewBlob);
        viewer.location.replace(objectUrl);
        const timer = window.setInterval(() => { if (viewer.closed) { URL.revokeObjectURL(objectUrl); window.clearInterval(timer); } }, 1000);
      } else {
        const objectUrl = URL.createObjectURL(file.blob);
        const link = document.createElement("a");
        link.href = objectUrl; link.download = file.filename;
        link.dataset.documentAction = "confirmed";
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (error) {
      viewer?.close();
      if (active.current && !(error instanceof Error && error.name === "AbortError")) {
        setFailed(true); setMessage(error instanceof Error ? error.message : "Could not prepare this document. Please try again.");
      }
    } finally { busy.current = false; if (active.current) setPending(null); }
  }

  return createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4"><h2 id={`${id}-title`} className="text-xl font-bold text-ink">{title}</h2><button type="button" aria-label="Close report" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <p id={`${id}-description`} className="mt-3 text-sm text-muted">{description ?? (isPdf ? "Your report uses the school's standard A4 template. Open the PDF to preview or print it." : "Download, preview or print, or share this file.")}</p>
      <div className="mt-6 grid gap-3">{([
        ["download", isPdf ? "Download PDF" : "Download File", Download],
        ["preview", isPdf ? "Preview / Print PDF" : "Preview / Print File", ExternalLink],
        ["share", isPdf ? "Share PDF" : "Share File", Share2]
      ] as const).map(([action, label, Icon]) => <Button key={action} type="button" variant={action === "download" ? "primary" : "secondary"} disabled={!!pending} aria-busy={pending === action} onClick={() => void perform(action)}>{pending === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{pending === action ? "Preparing…" : label}</Button>)}</div>
      {emailPrompt && <a className="mt-4 inline-block font-semibold text-primary" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Please attach the downloaded document before sending.")}`}>Compose email</a>}
      {message && <p role={failed ? "alert" : "status"} className="mt-4 text-sm text-muted">{message}</p>}
    </div>
  </div>, document.body);
}

/** Covers native download links as well as legacy event-based export controls. */
export function DownloadActionProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DownloadActionOptions | null>(null);
  useEffect(() => {
    const open = (event: Event) => setRequest((event as CustomEvent<DownloadActionOptions>).detail);
    const intercept = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[download]") as HTMLAnchorElement | null;
      if (!link || link.dataset.documentAction === "confirmed") return;
      event.preventDefault(); event.stopPropagation();
      setRequest({ title: link.textContent?.trim() || "Document", url: link.href, filename: link.download || new URL(link.href).pathname.split("/").pop() || "document" });
    };
    window.addEventListener("document-action", open);
    document.addEventListener("click", intercept, true);
    return () => { window.removeEventListener("document-action", open); document.removeEventListener("click", intercept, true); };
  }, []);
  return <>{children}{request && <DownloadActionModal {...request} onClose={() => setRequest(null)} />}</>;
}
