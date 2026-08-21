"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, GraduationCap, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_CORE_SUBJECTS, DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import {
  completeOnboardingAction,
  onboardingGradeSetupAction,
  onboardingSubjectSetupAction
} from "@/app/(app)/onboarding/actions";

export function SchoolOnboardingWizard({
  forceOpen = true
}: {
  forceOpen?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(forceOpen);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdClassIds, setCreatedClassIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([...DEFAULT_GRADE_NAMES]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([...DEFAULT_CORE_SUBJECTS]);
  const [applyToAllClasses, setApplyToAllClasses] = useState(true);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customSubjectDraft, setCustomSubjectDraft] = useState("");

  const stepLabels = useMemo(
    () => [
      { id: 1, label: "Grades & Classes" },
      { id: 2, label: "Global Subjects" }
    ],
    []
  );

  function toggleGrade(gradeName: string) {
    setSelectedGrades((current) =>
      current.includes(gradeName) ? current.filter((name) => name !== gradeName) : [...current, gradeName]
    );
  }

  function toggleSubject(subjectName: string) {
    setSelectedSubjects((current) =>
      current.includes(subjectName) ? current.filter((name) => name !== subjectName) : [...current, subjectName]
    );
  }

  function addCustomSubject() {
    const value = customSubjectDraft.trim();
    if (!value || customSubjects.includes(value) || selectedSubjects.includes(value)) return;
    setCustomSubjects((current) => [...current, value]);
    setCustomSubjectDraft("");
  }

  function handleGradeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    selectedGrades.forEach((grade) => formData.append("grade", grade));

    startTransition(async () => {
      try {
        const result = await onboardingGradeSetupAction(formData);
        setCreatedClassIds(result.classIds);
        pushToast(`Created ${result.classIds.length} class(es) with Section A.`, "success");
        router.refresh();
        setStep(2);
      } catch (err: any) {
        setError(err?.message ?? "Failed to set up grades and classes.");
      }
    });
  }

  function handleSubjectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    selectedSubjects.forEach((subject) => formData.append("subject", subject));
    customSubjects.forEach((subject) => formData.append("custom_subject", subject));
    if (applyToAllClasses) {
      formData.append("apply_to_all_classes", "on");
    } else {
      createdClassIds.forEach((classId) => formData.append("class_id", classId));
    }

    startTransition(async () => {
      try {
        const result = await onboardingSubjectSetupAction(formData);
        await completeOnboardingAction();
        pushToast(`Applied ${result.subjectIds.length} subject(s) across ${result.classCount} class(es).`, "success");
        router.refresh();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Failed to set up subjects.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-lift">
        <div className="flex items-start justify-between gap-4 border-b border-outline/50 px-6 py-5">
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-wide text-primary">School setup</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">Welcome to Darsgah</h2>
            <p className="mt-1 text-sm text-muted">Configure your academic structure in two quick steps.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-2 text-muted transition hover:bg-surface-low hover:text-ink"
            aria-label="Close onboarding wizard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-outline/40 px-6 py-4">
          <ol className="flex flex-wrap gap-3">
            {stepLabels.map((item) => (
              <li
                key={item.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                  step === item.id ? "bg-primary-soft text-primary" : "bg-surface-low text-muted"
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px]">{item.id}</span>
                {item.label}
              </li>
            ))}
          </ol>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {error ? <div className="mb-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</div> : null}

          {step === 1 ? (
            <form onSubmit={handleGradeSubmit} className="grid gap-5">
              <div className="rounded-[16px] border border-outline/50 bg-primary/5 px-4 py-3 text-sm text-ink">
                <div className="flex items-center gap-2 font-semibold">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Select the grades your school offers
                </div>
                <p className="mt-1 text-muted">All grades are pre-selected. Uncheck any grade you do not offer.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_GRADE_NAMES.map((gradeName) => {
                  const checked = selectedGrades.includes(gradeName);
                  return (
                    <label
                      key={gradeName}
                      className={`flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition ${
                        checked ? "border-primary/40 bg-primary/5 text-ink" : "border-outline/60 bg-white text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGrade(gradeName)}
                        className="h-4 w-4 accent-primary"
                      />
                      {gradeName}
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={pending || !selectedGrades.length}>
                  {pending ? "Creating classes..." : "Continue to subjects"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubjectSubmit} className="grid gap-5">
              <div className="rounded-[16px] border border-outline/50 bg-primary/5 px-4 py-3 text-sm text-ink">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Choose core subjects for your classes
                </div>
                <p className="mt-1 text-muted">Selected subjects will be attached to your generated classes.</p>
              </div>

              <label className="flex items-center gap-3 rounded-[12px] border border-outline/60 bg-surface-low px-4 py-3 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={applyToAllClasses}
                  onChange={(event) => setApplyToAllClasses(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Apply to all selected classes
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                {DEFAULT_CORE_SUBJECTS.map((subjectName) => {
                  const checked = selectedSubjects.includes(subjectName);
                  return (
                    <label
                      key={subjectName}
                      className={`flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition ${
                        checked ? "border-primary/40 bg-primary/5 text-ink" : "border-outline/60 bg-white text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(subjectName)}
                        className="h-4 w-4 accent-primary"
                      />
                      {subjectName}
                    </label>
                  );
                })}
              </div>

              {customSubjects.length ? (
                <div className="flex flex-wrap gap-2">
                  {customSubjects.map((subjectName) => (
                    <span key={subjectName} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                      <Check className="h-3 w-3" />
                      {subjectName}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Input
                  value={customSubjectDraft}
                  onChange={(event) => setCustomSubjectDraft(event.target.value)}
                  placeholder="Custom subject name"
                  className="max-w-xs"
                />
                <Button type="button" variant="secondary" onClick={addCustomSubject}>
                  + Add Custom Subject
                </Button>
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={pending}>
                  Back
                </Button>
                <Button type="submit" disabled={pending || (!selectedSubjects.length && !customSubjects.length)}>
                  {pending ? "Saving setup..." : "Finish setup"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
