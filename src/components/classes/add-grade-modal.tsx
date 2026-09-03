"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap, Plus, X } from "lucide-react";
import { onboardingGradeSetupAction } from "@/app/(app)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import { getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";

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
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
            <div className="flex items-start justify-between border-b border-outline/50 px-6 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Add grades</h2>
                <p className="mt-1 text-sm text-muted">Each grade starts with Section A and its default subjects.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted hover:bg-surface-low hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="grid gap-5 overflow-y-auto p-6">
              {error ? <div className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-semibold text-ink">
                <GraduationCap className="h-4 w-4 text-primary" /> Select every grade you want to add
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_GRADE_NAMES.map((name) => {
                  const alreadyAdded = existing.has(name.toLocaleLowerCase());
                  const checked = selected.includes(name);
                  return (
                    <label key={name} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${alreadyAdded ? "cursor-not-allowed bg-surface-low text-muted opacity-60" : checked ? "cursor-pointer border-primary/40 bg-primary/5" : "cursor-pointer border-outline/60"}`}>
                      <input type="checkbox" checked={checked || alreadyAdded} disabled={alreadyAdded} onChange={() => toggle(name)} className="h-4 w-4 accent-primary" />
                      <span className="flex-1">{name}</span>
                      {alreadyAdded ? <Check className="h-4 w-4" /> : <span className="text-[10px] text-primary">{getDefaultSubjectsForGrade(name).length} subjects</span>}
                    </label>
                  );
                })}
              </div>
              <div className="rounded-xl border border-outline/60 bg-surface-low p-4">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Create your own grade/class
                  <Input value={customGrade} onChange={(event) => setCustomGrade(event.target.value)} placeholder="e.g. Montessori Senior" />
                </label>
                <p className="mt-2 text-xs text-muted">A custom grade also starts with Section A. You can link subjects afterward.</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending || (!selected.length && !customGrade.trim())}>{pending ? "Adding..." : "Add selected grades"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
