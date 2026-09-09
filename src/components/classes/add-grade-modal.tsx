"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap, Plus, X } from "lucide-react";
import { onboardingGradeSetupAction } from "@/app/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import { getActiveGradeNames } from "@/lib/academics/active-grades";
import { getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";

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
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add classes by grade</h3>
                <p className="text-xs text-slate-500">
                  Select predefined grades to create standard classes (A, B, C) and default subjects automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {error ? <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div> : null}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {DEFAULT_GRADE_NAMES.map((name) => {
                    const isExisting = existing.has(name.toLocaleLowerCase());
                    const isSelected = selected.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={isExisting}
                        onClick={() => toggle(name)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
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
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-semibold text-slate-700">Add custom grade</label>
                  <Input
                    placeholder="e.g. O-Levels Prep"
                    value={customGrade}
                    onChange={(e) => setCustomGrade(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || (!selected.length && !customGrade.trim())}>
                  <GraduationCap className="h-4 w-4" /> {pending ? "Creating..." : "Create classes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
