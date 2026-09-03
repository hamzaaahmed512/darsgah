"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  href: string;
  label: string;
  status: "complete" | "partial" | "pending";
  approvedCount: number;
  totalSubjects: number;
  missing: string[];
  variant?: "primary" | "secondary";
};

export function ResultCardDownloadButton({ href, label, status, approvedCount, totalSubjects, missing, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const complete = status === "complete";

  function proceed() {
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return <>
    <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)} className="w-full justify-center sm:w-auto">
      <Printer className="h-4 w-4" /> {label}
    </Button>
    {open ? <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="result-download-title" className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-lift sm:rounded-[24px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${complete ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
              {complete ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div><h2 id="result-download-title" className="font-display text-xl font-bold text-ink">Result card status</h2><div className="mt-2"><Badge tone={complete ? "green" : "yellow"}>{complete ? "All results approved" : status === "partial" ? "Partial results" : "All results pending"}</Badge></div></div>
          </div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button>
        </div>

        {complete ? <p className="mt-5 rounded-xl bg-success-soft p-4 text-sm font-semibold text-success">All {totalSubjects} subject result{totalSubjects === 1 ? " is" : "s are"} finalized and approved.</p> : status === "partial" ? <div className="mt-5 grid gap-3"><p className="text-sm font-semibold text-ink">{missing.length} subject{missing.length === 1 ? " remains" : "s remain"} missing or pending approval. {approvedCount} of {totalSubjects} approved.</p><ul className="max-h-44 space-y-2 overflow-y-auto rounded-xl bg-warning-soft p-3">{missing.map((subject) => <li key={subject} className="text-sm font-semibold text-warning">{subject}</li>)}</ul></div> : <p className="mt-5 rounded-xl bg-warning-soft p-4 text-sm font-semibold text-warning">No subject results have been approved yet. The generated cards will contain no finalized subject results.</p>}

        <p className="mt-4 text-sm leading-6 text-muted">You can continue with the currently available results or cancel and return later.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={proceed}><Printer className="h-4 w-4" />Continue to print / PDF</Button></div>
      </div>
    </div> : null}
  </>;
}
