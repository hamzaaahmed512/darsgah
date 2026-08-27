"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, GraduationCap, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_GRADE_NAMES } from "@/lib/constants/onboarding";
import { getDefaultSubjectsForGrade } from "@/lib/constants/subjectDefaults";
import {
  completeOnboardingAction,
  onboardingGradeSetupAction,
  onboardingPrincipalTeachingAssignmentAction,
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
  const [createdClasses, setCreatedClasses] = useState<Array<{ id: string; name: string; grade_name: string; section_name: string | null }>>([]);
  const [principalTeaches, setPrincipalTeaches] = useState(false);
  const [principalClassId, setPrincipalClassId] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([...DEFAULT_GRADE_NAMES]);
  const [seededSubjectsByGrade, setSeededSubjectsByGrade] = useState<Record<string, number>>({});
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [customSubjectDraft, setCustomSubjectDraft] = useState("");

  const stepLabels = useMemo(
    () => [
      { id: 1, label: "Grades & Classes" },
      { id: 2, label: "Review & Finish" }
    ],
    []
  );

  const seededSummary = useMemo(
    () =>
      selectedGrades.map((gradeName) => ({
        gradeName,
        subjectCount: seededSubjectsByGrade[gradeName] ?? getDefaultSubjectsForGrade(gradeName).length,
        subjects: getDefaultSubjectsForGrade(gradeName).map((subject) => subject.name)
      })),
    [selectedGrades, seededSubjectsByGrade]
  );

  function toggleGrade(gradeName: string) {
    setSelectedGrades((current) =>
      current.includes(gradeName) ? current.filter((name) => name !== gradeName) : [...current, gradeName]
    );
  }

  function addCustomSubject() {
    const value = customSubjectDraft.trim();
    if (!value || customSubjects.includes(value)) return;
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
        setCreatedClasses(result.classSummaries ?? []);
        setPrincipalClassId(result.classSummaries?.[0]?.id ?? "");
        setSeededSubjectsByGrade(result.seededSubjectsByGrade ?? {});
        pushToast(`Generated ${result.classIds.length} class(es) with default subjects.`, "success");
        router.refresh();
        setStep(2);
      } catch (err: any) {
        setError(err?.message ?? "Failed to generate classes.");
      }
    });
  }

  function handleFinishSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    customSubjects.forEach((subject) => formData.append("custom_subject", subject));
    createdClassIds.forEach((classId) => formData.append("class_id", classId));

    startTransition(async () => {
      try {
        if (customSubjects.length) {
          const result = await onboardingSubjectSetupAction(formData);
          pushToast(`Added ${result.subjectIds.length} custom subject(s) across ${result.classCount} class(es).`, "success");
        }
        if (principalTeaches && principalClassId) {
          const teachingFormData = new FormData();
          teachingFormData.append("principal_class_id", principalClassId);
          await onboardingPrincipalTeachingAssignmentAction(teachingFormData);
        }
        await completeOnboardingAction();
        pushToast("School setup complete.", "success");
        router.refresh();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? "Failed to finish setup.");
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
            <p className="mt-1 text-sm text-muted">Generate classes with curriculum defaults, then review and finish.</p>
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
                <p className="mt-1 text-muted">
                  Each selected grade gets a Section A class with grade-appropriate default subjects automatically linked.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_GRADE_NAMES.map((gradeName) => {
                  const checked = selectedGrades.includes(gradeName);
                  const defaultCount = getDefaultSubjectsForGrade(gradeName).length;
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
                      <span className="flex-1">{gradeName}</span>
                      {checked && defaultCount ? (
                        <span className="text-[10px] font-bold text-primary">{defaultCount} subjects</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={pending || !selectedGrades.length}>
                  {pending ? "Generating classes..." : "Generate Classes"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinishSubmit} className="grid gap-5">
              <div className="rounded-[16px] border border-outline/50 bg-primary/5 px-4 py-3 text-sm text-ink">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Default subjects applied per grade
                </div>
                <p className="mt-1 text-muted">
                  You can add custom subjects now or edit, add, and remove subjects later from the Classes page.
                </p>
              </div>

              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
                {seededSummary.map((item) => (
                  <div key={item.gradeName} className="rounded-[12px] border border-outline/60 bg-surface-low px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink">{item.gradeName} A</p>
                      <span className="text-xs font-semibold text-primary">{item.subjectCount} subjects linked</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{item.subjects.join(", ")}</p>
                  </div>
                ))}
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

              <div className="rounded-[16px] border border-outline/50 bg-white px-4 py-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={principalTeaches}
                    onChange={(event) => setPrincipalTeaches(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-bold text-ink">Principal also teaches a class</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-muted">
                      This gives the principal a My Class attendance view while keeping full school management access.
                    </span>
                  </span>
                </label>
                {principalTeaches ? (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Principal class</label>
                    <select
                      value={principalClassId}
                      onChange={(event) => setPrincipalClassId(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-outline bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    >
                      {createdClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.grade_name} - {item.name}
                          {item.section_name ? ` - ${item.section_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Input
                  value={customSubjectDraft}
                  onChange={(event) => setCustomSubjectDraft(event.target.value)}
                  placeholder="Optional custom subject for all classes"
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
                <Button type="submit" disabled={pending}>
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
