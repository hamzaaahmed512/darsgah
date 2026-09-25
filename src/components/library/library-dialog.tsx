"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function LibraryDialog({ title, description, children, onClose, className = "max-w-lg" }: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus], " + focusable);
    first?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []);
      if (!items.length) { event.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(<div className="fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} className={`dialog-panel flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] ${className}`}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline/50 px-4 py-4 sm:px-6">
        <div className="min-w-0"><h2 id={`${id}-title`} className="font-display text-xl font-bold text-ink">{title}</h2>{description && <p id={`${id}-description`} className="mt-1 text-sm text-muted">{description}</p>}</div>
        <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${title}`} className="rounded-xl p-2 text-muted hover:bg-surface-low"><X className="h-5 w-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">{children}</div>
    </div>
  </div>, document.body);
}
