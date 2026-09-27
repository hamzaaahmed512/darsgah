"use client";

import { useEffect, useRef, useMemo, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, GraduationCap, Plus, X } from "lucide-react";
import { onboardingGradeSetupAction } from "@/app/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import { getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";
import { getActiveGradeNames } from "@/lib/academics/active-grades";

export { getActiveGradeNames };
export function AddGradeModal({ existingGradeNames }: { existingGradeNames: string[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [customGrade, setCustomGrade] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const existing = useMemo(() => new Set(existingGradeNames.map((name) => name.toLocaleLowerCase())), [existingGradeNames]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])") ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  function toggle(name: string) {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const custom = customGrade.trim();
    if (!selected.length && !custom) return;
    const formData = new FormData();
    selected.forEach((name) => formData.append("grade", name));
    if (custom) formData.append("custom_grade", custom);
    setError(null);
    startTransition(async () => {
      try {
        const result = await onboardingGradeSetupAction(formData);
        pushToast(`Added ${result.classIds.length} grade class${result.classIds.length === 1 ? "" : "es"}.`, "success");
        setSelected([]);
        setCustomGrade("");
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to add grades.");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="rounded-2xl">
        <Plus className="h-4 w-4" /> Add grade
      </Button>
      {open ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-grade-title" className="w-full max-w-2xl max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="sticky top-0 shrink-0 bg-white dark:bg-slate-900 p-4 sm:p-6 border-b z-10 flex items-center justify-between gap-3">
              <div>
                <h3 id="add-grade-title" className="text-lg font-semibold text-slate-900">Add classes by grade</h3>
                <p className="text-xs text-slate-500">
                  Select predefined grades to create standard classes (A, B, C) and default subjects automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close add classes"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 min-h-0 flex-1">
                {error ? <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div> : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DEFAULT_GRADE_NAMES.map((name) => {
                    const isExisting = existing.has(name.toLocaleLowerCase());
                    const isSelected = selected.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={isExisting}
                        aria-pressed={isSelected}
                        onClick={() => toggle(name)}
                        className={`flex min-h-20 min-w-0 items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
                          isExisting
                            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                              : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{name}</div>
                          <div className="text-[11px] text-slate-500">
                            {isExisting ? "Already added" : `${getDefaultSubjectsForGrade(name).length} subjects`}
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sticky bottom-0 shrink-0 bg-slate-50 dark:bg-slate-800 p-4 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
                <div className="w-full min-w-0 sm:flex-1">
                  <label htmlFor="custom-grade" className="text-xs font-semibold text-slate-700">Add custom grade</label>
                  <Input
                    id="custom-grade"
                    placeholder="e.g. O-Levels Prep"
                    value={customGrade}
                    onChange={(e) => setCustomGrade(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending || (!selected.length && !customGrade.trim())}>
                    <GraduationCap className="h-4 w-4" /> {pending ? "Creating..." : "Create classes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}
